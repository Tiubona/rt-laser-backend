// src/database/prismaClient.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

// Opcionalmente, no futuro podemos adicionar middlewares aqui

export { prisma };
