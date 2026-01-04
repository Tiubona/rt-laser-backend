// src/modules/admin/admin.personas.router.ts
import { Router, Request, Response } from "express";
import {
  personasConfig,
  PersonasConfig
} from "../config/personas.config";

export const adminPersonasRouter = Router();

/**
 * GET /admin/personas
 * Devolve toda config de personas (Júlia/Laura + horários + feriados)
 */
adminPersonasRouter.get("/", (req: Request, res: Response) => {
  return res.json(personasConfig);
});

/**
 * PUT /admin/personas
 * Permite atualizar HORÁRIOS e FERIADOS via painel.
 * (não vamos deixar o painel mexer nos textos da Júlia/Laura por enquanto)
 */
adminPersonasRouter.put("/", (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<PersonasConfig>;

    if (body.schedules) {
      personasConfig.schedules = body.schedules;
    }

    if (body.holidayOverrides) {
      personasConfig.holidayOverrides = body.holidayOverrides;
    }

    return res.json(personasConfig);
  } catch (error: any) {
    console.error("Erro ao atualizar personasConfig:", error?.message || error);
    return res.status(500).json({
      message: "Erro ao atualizar configuração de personas."
    });
  }
});
