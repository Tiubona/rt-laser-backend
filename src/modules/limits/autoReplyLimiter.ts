// src/modules/limits/autoReplyLimiter.ts

/**
 * Módulo de controle de limite de mensagens automáticas por contato/dia.
 *
 * Versão 2.0:
 * - Continua usando memória local (sem banco).
 * - Limite padrão = 8 por contato/dia.
 * - Permite sobrescrever o limite via variável de ambiente:
 *   AUTO_REPLY_LIMIT_PER_CONTACT_PER_DAY
 */

export interface AutoReplyContext {
  contactKey: string | null;
  mode: string; // AUTO | MISTO | HUMANO (informativo por enquanto)
  intentName?: string | null;
}

export interface AutoReplyLimiterDecision {
  allowed: boolean;
  reason?: string;
  totalAutoRepliesToday: number;
  limitPerDay: number;
}

const DEFAULT_MAX_AUTO_REPLIES_PER_CONTACT_PER_DAY = 8;

interface CounterEntry {
  date: string; // YYYY-MM-DD
  count: number;
}

const counters = new Map<string, CounterEntry>();

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function buildKey(contactKey: string): string {
  const date = getTodayDateString();
  return `${contactKey}::${date}`;
}

/**
 * Lê o limite de AUTO_REPLY_LIMIT_PER_CONTACT_PER_DAY, se existir
 * e for válido (>0). Caso contrário, usa o DEFAULT.
 */
export function getConfiguredAutoReplyLimit(): number {
  const raw = process.env.AUTO_REPLY_LIMIT_PER_CONTACT_PER_DAY;
  if (!raw) {
    return DEFAULT_MAX_AUTO_REPLIES_PER_CONTACT_PER_DAY;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_AUTO_REPLIES_PER_CONTACT_PER_DAY;
  }

  return Math.floor(parsed);
}

/**
 * Avalia se ainda é permitido enviar resposta automática para esse contato hoje.
 * NÃO incrementa o contador – isso é feito em registerAutoReply().
 */
export function evaluateAutoReplyLimit(
  ctx: AutoReplyContext
): AutoReplyLimiterDecision {
  const limit = getConfiguredAutoReplyLimit();

  if (!ctx.contactKey) {
    // Sem identificador de contato → não limitamos por enquanto
    return {
      allowed: true,
      totalAutoRepliesToday: 0,
      limitPerDay: limit,
    };
  }

  const key = buildKey(ctx.contactKey);
  const entry = counters.get(key);
  const count = entry?.count ?? 0;

  if (count >= limit) {
    return {
      allowed: false,
      reason:
        "Limite diário de mensagens automáticas atingido para este contato.",
      totalAutoRepliesToday: count,
      limitPerDay: limit,
    };
  }

  return {
    allowed: true,
    totalAutoRepliesToday: count,
    limitPerDay: limit,
  };
}

/**
 * Registra que UMA mensagem automática foi enviada agora para esse contato.
 */
export function registerAutoReply(
  ctx: AutoReplyContext
): { totalAutoRepliesToday: number; limitPerDay: number } {
  const limit = getConfiguredAutoReplyLimit();

  if (!ctx.contactKey) {
    return {
      totalAutoRepliesToday: 0,
      limitPerDay: limit,
    };
  }

  const today = getTodayDateString();
  const key = buildKey(ctx.contactKey);
  const existing = counters.get(key);

  let newCount = 1;

  if (existing && existing.date === today) {
    newCount = existing.count + 1;
  }

  counters.set(key, {
    date: today,
    count: newCount,
  });

  return {
    totalAutoRepliesToday: newCount,
    limitPerDay: limit,
  };
}
