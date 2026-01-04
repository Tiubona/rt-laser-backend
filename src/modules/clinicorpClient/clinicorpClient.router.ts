// src/modules/clinicorpClient/clinicorpClient.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import {
  getClinicorpConfig,
  prepareClinicorpPatientLookupRequest,
  prepareClinicorpSchedulePreviewRequest,
  searchPatientOnClinicorp,
  checkScheduleOnClinicorp,
} from "./clinicorpClient.service";
import {
  ClinicorpPatientLookupInput,
  ClinicorpSchedulePreviewInput,
} from "./clinicorpClient.types";

export const clinicorpClientRouter = Router();

/**
 * GET /admin/clinicorp/info
 * Retorna informações de configuração do Clinicorp (sem expor o token).
 */
clinicorpClientRouter.get(
  "/info",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const config = getClinicorpConfig();

      return res.json({
        success: true,
        config: {
          baseUrl: config.baseUrl,
          apiTokenPresent: config.apiTokenPresent,
          enabled: config.enabled,
        },
      });
    } catch (err) {
      console.error("GET /admin/clinicorp/info error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);

/**
 * POST /admin/clinicorp/preview-patient
 * Monta a requisição que SERIA enviada para buscar paciente,
 * sem executar HTTP real.
 */
clinicorpClientRouter.post(
  "/preview-patient",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as Partial<ClinicorpPatientLookupInput>;

      if (!body.query || typeof body.query !== "string") {
        return res.status(400).json({
          success: false,
          error: "QUERY_REQUIRED",
          message:
            "Informe um identificador para busca (CPF, e-mail, telefone, etc.).",
        });
      }

      const prepared = prepareClinicorpPatientLookupRequest({
        query: body.query.trim(),
      });

      return res.json({
        success: true,
        preparedRequest: prepared,
      });
    } catch (err: any) {
      console.error(
        "POST /admin/clinicorp/preview-patient error:",
        err
      );
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message:
          err?.message ||
          "Erro ao preparar requisição de busca de paciente Clinicorp.",
      });
    }
  }
);

/**
 * POST /admin/clinicorp/preview-schedule
 * Monta a requisição que SERIA enviada para consultar agenda/disponibilidade,
 * sem executar HTTP real.
 */
clinicorpClientRouter.post(
  "/preview-schedule",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as Partial<ClinicorpSchedulePreviewInput>;

      const prepared = prepareClinicorpSchedulePreviewRequest({
        date: body.date,
        professionalId: body.professionalId,
        serviceId: body.serviceId,
      });

      return res.json({
        success: true,
        preparedRequest: prepared,
      });
    } catch (err: any) {
      console.error(
        "POST /admin/clinicorp/preview-schedule error:",
        err
      );
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message:
          err?.message ||
          "Erro ao preparar requisição de agenda Clinicorp.",
      });
    }
  }
);

/**
 * POST /admin/clinicorp/search-patient
 * Busca REAL de paciente no Clinicorp (admin-only).
 */
clinicorpClientRouter.post(
  "/search-patient",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as Partial<ClinicorpPatientLookupInput>;

      if (!body.query || typeof body.query !== "string") {
        return res.status(400).json({
          success: false,
          error: "QUERY_REQUIRED",
          message:
            "Informe um identificador para busca (CPF, e-mail, telefone, etc.).",
        });
      }

      const result = await searchPatientOnClinicorp({
        query: body.query.trim(),
      });

      return res.status(result.success ? 200 : 502).json({
        success: result.success,
        statusCode: result.statusCode,
        errorMessage: result.errorMessage,
        preparedRequest: result.prepared,
        rawResponseBody: result.rawResponseBody,
      });
    } catch (err: any) {
      console.error(
        "POST /admin/clinicorp/search-patient error:",
        err
      );
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message:
          err?.message ||
          "Erro inesperado ao tentar buscar paciente no Clinicorp.",
      });
    }
  }
);

/**
 * POST /admin/clinicorp/check-schedule
 * Consulta REAL de agenda/disponibilidade no Clinicorp (admin-only).
 */
clinicorpClientRouter.post(
  "/check-schedule",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as Partial<ClinicorpSchedulePreviewInput>;

      const result = await checkScheduleOnClinicorp({
        date: body.date,
        professionalId: body.professionalId,
        serviceId: body.serviceId,
      });

      return res.status(result.success ? 200 : 502).json({
        success: result.success,
        statusCode: result.statusCode,
        errorMessage: result.errorMessage,
        preparedRequest: result.prepared,
        rawResponseBody: result.rawResponseBody,
      });
    } catch (err: any) {
      console.error(
        "POST /admin/clinicorp/check-schedule error:",
        err
      );
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message:
          err?.message ||
          "Erro inesperado ao tentar consultar agenda no Clinicorp.",
      });
    }
  }
);
