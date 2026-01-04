// src/modules/config/config.router.ts

import { Router, Response } from "express";
import { AuthenticatedRequest, requireAdminAuth } from "../auth/auth.middleware";
import {
  getRobotConfigDto,
  updateRobotConfigFromBody,
} from "./config.service";
import { UpdateRobotConfigBody } from "./config.types";

export const configRouter = Router();

/**
 * GET /admin/config
 * Retorna a configuração atual do robô.
 * Se não existir no banco, cria com valores padrão.
 */
configRouter.get(
  "/",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto = await getRobotConfigDto();
      return res.json({
        success: true,
        config: dto,
      });
    } catch (err) {
      console.error("GET /admin/config error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);

/**
 * PUT /admin/config
 * Atualiza a configuração do robô com base no body enviado.
 */
configRouter.put(
  "/",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as UpdateRobotConfigBody;

      const updated = await updateRobotConfigFromBody(body);

      return res.json({
        success: true,
        config: updated,
      });
    } catch (err) {
      console.error("PUT /admin/config error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);
