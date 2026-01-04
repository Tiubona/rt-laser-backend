// src/modules/chatguruClient/chatguruClient.types.ts

export interface ChatGuruConfigInfo {
  baseUrl: string | null;
  apiTokenPresent: boolean;
  enabled: boolean;
}

export interface ChatGuruSendTextMessageInput {
  to: string;
  text: string;
  previewOnly?: boolean;
}

/**
 * Representa como seria a requisição HTTP para o ChatGuru.
 */
export interface ChatGuruPreparedRequest {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: any;
}

/**
 * Resultado de uma tentativa de envio de mensagem de texto real
 * via ChatGuru.
 */
export interface ChatGuruSendTextMessageResult {
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  rawResponseBody?: any;
  prepared: ChatGuruPreparedRequest;
}
