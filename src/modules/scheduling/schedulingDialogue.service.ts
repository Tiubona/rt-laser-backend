// src/modules/scheduling/schedulingDialogue.service.ts

import { isSchedulingIntent } from "./scheduling.service";

export interface FirstSchedulingQuestionResult {
  enabled: boolean;
  shouldAsk: boolean;
  questionText: string | null;
  reason?: string;
}

/**
 * Decide se o robô deve enviar a PRIMEIRA pergunta automática
 * em fluxos de agendamento.
 *
 * Segurança do Nível 3:
 * - NÃO confirma horário.
 * - NÃO manda mais de uma pergunta.
 * - Pergunta só quando permitido via config + intent.
 */
export function decideFirstSchedulingQuestion(
  intentName: string | null
): FirstSchedulingQuestionResult {
  const enabled =
    (process.env.SCHEDULING_FIRST_QUESTION_ENABLED || "")
      .trim()
      .toLowerCase() === "true";

  const defaultText =
    process.env.SCHEDULING_FIRST_QUESTION_TEXT ||
    "Perfeito! Para agilizar seu atendimento, qual é o melhor dia e período para você? Manhã, tarde ou noite?";

  if (!enabled) {
    return {
      enabled,
      shouldAsk: false,
      questionText: null,
      reason: "Envio automático da primeira pergunta está desativado.",
    };
  }

  if (!isSchedulingIntent(intentName)) {
    return {
      enabled,
      shouldAsk: false,
      questionText: null,
      reason: "A intenção não é de agendamento.",
    };
  }

  return {
    enabled,
    shouldAsk: true,
    questionText: defaultText,
  };
}
