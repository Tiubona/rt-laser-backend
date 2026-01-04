// src/modules/intents/intents.engine.ts

import {
  IntentAnalysis,
  IntentAnalysisResult,
  IntentName,
} from "./intents.types";
import { getIntentConfig } from "./intents.map";
import { buildReplyForIntent } from "./intents.responses";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectIntentName(text: string): IntentName {
  const norm = normalizeText(text);

  // Saudações
  if (
    norm.includes("oi") ||
    norm.includes("ola") ||
    norm.includes("olá") ||
    norm.includes("bom dia") ||
    norm.includes("boa tarde") ||
    norm.includes("boa noite")
  ) {
    return "SAUDACAO";
  }

  // Tatuagem
  if (
    norm.includes("tatuagem") ||
    norm.includes("tattoo") ||
    norm.includes("tatoo")
  ) {
    return "ORCAMENTO_REMOVER_TATUAGEM";
  }

  // Micro / sobrancelha
  if (
    norm.includes("micropigmentacao") ||
    norm.includes("micropigmentação") ||
    norm.includes("microblading") ||
    norm.includes("sobrancelha") ||
    norm.includes("sobrancelhas")
  ) {
    return "ORCAMENTO_REMOVER_MICRO";
  }

  // Dor / medo
  if (
    norm.includes("doe") ||
    norm.includes("doi") ||
    norm.includes("dói") ||
    norm.includes("dor") ||
    norm.includes("medo") ||
    norm.includes("receio") ||
    norm.includes("machuca") ||
    norm.includes("dói muito")
  ) {
    return "DOR_MEDO";
  }

  // Informação geral
  if (
    norm.includes("como funciona") ||
    norm.includes("quantas sessoes") ||
    norm.includes("quantas sessões") ||
    norm.includes("resultado") ||
    norm.includes("cicatriz") ||
    norm.includes("cicatrizara") ||
    norm.includes("cicatrizar")
  ) {
    return "INFORMACAO_PROCEDIMENTO";
  }

  return "FALLBACK";
}

function getConfidenceForIntent(intentName: IntentName): number {
  switch (intentName) {
    case "SAUDACAO":
    case "ORCAMENTO_REMOVER_TATUAGEM":
    case "ORCAMENTO_REMOVER_MICRO":
      return 0.95;
    case "DOR_MEDO":
    case "INFORMACAO_PROCEDIMENTO":
      return 0.85;
    case "FALLBACK":
    default:
      return 0.4;
  }
}

export function runIntentEngine(
  text: string,
  contactName?: string | null
): IntentAnalysisResult {
  if (!text || !text.trim()) {
    return {
      intent: null,
      responseSuggested: null,
    };
  }

  const intentName = detectIntentName(text);
  const config = getIntentConfig(intentName);

  const intent: IntentAnalysis = {
    name: intentName,
    confidence: getConfidenceForIntent(intentName),
    action: config.defaultActionType,
  };

  const responseSuggested = {
    text: buildReplyForIntent(intentName, { text, contactName }),
  };

  return {
    intent,
    responseSuggested,
  };
}
