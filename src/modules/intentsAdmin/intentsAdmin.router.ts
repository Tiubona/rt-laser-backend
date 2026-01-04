// src/modules/intentsAdmin/intentsAdmin.router.ts

import { Router, Request, Response } from "express";

export const intentsAdminRouter = Router();

/**
 * Router administrativo para intents.
 *
 * Nesta versão inicial, ele apenas expõe um endpoint básico
 * de "ping" para confirmar que a rota está montada.
 *
 * Endpoints mais avançados (listar intents, editar respostas etc.)
 * podem ser adicionados depois, sem impactar o funcionamento atual.
 */

intentsAdminRouter.get("/", (req: Request, res: Response) => {
  return res.json({
    ok: true,
    scope: "intents-admin",
    message:
      "Rota administrativa de intents ativa. Nenhuma operação específica implementada ainda.",
  });
});

export default intentsAdminRouter;
