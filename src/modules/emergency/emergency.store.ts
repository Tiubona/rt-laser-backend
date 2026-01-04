// src/modules/emergency/emergency.store.ts

import { prisma } from "../../database/prismaClient";
import { EmergencyEmail } from "@prisma/client";

export const emergencyStore = {
  listAll(): Promise<EmergencyEmail[]> {
    return prisma.emergencyEmail.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  listActive(): Promise<EmergencyEmail[]> {
    return prisma.emergencyEmail.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
  },

  create(name: string, email: string): Promise<EmergencyEmail> {
    return prisma.emergencyEmail.create({
      data: {
        name,
        email,
        active: true,
      },
    });
  },

  async softDelete(id: number): Promise<EmergencyEmail | null> {
    try {
      return await prisma.emergencyEmail.update({
        where: { id },
        data: {
          active: false,
        },
      });
    } catch {
      return null;
    }
  },
};
