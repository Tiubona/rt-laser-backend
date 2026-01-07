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
  nome_contato?: string | null;

  origem_msg?: string | null;
  msg?: string | null;

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
  phone: string;
  message: string;
  forceSend?: boolean; // compat (não usado na API)
};

type ChatGuruSendMessageResponse = {
  success: boolean;
  data?: any;
  error?: any;
};

/**
 * Envia mensagem pelo ChatGuru.
 * ✅ Tenta 2 formatos:
 * 1) POST {base}/send-message (JSON body)
 * 2) fallback: POST {base}?action=message_send&... (querystring)
 *
 * Isso mata o "404 Not Found" sem ficar adivinhando.
 */
async function sendMessageToChatGuru(
  payload: ChatGuruSendMessagePayload
): Promise<ChatGuruSendMessageResponse> {
  const apiEndpointRaw =
    (process.env.CHATGURU_API_BASE_URL || "").trim() || "https://s19.chatguru.app/api/v1";
  const apiEndpoint = apiEndpointRaw.replace(/\/+$/, ""); // remove barras finais

  const token = (process.env.CHATGURU_API_TOKEN || "").trim();
  const accountId = (process.env.CHATGURU_ACCOUNT_ID || "").trim();
  const phoneId = (process.env.CHATGURU_PHONE_ID || "").trim();

  if (!token || !accountId || !phoneId) {
    console.error(
      "[CHATGURU] Configuração incompleta. Verifique CHATGURU_API_TOKEN, CHATGURU_ACCOUNT_ID, CHATGURU_PHONE_ID."
    );
    return { success: false, error: "CHATGURU config ausente (token/account_id/phone_id)" };
  }

  const chatNumber = String(payload.phone || "").replace(/\D/g, "");
  const text = String(payload.message || "");

  // ===== Tentativa #1: /send-message (JSON body) =====
  const urlSendMessage =
    `${apiEndpoint}/send-message` +
    `?key=${encodeURIComponent(token)}` +
    `&account_id=${encodeURIComponent(accountId)}` +
    `&phone_id=${encodeURIComponent(phoneId)}`;

  const bodySendMessage = { text, chat_number: chatNumber };

  try {
    console.log("[CHATGURU] tentativa#1 POST =", urlSendMessage);
    console.log("[CHATGURU] body tentativa#1 =", bodySendMessage);

    const r1 = await axios.post(urlSendMessage, bodySendMessage, { timeout: 10000 });
    return { success: true, data: r1.data };
  } catch (e1: any) {
    const status1 = e1?.response?.status;
    const data1 = e1?.response?.data;
    console.error("[CHATGURU] tentativa#1 falhou:", status1, data1 || e1?.message);

    // Se não for 404, é erro real (token/account/phoneId/permissão) -> devolve
    if (status1 && status1 !== 404) {
      return { success: false, error: data1 || e1?.message || e1 };
    }
  }

  // ===== Tentativa #2: fallback querystring action=message_send =====
  try {
    const urlFallback =
      `${apiEndpoint}` +
      `?key=${encodeURIComponent(token)}` +
      `&account_id=${encodeURIComponent(accountId)}` +
      `&phone_id=${encodeURIComponent(phoneId)}` +
      `&action=message_send` +
      `&text=${encodeURIComponent(text)}` +
      `&chat_number=${encodeURIComponent(chatNumber)}`;

    console.log("[CHATGURU] tentativa#2 (fallback) POST =", urlFallback);

    const r2 = await axios.post(urlFallback, null, { timeout: 10000 });
    return { success: true, data: r2.data };
  } catch (e2: any) {
    console.error(
      "[CHATGURU] tentativa#2 falhou:",
      e2?.response?.status,
      e2?.response?.data || e2?.message || e2
    );
    return { success: false, error: e2?.response?.data || e2?.message || e2 };
  }
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
  // Se AFTER_HOURS_ENABLED existir e for "false", desliga
  const enabledFlag = (process.env.AFTER_HOURS_ENABLED || "").trim().toLowerCase();
  if (enabledFlag === "false" || enabledFlag === "0" || enabledFlag === "no") {
    return { intercepted: false };
  }

  const url = process.env.AFTER_HOURS_WEBHOOK_URL;
  if (!url) return { intercepted: false };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.AFTER_HOURS_WEBHOOK_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.AFTER_HOURS_WEBHOOK_TOKEN}`;
    }

    const response = await axios.post(url, body, { timeout: 5000, headers });
    const data = response.data;

    // CONTRATO (novo): action=AUTO_REPLY + message
    if (
      data &&
      data.success &&
      data.action === "AUTO_REPLY" &&
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      return { intercepted: true, replyText: data.message.trim(), rawResponse: data };
    }

    // CONTRATO (compat antigo): replyMessage
    if (
      data &&
      data.success &&
      typeof data.replyMessage === "string" &&
      data.replyMessage.trim()
    ) {
      return { intercepted: true, replyText: data.replyMessage.trim(), rawResponse: data };
    }

    return { intercepted: false, rawResponse: data };
  } catch (error: any) {
    console.error(
      "[WEBHOOK][AFTER_HOURS] Erro ao chamar serviço fora de horário:",
      error?.message || error
    );
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

  const scenario = await prisma.chatScenario.findUnique({ where: { uraKey: ura } });

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

  // Log inicial (compacto e útil)
  try {
    console.log("[WEBHOOK] Payload recebido do ChatGuru:", JSON.stringify(body || {}, null, 2));
  } catch {}

  // 1) Verificação de token (se configurado)
  const expectedToken = (process.env.CHATGURU_WEBHOOK_TOKEN || "").trim();
  const receivedToken =
    (req.headers["x-chatguru-token"] as string | undefined) ||
    (req.query.token as string | undefined) ||
    (body as any)?.token;

  if (expectedToken) {
    if (!receivedToken || String(receivedToken).trim() !== expectedToken) {
      console.warn("[WEBHOOK] Token inválido ou ausente.");
      // 401 aqui é ok (segurança)
      return res.status(401).json({ success: false, message: "Token inválido." });
    }
  }

  // 2) Normaliza campos (aceita body OU querystring)
  const q = (req.query || {}) as Record<string, any>;

  const text = String(body.msg ?? q.msg ?? q.text ?? q.message ?? "").trim();

  // ✅ pega de vários campos possíveis (ChatGuru nem sempre manda "telefone")
  const telefone = String(
    body.telefone ??
      (body as any).celular ??
      q.telefone ??
      q.celular ??
      q.phone ??
      q.chat_number ??
      ""
  ).trim();

  const instanceId = String(
    body.id_instancia ?? q.id_instancia ?? q.instanceId ?? q.instance_id ?? q.instancia ?? ""
  ).trim();

  const origemMsg = String(body.origem_msg ?? q.origem_msg ?? q.origem ?? "whatsapp").trim();
  (body as any).origem_msg = origemMsg;

  const nomeContato = String(body.nome_contato ?? q.nome_contato ?? q.nome ?? "").trim();
  if (nomeContato) (body as any).nome_contato = nomeContato;

  // Se faltou telefone/instância, não quebra e não retenta infinito
  if (!telefone || !instanceId) {
    console.warn("[WEBHOOK] Telefone ou id_instancia ausentes.", {
      telefone: telefone || null,
      id_instancia: instanceId || null,
      query: q,
      bodyKeys: Object.keys(body || {}),
    });
    return res.status(200).json({
      success: true,
      ignored: true,
      reason: "MISSING_REQUIRED_FIELDS",
    });
  }

  // ✅ MODO TESTE SEGURO (whitelist): só processa se for o número autorizado
  const allowedPhone = (process.env.TEST_ALLOWED_PHONE || "").trim();
  if (allowedPhone) {
    const normalizedIncoming = String(telefone).replace(/\D/g, "");
    const normalizedAllowed = allowedPhone.replace(/\D/g, "");
    if (normalizedIncoming !== normalizedAllowed) {
      console.log("[WEBHOOK] Ignorado: número não autorizado para teste.", {
        telefone: normalizedIncoming,
      });
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: "PHONE_NOT_ALLOWED",
      });
    }
  }

  const isFromWhatsApp = (body?.origem_msg || "").toLowerCase() === "whatsapp";
  const canAutoSend = isFromWhatsApp;

  // 3) robô fora de horário decide se intercepta
  try {
    const afterHoursResult = await callAfterHoursIfEnabled(body);

    if (afterHoursResult.intercepted && afterHoursResult.replyText && canAutoSend) {
      console.log("[WEBHOOK][AFTER_HOURS] Interceptado pelo robô fora de horário.");

      const sendResult = await sendMessageToChatGuru({
        phone: telefone,
        message: afterHoursResult.replyText,
        forceSend: true,
      });

      return res.json({
        success: true,
        handledBy: "AFTER_HOURS",
        canAutoSend: true,
        handoffToHuman: !sendResult?.success,
        replyPreview: afterHoursResult.replyText,
        sendResult,
        afterHoursRaw: afterHoursResult.rawResponse ?? null,
      });
    }
  } catch (err) {
    console.error("[WEBHOOK][AFTER_HOURS] Erro inesperado:", err);
  }

  // 4) robô treinado (URA handler)
  try {
    const uraFromContext = getURAFromContext(body);
    const nome = (body.nome_contato || null) as string | null;

    const uraFinal =
      uraFromContext && String(uraFromContext).trim()
        ? String(uraFromContext).trim()
        : isGreeting(text)
        ? "SAUDACAO"
        : "DEFAULT";

    const uraResult = await runUraHandler({
      ura: uraFinal,
      mensagem: text || "(sem mensagem)",
      contato: telefone,
      nome,
    });

    let handoffToHuman = !canAutoSend;
    let sendResult: any = null;

    if (canAutoSend) {
      const r = await sendMessageToChatGuru({
        phone: telefone,
        message: uraResult.message,
        forceSend: true,
      });
      sendResult = r;
      if (!r.success) handoffToHuman = true;
    }

    // Log opcional no DB (não trava o fluxo)
    try {
      await prisma.adminLog.create({
        data: {
          type: "CHATGURU_WEBHOOK",
          message: `Atendimento via URA_HANDLER (ura=${uraFinal}, scenarioFound=${uraResult.scenarioFound}).`,
          payload: JSON.stringify({
            telefone,
            instanceId,
            uraFromContext,
            uraFinal,
            nextUra: uraResult.nextUra,
            text,
          }),
        },
      });
    } catch (logErr: any) {
      console.warn("[WARN] Falha ao registrar admin log (não crítico).", logErr?.message || logErr);
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

    try {
      await prisma.adminLog.create({
        data: {
          type: "CHATGURU_WEBHOOK_ERROR",
          message: "Erro no processamento do webhook (URA_HANDLER).",
          payload: JSON.stringify({
            error: err?.message || String(err),
            body,
          }),
        },
      });
    } catch {}

    return res.status(500).json({
      success: false,
      message: "Erro interno ao processar webhook.",
    });
  }
});

// ===== ROTA DE TESTE (NÃO ENVIA MENSAGEM REAL) =====
router.post("/test", async (req: Request, res: Response) => {
  const body = (req.body || {}) as Partial<ChatGuruWebhookBody>;

  const telefone = String(body.telefone || (body as any).celular || "5599999999999");
  const mensagem = String(body.msg || "mensagem de teste").trim();

  const uraResult = await runUraHandler({
    ura: "DEFAULT",
    mensagem,
    contato: telefone,
    nome: (body.nome_contato ?? "Teste") as string,
  });

  return res.json({
    success: true,
    mode: "TEST",
    willSendToChatGuru: false,
    preview: {
      phone: telefone,
      message: uraResult.message,
    },
    ura: "DEFAULT",
    nextUra: uraResult.nextUra,
  });
});

export default router;
