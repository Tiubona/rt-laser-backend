// src/modules/config/config.store.ts

import { prisma } from "../../database/prismaClient";
import { RobotConfig } from "@prisma/client";

export const configStore = {
  findConfig(): Promise<RobotConfig | null> {
    // Como o id é sempre 1 no schema, podemos buscar diretamente
    return prisma.robotConfig.findUnique({
      where: { id: 1 },
    });
  },

  createDefaultConfig(): Promise<RobotConfig> {
    return prisma.robotConfig.create({
      data: {
        id: 1,
        robotEnabled: true,
        atendimentoMode: "AUTO",
        horarioInicio: "08:00",
        horarioFim: "20:00",
        timezone: "America/Sao_Paulo",
        fallbackToHuman: true,
      },
    });
  },

  async getOrCreateConfig(): Promise<RobotConfig> {
    const existing = await this.findConfig();

    if (existing) return existing;

    return this.createDefaultConfig();
  },

  updateConfig(partial: Partial<RobotConfig>): Promise<RobotConfig> {
    return prisma.robotConfig.update({
      where: { id: 1 },
      data: {
        ...partial,
      },
    });
  },
};
