// src/scripts/createAdmin.ts
//
// Script de seed para criar o PRIMEIRO usuário admin no banco.
// NÃO roda automaticamente. Só será executado quando o banco PostgreSQL
// estiver funcionando e você rodar o comando específico.
//
// Fluxo (quando for a hora de usar):
// 1. Garantir que o PostgreSQL está rodando e o DATABASE_URL no .env está correto.
// 2. Rodar as migrações do Prisma (npx prisma migrate dev).
// 3. Executar este script para criar o admin inicial.
//
// Por enquanto, você só precisa DEIXAR ESSE ARQUIVO PRONTO NO PROJETO.

import "dotenv/config";
import { prisma } from "../database/prismaClient";
import { hashPassword } from "../modules/auth/auth.service";

async function main() {
  const name = process.env.INIT_ADMIN_NAME || "Admin RT Laser";
  const email = process.env.INIT_ADMIN_EMAIL || "admin@rtlaser.com";
  const password =
    process.env.INIT_ADMIN_PASSWORD || "TrocarSenhaForte@123";

  console.log("== SEED ADMIN USER ==");
  console.log("Nome:", name);
  console.log("Email:", email);

  const existing = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("Já existe um AdminUser com esse email. Nada foi feito.");
    return;
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash,
      isActive: true,
    },
  });

  console.log("Admin criado com sucesso:");
  console.log({
    id: admin.id,
    name: admin.name,
    email: admin.email,
  });

  console.log("\nIMPORTANTE:");
  console.log(
    "Use esse email e senha para fazer login no painel admin quando estiver tudo conectado:"
  );
  console.log("Email:", email);
  console.log("Senha:", password);
  console.log(
    "Depois de logar a primeira vez em produção, troque essa senha por uma ainda mais forte."
  );
}

main()
  .catch((err) => {
    console.error("Erro ao criar admin inicial:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
