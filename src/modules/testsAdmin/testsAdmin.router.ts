// src/modules/testsAdmin/testsAdmin.router.ts

import { Router, Response } from "express";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "../auth/auth.middleware";
import { getRobotConfigDto } from "../config/config.service";
import { RobotConfigDTO } from "../config/config.types";
import { IntentsHandler } from "../intents/intents.handler";
import {
  TestSimulateRequestBody,
  TestSimulateResult,
  TestDecision,
} from "./testsAdmin.types";

export const testsAdminRouter = Router();

/**
 * Converte "HH:mm" em minutos desde 00:00.
 */
function parseTimeToMinutes(time: string | undefined | null): number | null {
  if (!time || typeof time !== "string") return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (isNaN(hour) || isNaN(minute)) return null;
  return hour * 60 + minute;
}

/**
 * Retorna o horário em minutos usado para comparação:
 * - Se debugTime for válido → usa ele.
 * - Senão → horário atual do servidor.
 */
function getNowMinutesForComparison(debugTime?: string): number {
  if (debugTime) {
    const m = parseTimeToMinutes(debugTime);
    if (m !== null) return m;
  }

  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Verifica se está FORA do horário de atendimento, considerando
 * início/fim que podem cruzar a meia-noite.
 */
function isOutsideSchedule(config: RobotConfigDTO, nowMinutes: number): boolean {
  const startMinutes =
    parseTimeToMinutes(config.horarioInicio) ?? parseTimeToMinutes("08:00")!;
  const endMinutes =
    parseTimeToMinutes(config.horarioFim) ?? parseTimeToMinutes("20:00")!;

  if (startMinutes === endMinutes) {
    // Se for igual, consideramos "sempre dentro"
    return false;
  }

  if (startMinutes < endMinutes) {
    // Janela normal no mesmo dia
    return nowMinutes < startMinutes || nowMinutes > endMinutes;
  }

  // Janela que cruza meia-noite (ex.: 20:00–06:00)
  return nowMinutes > endMinutes && nowMinutes < startMinutes;
}

/**
 * POST /admin/tests/simulate
 * Simula o comportamento do robô sem gravar nada em banco,
 * retornando análise de intent, decisão e resposta sugerida.
 */
testsAdminRouter.post(
  "/simulate",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as TestSimulateRequestBody;

      if (!body.text || !body.text.trim()) {
        return res.status(400).json({
          success: false,
          error: "TEXT_REQUIRED",
          message: "Informe um texto para simulação.",
        });
      }

      const config = await getRobotConfigDto();
      const nowMinutes = getNowMinutesForComparison(body.debugTime);
      const outsideSchedule = isOutsideSchedule(config, nowMinutes);

      let analysis: any | null = null;
      let decision: TestDecision = {
        handoffToHuman: false,
        reply: null,
        mode: config.atendimentoMode,
      };

      if (!config.robotEnabled) {
        decision = {
          handoffToHuman: true,
          reply: null,
          mode: config.atendimentoMode,
          reason: "Robô desligado na configuração.",
        };
      } else if (outsideSchedule) {
        decision = {
          handoffToHuman: true,
          reply: null,
          mode: config.atendimentoMode,
          reason: "Fora do horário de atendimento configurado.",
        };
      } else {
        // Robô ligado e dentro do horário → rodar motor de intents
        analysis = await IntentsHandler.analyzeText(
          body.text,
          body.contactName
        );

        if (!analysis.intent) {
          decision = {
            handoffToHuman: true,
            reply: null,
            mode: config.atendimentoMode,
            reason: "Não foi possível identificar claramente a intenção.",
          };
        } else {
          const mode = config.atendimentoMode;
          const intentName: string = analysis.intent.name;

          if (mode === "HUMANO") {
            decision = {
              handoffToHuman: true,
              reply: null,
              mode,
              reason: "Modo HUMANO: sempre encaminhar para atendente.",
            };
          } else if (mode === "AUTO") {
            decision = {
              handoffToHuman: false,
              reply: analysis.responseSuggested?.text ?? null,
              mode,
            };
          } else if (mode === "MISTO") {
            const intentsAutoInMisto = [
              "SAUDACAO",
              "ORCAMENTO_REMOVER_TATUAGEM",
              "ORCAMENTO_REMOVER_MICRO",
            ];

            if (intentsAutoInMisto.includes(intentName)) {
              decision = {
                handoffToHuman: false,
                reply: analysis.responseSuggested?.text ?? null,
                mode,
              };
            } else {
              decision = {
                handoffToHuman: true,
                reply: null,
                mode,
                reason:
                  "Modo MISTO: esta intenção é encaminhada para atendimento humano.",
              };
            }
          } else {
            decision = {
              handoffToHuman: true,
              reply: null,
              mode,
              reason:
                "Modo de atendimento desconhecido. Encaminhado para humano.",
            };
          }
        }
      }

      const result: TestSimulateResult = {
        configSnapshot: config,
        nowMinutesUsed: nowMinutes,
        outsideSchedule,
        analysis,
        decision,
      };

      return res.json({
        success: true,
        result,
      });
    } catch (err) {
      console.error("POST /admin/tests/simulate error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);
