// ==============================================
// chatguruClient.service.ts
// Cliente da API v1 do ChatGuru (old API / zap.guru style)
// - Usa QUERY STRING: key, account_id, phone_id, action=message_send
// - Não usa Authorization: Bearer, nem /messages
// ==============================================

import { URL } from "url";
import https from "https";

export interface ChatGuruApiConfig {
  baseUrl: string;
  key: string;
  accountId: string;
  phoneId: string;
  enabled: boolean;
}

export interface SendTextMessageParams {
  to: string;   // número completo: 55DDDNNNNNNNN
  text: string; // texto da mensagem
}

export interface ChatGuruSendResult {
  success: boolean;
  statusCode: number | null;
  errorMessage: string | null;
  rawResponseBody: any;
  prepared: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
  };
}

// ----------------------------------------------
// Leitura da config a partir do .env
// ----------------------------------------------
export function getChatGuruConfig(): ChatGuruApiConfig {
  const baseUrl =
    process.env.CHATGURU_API_BASE_URL?.trim() ||
    ""; // ex: https://s19.chatguru.app/api/v1
  const key = process.env.CHATGURU_API_TOKEN?.trim() || "";
  const accountId = process.env.CHATGURU_ACCOUNT_ID?.trim() || "";
  const phoneId = process.env.CHATGURU_PHONE_ID?.trim() || "";

  const enabled = !!(baseUrl && key && accountId && phoneId);

  return {
    baseUrl,
    key,
    accountId,
    phoneId,
    enabled,
  };
}

// ----------------------------------------------
// Helper HTTP POST simples usando https nativo
// ----------------------------------------------
function httpPost(url: URL): Promise<{ statusCode: number | null; body: string }> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      method: "POST",
    };

    const req = https.request(url, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode ?? null,
          body: data,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    // Sem body, tudo vai na query string conforme docs da v1
    req.end();
  });
}

// ----------------------------------------------
// Envio de texto via API v1 (message_send)
// ----------------------------------------------
export async function sendTextMessageViaChatGuru(
  params: SendTextMessageParams
): Promise<ChatGuruSendResult> {
  const { to, text } = params;
  const cfg = getChatGuruConfig();

  const preparedBase: ChatGuruSendResult = {
    success: false,
    statusCode: null,
    errorMessage: null,
    rawResponseBody: null,
    prepared: {
      url: cfg.baseUrl,
      method: "POST",
    },
  };

  if (!cfg.enabled) {
    return {
      ...preparedBase,
      errorMessage:
        "Configuração da API ChatGuru incompleta. Verifique CHATGURU_API_BASE_URL, CHATGURU_API_TOKEN, CHATGURU_ACCOUNT_ID, CHATGURU_PHONE_ID.",
    };
  }

  if (!to || !text) {
    return {
      ...preparedBase,
      errorMessage: "Parâmetros inválidos: 'to' e 'text' são obrigatórios.",
    };
  }

  try {
    // Monta URL com query string no padrão v1
    const url = new URL(cfg.baseUrl);

    // Parâmetros obrigatórios em todas as requisições
    // POST https://.../api/v1?key=KEY&account_id=ACCOUNT_ID&phone_id=PHONE_ID&action=message_send&send_date=...&text=...&chat_number=...
    url.searchParams.set("key", cfg.key);
    url.searchParams.set("account_id", cfg.accountId);
    url.searchParams.set("phone_id", cfg.phoneId);
    url.searchParams.set("action", "message_send");

    // Data / hora atual simples (YYYY-MM-DD HH:MM)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const sendDate = `${year}-${month}-${day} ${hour}:${minute}`;

    url.searchParams.set("send_date", sendDate);
    url.searchParams.set("text", text);
    url.searchParams.set("chat_number", to);

    const httpResult = await httpPost(url);

    let parsed: any = null;
    try {
      parsed = httpResult.body ? JSON.parse(httpResult.body) : null;
    } catch {
      // corpo não-JSON, segue bruto
    }

    const codeFromBody: number | undefined =
      parsed && typeof parsed.code === "number" ? parsed.code : undefined;

    const isSuccess =
      (httpResult.statusCode && httpResult.statusCode >= 200 && httpResult.statusCode < 300) ||
      codeFromBody === 201 ||
      parsed?.result === "success";

    return {
      success: isSuccess,
      statusCode: httpResult.statusCode,
      errorMessage: isSuccess
        ? null
        : `Falha ao enviar mensagem para ChatGuru (status ${httpResult.statusCode ?? "?"}, code ${
            codeFromBody ?? "?"
          }).`,
      rawResponseBody: parsed ?? httpResult.body,
      prepared: {
        url: url.toString(),
        method: "POST",
      },
    };
  } catch (err: any) {
    return {
      ...preparedBase,
      errorMessage: `Erro ao enviar mensagem para ChatGuru: ${String(err)}`,
    };
  }
}
