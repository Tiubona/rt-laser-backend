// src/modules/metrics/metrics.store.ts

import { prisma } from "../../database/prismaClient";

export const metricsStore = {
  countAllMessages() {
    return prisma.webhookMessageRecord.count();
  },

  countWithIntent() {
    return prisma.webhookMessageRecord.count({
      where: {
        intentName: {
          not: null,
        },
      },
    });
  },

  countIgnored() {
    return prisma.webhookMessageRecord.count({
      where: {
        ignored: true,
      },
    });
  },

  countHandoff() {
    return prisma.webhookMessageRecord.count({
      where: {
        handoffToHuman: true,
      },
    });
  },

  countByIntent() {
    return prisma.webhookMessageRecord.groupBy({
      by: ["intentName"],
      where: {
        intentName: {
          not: null,
        },
      },
      _count: {
        intentName: true,
      },
      orderBy: {
        _count: {
          intentName: "desc",
        },
      },
    });
  },
};
