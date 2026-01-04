// src/modules/aiAssistant/aiAssistant.types.ts

export interface AiAssistantRequest {
  text: string;
  intentName?: string | null;
  contactName?: string | null;
  contextSummary?: string | null;
}

export interface AiAssistantResponse {
  text: string;
  usedProvider: string;
  simulated: boolean;
  meta?: {
    intentName?: string | null;
    contactName?: string | null;
  };
}
