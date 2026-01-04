// src/modules/scheduling/scheduling.types.ts

import { ClinicorpHttpResult } from "../clinicorpClient/clinicorpClient.types";

/**
 * Intents relacionadas a agendamento que o robô deve tratar
 * como "pedido de agenda" para fins de integração com Clinicorp.
 *
 * Ajuste / amplie essa lista conforme as intents configuradas
 * no IntentsHandler.
 */
export type SchedulingIntentName =
  | "AGENDAR_AVALIACAO_TATUAGEM"
  | "AGENDAR_AVALIACAO_MICRO"
  | "AGENDAR_AVALIACAO_GERAL"
  | "AGENDAR_RETORNO"
  | "AGENDAR_OUTRO";

export interface SchedulingProbeConfig {
  defaultProfessionalId?: string | null;
  defaultServiceId?: string | null;
}

/**
 * Resultado do "probe" de agenda no Clinicorp.
 * Fica registrado em logs administrativos para uso da equipe.
 */
export interface SchedulingProbeResult {
  enabled: boolean;
  clinicorpEnabled: boolean;
  intentName: string | null;
  requested: {
    date?: string | null;
    professionalId?: string | null;
    serviceId?: string | null;
  };
  clinicorpCall?: ClinicorpHttpResult | null;
  errorMessage?: string;
}
