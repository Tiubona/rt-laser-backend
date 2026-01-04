// src/modules/logs/logs.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import { listAdminLogsDTO } from "./logs.service";

export const logsRouter = Router();

/**
 * GET /admin/logs
 * Query params:
 *   - limit?: number (default 100, max 500)
 *   - type?: string (filtrar por tipo)
 */
logsRouter.get(
  "/",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limitParam = req.query.limit as string | undefined;
      const typeParam = req.query.type as string | undefined;

      let limit = 100;

      if (limitParam) {
        const parsed = Number(limitParam);
        if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 500) {
          limit = parsed;
        }
      }

      const logs = await listAdminLogsDTO(limit, typeParam || undefined);

      return res.json({
        success: true,
        logs,
      });
    } catch (err) {
      console.error("GET /admin/logs error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);
