// src/modules/config/config.service.ts

import { RobotConfig } from "@prisma/client";
import { configStore } from "./config.store";
import {
  AtendimentoMode,
  RobotConfigDTO,
  UpdateRobotConfigBody,
} from "./config.types";

const DEFAULT_INICIO = "08:00";
const DEFAULT_FIM = "20:00";
const DEFAULT_TZ = "America/Sao_Paulo";
const ALLOWED_MODES: AtendimentoMode[] = ["AUTO", "MISTO", "HUMANO"];

function mapToDTO(config: RobotConfig): RobotConfigDTO {
  return {
    id: config.id,
    robotEnabled: config.robotEnabled,
    atendimentoMode: config.atendimentoMode as AtendimentoMode,
    horarioInicio: config.horarioInicio,
    horarioFim: config.horarioFim,
    timezone: config.timezone,
    fallbackToHuman: config.fallbackToHuman,
    createdAt: config.createdAt?.toISOString?.() ?? undefined,
    updatedAt: config.updatedAt?.toISOString?.() ?? undefined,
  };
}

function sanitizeTime(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  // aqui poderíamos validar formato HH:MM; por enquanto aceitamos qualquer string básica
  return value;
}

function sanitizeTimezone(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value;
}

function sanitizeAtendimentoMode(
  value: AtendimentoMode | undefined,
  fallback: AtendimentoMode
): AtendimentoMode {
  if (!value) return fallback;
  if (!ALLOWED_MODES.includes(value)) return fallback;
  return value;
}

export async function getRobotConfigDto(): Promise<RobotConfigDTO> {
  const config = await configStore.getOrCreateConfig();
  return mapToDTO(config);
}

export async function updateRobotConfigFromBody(
  body: UpdateRobotConfigBody
): Promise<RobotConfigDTO> {
  const current = await configStore.getOrCreateConfig();

  const updated = await configStore.updateConfig({
    robotEnabled:
      typeof body.robotEnabled === "boolean"
        ? body.robotEnabled
        : current.robotEnabled,
    fallbackToHuman:
      typeof body.fallbackToHuman === "boolean"
        ? body.fallbackToHuman
        : current.fallbackToHuman,
    atendimentoMode: sanitizeAtendimentoMode(
      body.atendimentoMode,
      current.atendimentoMode as AtendimentoMode
    ),
    horarioInicio: sanitizeTime(body.horarioInicio, current.horarioInicio || DEFAULT_INICIO),
    horarioFim: sanitizeTime(body.horarioFim, current.horarioFim || DEFAULT_FIM),
    timezone: sanitizeTimezone(body.timezone, current.timezone || DEFAULT_TZ),
  });

  return mapToDTO(updated);
}
