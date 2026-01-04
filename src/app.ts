import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import { adminRouter } from "./modules/admin/admin.router";
import chatGuruWebhookRouter from "./modules/chatguru/chatguru.webhook.router";
import { uraHandlerRouter } from "./modules/chatguru/ura.handler.router";
import { uraScenariosAdminRouter } from "./modules/uraScenariosAdmin/uraScenariosAdmin.router";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rota de teste para ver se o backend está vivo
app.get("/health", (req, res) => {
  return res.json({
    status: "ok",
    service: "rt-laser-backend",
    timestamp: new Date().toISOString(),
  });
});

// Painel para cadastrar cenários de URA
app.use("/admin/ura-scenarios", uraScenariosAdminRouter);

// Endpoint que o ChatGuru vai chamar para URA + IA
app.use("/chatguru", uraHandlerRouter);

// Webhook oficial que já existia no projeto
app.use("/webhook/chatguru", chatGuruWebhookRouter);

export { app };
