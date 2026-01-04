// src/modules/auth/auth.store.ts

import { prisma } from "../../database/prismaClient";
import { AdminUser } from "@prisma/client";

export const authStore = {
  findByEmail(email: string) {
    return prisma.adminUser.findUnique({
      where: { email },
    });
  },

  findById(id: number) {
    return prisma.adminUser.findUnique({
      where: { id },
    });
  },

  async createAdminUser(
    name: string,
    email: string,
    passwordHash: string
  ): Promise<AdminUser> {
    return prisma.adminUser.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
  },

  async saveTwoFactorSecret(id: number, secret: string): Promise<AdminUser> {
    return prisma.adminUser.update({
      where: { id },
      data: {
        twoFactorSecret: secret,
      },
    });
  },

  async enableTwoFactor(id: number): Promise<AdminUser> {
    return prisma.adminUser.update({
      where: { id },
      data: {
        isTwoFactorEnabled: true,
      },
    });
  },
};
