// src/modules/intentsAdmin/intentsAdmin.data.ts

import { IntentDefinitionDTO } from "./intentsAdmin.types";

/**
 * Lista estática de intents do robô RT Laser.
 * Baseada no desenho anterior (SAUDACAO, ORCAMENTO_REMOVER_TATUAGEM, etc.).
 * Pode ser expandida em fases futuras.
 */
export const INTENTS_DEFINITIONS: IntentDefinitionDTO[] = [
  {
    intentName: "SAUDACAO",
    defaultActionType: "RESPOSTA_PADRAO_SAUDACAO",
    description: "Saudação inicial e apresentação do robô RT Laser.",
  },
  {
    intentName: "ORCAMENTO_REMOVER_TATUAGEM",
    defaultActionType: "ORIENTAR_ORCAMENTO_TATUAGEM",
    description:
      "Cliente buscando orçamento ou informações sobre remoção de tatuagem.",
  },
  {
    intentName: "ORCAMENTO_REMOVER_MICRO",
    defaultActionType: "ORIENTAR_ORCAMENTO_MICRO",
    description:
      "Cliente buscando orçamento ou informações sobre remoção de micropigmentação.",
  },
  {
    intentName: "AGENDAMENTO",
    defaultActionType: "ENCAMINHAR_AGENDAMENTO",
    description:
      "Encaminhar para fluxo de agendamento (escolha de unidade, dia, horário e profissional).",
  },
  {
    intentName: "REMARCACAO",
    defaultActionType: "ENCAMINHAR_REMARCACAO",
    description:
      "Encaminhar para fluxo de remarcação, localizando o horário atual e oferecendo novas opções.",
  },
  {
    intentName: "CANCELAMENTO",
    defaultActionType: "ENCAMINHAR_CANCELAMENTO",
    description:
      "Encaminhar para fluxo de cancelamento, registrando motivo e aplicando regras da clínica.",
  },
  {
    intentName: "DOR_MEDO",
    defaultActionType: "ACOLHER_MEDO_DOR",
    description:
      "Responder de forma acolhedora, explicando sobre dor, conforto, segurança e tecnologia utilizada.",
  },
  {
    intentName: "INFORMACAO_PROCEDIMENTO",
    defaultActionType: "EXPLICAR_PROCEDIMENTO",
    description:
      "Explicar como funciona o procedimento, número de sessões, resultados esperados e cuidados.",
  },
  {
    intentName: "FALLBACK",
    defaultActionType: "FALLBACK_ATENDIMENTO",
    description:
      "Intenção de fallback quando o robô não entendeu bem. Deve responder de forma neutra e encaminhar, se necessário.",
  },
];
