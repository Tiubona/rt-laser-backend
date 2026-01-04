// src/modules/emergency/emergency.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import {
  createEmergencyEmailDTO,
  deleteEmergencyEmailDTO,
  listEmergencyEmailsDTO,
  sendEmergencyAlert,
} from "./emergency.service";
import {
  CreateEmergencyEmailBody,
  EmergencyAlertBody,
} from "./emergency.types";

export const emergencyRouter = Router();

/**
 * GET /admin/emergency/emails
 * Lista todos os e-mails de emergência cadastrados.
 */
emergencyRouter.get(
  "/emails",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const emails = await listEmergencyEmailsDTO();
      return res.json({
        success: true,
        emails,
      });
    } catch (err) {
      console.error("GET /admin/emergency/emails error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);

/**
 * POST /admin/emergency/emails
 * Cria um novo e-mail de emergência.
 * Body: { name: string, email: string }
 */
emergencyRouter.post(
  "/emails",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, email } = req.body as CreateEmergencyEmailBody;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: "NAME_AND_EMAIL_REQUIRED",
        });
      }

      const created = await createEmergencyEmailDTO(name, email);

      return res.status(201).json({
        success: true,
        email: created,
      });
    } catch (err) {
      console.error("POST /admin/emergency/emails error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);

/**
 * DELETE /admin/emergency/emails/:id
 * Desativa (soft delete) um e-mail de emergência.
 */
emergencyRouter.delete(
  "/emails/:id",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (!id || Number.isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "INVALID_ID",
        });
      }

      const ok = await deleteEmergencyEmailDTO(id);

      if (!ok) {
        return res.status(404).json({
          success: false,
          error: "EMAIL_NOT_FOUND",
        });
      }

      return res.json({
        success: true,
      });
    } catch (err) {
      console.error("DELETE /admin/emergency/emails/:id error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);

/**
 * POST /admin/emergency/alert
 * Dispara um alerta para todos os e-mails ativos.
 * Body: { subject?: string, message: string }
 */
emergencyRouter.post(
  "/alert",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { subject, message } = req.body as EmergencyAlertBody;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: "MESSAGE_REQUIRED",
        });
      }

      const result = await sendEmergencyAlert({ subject, message });

      return res.json({
        success: result.success,
        sent: result.sent,
      });
    } catch (err) {
      console.error("POST /admin/emergency/alert error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);
