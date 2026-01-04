// src/modules/uraScenariosAdmin/uraScenariosAdmin.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import { prisma } from "../../database/prismaClient";

export const uraScenariosAdminRouter = Router();

// Todas as rotas exigem admin logado
uraScenariosAdminRouter.use(requireAdminAuth);

/**
 * GET /admin/ura-scenarios
 * Lista todos os cenários cadastrados.
 */
uraScenariosAdminRouter.get(
  "/",
  async (req: AuthenticatedRequest, res: Response) => {
    const items = await prisma.chatScenario.findMany({
      orderBy: { id: "asc" },
    });

    return res.json({
      success: true,
      items,
    });
  }
);

/**
 * POST /admin/ura-scenarios
 * Cria um novo cenário.
 */
uraScenariosAdminRouter.post(
  "/",
  async (req: AuthenticatedRequest, res: Response) => {
    const { name, uraKey, description, aiInstructions, defaultNextUra, active } =
      req.body as {
        name: string;
        uraKey: string;
        description?: string;
        aiInstructions: string;
        defaultNextUra?: string;
        active?: boolean;
      };

    if (!name || !uraKey || !aiInstructions) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message:
          "Campos 'name', 'uraKey' e 'aiInstructions' são obrigatórios.",
      });
    }

    const created = await prisma.chatScenario.create({
      data: {
        name,
        uraKey,
        description: description || null,
        aiInstructions,
        defaultNextUra: defaultNextUra || null,
        active: active ?? true,
      },
    });

    return res.status(201).json({
      success: true,
      item: created,
    });
  }
);

/**
 * PUT /admin/ura-scenarios/:id
 * Atualiza um cenário existente.
 */
uraScenariosAdminRouter.put(
  "/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id || 0);
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_ID",
        message: "ID inválido para cenário.",
      });
    }

    const { name, uraKey, description, aiInstructions, defaultNextUra, active } =
      req.body as {
        name?: string;
        uraKey?: string;
        description?: string;
        aiInstructions?: string;
        defaultNextUra?: string;
        active?: boolean;
      };

    const existing = await prisma.chatScenario.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Cenário não encontrado.",
      });
    }

    const updated = await prisma.chatScenario.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        uraKey: uraKey ?? existing.uraKey,
        description: description ?? existing.description,
        aiInstructions: aiInstructions ?? existing.aiInstructions,
        defaultNextUra: defaultNextUra ?? existing.defaultNextUra,
        active: typeof active === "boolean" ? active : existing.active,
      },
    });

    return res.json({
      success: true,
      item: updated,
    });
  }
);

/**
 * DELETE /admin/ura-scenarios/:id
 * Remove um cenário.
 */
uraScenariosAdminRouter.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id || 0);
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_ID",
        message: "ID inválido para cenário.",
      });
    }

    await prisma.chatScenario.delete({
      where: { id },
    });

    return res.status(204).send();
  }
);
