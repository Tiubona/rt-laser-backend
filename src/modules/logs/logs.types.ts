// src/modules/logs/logs.types.ts

export interface AdminLogDTO {
  id: number;
  type: string;
  message: string;
  data?: any;
  createdAt: string;
}

export interface CreateAdminLogInput {
  type: string;
  message: string;
  data?: any;
}
