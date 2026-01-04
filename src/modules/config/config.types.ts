// src/modules/config/config.types.ts

export type AtendimentoMode = "AUTO" | "MISTO" | "HUMANO";

export interface RobotConfigDTO {
  id: number;
  robotEnabled: boolean;
  atendimentoMode: AtendimentoMode;
  horarioInicio: string; // "HH:MM"
  horarioFim: string; // "HH:MM"
  timezone: string; // ex.: "America/Sao_Paulo"
  fallbackToHuman: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateRobotConfigBody {
  robotEnabled?: boolean;
  atendimentoMode?: AtendimentoMode;
  horarioInicio?: string;
  horarioFim?: string;
  timezone?: string;
  fallbackToHuman?: boolean;
}
