// src/modules/playbooks/playbooks.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import { listPlaybooks, getPlaybookById } from "./playbooks.service";

export const playbooksRouter = Router();

/**
 * GET /admin/playbooks
 * Lista todos os playbooks disponíveis.
 */
playbooksRouter.get(
  "/",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = listPlaybooks();
      return res.json({
        success: true,
        total: result.length,
        playbooks: result,
      });
    } catch (err) {
      console.error("GET /admin/playbooks error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);

/**
 * GET /admin/playbooks/:id
 * Detalhe de um playbook específico.
 */
playbooksRouter.get(
  "/:id",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id;
      const playbook = getPlaybookById(id);

      if (!playbook) {
        return res.status(404).json({
          success: false,
          error: "PLAYBOOK_NOT_FOUND",
        });
      }

      return res.json({
        success: true,
        playbook,
      });
    } catch (err) {
      console.error("GET /admin/playbooks/:id error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);
