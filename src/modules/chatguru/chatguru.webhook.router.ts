// src/modules/chatguru/chatguru.webhook.router.ts

import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { generateAiAssistantResponse } from "../aiAssistant/aiAssistant.service";

// ✅ USA O CLIENT QUE FUNCIONA (o que você mandou)
import { sendTextMessageViaChatGuru } from "../chatguruClient/chatguruClient.service";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Tipos baseados na estrutura do ChatGuru e do nosso backend RT Laser
 */
interface ChatGuruWebhookBody {
  id_instancia?: string;

  telefone?: string;
  celular?: string;

  nome_contato?: string | null;
  nome?: string | null;

  origem_msg?: string | null;
  origem?: string | null;

  msg?: string | null;
  texto_mensagem?: string | null;
  executado_por?: string | null;

  link_chat?: string | null;

  phone_id?: string | null;
  phoneId?: string | null;

  context_vars?: {
    [key: string]: string | number | boolean | null | undefined;
  } | null;

  campanha_nome?: string | null;
  campanha_id?: string | null;
  etiqueta?: string | null;
  etapa_funil?: string | null;

  [key: string]: any;
}

/**
 * Helpers
 */
function safeTrim(v: any): string {
  return String(v ?? "").trim();
}

function onlyDigits(v: any): string {
  return safeTrim(v).replace(/\D/g, "");
}

function removeTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function tryExtractInstanceIdFromLink(linkChat?: string | null): string | null {
  const link = safeTrim(linkChat);
  if (!link) return null;
  try {
    const u = new URL(link);
    const host = u.host || "";
    const first = host.split(".")[0];
    if (first && /^[a-z0-9]+$/i.test(first)) return first;
    return null;
  } catch {
    return null;
  }
}

function envBool(name: string, defaultValue = false): boolean {
  const v = safeTrim(process.env[name]).toLowerCase();
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes" || v === "y" || v === "on";
}

/**
 * ✅ Envio via client (o mesmo que funcionou no Mac)
 * - com LOG obrigatório (pra você ver URL/STATUS/RETORNO)
 * - compat: CHATGURU_API_KEY -> CHATGURU_API_TOKEN
 */
async function sendViaChatGuruClient(params: { to: string; text: string }) {
  // compat de env: se setaram CHATGURU_API_KEY no Render, usa como TOKEN também
  if (!safeTrim(process.env.CHATGURU_API_TOKEN) && safeTrim(process.env.CHATGURU_API_KEY)) {
    process.env.CHATGURU_API_TOKEN = safeTrim(process.env.CHATGURU_API_KEY);
  }

  // normaliza baseUrl (evita // no final)
  if (process.env.CHATGURU_API_BASE_URL) {
    process.env.CHATGURU_API_BASE_URL = removeTrailingSlash(process.env.CHATGURU_API_BASE_URL);
  }

  const result = await sendTextMessageViaChatGuru({
    to: onlyDigits(params.to),
    text: params.text,
  });

  // ✅ LOG que mata a dúvida
  console.log("[CHATGURU_CLIENT] send prepared:", {
    ok: result.success,
    statusCode: result.statusCode,
    url: result.prepared?.url,
    errorMessage: result.errorMessage,
    raw: result.rawResponseBody,
  });

  return result;
}

/**
 * Extrai URA do context_vars (se existir)
 */
function getURAFromContext(body: ChatGuruWebhookBody): string | null {
  const ctx = body.context_vars || {};
  const uraKey = Object.entries(ctx).find(
    ([key]) => key.toLowerCase() === "ura" || key.toLowerCase() === "ura_context"
  )?.[1];

  if (!uraKey) return null;
  if (typeof uraKey === "string") return uraKey;
  return String(uraKey);
}

/**
 * Heurística simples para saudação.
 */
function isGreeting(text: string): boolean {
  const lower = (text || "").trim().toLowerCase();
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

// ===== Integração com robô fora de horário (serviço dedicado) =====

type AfterHoursResult = {
  intercepted: boolean;
  replyText?: string;
  rawResponse?: any;
};

async function callAfterHoursIfEnabled(body: ChatGuruWebhookBody): Promise<AfterHoursResult> {
  const enabledFlag = safeTrim(process.env.AFTER_HOURS_ENABLED).toLowerCase();
  if (enabledFlag === "false" || enabledFlag === "0" || enabledFlag === "no") {
    return { intercepted: false };
  }

  const url = safeTrim(process.env.AFTER_HOURS_WEBHOOK_URL);
  if (!url) return { intercepted: false };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (process.env.AFTER_HOURS_WEBHOOK_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.AFTER_HOURS_WEBHOOK_TOKEN}`;
    }

    const response = await axios.post(url, body, { timeout: 5000, headers });
    const data = response.data;

    if (data?.success && data.action === "AUTO_REPLY" && typeof data.message === "string" && data.message.trim()) {
      return { intercepted: true, replyText: data.message.trim(), rawResponse: data };
    }

    if (data?.success && typeof data.replyMessage === "string" && data.replyMessage.trim()) {
      return { intercepted: true, replyText: data.replyMessage.trim(), rawResponse: data };
    }

    return { intercepted: false, rawResponse: data };
  } catch (error: any) {
    console.error("[WEBHOOK][AFTER_HOURS] Erro ao chamar serviço fora de horário:", error?.message || error);
    return { intercepted: false };
  }
}

/**
 * Implementação do "URA Handler"
 */
async function runUraHandler(input: {
  ura: string;
  mensagem: string;
  contato?: string;
  nome?: string | null;
}): Promise<{ message: string; nextUra: string | null; scenarioFound: boolean }> {
  const { ura, mensagem, nome } = input;

  const scenario = await prisma.chatScenario.findUnique({
    where: { uraKey: ura },
  });

  if (!scenario || !scenario.active) {
    return {
      scenarioFound: false,
      message:
        "Recebi sua mensagem e vou encaminhar para a equipe responder com calma no horário de atendimento, tudo bem? 💚",
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

  const nextUra = scenario.defaultNextUra || null;

  return { scenarioFound: true, message: respostaFinal, nextUra };
}

/**
 * WEBHOOK PRINCIPAL DO CHATGURU
 */
router.post("/", async (req: Request, res: Response): Promise<Response | void> => {
  const body = (req.body || {}) as ChatGuruWebhookBody;
  const q = (req.query || {}) as Record<string, any>;

  // ✅ token/secret do webhook: aceita ambos nomes (porque teu .env usa SECRET)
  const expectedToken =
    safeTrim(process.env.CHATGURU_WEBHOOK_TOKEN) ||
    safeTrim(process.env.CHATGURU_WEBHOOK_SECRET);

  const receivedToken =
    (req.headers["x-chatguru-token"] as string | undefined) ||
    (q.token as string | undefined) ||
    (body as any)?.token;

  if (expectedToken) {
    if (!receivedToken || receivedToken !== expectedToken) {
      console.warn("[WEBHOOK] Token inválido ou ausente.");
      return res.status(401).json({ success: false, message: "Token inválido." });
    }
  }

  // ✅ normalização dos campos (ChatGuru varia)
  const telefone = safeTrim(
    body.telefone ||
      body.celular ||
      q.telefone ||
      q.celular ||
      q.phone ||
      q.chat_number
  );

  const text = safeTrim(
    body.msg ||
      body.texto_mensagem ||
      body.executado_por ||
      q.msg ||
      q.text ||
      q.message
  );

  const origemMsg = safeTrim(
    body.origem_msg ||
      body.origem ||
      q.origem_msg ||
      q.origem ||
      "whatsapp"
  );

  const nomeContato = safeTrim(
    body.nome_contato ||
      body.nome ||
      q.nome_contato ||
      q.nome
  );

  const instanceFromBody = safeTrim(
    body.id_instancia ||
      q.id_instancia ||
      q.instanceId ||
      q.instance_id
  );

  const instanceFromLink = tryExtractInstanceIdFromLink(
    (body.link_chat as any) || (q.link_chat as any)
  );

  const instanceFallback = safeTrim(process.env.CHATGURU_INSTANCE_ID_DEFAULT || "");

  const instanceId = instanceFromBody || instanceFromLink || instanceFallback;

  const phoneIdFromWebhook = safeTrim(body.phone_id || body.phoneId || q.phone_id || q.phoneId);

  // aplica consistência
  body.origem_msg = origemMsg;
  if (nomeContato) body.nome_contato = nomeContato;
  if (telefone) body.telefone = telefone;
  if (text) body.msg = text;
  if (instanceId) body.id_instancia = instanceId;
  if (phoneIdFromWebhook && !body.phone_id) body.phone_id = phoneIdFromWebhook;

  // ✅ LOG enxuto mas suficiente
  console.log("[WEBHOOK] Entrada normalizada:", {
    instanceId,
    telefone: onlyDigits(telefone),
    origemMsg,
    phoneId: phoneIdFromWebhook || safeTrim(process.env.CHATGURU_PHONE_ID) || "(sem phone_id)",
    textPreview: (text || "").slice(0, 40),
    hasLinkChat: !!safeTrim(body.link_chat),
  });

  if (!telefone || !instanceId) {
    console.warn("[WEBHOOK] Ignorado: faltou telefone ou instanceId.", {
      telefone: telefone || null,
      instanceId: instanceId || null,
      hasLinkChat: !!safeTrim(body.link_chat),
    });
    return res.status(200).json({ success: true, ignored: true, reason: "MISSING_REQUIRED_FIELDS" });
  }

  // ✅ whitelist opcional (modo teste)
  const allowedPhone = safeTrim(process.env.TEST_ALLOWED_PHONE);
  if (allowedPhone) {
    const incoming = onlyDigits(telefone);
    const allowed = onlyDigits(allowedPhone);
    if (incoming !== allowed) {
      return res.status(200).json({ success: true, ignored: true, reason: "PHONE_NOT_ALLOWED" });
    }
  }

  // ✅ flags (pra você conseguir desligar via env se quiser)
  const apiEnabled = envBool("CHATGURU_API_ENABLED", true);
  const autoSendEnabled = envBool("CHATGURU_AUTO_SEND_ENABLED", true);

  const canAutoSend = origemMsg.toLowerCase() === "whatsapp" && apiEnabled && autoSendEnabled;

  // 1) AFTER HOURS (se interceptar, responde por aqui)
  try {
    const afterHoursResult = await callAfterHoursIfEnabled(body);

    if (afterHoursResult.intercepted && afterHoursResult.replyText && canAutoSend) {
      const sendResult = await sendViaChatGuruClient({
        to: telefone,
        text: afterHoursResult.replyText,
      });

      return res.json({
        success: true,
        handledBy: "AFTER_HOURS",
        canAutoSend,
        handoffToHuman: !sendResult.success,
        replyPreview: afterHoursResult.replyText,
        sendResult,
      });
    }
  } catch (err) {
    console.error("[WEBHOOK][AFTER_HOURS] Erro inesperado:", err);
  }

  // 2) URA HANDLER
  try {
    const uraFromContext = getURAFromContext(body);

    const uraFinal =
      uraFromContext && safeTrim(uraFromContext)
        ? safeTrim(uraFromContext)
        : isGreeting(text)
        ? "SAUDACAO"
        : "DEFAULT";

    const uraResult = await runUraHandler({
      ura: uraFinal,
      mensagem: text || "(sem mensagem)",
      contato: telefone,
      nome: body.nome_contato || null,
    });

    let sendResult: any = null;
    let handoffToHuman = !canAutoSend;

    if (canAutoSend) {
      sendResult = await sendViaChatGuruClient({
        to: telefone,
        text: uraResult.message,
      });

      if (!sendResult.success) handoffToHuman = true;
    } else {
      console.warn("[WEBHOOK] Auto-send desligado por flags/env ou origem != whatsapp.", {
        origemMsg,
        apiEnabled,
        autoSendEnabled,
      });
    }

    // log opcional
    try {
      await prisma.adminLog.create({
        data: {
          type: "CHATGURU_WEBHOOK",
          message: `Atendimento via URA_HANDLER (ura=${uraFinal}, scenarioFound=${uraResult.scenarioFound}).`,
          payload: JSON.stringify({
            telefone: onlyDigits(telefone),
            instanceId,
            uraFinal,
            nextUra: uraResult.nextUra,
            textPreview: (text || "").slice(0, 120),
            sendOk: !!sendResult?.success,
            sendStatus: sendResult?.statusCode ?? null,
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
    console.error("[WEBHOOK] Erro no URA_HANDLER:", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno ao processar webhook." });
  }
});

export default router;
