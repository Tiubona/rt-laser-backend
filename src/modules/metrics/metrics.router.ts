// src/modules/metrics/metrics.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import { getWebhookMetricsSummary } from "./metrics.service";

export const metricsRouter = Router();

/**
 * GET /admin/metrics/summary
 * Retorna um resumo de métricas do webhook.
 */
metricsRouter.get(
  "/summary",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = await getWebhookMetricsSummary();
      return res.json({
        success: true,
        summary,
      });
    } catch (err) {
      console.error("GET /admin/metrics/summary error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);
