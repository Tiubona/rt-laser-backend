// src/modules/reportsAdmin/reportsAdmin.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import { getReportsSummary } from "./reportsAdmin.service";

export const reportsAdminRouter = Router();

/**
 * GET /admin/reports/summary?days=7
 * Retorna um resumo de mensagens, intents e erros no período.
 */
reportsAdminRouter.get(
  "/summary",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const daysParam = req.query.days;
      const days = daysParam ? Number(daysParam) : 7;

      const summary = await getReportsSummary(days);

      return res.json({
        success: true,
        summary,
      });
    } catch (err) {
      console.error("GET /admin/reports/summary error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);
