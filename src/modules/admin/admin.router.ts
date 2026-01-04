import { Router, Request, Response } from "express";
import axios from "axios";

const adminRouter = Router();

const AFTER_HOURS_ROBOT_URL =
  process.env.AFTER_HOURS_ROBOT_URL || "http://localhost:3002";

// Health do módulo admin
adminRouter.get("/health", (req: Request, res: Response) => {
  return res.json({
    status: "ok",
    module: "admin",
    timestamp: new Date().toISOString(),
  });
});

// ==============================
// Integração com robô fora de horário
// ==============================

// Config básico do robô fora de horário
adminRouter.get("/after-hours/config", (req: Request, res: Response) => {
  return res.json({
    url: AFTER_HOURS_ROBOT_URL,
    enabled: true,
  });
});

// Health do robô fora de horário (via proxy)
adminRouter.get(
  "/after-hours/health",
  async (req: Request, res: Response) => {
    try {
      const healthUrl = `${AFTER_HOURS_ROBOT_URL.replace(/\/$/, "")}/health`;
      const response = await axios.get(healthUrl, { timeout: 2000 });

      return res.json({
        ok: true,
        url: AFTER_HOURS_ROBOT_URL,
        remote: response.data,
      });
    } catch (error: any) {
      console.error(
        "[ADMIN] Erro ao consultar robô fora de horário:",
        error?.message || error
      );

      return res.status(500).json({
        ok: false,
        url: AFTER_HOURS_ROBOT_URL,
        error:
          "Não foi possível se conectar ao robô fora de horário. Verifique se ele está rodando e a URL AFTER_HOURS_ROBOT_URL.",
      });
    }
  }
);

export { adminRouter };
