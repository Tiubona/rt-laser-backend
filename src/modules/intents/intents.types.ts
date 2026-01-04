// src/modules/intents/intents.types.ts

export type IntentName =
  | "SAUDACAO"
  | "ORCAMENTO_REMOVER_TATUAGEM"
  | "ORCAMENTO_REMOVER_MICRO"
  | "DOR_MEDO"
  | "INFORMACAO_PROCEDIMENTO"
  | "FALLBACK";

export interface IntentConfig {
  name: IntentName;
  defaultActionType: string;
  description: string;
  /**
   * Se true, o robô pode responder sozinho em modo MISTO.
   * Se false, em modo MISTO a intent vai para humano.
   */
  allowAutoInMisto: boolean;
}

/**
 * Resultado da análise de intenção.
 */
export interface IntentAnalysis {
  name: IntentName;
  confidence: number; // 0 a 1
  action: string; // defaultActionType
}

/**
 * Texto sugerido pelo motor de intents.
 */
export interface IntentResponseSuggested {
  text: string;
}

/**
 * Resultado completo da análise de texto.
 */
export interface IntentAnalysisResult {
  intent: IntentAnalysis | null;
  responseSuggested: IntentResponseSuggested | null;
}
