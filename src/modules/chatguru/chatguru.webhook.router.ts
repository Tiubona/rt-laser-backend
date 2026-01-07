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
 */
interface ChatGuruWebhookBody {
  id_instancia?: string;
  id_msg?: string | null;
  id_contato?: string | null;

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

  context_vars?: {
    [key: string]: string | number | boolean | null | undefined;
  } | null;

  campanha_nome?: string | null;
  campanha_id?: string | null;
  etiqueta?: string | null;
  etapa_funil?: string | null;

  [key: string]: any;
}

type ChatGuruSendMessagePayload = {
  instanceId: string;
  phone: string;
  message: string;
  phoneId?: string | null; // ✅ vem do webhook; fallback no env
};

type ChatGuruSendMessageResponse = {
  success: boolean;
  data?: any;
  error?: any;
  tried?: any[];
};

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
    // host: s19.chatguru.app
    const host = u.host || "";
    const first = host.split(".")[0];
    if (first && /^[a-z0-9]+$/i.test(first)) return first;
    return null;
  } catch {
    return null;
  }
}

function maskSecret(s: string): string {
  const v = safeTrim(s);
  if (v.length <= 8) return "********";
  return `${v.slice(0, 3)}********${v.slice(-3)}`;
}

/**
 * Envia mensagem de texto pelo ChatGuru (API via querystring)
 * Doc: action=message_send
 * POST https://{endpoint}/api/v1?key=KEY&account_id=ACCOUNT_ID&phone_id=PHONE_ID&action=message_send&text=TEXT&chat_number=CHAT_NUMBER
 */
async function sendMessageToChatGuru(
  payload: ChatGuruSendMessagePayload
): Promise<ChatGuruSendMessageResponse> {
  const token = safeTrim(process.env.CHATGURU_API_TOKEN);
  const accountId = safeTrim(process.env.CHATGURU_ACCOUNT_ID);

  if (!token || !accountId) {
    return {
      success: false,
      error: "CHATGURU config ausente (CHATGURU_API_TOKEN / CHATGURU_ACCOUNT_ID).",
    };
  }

  const instanceId = safeTrim(payload.instanceId);
  const chatNumber = onlyDigits(payload.phone);
  const text = safeTrim(payload.message);

  // ✅ phone_id: prioridade: payload (webhook) -> env
  const phoneId = safeTrim(payload.phoneId || process.env.CHATGURU_PHONE_ID);

  if (!phoneId) {
    return {
      success: false,
      error: "CHATGURU config ausente (phone_id). Nem no webhook nem no ENV.",
    };
  }

  // ✅ endpoint: prioridade ABSOLUTA para a instância (s19)
  const forcedBase = instanceId ? `https://${instanceId}.chatguru.app/api/v1` : "";
  const envBase = safeTrim(process.env.CHATGURU_API_BASE_URL); // ex: https://s19.chatguru.app/api/v1
  const apiBase = removeTrailingSlash(forcedBase || envBase || "https://app.zap.guru/api/v1");

  const tried: any[] = [];

  async function attempt(paramName: "key" | "token") {
    const url =
      `${apiBase}` +
      `?${paramName}=${encodeURIComponent(token)}` +
      `&account_id=${encodeURIComponent(accountId)}` +
      `&phone_id=${encodeURIComponent(phoneId)}` +
      `&action=message_send` +
      `&text=${encodeURIComponent(text)}` +
      `&chat_number=${encodeURIComponent(chatNumber)}`;

    tried.push({
      apiBase,
      paramName,
      token: maskSecret(token),
      accountId,
      phoneId,
      chatNumber,
      instanceId,
    });

    console.log("[CHATGURU] send attempt:", { apiBase, paramName, phoneId, chatNumber, instanceId });

    try {
      const response = await axios.post(url, null, { timeout: 10000 });
      return { ok: true as const, data: response.data };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data || error?.message || error;
      console.error("[CHATGURU] send error:", { status, data });
      return { ok: false as const, status, data };
    }
  }

  // 1) tenta com key=
  const r1 = await attempt("key");
  if (r1.ok) return { success: true, data: r1.data, tried };

  // 2) se der 404/not found, tenta com token=
  const is404 =
    r1.status === 404 ||
    (typeof r1.data === "object" && r1.data?.detail === "Not Found") ||
    String(r1.data).toLowerCase().includes("not found");

  if (is404) {
    const r2 = await attempt("token");
    if (r2.ok) return { success: true, data: r2.data, tried };
    return { success: false, error: r2.data, tried };
  }

  return { success: false, error: r1.data, tried };
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

// ===== Integração com robô fora de horário =====

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
    const headers: Record<string, string> = { "Content-Type": "application/json" };
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
 * Implementação do URA Handler
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

  const nextUra = scenario.defaultNextUra || null;

  return { scenarioFound: true, message: respostaFinal, nextUra };
}

/**
 * WEBHOOK PRINCIPAL DO CHATGURU
 */
router.post("/", async (req: Request, res: Response): Promise<Response | void> => {
  const body = (req.body || {}) as ChatGuruWebhookBody;
  const q = (req.query || {}) as Record<string, any>;

  // Token do webhook
  const expectedToken = safeTrim(process.env.CHATGURU_WEBHOOK_TOKEN);
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

  // Normalização
  const telefone = safeTrim(body.telefone || body.celular || q.telefone || q.celular || q.phone || q.chat_number);
  const text = safeTrim(body.msg || body.texto_mensagem || body.executado_por || q.msg || q.text || q.message);
  const origemMsg = safeTrim(body.origem_msg || body.origem || q.origem_msg || q.origem || "whatsapp");
  const nomeContato = safeTrim(body.nome_contato || body.nome || q.nome_contato || q.nome);
  const phoneIdFromWebhook = safeTrim(body.phone_id || q.phone_id || "");

  const instanceFromBody = safeTrim(body.id_instancia || q.id_instancia || q.instanceId || q.instance_id);
  const instanceFromLink = tryExtractInstanceIdFromLink(body.link_chat || q.link_chat || "");
  const instanceFallback = safeTrim(process.env.CHATGURU_INSTANCE_ID_DEFAULT || "");
  const instanceId = instanceFromBody || instanceFromLink || instanceFallback;

  body.origem_msg = origemMsg;
  if (nomeContato) body.nome_contato = nomeContato;
  if (telefone) body.telefone = telefone;
  if (text) body.msg = text;
  if (instanceId) body.id_instancia = instanceId;

  console.log("[WEBHOOK] Entrada normalizada:", {
    instanceId,
    telefone,
    origemMsg,
    phoneId: phoneIdFromWebhook || "(sem phone_id no webhook)",
    textPreview: (text || "").slice(0, 40),
    hasLinkChat: !!safeTrim(body.link_chat),
  });

  if (!telefone || !instanceId) {
    console.warn("[WEBHOOK] Ignorado: faltou telefone ou instanceId.");
    return res.status(200).json({ success: true, ignored: true, reason: "MISSING_REQUIRED_FIELDS" });
  }

  // Whitelist de teste
  const allowedPhone = safeTrim(process.env.TEST_ALLOWED_PHONE);
  if (allowedPhone) {
    if (onlyDigits(telefone) !== onlyDigits(allowedPhone)) {
      return res.status(200).json({ success: true, ignored: true, reason: "PHONE_NOT_ALLOWED" });
    }
  }

  const canAutoSend = origemMsg.toLowerCase() === "whatsapp";

  // AFTER HOURS
  try {
    const afterHoursResult = await callAfterHoursIfEnabled(body);

    if (afterHoursResult.intercepted && afterHoursResult.replyText && canAutoSend) {
      const sendResult = await sendMessageToChatGuru({
        instanceId,
        phone: telefone,
        message: afterHoursResult.replyText,
        phoneId: phoneIdFromWebhook || null,
      });

      return res.json({
        success: true,
        handledBy: "AFTER_HOURS",
        canAutoSend: true,
        handoffToHuman: !sendResult.success,
        replyPreview: afterHoursResult.replyText,
        sendResult,
      });
    }
  } catch (err) {
    console.error("[WEBHOOK][AFTER_HOURS] Erro inesperado:", err);
  }

  // URA HANDLER
  try {
    const uraFromContext = getURAFromContext(body);
    const uraFinal =
      uraFromContext && safeTrim(uraFromContext) ? safeTrim(uraFromContext) : isGreeting(text) ? "SAUDACAO" : "DEFAULT";

    const uraResult = await runUraHandler({
      ura: uraFinal,
      mensagem: text || "(sem mensagem)",
      contato: telefone,
      nome: body.nome_contato || null,
    });

    let sendResult: any = null;
    let handoffToHuman = !canAutoSend;

    if (canAutoSend) {
      sendResult = await sendMessageToChatGuru({
        instanceId,
        phone: telefone,
        message: uraResult.message,
        phoneId: phoneIdFromWebhook || null,
      });

      if (!sendResult.success) handoffToHuman = true;
    }

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

// ROTA DE TESTE (não envia mensagem real)
router.post("/test", async (req: Request, res: Response) => {
  const body = (req.body || {}) as Partial<ChatGuruWebhookBody>;
  const telefone = safeTrim(body.telefone || body.celular || "5599999999999");
  const mensagem = safeTrim(body.msg || body.texto_mensagem || "mensagem de teste");

  const uraResult = await runUraHandler({
    ura: "DEFAULT",
    mensagem,
    contato: telefone,
    nome: (body.nome_contato ?? body.nome ?? "Teste") as string,
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
