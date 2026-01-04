// src/modules/auth/auth.service.ts

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";

import { authStore } from "./auth.store";
import {
  AdminUserSafe,
  JwtPayload,
  TwoFactorSetupResponse,
} from "./auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const APP_NAME = process.env.APP_NAME || "RT Laser Admin";

function toSafeAdminUser(admin: any): AdminUserSafe {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    isActive: admin.isActive,
    isTwoFactorEnabled: admin.isTwoFactorEnabled,
  };
}

// --------- SENHA / HASH ---------

export async function hashPassword(plain: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(plain, saltRounds);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// --------- JWT ---------

export function generateJwt(adminId: number, email: string): string {
  const payload: JwtPayload = {
    sub: adminId,
    email,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyJwt(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  return decoded;
}

// --------- 2FA (TOTP) ---------

export async function generateTwoFactorSetup(
  adminId: number,
  email: string
): Promise<TwoFactorSetupResponse> {
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${email})`,
  });

  await authStore.saveTwoFactorSecret(adminId, secret.base32);

  return {
    otpauthUrl: secret.otpauth_url ?? "",
  };
}

export async function verifyTwoFactorToken(
  adminId: number,
  token: string
): Promise<boolean> {
  const admin = await authStore.findById(adminId);

  if (!admin || !admin.twoFactorSecret) {
    return false;
  }

  const ok = speakeasy.totp.verify({
    secret: admin.twoFactorSecret,
    encoding: "base32",
    token,
    window: 1, // permite pequena diferença de horário
  });

  if (!ok) return false;

  // Se ainda não estava marcado como ativo, marcamos agora
  if (!admin.isTwoFactorEnabled) {
    await authStore.enableTwoFactor(adminId);
  }

  return true;
}

// --------- BUSCA / UTILS ---------

export async function getAdminByEmail(email: string) {
  return authStore.findByEmail(email);
}

export async function getAdminById(id: number) {
  const admin = await authStore.findById(id);
  return admin ? toSafeAdminUser(admin) : null;
}

export function mapToSafeAdmin(admin: any): AdminUserSafe {
  return toSafeAdminUser(admin);
}
