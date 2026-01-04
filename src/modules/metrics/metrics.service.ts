// src/modules/metrics/metrics.service.ts

import { metricsStore } from "./metrics.store";
import { IntentCount, WebhookMetricsSummary } from "./metrics.types";

export async function getWebhookMetricsSummary(): Promise<WebhookMetricsSummary> {
  const [
    totalMessages,
    totalWithIntent,
    totalIgnored,
    totalHandoff,
    byIntent,
  ] = await Promise.all([
    metricsStore.countAllMessages(),
    metricsStore.countWithIntent(),
    metricsStore.countIgnored(),
    metricsStore.countHandoff(),
    metricsStore.countByIntent(),
  ]);

  const intents: IntentCount[] = byIntent
    .filter((row) => !!row.intentName)
    .map((row) => ({
      intentName: row.intentName as string,
      count: row._count.intentName,
    }));

  return {
    totalMessages,
    totalWithIntent,
    totalIgnored,
    totalHandoff,
    intents,
  };
}
