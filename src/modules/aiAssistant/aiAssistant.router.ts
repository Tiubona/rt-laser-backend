// src/modules/aiAssistant/aiAssistant.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import {
  AiAssistantRequest,
  AiAssistantResponse,
} from "./aiAssistant.types";
import { generateAiAssistantResponse } from "./aiAssistant.service";

export const aiAssistantRouter = Router();

/**
 * POST /admin/ai/preview
 * Gera uma resposta simulada da "IA híbrida" para uso em laboratório.
 * Não impacta o webhook oficial e não grava nada em banco.
 */
aiAssistantRouter.post(
  "/preview",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as AiAssistantRequest;

      if (!body.text || !body.text.trim()) {
        return res.status(400).json({
          success: false,
          error: "TEXT_REQUIRED",
          message: "Informe um texto para gerar uma resposta da IA.",
        });
      }

      const result: AiAssistantResponse =
        await generateAiAssistantResponse(body);

      return res.json({
        success: true,
        result,
      });
    } catch (err) {
      console.error("POST /admin/ai/preview error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);
