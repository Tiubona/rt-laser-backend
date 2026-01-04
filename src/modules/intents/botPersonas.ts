// src/modules/intents/botPersonas.ts

export type BotPersonaId = "JULIA" | "LAURA";

export interface BotPersona {
  id: BotPersonaId;
  /**
   * Nome completo que aparece para o cliente.
   * Ex: "Júlia, assistente virtual da RT Laser"
   */
  displayName: string;
  /**
   * Nome curto usado no texto.
   * Ex: "Júlia" ou "Laura"
   */
  shortName: string;
  /**
   * Descrição interna da persona (para IA, logs, etc.).
   */
  description: string;
  /**
   * Tipo de atendimento principal da persona.
   * JULIA -> "expediente"
   * LAURA -> "fora-expediente"
   */
  mode: "expediente" | "fora-expediente";
}

export const BOT_PERSONAS: Record<BotPersonaId, BotPersona> = {
  JULIA: {
    id: "JULIA",
    displayName: "Júlia, assistente virtual da RT Laser",
    shortName: "Júlia",
    description:
      "Atende clientes durante o horário de expediente, com linguagem acolhedora, direta e profissional, ajudando em dúvidas, orçamentos e primeiros contatos.",
    mode: "expediente",
  },
  LAURA: {
    id: "LAURA",
    displayName: "Laura, assistente virtual da RT Laser",
    shortName: "Laura",
    description:
      "Atende clientes fora do horário de expediente, acolhe a mensagem, organiza as informações e orienta sobre o retorno no próximo horário de atendimento.",
    mode: "fora-expediente",
  },
};

/**
 * Decide qual persona deve ser usada com base se está ou não em horário de expediente.
 *
 * Regra simples:
 * - isBusinessHours = true  -> JULIA
 * - isBusinessHours = false -> LAURA
 */
export function choosePersonaByBusinessHours(
  isBusinessHours: boolean
): BotPersonaId {
  return isBusinessHours ? "JULIA" : "LAURA";
}
