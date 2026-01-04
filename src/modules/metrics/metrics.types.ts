// src/modules/metrics/metrics.types.ts

export interface IntentCount {
  intentName: string;
  count: number;
}

export interface WebhookMetricsSummary {
  totalMessages: number;
  totalWithIntent: number;
  totalIgnored: number;
  totalHandoff: number;
  intents: IntentCount[];
}
