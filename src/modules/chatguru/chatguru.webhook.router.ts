// src/modules/chatguru/chatguru.webhook.router.ts

import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { generateAiAssistantResponse } from "../aiAssistant/aiAssistant.service";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Tipos baseados na estrutura do ChatGuru e do nosso backend RT Laser
 * (o payload do ChatGuru varia bastante, então vários campos são opcionais)
 */
interface ChatGuruWebhookBody {
  id_instancia?: string | null;

  telefone?: string | null;
  celular?: string | null;

  nome_contato?: string | null;
  nome?: string | null;

  origem_msg?: string | null;
  origem?: string | null;

  msg?: string | null;
  texto_mensagem?: string | null;
  executado_por?: string | null;

  link_chat?: string | null;

  phone_id?: string | null; // costuma vir no payload
  context_vars?: Record<string, any> | null;

  campanha_nome?: string | null;
  campanha_id?: string | null;
  etiqueta?: string | null;
  etapa_funil?: string | null;

  [key: string]: any;
}

type AfterHoursResult = {
  intercepted: boolean;
  replyText?: string;
  rawResponse?: any;
};

type SendAttempt = {
  method: "POST" | "GET";
  url: string;
  status?: number;
  dataPreview?: string;
};

function safeTrim(v: any): string {
  return String(v ?? "").trim();
}
function onlyDigits(v: any): string {
  return safeTrim(v).replace(/\D/g, "");
}
function removeTrailingSlash(url: string): string {
  return safeTrim(url).replace(/\/+$/, "");
}

function tryExtractInstanceIdFromLink(linkChat?: string | null): string | null {
  const link = safeTrim(linkChat);
  if (!link) return null;
  try {
    const u = new URL(link);
    // ex: host "s19.chatguru.app"
    const host = u.host || "";
    const first = host.split(".")[0];
    if (first && /^[a-z0-9]+$/i.test(first)) return first;
    return null;
  } catch {
    return null;
  }
}

function tryExtractInstanceIdFromBaseUrl(baseUrl?: string | null): string | null {
  const url = safeTrim(baseUrl);
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.host || ""; // ex: s19.chatguru.app
    const first = host.split(".")[0];
    if (first && /^[a-z0-9]+$/i.test(first)) return first;
    return null;
  } catch {
    return null;
  }
}

function isGreeting(text: string): boolean {
  const lower = safeTrim(text).toLowerCase();
  return (
    lower === "oi" ||
    lower === "olá" ||
    lower === "ola" ||
    lower === "bom dia" ||
    lower === "boa tarde" ||
    lower === "boa noite" ||
    lower.startsWith("oi ") ||
    lower.startsWith("ola ") ||
    lower.startsWith("olá ")
  );
}

function isEnvFalse(v: any): boolean {
  const s = safeTrim(v).toLowerCase();
  return s === "false" || s === "0" || s === "no" || s === "off";
}

/**
 * ===== Integração com robô fora de horário (serviço dedicado) =====
 */
async function callAfterHoursIfEnabled(body: ChatGuruWebhookBody): Promise<AfterHoursResult> {
  if (isEnvFalse(process.env.AFTER_HOURS_ENABLED)) return { intercepted: false };

  const url = safeTrim(process.env.AFTER_HOURS_WEBHOOK_URL);
  if (!url) return { intercepted: false };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.AFTER_HOURS_WEBHOOK_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.AFTER_HOURS_WEBHOOK_TOKEN}`;
    }

    const response = await axios.post(url, body, { timeout: 5000, headers });
    const data = response.data;

    // CONTRATO novo: action=AUTO_REPLY + message
    if (data?.success && data.action === "AUTO_REPLY" && typeof data.message === "string" && data.message.trim()) {
      return { intercepted: true, replyText: data.message.trim(), rawResponse: data };
    }

    // compat antigo: replyMessage
    if (data?.success && typeof data.replyMessage === "string" && data.replyMessage.trim()) {
      return { intercepted: true, replyText: data.replyMessage.trim(), rawResponse: data };
    }

    return { intercepted: false, rawResponse: data };
  } catch (error: any) {
    console.error("[WEBHOOK][AFTER_HOURS] erro:", error?.message || error);
    return { intercepted: false };
  }
}

/**
 * ===== URA Handler (mesma ideia do ura.handler.router.ts) =====
 */
async function runUraHandler(input: {
  ura: string;
  mensagem: string;
  contato?: string;
  nome?: string | null;
}): Promise<{ message: string; nextUra: string | null; scenarioFound: boolean }> {
  const { ura, mensagem, nome } = input;

  const scenario = await prisma.chatScenario.findUnique({ where: { uraKey: ura } });

  if (!scenario || !scenario.active) {
    return {
      scenarioFound: false,
      message: "Recebi sua mensagem e vou encaminhar para a equipe responder com calma no horário de atendimento, tudo bem? 💚",
      nextUra: null,
    };
  }

  const contextSummary = [
    `CENÁRIO URA: ${scenario.uraKey}`,
    scenario.description ? `Descrição: ${scenario.description}` : "Descrição: (não informada)",
    "",
    "INSTRUÇÕES ESPECÍFICAS PARA ESTE CONTEXTO:",
    scenario.aiInstructions,
  ]
    .join("\n")
    .trim();

  const aiResult = await generateAiAssistantResponse({
    text: mensagem,
    contactName: nome ?? null,
    contextSummary,
  });

  const respostaFinal =
    aiResult.text ||
    "Tive uma pequena dificuldade aqui agora, mas já vou pedir para alguém da equipe te responder direitinho, tudo bem? 💚";

  return {
    scenarioFound: true,
    message: respostaFinal,
    nextUra: scenario.defaultNextUra || null,
  };
}

/**
 * ===== Envio de mensagem para ChatGuru =====
 *
 * IMPORTANTE:
 * - Força sempre a BASE da instância: https://{instance}.chatguru.app/api/v1
 * - Tenta POST e, se der 404, tenta GET (porque tem conta que muda isso)
 */
async function sendMessageToChatGuru(params: {
  instanceId: string;
  accountId: string;
  apiToken: string; // chave (vai no parâmetro key=)
  phoneId: string;
  chatNumber: string;
  text: string;
}): Promise<{ success: boolean; data?: any; error?: any; attempts: SendAttempt[] }> {
  const base = `https://${params.instanceId}.chatguru.app/api/v1`;

  const url =
    `${removeTrailingSlash(base)}` +
    `?key=${encodeURIComponent(params.apiToken)}` +
    `&account_id=${encodeURIComponent(params.accountId)}` +
    `&phone_id=${encodeURIComponent(params.phoneId)}` +
    `&action=message_send` +
    `&text=${encodeURIComponent(params.text)}` +
    `&chat_number=${encodeURIComponent(params.chatNumber)}`;

  const attempts: SendAttempt[] = [];

  // 1) POST
  try {
    const r = await axios.post(url, null, { timeout: 10000 });
    attempts.push({ method: "POST", url, status: r.status });
    return { success: true, data: r.data, attempts };
  } catch (e1: any) {
    const status = e1?.response?.status;
    const data = e1?.response?.data;
    attempts.push({
      method: "POST",
      url,
      status,
      dataPreview: safeTrim(typeof data === "string" ? data : JSON.stringify(data)).slice(0, 200),
    });

    const is404 =
      status === 404 ||
      (typeof data === "object" && data?.detail === "Not Found") ||
      safeTrim(data).toLowerCase().includes("not found");

    if (!is404) {
      return { success: false, error: data || e1?.message || e1, attempts };
    }
  }

  // 2) GET (fallback)
  try {
    const r = await axios.get(url, { timeout: 10000 });
    attempts.push({ method: "GET", url, status: r.status });
    return { success: true, data: r.data, attempts };
  } catch (e2: any) {
    const status = e2?.response?.status;
    const data = e2?.response?.data;
    attempts.push({
      method: "GET",
      url,
      status,
      dataPreview: safeTrim(typeof data === "string" ? data : JSON.stringify(data)).slice(0, 200),
    });
    return { success: false, error: data || e2?.message || e2, attempts };
  }
}

/**
 * ===== WEBHOOK PRINCIPAL DO CHATGURU =====
 */
router.post("/", async (req: Request, res: Response): Promise<Response | void> => {
  const body = (req.body || {}) as ChatGuruWebhookBody;
  const q = (req.query || {}) as Record<string, any>;

  // Segurança: aceita TOKEN por CHATGURU_WEBHOOK_TOKEN ou CHATGURU_WEBHOOK_SECRET
  const expectedToken = safeTrim(process.env.CHATGURU_WEBHOOK_TOKEN || process.env.CHATGURU_WEBHOOK_SECRET);
  const receivedToken =
    (req.headers["x-chatguru-token"] as string | undefined) ||
    (q.token as string | undefined) ||
    (body as any)?.token;

  if (expectedToken && receivedToken !== expectedToken) {
    console.warn("[WEBHOOK] token inválido.");
    return res.status(401).json({ success: false, message: "Token inválido." });
  }

  // Normalização (o ChatGuru manda de jeitos diferentes)
  const telefone = safeTrim(body.telefone || body.celular || q.telefone || q.celular || q.phone || q.chat_number);
  const text = safeTrim(body.msg || body.texto_mensagem || body.executado_por || q.msg || q.text || q.message);
  const origemMsg = safeTrim(body.origem_msg || body.origem || q.origem_msg || q.origem || "whatsapp").toLowerCase();
  const nomeContato = safeTrim(body.nome_contato || body.nome || q.nome_contato || q.nome);

  const phoneIdFromWebhook = safeTrim(body.phone_id || q.phone_id || "");
  const phoneIdEnv = safeTrim(process.env.CHATGURU_PHONE_ID);

  // instanceId: body -> link_chat -> base_url -> fallback env
  const instanceFromBody = safeTrim(body.id_instancia || q.id_instancia || q.instanceId || q.instance_id);
  const instanceFromLink = tryExtractInstanceIdFromLink(body.link_chat || q.link_chat);
  const instanceFromBaseUrl = tryExtractInstanceIdFromBaseUrl(process.env.CHATGURU_API_BASE_URL);
  const instanceFallback = safeTrim(process.env.CHATGURU_INSTANCE_ID_DEFAULT);
  const instanceId = instanceFromBody || instanceFromLink || instanceFromBaseUrl || instanceFallback;

  // log enxuto
  console.log("[WEBHOOK] Entrada normalizada:", {
    instanceId,
    telefone,
    origemMsg,
    phoneId: phoneIdFromWebhook || phoneIdEnv || "(sem phone_id)",
    textPreview: (text || "").slice(0, 40),
    hasLinkChat: !!safeTrim(body.link_chat),
    keys: Object.keys(body || {}).slice(0, 30),
  });

  if (!telefone || !instanceId) {
    console.warn("[WEBHOOK] Ignorado: faltou telefone ou instanceId.");
    return res.status(200).json({ success: true, ignored: true, reason: "MISSING_REQUIRED_FIELDS" });
  }

  // Modo teste seguro (whitelist)
  const allowedPhone = safeTrim(process.env.TEST_ALLOWED_PHONE);
  if (allowedPhone) {
    if (onlyDigits(telefone) !== onlyDigits(allowedPhone)) {
      return res.status(200).json({ success: true, ignored: true, reason: "PHONE_NOT_ALLOWED" });
    }
  }

  // Flags (se você estiver usando)
  if (isEnvFalse(process.env.CHATGURU_API_ENABLED)) {
    return res.status(200).json({ success: true, ignored: true, reason: "CHATGURU_API_DISABLED" });
  }
  if (isEnvFalse(process.env.CHATGURU_AUTO_SEND_ENABLED)) {
    return res.status(200).json({ success: true, ignored: true, reason: "AUTO_SEND_DISABLED" });
  }

  const canAutoSend = origemMsg === "whatsapp";

  // AFTER HOURS
  try {
    const after = await callAfterHoursIfEnabled(body);
    if (after.intercepted && after.replyText && canAutoSend) {
      const accountId = safeTrim(process.env.CHATGURU_ACCOUNT_ID);
      const apiToken = safeTrim(process.env.CHATGURU_API_TOKEN || process.env.CHATGURU_API_KEY); // aceita os dois
      const phoneId = phoneIdFromWebhook || phoneIdEnv;

      if (!accountId || !apiToken || !phoneId) {
        console.error("[CHATGURU] ENV incompleto p/ enviar (accountId/apiToken/phoneId).");
        return res.json({
          success: true,
          handledBy: "AFTER_HOURS",
          canAutoSend,
          handoffToHuman: true,
          replyPreview: after.replyText,
          sendResult: { success: false, error: "ENV_INCOMPLETE" },
        });
      }

      const sendResult = await sendMessageToChatGuru({
        instanceId,
        accountId,
        apiToken,
        phoneId,
        chatNumber: onlyDigits(telefone),
        text: after.replyText,
      });

      console.log("[CHATGURU] send(after_hours):", sendResult.success, sendResult.attempts?.slice(-1)?.[0] || null);

      return res.json({
        success: true,
        handledBy: "AFTER_HOURS",
        canAutoSend,
        handoffToHuman: !sendResult.success,
        replyPreview: after.replyText,
        sendResult,
      });
    }
  } catch (err) {
    console.error("[WEBHOOK][AFTER_HOURS] erro inesperado:", err);
  }

  // URA HANDLER
  try {
    const uraFromContext = (() => {
      const ctx = body.context_vars || {};
      const found = Object.entries(ctx).find(
        ([k]) => k.toLowerCase() === "ura" || k.toLowerCase() === "ura_context"
      )?.[1];
      if (!found) return null;
      return typeof found === "string" ? found : String(found);
    })();

    const uraFinal = uraFromContext && safeTrim(uraFromContext) ? safeTrim(uraFromContext) : isGreeting(text) ? "SAUDACAO" : "DEFAULT";

    const uraResult = await runUraHandler({
      ura: uraFinal,
      mensagem: text || "(sem mensagem)",
      contato: telefone,
      nome: nomeContato || null,
    });

    let sendResult: any = null;
    let handoffToHuman = !canAutoSend;

    if (canAutoSend) {
      const accountId = safeTrim(process.env.CHATGURU_ACCOUNT_ID);
      const apiToken = safeTrim(process.env.CHATGURU_API_TOKEN || process.env.CHATGURU_API_KEY); // aceita os dois
      const phoneId = phoneIdFromWebhook || phoneIdEnv;

      if (!accountId || !apiToken || !phoneId) {
        console.error("[CHATGURU] ENV incompleto p/ enviar (accountId/apiToken/phoneId).");
        handoffToHuman = true;
        sendResult = { success: false, error: "ENV_INCOMPLETE" };
      } else {
        sendResult = await sendMessageToChatGuru({
          instanceId,
          accountId,
          apiToken,
          phoneId,
          chatNumber: onlyDigits(telefone),
          text: uraResult.message,
        });

        console.log("[CHATGURU] send(ura):", sendResult.success, sendResult.attempts?.slice(-1)?.[0] || null);

        if (!sendResult.success) handoffToHuman = true;
      }
    }

    // log opcional
    try {
      await prisma.adminLog.create({
        data: {
          type: "CHATGURU_WEBHOOK",
          message: `URA_HANDLER (ura=${uraFinal}, scenarioFound=${uraResult.scenarioFound}).`,
          payload: JSON.stringify({
            telefone,
            instanceId,
            uraFinal,
            nextUra: uraResult.nextUra,
            sendOk: !!sendResult?.success,
          }),
        },
      });
    } catch {}

    return res.json({
      success: true,
      handledBy: "URA_HANDLER",
      canAutoSend,
      handoffToHuman,
      ura: uraFinal,
      nextUra: uraResult.nextUra,
      replyPreview: uraResult.message,
      sendResult,
    });
  } catch (err: any) {
    console.error("[WEBHOOK] erro ura handler:", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno ao processar webhook." });
  }
});

// ROTA DE TESTE (não envia mensagem real)
router.post("/test", async (req: Request, res: Response) => {
  const body = (req.body || {}) as Partial<ChatGuruWebhookBody>;
  const telefone = safeTrim(body.telefone || body.celular || "5599999999999");
  const mensagem = safeTrim(body.msg || body.texto_mensagem || "mensagem de teste");

  const uraResult = await runUraHandler({
    ura: "DEFAULT",
    mensagem,
    contato: telefone,
    nome: safeTrim(body.nome_contato || body.nome || "Teste"),
  });

  return res.json({
    success: true,
    mode: "TEST",
    willSendToChatGuru: false,
    preview: { phone: telefone, message: uraResult.message },
    ura: "DEFAULT",
    nextUra: uraResult.nextUra,
  });
});

export default router;
