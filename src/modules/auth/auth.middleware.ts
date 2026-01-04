// src/modules/auth/auth.middleware.ts

import { NextFunction, Response, Request } from "express";
import { verifyJwt, getAdminById } from "./auth.service";
import { AdminUserSafe } from "./auth.types";

export interface AuthenticatedRequest extends Request {
  admin?: AdminUserSafe;
}

/**
 * Middleware principal para proteger rotas administrativas.
 * - Lê o header Authorization: Bearer <token>
 * - Valida o JWT
 * - Carrega o AdminUser no req.admin
 */
export async function requireAdminAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "TOKEN_MISSING" });
    }

    const token = authHeader.substring("Bearer ".length);

    const payload = verifyJwt(token);
    const admin = await getAdminById(payload.sub);

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: "ADMIN_NOT_FOUND_OR_INACTIVE" });
    }

    req.admin = admin;
    return next();
  } catch (err) {
    console.error("requireAdminAuth error:", err);
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

/**
 * Alias de compatibilidade:
 * - Caso o código antigo use `authGuard`, ele vai usar o mesmo fluxo do requireAdminAuth.
 */
export const authGuard = requireAdminAuth;
