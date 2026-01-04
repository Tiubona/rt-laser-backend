// src/modules/auth/auth.router.ts

import { Router, Response } from "express";
import { authStore } from "./auth.store";
import {
  generateJwt,
  verifyPassword,
  generateTwoFactorSetup,
  verifyTwoFactorToken,
  mapToSafeAdmin,
} from "./auth.service";
import {
  AuthenticatedRequest,
  requireAdminAuth,
} from "./auth.middleware";
import { LoginRequestBody, TwoFactorConfirmBody } from "./auth.types";

export const authRouter = Router();

// POST /admin/auth/login
authRouter.post("/login", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, twoFactorToken } = req.body as LoginRequestBody;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "EMAIL_AND_PASSWORD_REQUIRED",
      });
    }

    const admin = await authStore.findByEmail(email);

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: "INVALID_CREDENTIALS",
      });
    }

    const validPassword = await verifyPassword(password, admin.passwordHash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: "INVALID_CREDENTIALS",
      });
    }

    // Se o admin tiver 2FA ativado, exigir o token
    if (admin.isTwoFactorEnabled) {
      if (!twoFactorToken) {
        return res.status(403).json({
          success: false,
          error: "TWO_FACTOR_REQUIRED",
        });
      }

      const ok = await verifyTwoFactorToken(admin.id, twoFactorToken);

      if (!ok) {
        return res.status(403).json({
          success: false,
          error: "INVALID_TWO_FACTOR_TOKEN",
        });
      }
    }

    const token = generateJwt(admin.id, admin.email);
    const safeAdmin = mapToSafeAdmin(admin);

    return res.json({
      success: true,
      token,
      user: safeAdmin,
    });
  } catch (err) {
    console.error("POST /admin/auth/login error:", err);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
    });
  }
});

// GET /admin/auth/me
authRouter.get(
  "/me",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: "NOT_AUTHENTICATED",
      });
    }

    return res.json({
      success: true,
      user: req.admin,
    });
  }
);

// POST /admin/auth/2fa/setup
authRouter.post(
  "/2fa/setup",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          error: "NOT_AUTHENTICATED",
        });
      }

      const result = await generateTwoFactorSetup(
        req.admin.id,
        req.admin.email
      );

      return res.json({
        success: true,
        ...result, // { otpauthUrl }
      });
    } catch (err) {
      console.error("POST /admin/auth/2fa/setup error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);

// POST /admin/auth/2fa/confirm
authRouter.post(
  "/2fa/confirm",
  requireAdminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          error: "NOT_AUTHENTICATED",
        });
      }

      const { token } = req.body as TwoFactorConfirmBody;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: "TOKEN_REQUIRED",
        });
      }

      const ok = await verifyTwoFactorToken(req.admin.id, token);

      if (!ok) {
        return res.status(400).json({
          success: false,
          error: "INVALID_TWO_FACTOR_TOKEN",
        });
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("POST /admin/auth/2fa/confirm error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);
