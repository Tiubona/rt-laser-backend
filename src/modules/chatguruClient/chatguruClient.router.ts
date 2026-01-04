// src/modules/chatguruClient/chatguruClient.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import {
  getChatGuruConfig,
  prepareChatGuruSendTextMessage,
  sendTextMessageViaChatGuru,
} from "./chatguruClient.service";
import { ChatGuruSendTextMessageInput } from "./chatguruClient.types";

export const chatGuruClientRouter = Router();

/**
 * GET /admin/chatguru/info
 * Retorna informações de configuração do ChatGuru (sem expor o token).
 */
chatGuruClientRouter.get(
  "/info",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const config = getChatGuruConfig();

      return res.json({
        success: true,
        config: {
          baseUrl: config.baseUrl,
          apiTokenPresent: config.apiTokenPresent,
          enabled: config.enabled,
        },
      });
    } catch (err) {
      console.error("GET /admin/chatguru/info error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);

/**
 * POST /admin/chatguru/preview-text
 * Monta a requisição que SERIA enviada ao ChatGuru para mandar um texto,
 * mas NÃO executa o envio. Serve apenas para laboratório/configuração.
 */
chatGuruClientRouter.post(
  "/preview-text",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as Partial<ChatGuruSendTextMessageInput>;

      if (!body.to || typeof body.to !== "string") {
        return res.status(400).json({
          success: false,
          error: "TO_REQUIRED",
          message: "Informe o número/contato de destino (to).",
        });
      }

      if (!body.text || typeof body.text !== "string") {
        return res.status(400).json({
          success: false,
          error: "TEXT_REQUIRED",
          message: "Informe o texto da mensagem.",
        });
      }

      const prepared = prepareChatGuruSendTextMessage({
        to: body.to,
        text: body.text,
        previewOnly: true,
      });

      return res.json({
        success: true,
        preparedRequest: prepared,
      });
    } catch (err: any) {
      console.error("POST /admin/chatguru/preview-text error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: err?.message || "Erro ao preparar requisição para ChatGuru.",
      });
    }
  }
);

/**
 * POST /admin/chatguru/send-text
 * Tenta ENVIAR de fato uma mensagem de texto via ChatGuru.
 * Continua sendo um endpoint somente admin (teste/validação).
 * O webhook oficial AINDA NÃO usa este envio automático.
 */
chatGuruClientRouter.post(
  "/send-text",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as Partial<ChatGuruSendTextMessageInput>;

      if (!body.to || typeof body.to !== "string") {
        return res.status(400).json({
          success: false,
          error: "TO_REQUIRED",
          message: "Informe o número/contato de destino (to).",
        });
      }

      if (!body.text || typeof body.text !== "string") {
        return res.status(400).json({
          success: false,
          error: "TEXT_REQUIRED",
          message: "Informe o texto da mensagem.",
        });
      }

      const result = await sendTextMessageViaChatGuru({
        to: body.to,
        text: body.text,
      });

      return res.status(result.success ? 200 : 502).json({
        success: result.success,
        statusCode: result.statusCode,
        errorMessage: result.errorMessage,
        preparedRequest: result.prepared,
        rawResponseBody: result.rawResponseBody,
      });
    } catch (err: any) {
      console.error("POST /admin/chatguru/send-text error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message:
          err?.message ||
          "Erro inesperado ao tentar enviar mensagem via ChatGuru.",
      });
    }
  }
);
