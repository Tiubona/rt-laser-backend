// src/modules/testsAdmin/testsAdmin.types.ts

import { RobotConfigDTO } from "../config/config.types";

export interface TestSimulateRequestBody {
  text: string;
  contactName?: string | null;
  debugTime?: string; // "HH:MM" opcional, para simular horário
}

export interface TestDecision {
  handoffToHuman: boolean;
  reply: string | null;
  reason?: string;
  mode: string;
}

export interface TestSimulateResult {
  configSnapshot: RobotConfigDTO;
  nowMinutesUsed: number;
  outsideSchedule: boolean;
  analysis: any | null;
  decision: TestDecision;
}
