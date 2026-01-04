// src/modules/limitsAdmin/limitsAdmin.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import { getConfiguredAutoReplyLimit } from "../limits/autoReplyLimiter";

export const limitsAdminRouter = Router();

/**
 * GET /admin/limits/info
 * Retorna as configurações atuais de limite de auto-respostas.
 */
limitsAdminRouter.get(
  "/info",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const maxAutoRepliesPerContactPerDay = getConfiguredAutoReplyLimit();

      return res.json({
        success: true,
        maxAutoRepliesPerContactPerDay,
        source: process.env.AUTO_REPLY_LIMIT_PER_CONTACT_PER_DAY
          ? "ENV"
          : "DEFAULT",
      });
    } catch (err) {
      console.error("GET /admin/limits/info error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);
