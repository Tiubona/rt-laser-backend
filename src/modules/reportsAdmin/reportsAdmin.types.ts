// src/modules/reportsAdmin/reportsAdmin.types.ts

export interface ReportsSummaryIntentRow {
  intentName: string | null;
  count: number;
}

export interface ReportsDailyMessagesRow {
  date: string; // formato YYYY-MM-DD
  total: number;
}

export interface ReportsSummaryTotals {
  totalMessages: number;
  totalWithIntent: number;
  totalIgnored: number;
  totalHandoff: number;
  totalErrors: number;
}

export interface ReportsSummaryRange {
  days: number;
  from: string; // ISO
  to: string;   // ISO
}

export interface ReportsSummaryDTO {
  range: ReportsSummaryRange;
  totals: ReportsSummaryTotals;
  byIntent: ReportsSummaryIntentRow[];
  dailyMessages: ReportsDailyMessagesRow[];
}
