import { webhookMetricsService } from "../metrics/webhook.metrics";

export const adminMetricsService = {
  getWebhookMetrics() {
    return webhookMetricsService.getSnapshot();
  },

  resetWebhookMetrics() {
    webhookMetricsService.reset();
  },
};
