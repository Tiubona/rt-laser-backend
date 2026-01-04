import { PrismaClient, AdminLog } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Cria um registro de log administrativo.
 * Salva o payload como JSON em AdminLog.payload.
 */
export async function createAdminLog(
  type: string,
  message: string,
  data?: any
): Promise<AdminLog | null> {
  try {
    return await prisma.adminLog.create({
      data: {
        type,
        message,
        payload: data ? JSON.stringify(data) : null,
      },
    });
  } catch (error: any) {
    console.error(
      "[WARN] Falha ao registrar admin log no banco. Seguindo sem quebrar fluxo.",
      error?.message || error
    );
    return null;
  }
}

/**
 * Lista logs administrativos mais recentes.
 */
export async function listLogs(
  limit: number,
  type?: string
): Promise<AdminLog[]> {
  try {
    return await prisma.adminLog.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (error: any) {
    console.error(
      "[WARN] Falha ao listar admin logs no banco. Seguindo sem quebrar fluxo.",
      error?.message || error
    );
    return [];
  }
}
