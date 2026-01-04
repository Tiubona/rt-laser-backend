// src/modules/intents/intents.responses.ts

import { IntentName } from "./intents.types";
import {
  buildTextFromPlaybook,
  getPlaybookByIntentName,
} from "../playbooks/playbooks.service";
import {
  BotPersonaId,
  choosePersonaByBusinessHours,
} from "./botPersonas";

interface BuildReplyParams {
  text: string;
  contactName?: string | null;
}

/**
 * Decide se estamos em horário de expediente ou não.
 * Por enquanto usamos apenas o horário local do servidor.
 * Opcionalmente, você pode ajustar via variáveis de ambiente:
 * - BUSINESS_START_HOUR (0–23)
 * - BUSINESS_END_HOUR   (0–23)
 */
function isBusinessHoursNow(): boolean {
  const now = new Date();
  const hour = now.getHours();

  const start =
    process.env.BUSINESS_START_HOUR !== undefined
      ? Number(process.env.BUSINESS_START_HOUR)
      : 9;
  const end =
    process.env.BUSINESS_END_HOUR !== undefined
      ? Number(process.env.BUSINESS_END_HOUR)
      : 18;

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return hour >= 9 && hour < 18;
  }

  return hour >= start && hour < end;
}

/**
 * Monta uma saudação personalizada para Júlia ou Laura.
 */
function buildGreetingForPersona(
  personaId: BotPersonaId,
  params: BuildReplyParams
): string {
  const firstName = params.contactName?.trim();
  const namePart = firstName ? `, ${firstName}` : "";

  const isBusinessHours = isBusinessHoursNow();

  if (personaId === "JULIA") {
    // Júlia – expediente
    return [
      `Oi${namePart}, tudo bem? 😊`,
      `Aqui é a Júlia, assistente virtual da RT Laser.`,
      `Eu te atendo por aqui durante o horário de expediente para facilitar seu atendimento.`,
      `Me conta: você quer falar sobre remoção de tatuagem, sobrancelha ou tem alguma dúvida específica?`,
    ].join(" ");
  }

  // Laura – fora de expediente
  if (!isBusinessHours) {
    return [
      `Oi${namePart}, tudo bem? 🌙`,
      `Aqui é a Laura, assistente virtual da RT Laser.`,
      `Agora estamos fora do horário de atendimento, mas a sua mensagem já ficou registrada aqui.`,
      `Assim que nossa equipe voltar, vamos olhar com carinho e te responder com as melhores opções pra você, combinado?`,
    ].join(" ");
  }

  // Fallback neutro (caso algo fuja da regra)
  return [
    `Oi${namePart}, aqui é a equipe virtual da RT Laser.`,
    `Recebi sua mensagem e estou aqui pra te ajudar da melhor forma possível.`,
  ].join(" ");
}

/**
 * Gera respostas de texto padrão para cada intent,
 * usando a camada de playbooks como fonte principal.
 *
 * Se houver playbook configurado para a intent, ele tem prioridade.
 * Caso contrário, caímos no switch com textos padrão.
 */
export function buildReplyForIntent(
  intentName: IntentName,
  params: BuildReplyParams
): string {
  const playbook = getPlaybookByIntentName(intentName);
  if (playbook) {
    const fromPlaybook = buildTextFromPlaybook(playbook, {
      text: params.text,
      contactName: params.contactName,
    });

    if (fromPlaybook && fromPlaybook.trim().length > 0) {
      return fromPlaybook;
    }
  }

  switch (intentName) {
    case "SAUDACAO": {
      const isBusinessHours = isBusinessHoursNow();
      const personaId = choosePersonaByBusinessHours(isBusinessHours);
      return buildGreetingForPersona(personaId, params);
    }

    case "ORCAMENTO_REMOVER_TATUAGEM":
      return (
        "Vamos falar da sua tatuagem. Para te dar uma orientação melhor, " +
        "me manda por favor: fotos da tatuagem, local do corpo, cores que ela tem " +
        "e há quanto tempo você fez. Assim eu já consegue te explicar como funciona " +
        "o processo de remoção aqui na RT Laser."
      );

    case "ORCAMENTO_REMOVER_MICRO":
      return (
        "Vamos falar da sua sobrancelha. Me envia fotos de perto e de frente, " +
        "me conta há quanto tempo você fez a micro e se já fez algum retoque. " +
        "Com isso eu consigo te orientar melhor sobre as sessões de remoção."
      );

    case "DOR_MEDO":
      return (
        "Entendo seu medo, é super comum. A tecnologia de laser que usamos hoje " +
        "é segura, e a sensação costuma lembrar pequenas borrachinhas estalando na pele. " +
        "Em muitos casos usamos recursos para deixar o procedimento mais confortável. " +
        "Se você quiser, posso te explicar passo a passo como funciona aqui na RT Laser."
      );

    case "INFORMACAO_PROCEDIMENTO":
      return (
        "A remoção é feita em sessões com laser específico para pigmento. " +
        "O intervalo entre as sessões e a quantidade total depende de fatores como " +
        "cor, profundidade e o tempo da tatuagem ou da micro. " +
        "Se você me mandar fotos, consigo te explicar com mais precisão como seria no seu caso."
      );

    case "FALLBACK":
    default:
      return (
        "Não entendi bem sua mensagem para responder automaticamente sem risco de erro. " +
        "Vou encaminhar para atendimento humano te ajudar melhor, tudo bem?"
      );
  }
}
