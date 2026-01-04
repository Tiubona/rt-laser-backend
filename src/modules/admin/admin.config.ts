// src/modules/admin/admin.config.ts

export type AtendimentoMode = "AUTO" | "MISTO" | "HUMANO";

export interface RobotConfig {
  robotEnabled: boolean;
  atendimentoMode: AtendimentoMode;
  horarioInicio: string; // ex: "09:00"
  horarioFim: string; // ex: "19:00"
  timezone: string; // ex: "America/Sao_Paulo"
  fallbackAcionarHumanoDepoisMin: number;
}

// Configuração em memória (padrão)
let currentConfig: RobotConfig = {
  robotEnabled: true,
  atendimentoMode: "MISTO",
  horarioInicio: "09:00",
  horarioFim: "19:00",
  timezone: "America/Sao_Paulo",
  fallbackAcionarHumanoDepoisMin: 10,
};

/**
 * Retorna a configuração atual do robô.
 */
export function getRobotConfig(): RobotConfig {
  return currentConfig;
}

/**
 * Atualiza parcialmente a configuração do robô.
 * Qualquer campo presente no partial sobrescreve o valor atual.
 */
export function updateRobotConfig(
  partial: Partial<RobotConfig>
): RobotConfig {
  currentConfig = {
    ...currentConfig,
    ...partial,
  };

  return currentConfig;
}
