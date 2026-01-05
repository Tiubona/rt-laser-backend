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
  id_instancia: string;
  id_msg?: string | null;
  id_contato?: string | null;

  telefone: string;
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
  forceSend?: boolean;
};

type ChatGuruSendMessageResponse = {
  success: boolean;
  data?: any;
  error?: any;
};

/**
 * Envia mensagem de texto pelo ChatGuru (API HTTP)
 */
async function sendMessageToChatGuru(
  payload: ChatGuruSendMessagePayload,
  instanceId: string
): Promise<ChatGuruSendMessageResponse> {
  // Aceita os dois nomes (pra nunca mais quebrar por detalhe de env)
  const baseUrl =
    process.env.CHATGURU_API_URL?.trim() ||
    process.env.CHATGURU_API_BASE_URL?.trim() ||
    "";

  const token = process.env.CHATGURU_API_TOKEN?.trim() || "";

  // Diagnóstico SEM expor segredo
  console.log("[ENV] CHATGURU_API_URL present?", !!process.env.CHATGURU_API_URL);
  console.log("[ENV] CHATGURU_API_BASE_URL present?", !!process.env.CHATGURU_API_BASE_URL);
  console.log("[ENV] CHATGURU_API_TOKEN present?", !!process.env.CHATGURU_API_TOKEN);

  if (!baseUrl || !token) {
    console.error(
      "[CHATGURU] CHATGURU_API_URL/CHATGURU_API_BASE_URL ou CHATGURU_API_TOKEN não configurados."
    );
    return {
      success: false,
      error: "CHATGURU_API_URL/CHATGURU_API_TOKEN ausentes",
    };
  }

  // Monta URL sem duplicar /api/v1
  const normalizedBase = baseUrl.replace(/\/+$/, ""); // remove / no final
  const hasApiV1 = normalizedBase.endsWith("/api/v1");

  const url = hasApiV1
    ? `${normalizedBase}/${instanceId}/send-message`
    : `${normalizedBase}/api/v1/${instanceId}/send-message`;

  try {
    const response = await axios.post(
      url,
      {
        number: payload.phone,
        message: payload.message,
        forceSend: payload.forceSend ?? true,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error(
      "[CHATGURU] Erro ao enviar mensagem:",
      error?.response?.data || error?.message || error
    );
    return {
      success: false,
      error: error?.response?.data || error?.message || error,
    };
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
 * (A sacada aqui é: se for saudação e NÃO tiver URA, nós forçamos URA=SAUDACAO,
 * pra cair no seu cenário treinado no painel, sem duplicar texto no webhook.)
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

async function callAfterHoursIfEnabled(
  body: ChatGuruWebhookBody
): Promise<AfterHoursResult> {
  const url = process.env.AFTER_HOURS_WEBHOOK_URL;

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

    // CONTRATO (novo): action=AUTO_REPLY + message
    if (
      data &&
      data.success &&
      data.action === "AUTO_REPLY" &&
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      return {
        intercepted: true,
        replyText: data.message.trim(),
        rawResponse: data,
      };
    }

    // CONTRATO (compat antigo): replyMessage
    if (
      data &&
      data.success &&
      typeof data.replyMessage === "string" &&
      data.replyMessage.trim()
    ) {
      return {
        intercepted: true,
        replyText: data.replyMessage.trim(),
        rawResponse: data,
      };
    }

    // Se PASS_THROUGH ou qualquer outro caso, não intercepta
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
 * Implementação do "URA Handler" (mesma lógica do ura.handler.router.ts),
 * só que chamada diretamente aqui pra evitar HTTP interno e manter 1 pipeline.
 */
async function runUraHandler(input: {
  ura: string;
  mensagem: string;
  contato?: string;
  nome?: string | null;
}): Promise<{ message: string; nextUra: string | null; scenarioFound: boolean }> {
  const { ura, mensagem, contato, nome } = input;

  // 1) Buscar cenário configurado para essa URA
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

  // 2) Montar o contexto para o RTBrain
  const contextSummary = [
    `CENÁRIO URA: ${scenario.uraKey}`,
    scenario.description
      ? `Descrição: ${scenario.description}`
      : "Descrição: (não informada)",
    "",
    "INSTRUÇÕES ESPECÍFICAS PARA ESTE CONTEXTO:",
    scenario.aiInstructions,
  ]
    .join("\n")
    .trim();

  // 3) Chamar a IA usando o mesmo pipeline do robô principal
  const aiResult = await generateAiAssistantResponse({
    text: mensagem,
    contactName: nome ?? null,
    contextSummary,
  });

  const respostaFinal =
    aiResult.text ||
    "Tive uma pequena dificuldade aqui agora, mas já vou pedir para alguém da equipe te responder direitinho, tudo bem? 💚";

  // 4) URA de saída opcional configurada no painel
  const nextUra = scenario.defaultNextUra || null;

  return {
    scenarioFound: true,
    message: respostaFinal,
    nextUra,
  };
}

/**
 * WEBHOOK PRINCIPAL DO CHATGURU (CAMINHO A)
 * - Intercepta se o robô fora de horário responder AUTO_REPLY
 * - Caso contrário, passa pro seu robô treinado (URA Handler)
 */
router.post(
  "/",
  async (req: Request, res: Response): Promise<Response | void> => {
    const body = req.body as ChatGuruWebhookBody;

    // 0) Log inicial
    try {
      console.log(
        "[WEBHOOK] Payload recebido do ChatGuru:",
        JSON.stringify(
          {
            id_instancia: body.id_instancia,
            telefone: body.telefone,
            origem_msg: body.origem_msg,
            msg: body.msg,
            etiqueta: body.etiqueta,
            etapa_funil: body.etapa_funil,
            campanha_nome: body.campanha_nome,
            context_vars: body.context_vars,
          },
          null,
          2
        )
      );
    } catch {}

    // 1) Verificação de token (se configurado)
    const expectedToken = process.env.CHATGURU_WEBHOOK_TOKEN;
    const receivedToken =
      (req.headers["x-chatguru-token"] as string | undefined) ||
      (req.query.token as string | undefined) ||
      (body as any)?.token;

    if (expectedToken) {
      if (!receivedToken || receivedToken !== expectedToken) {
        console.warn("[WEBHOOK] Token inválido ou ausente.");
        return res.status(401).json({
          success: false,
          message: "Token inválido.",
        });
      }
    }

    // 2) Normaliza campos
    const text = (body.msg || "").trim();
    const telefone = body.telefone;
    const instanceId = body.id_instancia;

    if (!telefone || !instanceId) {
      console.warn("[WEBHOOK] Telefone ou id_instancia ausentes.");
      return res.status(400).json({
        success: false,
        message: "Telefone ou id_instancia ausentes.",
      });
    }

    const isFromWhatsApp = body?.origem_msg === "whatsapp";
    const canAutoSend = isFromWhatsApp;

    // 3) CAMINHO A — robô fora de horário decide se intercepta
    try {
      const afterHoursResult = await callAfterHoursIfEnabled(body);

      if (afterHoursResult.intercepted && afterHoursResult.replyText && canAutoSend) {
        console.log("[WEBHOOK][AFTER_HOURS] Interceptado pelo robô fora de horário.");

        const sendResult = await sendMessageToChatGuru(
          {
            phone: telefone,
            message: afterHoursResult.replyText,
            forceSend: true,
          },
          instanceId
        );

        return res.json({
          success: true,
          handledBy: "AFTER_HOURS",
          canAutoSend: true,
          handoffToHuman: false,
          replyPreview: afterHoursResult.replyText,
          sendResult,
          afterHoursRaw: afterHoursResult.rawResponse ?? null,
        });
      }
    } catch (err) {
      console.error("[WEBHOOK][AFTER_HOURS] Erro inesperado:", err);
      // não mata o fluxo; segue pro robô treinado
    }

    // 4) CAMINHO A — robô treinado (URA handler)
    try {
      const uraFromContext = getURAFromContext(body);
      const nome = (body.nome_contato || null) as string | null;

      // Se for saudação e não veio URA, forçamos URA=SAUDACAO
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

      // Se não é WhatsApp, não envia automático
      let handoffToHuman = !canAutoSend;

      let sendResult: any = null;
      if (canAutoSend) {
        const r = await sendMessageToChatGuru(
          {
            phone: telefone,
            message: uraResult.message,
            forceSend: true,
          },
          instanceId
        );
        sendResult = r;
        if (!r.success) handoffToHuman = true;
      }

      // Log opcional
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
  }
);

// ===== ROTA DE TESTE (NÃO ENVIA MENSAGEM REAL) =====
router.post("/test", async (req: Request, res: Response) => {
  const body = req.body as ChatGuruWebhookBody;

  const telefone = body.telefone || "5599999999999";
  const mensagem = (body.msg || "mensagem de teste").trim();

  const uraResult = await runUraHandler({
    ura: "DEFAULT",
    mensagem,
    contato: telefone,
    nome: body.nome_contato ?? "Teste",
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
