// src/modules/intents/intents.map.ts

import { IntentConfig, IntentName } from "./intents.types";

const INTENTS_CONFIG_MAP: Record<IntentName, IntentConfig> = {
  SAUDACAO: {
    name: "SAUDACAO",
    defaultActionType: "RESPOSTA_PADRAO_SAUDACAO",
    description: "Saudação inicial e apresentação do robô RT Laser.",
    allowAutoInMisto: true,
  },
  ORCAMENTO_REMOVER_TATUAGEM: {
    name: "ORCAMENTO_REMOVER_TATUAGEM",
    defaultActionType: "ORIENTAR_ORCAMENTO_TATUAGEM",
    description:
      "Cliente buscando orçamento ou informações para remoção de tatuagem.",
    allowAutoInMisto: true,
  },
  ORCAMENTO_REMOVER_MICRO: {
    name: "ORCAMENTO_REMOVER_MICRO",
    defaultActionType: "ORIENTAR_ORCAMENTO_MICRO",
    description:
      "Cliente buscando orçamento ou informações para remoção de micropigmentação de sobrancelhas.",
    allowAutoInMisto: true,
  },
  DOR_MEDO: {
    name: "DOR_MEDO",
    defaultActionType: "ACOLHER_MEDO_DOR",
    description:
      "Cliente com medo de dor, cicatriz ou consequências do procedimento.",
    allowAutoInMisto: false,
  },
  INFORMACAO_PROCEDIMENTO: {
    name: "INFORMACAO_PROCEDIMENTO",
    defaultActionType: "EXPLICAR_PROCEDIMENTO",
    description:
      "Cliente pedindo explicação geral de como funciona o procedimento, sessões e resultados.",
    allowAutoInMisto: false,
  },
  FALLBACK: {
    name: "FALLBACK",
    defaultActionType: "FALLBACK_ATENDIMENTO",
    description:
      "Quando o texto não se encaixa claramente em nenhuma intent conhecida.",
    allowAutoInMisto: false,
  },
};

export function getIntentConfig(name: IntentName): IntentConfig {
  return INTENTS_CONFIG_MAP[name];
}

export function getAllIntentConfigs(): IntentConfig[] {
  return Object.values(INTENTS_CONFIG_MAP);
}
