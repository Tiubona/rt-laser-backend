import { JsonStorage } from "../../storage/jsonStorage";

export type AdminLogType = "ACCESS" | "CONFIG_UPDATE";

export interface AdminLog {
  id: string;
  timestamp: string;
  type: AdminLogType;
  route: string;
  method: string;
  userEmail?: string;
  details?: string;
}

class AdminLogService {
  private logs: AdminLog[] = [];
  private storage: JsonStorage<AdminLog[]>;

  constructor() {
    // Arquivo onde os logs serão armazenados em disco
    this.storage = new JsonStorage<AdminLog[]>("data/admin-logs.json");

    // Carrega logs já existentes ao iniciar o serviço
    this.logs = this.storage.readAll([]);
  }

  /**
   * Cria um novo log administrativo.
   * 
   * Aceita todos os campos de AdminLog EXCETO o id.
   * - Se timestamp não for informado, gera automaticamente.
   */
  addLog(data: Omit<AdminLog, "id">): AdminLog {
    const nextId =
      this.logs.length > 0 ? String(Number(this.logs[0].id) + 1) : "1";

    const log: AdminLog = {
      id: nextId,
      timestamp: data.timestamp ?? new Date().toISOString(),
      type: data.type,
      route: data.route,
      method: data.method,
      userEmail: data.userEmail,
      details: data.details,
    };

    // Mantém o log mais recente no início
    this.logs.unshift(log);

    // Limita a 200 registros em memória
    if (this.logs.length > 200) {
      this.logs.pop();
    }

    // Persiste tudo em disco
    this.storage.writeAll(this.logs);

    return log;
  }

  /**
   * Lista logs (por padrão, os 50 primeiros).
   */
  listLogs(limit = 50): AdminLog[] {
    return this.logs.slice(0, limit);
  }

  /**
   * Reseta todos os logs, limpando memória e arquivo.
   */
  resetLogs(): void {
    this.logs = [];
    this.storage.writeAll(this.logs);
  }
}

// Instância única para ser usada pelas rotas admin
export const adminLogService = new AdminLogService();
