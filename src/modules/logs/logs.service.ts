// src/modules/logs/logs.service.ts

import { AdminLog } from "@prisma/client";
import { createAdminLog as storeCreateAdminLog, listLogs } from "./logs.store";
import { AdminLogDTO, CreateAdminLogInput } from "./logs.types";

function mapToDTO(log: AdminLog): AdminLogDTO {
  let data: any = undefined;
  const anyLog: any = log as any;

  // Em algumas versões o campo pode se chamar "payload"
  const rawPayload =
    typeof anyLog.payload !== "undefined" ? anyLog.payload : anyLog.data;

  if (rawPayload) {
    try {
      data = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
    } catch {
      data = rawPayload;
    }
  }

  return {
    id: log.id,
    type: log.type,
    message: log.message,
    data,
    createdAt: log.createdAt.toISOString(),
  };
}

/**
 * Cria log administrativo em DTO amigável.
 */
export async function createAdminLogDTO(
  input: CreateAdminLogInput
): Promise<AdminLogDTO | null> {
  const created = await storeCreateAdminLog(
    input.type,
    input.message,
    input.data
  );

  if (!created) {
    return null;
  }

  return mapToDTO(created);
}

/**
 * Mantém compatibilidade com a assinatura antiga
 * usada em outros módulos: createAdminLog(...)
 */
export async function createAdminLog(
  input: CreateAdminLogInput
): Promise<AdminLogDTO | null> {
  return createAdminLogDTO(input);
}

/**
 * Lista logs administrativos em formato DTO.
 */
export async function listAdminLogsDTO(
  limit: number,
  type?: string
): Promise<AdminLogDTO[]> {
  const logs = await listLogs(limit, type);
  return logs.map(mapToDTO);
}
