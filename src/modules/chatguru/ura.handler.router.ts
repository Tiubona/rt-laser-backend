// src/modules/chatguru/ura.handler.router.ts

import { Router, Request, Response } from "express";
import { prisma } from "../../database/prismaClient";
import { generateAiAssistantResponse } from "../aiAssistant/aiAssistant.service";

export const uraHandlerRouter = Router();

/**
 * Endpoint genérico para tratar URA + IA.
 *
 * Recebe:
 *  - ura: contexto vindo do ChatGuru (ex.: "LeAgN")
 *  - mensagem: texto digitado pelo cliente
 *  - contato: opcional (telefone)
 *  - nome: opcional (nome do cliente)
 *
 * Consulta o ChatScenario (configurado no painel) e devolve:
 *  - message: texto humanizado
 *  - nextUra: URA de saída opcional para o ChatGuru
 */
uraHandlerRouter.post(
  "/ura-handler",
  async (req: Request, res: Response) => {
    try {
      const { ura, mensagem, contato, nome } = req.body as {
        ura: string;
        mensagem: string;
        contato?: string;
        nome?: string;
      };

      if (!ura || !mensagem) {
        return res.status(400).json({
          success: false,
          error: "MISSING_FIELDS",
          message: "Campos 'ura' e 'mensagem' são obrigatórios.",
        });
      }

      // 1) Buscar cenário configurado para essa URA
      const scenario = await prisma.chatScenario.findUnique({
        where: { uraKey: ura },
      });

      if (!scenario || !scenario.active) {
        // Se não tiver cenário configurado, devolve algo neutro
        return res.json({
          success: true,
          message:
            "Recebi sua mensagem e vou encaminhar para a equipe responder com calma no horário de atendimento, tudo bem? 💚",
          nextUra: null,
        });
      }

      // 2) Montar o contexto para o RTBrain
      const contextSummary = [
        `CENÁRIO URA: ${scenario.uraKey}`,
        scenario.description
          ? `Descrição: ${scenario.description}`
          : "Descrição: (não informada)",
        "",
        "INSTRUÇÕES ESPECÍFICAS PARA ESTE CONTEXTO:",
        scenario.aiInstructions,
      ]
        .join("\n")
        .trim();

      // 3) Chamar a IA usando o mesmo pipeline do robô principal
      const aiResult = await generateAiAssistantResponse({
        text: mensagem,
        contactName: nome ?? null,
        contextSummary,
      });

      const respostaFinal =
        aiResult.text ||
        "Tive uma pequena dificuldade aqui agora, mas já vou pedir para alguém da equipe te responder direitinho, tudo bem? 💚";

      // 4) URA de saída opcional configurada no painel
      const nextUra = scenario.defaultNextUra || null;

      return res.json({
        success: true,
        message: respostaFinal,
        nextUra,
      });
    } catch (err: any) {
      console.error("[URA-HANDLER] Erro:", err);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_ERROR",
        message:
          err?.message ||
          "Erro interno ao processar URA. Tente novamente em instantes.",
      });
    }
  }
);
