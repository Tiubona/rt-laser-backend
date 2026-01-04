// src/modules/aiAssistant/aiAssistant.service.ts

import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let RTBRAIN_TEXT: string | null = null;

// Carrega o arquivo RTBrain uma vez
function loadRTBrain(): string {
  if (RTBRAIN_TEXT) return RTBRAIN_TEXT;

  const filePath = path.resolve(__dirname, "../../rtbrain/rtbrain.txt");

  try {
    RTBRAIN_TEXT = fs.readFileSync(filePath, "utf8");
    console.log("[RTBRAIN] Arquivo carregado com sucesso:", filePath);
  } catch (err) {
    console.error("[RTBRAIN] Erro ao carregar arquivo:", filePath, err);
    RTBRAIN_TEXT =
      "Você é uma secretária da RT Laser. Houve um erro ao carregar o RTBrain, então responda com educação e peça desculpas pela instabilidade, dizendo que alguém da equipe vai finalizar o atendimento.";
  }

  return RTBRAIN_TEXT;
}

export interface GenerateAiAssistantParams {
  text: string; // mensagem do paciente
  intentName?: string;
  contactName?: string | null;
  contextSummary?: string; // o que o router está montando (persona, horário, etc.)
}

export interface GenerateAiAssistantResult {
  text: string | null; // texto final da IA
  raw?: any; // resposta crua da OpenAI (se precisar debugar)
}

// Função principal usada pelo webhook
export async function generateAiAssistantResponse(
  params: GenerateAiAssistantParams
): Promise<GenerateAiAssistantResult> {
  const { text, contactName, contextSummary } = params;

  const rtbrain = loadRTBrain();

  // Monte o "system" juntando o RTBrain + contexto dinâmico
  const systemMessage = [
    rtbrain.trim(),
    "",
    "---------------------------",
    "[CONTEXTO GERADO PELO BACKEND (PERSONA / HORÁRIO / SERVIÇO FOCO)]",
    contextSummary ?? "",
    "",
    "[INSTRUÇÕES FINAIS]",
    "- Responda sempre como secretária da RT Laser.",
    "- NÃO repita literalmente a pergunta do paciente.",
    "- Responda de forma direta o que foi perguntado.",
    "- Não invente serviços que a RT Laser não oferece.",
    "- Não mencione que é IA ou robô.",
  ]
    .join("\n")
    .trim();

  const nameInfo = contactName && typeof contactName === "string"
    ? `O nome do paciente é: ${contactName}.`
    : "O nome do paciente não foi identificado.";

  const userMessage = [
    nameInfo,
    "",
    "Mensagem atual do paciente:",
    `"${text}"`
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // ou outro modelo que você preferir
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.4, // mais baixo = mais obediente ao RTBrain
      max_tokens: 300,
    });

    const choice = completion.choices[0];
    const replyText = (choice.message?.content || "").trim() || null;

    return {
      text: replyText,
      raw: completion,
    };
  } catch (err) {
    console.error("[RTBRAIN] Erro ao chamar OpenAI:", err);

    return {
      text:
        "Peço desculpas, estou com uma instabilidade aqui na parte inteligente do sistema. Já anotei a tua mensagem e em seguida alguém da equipe RT Laser te responde direitinho, tudo bem?",
      raw: null,
    };
  }
}
