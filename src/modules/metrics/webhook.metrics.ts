export interface WebhookMessageRecord {
  timestamp: string;
  intentName?: string;
  handoffToHuman: boolean;
  ignored: boolean;
}

export interface WebhookMetricsSnapshot {
  totalMessages: number;
  totalIgnored: number;
  totalHandoff: number;
  totalAutoHandled: number;
  intents: {
    [intentName: string]: {
      count: number;
      handoffCount: number;
      autoHandledCount: number;
    };
  };
}

class WebhookMetricsService {
  private records: WebhookMessageRecord[] = [];

  recordMessage(record: WebhookMessageRecord): void {
    this.records.push(record);
  }

  getSnapshot(): WebhookMetricsSnapshot {
    const snapshot: WebhookMetricsSnapshot = {
      totalMessages: this.records.length,
      totalIgnored: 0,
      totalHandoff: 0,
      totalAutoHandled: 0,
      intents: {},
    };

    for (const r of this.records) {
      if (r.ignored) {
        snapshot.totalIgnored++;
      }

      if (r.handoffToHuman) {
        snapshot.totalHandoff++;
      } else if (!r.ignored) {
        snapshot.totalAutoHandled++;
      }

      const key = r.intentName || "DESCONHECIDA";

      if (!snapshot.intents[key]) {
        snapshot.intents[key] = {
          count: 0,
          handoffCount: 0,
          autoHandledCount: 0,
        };
      }

      snapshot.intents[key].count++;

      if (r.handoffToHuman) {
        snapshot.intents[key].handoffCount++;
      } else if (!r.ignored) {
        snapshot.intents[key].autoHandledCount++;
      }
    }

    return snapshot;
  }

  reset(): void {
    this.records = [];
  }
}

export const webhookMetricsService = new WebhookMetricsService();
