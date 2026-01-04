// src/modules/scheduling/scheduling.service.ts

import {
  SchedulingIntentName,
  SchedulingProbeConfig,
  SchedulingProbeResult,
} from "./scheduling.types";
import {
  getClinicorpConfig,
  checkScheduleOnClinicorp,
} from "../clinicorpClient/clinicorpClient.service";

/**
 * Lista de intents que serão tratadas como "pedido de agendamento".
 * Ajuste conforme as intents realmente cadastradas no IntentsHandler.
 */
const SCHEDULING_INTENTS: SchedulingIntentName[] = [
  "AGENDAR_AVALIACAO_TATUAGEM",
  "AGENDAR_AVALIACAO_MICRO",
  "AGENDAR_AVALIACAO_GERAL",
  "AGENDAR_RETORNO",
  "AGENDAR_OUTRO",
];

/**
 * Verifica se um determinado nome de intent é considerada de agendamento.
 */
export function isSchedulingIntent(
  intentName: string | null
): intentName is SchedulingIntentName {
  if (!intentName) return false;
  return SCHEDULING_INTENTS.includes(
    intentName as SchedulingIntentName
  );
}

/**
 * Lê do .env uma configuração padrão para o probe de agenda.
 *
 * Variáveis opcionais:
 * - CLINICORP_SCHED_DEFAULT_PROFESSIONAL_ID
 * - CLINICORP_SCHED_DEFAULT_SERVICE_ID
 */
function getSchedulingProbeConfigFromEnv(): SchedulingProbeConfig {
  const defaultProfessionalId =
    process.env.CLINICORP_SCHED_DEFAULT_PROFESSIONAL_ID || "";
  const defaultServiceId =
    process.env.CLINICORP_SCHED_DEFAULT_SERVICE_ID || "";

  return {
    defaultProfessionalId: defaultProfessionalId || null,
    defaultServiceId: defaultServiceId || null,
  };
}

/**
 * Realiza um "probe" de agenda no Clinicorp para intents de agendamento.
 *
 * NÍVEL 1 (semi-automático interno):
 * - Não muda a resposta ao cliente.
 * - Apenas consulta a agenda (se habilitado) e registra o resultado
 *   em logs administrativos para orientar a equipe humana.
 *
 * Controle por .env:
 * - CLINICORP_SCHEDULING_PROBE_ENABLED=true
 * - CLINICORP_API_ENABLED=true (+ baseUrl + token)
 */
export async function probeClinicorpScheduleForIntent(
  intentName: string | null
): Promise<SchedulingProbeResult | null> {
  // Se a intent nem for de agendamento, não faz nada.
  if (!isSchedulingIntent(intentName)) {
    return null;
  }

  const probeEnabledEnv =
    (process.env.CLINICORP_SCHEDULING_PROBE_ENABLED || "")
      .trim()
      .toLowerCase() === "true";

  const clinicorpConfig = getClinicorpConfig();
  const schedConfig = getSchedulingProbeConfigFromEnv();

  const baseResult: SchedulingProbeResult = {
    enabled: probeEnabledEnv,
    clinicorpEnabled: clinicorpConfig.enabled,
    intentName: intentName,
    requested: {
      date: null,
      professionalId: schedConfig.defaultProfessionalId || null,
      serviceId: schedConfig.defaultServiceId || null,
    },
    clinicorpCall: null,
    errorMessage: undefined,
  };

  if (!probeEnabledEnv) {
    return {
      ...baseResult,
      errorMessage:
        "Probe de agendamento desabilitado (CLINICORP_SCHEDULING_PROBE_ENABLED != true).",
    };
  }

  if (!clinicorpConfig.enabled) {
    return {
      ...baseResult,
      errorMessage:
        "Clinicorp API não habilitada ou configuração incompleta (ver CLINICORP_API_ENABLED / BASE_URL / TOKEN).",
    };
  }

  try {
    const result = await checkScheduleOnClinicorp({
      date: undefined, // futuro: podemos ajustar para datas preferidas do cliente
      professionalId: schedConfig.defaultProfessionalId || undefined,
      serviceId: schedConfig.defaultServiceId || undefined,
    });

    return {
      ...baseResult,
      clinicorpCall: result,
      errorMessage: result.success ? undefined : result.errorMessage,
    };
  } catch (err: any) {
    return {
      ...baseResult,
      errorMessage:
        err?.message ||
        "Erro inesperado ao consultar agenda no Clinicorp (probe de agendamento).",
    };
  }
}
