// src/modules/auth/auth.types.ts

export interface JwtPayload {
  sub: number; // ID do AdminUser
  email: string;
}

export interface AdminUserSafe {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  isTwoFactorEnabled: boolean;
}

export interface LoginRequestBody {
  email: string;
  password: string;
  // Se o admin tiver 2FA ativo, ele manda esse token junto
  twoFactorToken?: string;
}

export interface TwoFactorSetupResponse {
  otpauthUrl: string;
}

export interface TwoFactorConfirmBody {
  token: string; // código 2FA digitado pelo admin
}
