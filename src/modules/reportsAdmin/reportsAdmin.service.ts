// src/modules/reportsAdmin/reportsAdmin.service.ts

import { prisma } from "../../database/prismaClient";
import {
  ReportsSummaryDTO,
  ReportsSummaryIntentRow,
  ReportsDailyMessagesRow,
} from "./reportsAdmin.types";

/**
 * Gera um resumo de mensagens do webhook em um intervalo de dias.
 * Baseia-se em WebhookMessageRecord + AdminLog (WEBHOOK_ERROR).
 */
export async function getReportsSummary(
  days: number
): Promise<ReportsSummaryDTO> {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 7;

  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const from = new Date(now);
  from.setDate(from.getDate() - (safeDays - 1));
  from.setHours(0, 0, 0, 0);

  const range = {
    days: safeDays,
    from: from.toISOString(),
    to: to.toISOString(),
  };

  // Buscar mensagens do webhook nesse intervalo
  const messages = (await prisma.webhookMessageRecord.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: to,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  })) as any[];

  const totalMessages = messages.length;
  let totalWithIntent = 0;
  let totalIgnored = 0;
  let totalHandoff = 0;

  const intentsMap = new Map<string | null, number>();
  const dailyMap = new Map<string, number>();

  for (const msg of messages) {
    const intentName = (msg.intentName ?? null) as string | null;
    const handoffToHuman = !!msg.handoffToHuman;
    const ignored = !!msg.ignored;

    if (intentName) {
      totalWithIntent += 1;
    }
    if (ignored) {
      totalIgnored += 1;
    }
    if (handoffToHuman) {
      totalHandoff += 1;
    }

    const createdAt: Date = msg.createdAt
      ? new Date(msg.createdAt)
      : new Date();
    const dateKey = createdAt.toISOString().slice(0, 10); // YYYY-MM-DD

    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
    intentsMap.set(intentName, (intentsMap.get(intentName) || 0) + 1);
  }

  // Erros no período (AdminLog: WEBHOOK_ERROR)
  const totalErrors = await prisma.adminLog.count({
    where: {
      type: "WEBHOOK_ERROR",
      createdAt: {
        gte: from,
        lte: to,
      },
    },
  });

  const byIntent: ReportsSummaryIntentRow[] = Array.from(
    intentsMap.entries()
  ).map(([intentName, count]) => ({
    intentName,
    count,
  }));

  byIntent.sort((a, b) => {
    const ai = a.intentName || "";
    const bi = b.intentName || "";
    return ai.localeCompare(bi);
  });

  const dailyMessages: ReportsDailyMessagesRow[] = Array.from(
    dailyMap.entries()
  )
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    range,
    totals: {
      totalMessages,
      totalWithIntent,
      totalIgnored,
      totalHandoff,
      totalErrors,
    },
    byIntent,
    dailyMessages,
  };
}
