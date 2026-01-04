// src/modules/intentsAdmin/intentsAdmin.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import { INTENTS_DEFINITIONS } from "./intentsAdmin.data";

export const intentsAdminRouter = Router();

/**
 * GET /admin/intents
 * Lista todas as intents conhecidas pelo robô, com ação padrão e descrição.
 */
intentsAdminRouter.get(
  "/",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      return res.json({
        success: true,
        total: INTENTS_DEFINITIONS.length,
        intents: INTENTS_DEFINITIONS,
      });
    } catch (err) {
      console.error("GET /admin/intents error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);
