// src/modules/intents/intents.handler.ts

import { IntentAnalysisResult } from "./intents.types";
import { runIntentEngine } from "./intents.engine";

/**
 * Handler simples que hoje só delega para o motor de intents baseado em regras.
 * Futuras fases podem acoplar IA aqui sem mexer no resto do sistema.
 */
export class IntentsHandler {
  static async analyzeText(
    text: string,
    contactName?: string | null
  ): Promise<IntentAnalysisResult> {
    // Aqui é síncrono, mas já deixo async para futuro uso de IA externa.
    return runIntentEngine(text, contactName);
  }
}
