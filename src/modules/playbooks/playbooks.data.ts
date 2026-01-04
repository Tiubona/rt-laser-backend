// src/modules/playbooks/playbooks.data.ts

import { PlaybookDefinitionDTO } from "./playbooks.types";

/**
 * Playbooks estáticos do robô RT Laser.
 * Cada playbook representa um fluxo/script de atendimento para uma intenção
 * ou para uso manual da equipe (follow-up, pós-sessão, reativação, etc.).
 */
export const PLAYBOOKS: PlaybookDefinitionDTO[] = [
  {
    id: "SAUDACAO_BASICA",
    intentName: "SAUDACAO",
    title: "Saudação inicial RT Laser",
    description:
      "Apresentação do assistente RT Laser e direcionamento para tatuagem ou micro.",
    tags: ["saudacao", "inicio", "primeiro-contato"],
    steps: [
      {
        order: 1,
        text: "Oi, {{nomeOpcional}}! Tudo bem? 😊",
      },
      {
        order: 2,
        text: "Aqui é o assistente virtual da RT Laser, especializado em remoção de tatuagem e micropigmentação.",
      },
      {
        order: 3,
        text: "Me conta: você quer remover tatuagem, sobrancelha (micro) ou está com alguma dúvida sobre o procedimento?",
      },
    ],
  },
  {
    id: "ORCAMENTO_TATUAGEM_PADRAO",
    intentName: "ORCAMENTO_REMOVER_TATUAGEM",
    title: "Orçamento – Remoção de tatuagem",
    description:
      "Fluxo padrão para pedir informações e fotos da tatuagem para orçamento.",
    tags: ["orcamento", "tatuagem"],
    steps: [
      {
        order: 1,
        text: "Show, {{nomeOpcional}}! Vamos falar da sua tatuagem 🧩",
      },
      {
        order: 2,
        text: "Pra te passar uma estimativa mais certeira, eu preciso de algumas informações:",
      },
      {
        order: 3,
        title: "Informações necessárias",
        text: [
          "• Local do corpo",
          "• Tamanho aproximado em centímetros",
          "• Cor (só preta ou tem cor também?)",
          "• Uma foto bem nítida de frente, com boa iluminação",
        ].join("\n"),
      },
      {
        order: 4,
        text: "Você consegue me enviar essas informações e uma foto aqui mesmo? A partir disso já conseguimos te orientar bem melhor sobre sessões e investimento.",
      },
    ],
  },
  {
    id: "ORCAMENTO_MICRO_PADRAO",
    intentName: "ORCAMENTO_REMOVER_MICRO",
    title: "Orçamento – Remoção de micropigmentação",
    description:
      "Fluxo padrão para orientar e pedir fotos da sobrancelha com micro.",
    tags: ["orcamento", "micro", "sobrancelha"],
    steps: [
      {
        order: 1,
        text: "Perfeito, {{nomeOpcional}}! Vamos ver essa sobrancelha ✨",
      },
      {
        order: 2,
        text: "Pra te orientar direitinho sobre remoção de micropigmentação, me manda por favor:",
      },
      {
        order: 3,
        title: "Informações necessárias",
        text: [
          "• Uma foto de frente, olhando pra câmera",
          "• Uma foto mais aproximada de cada sobrancelha",
          "• Quanto tempo faz que você fez a micro?",
          "• Se já fez algum outro procedimento em cima (ex.: retoque, nova micro, laser, etc.)",
        ].join("\n"),
      },
      {
        order: 4,
        text: "Com essas informações eu já consigo te explicar melhor quantas sessões, cuidados e próximos passos.",
      },
    ],
  },
  {
    id: "DOR_MEDO_ACOLHIMENTO",
    intentName: "DOR_MEDO",
    title: "Acolhimento – Dor e medo",
    description:
      "Script para acolher medo de dor, cicatriz ou consequências do procedimento.",
    tags: ["dor", "medo", "acolhimento"],
    steps: [
      {
        order: 1,
        text: "Entendo seu medo, {{nomeOpcional}}, e é super normal sentir isso 🙏",
      },
      {
        order: 2,
        text: "A tecnologia de laser que usamos hoje é muito mais segura e confortável do que antigamente.",
      },
      {
        order: 3,
        text: "A sensação varia de pessoa pra pessoa, mas a maioria descreve como \"borrachinhas estalando\" na pele.",
      },
      {
        order: 4,
        text: "Usamos parâmetros de energia seguros, técnicas para conforto e todo o protocolo de proteção da pele.",
      },
      {
        order: 5,
        text: "Se você quiser, posso te explicar passo a passo como funciona a sessão ou já te encaminho pra falar com um especialista humano pra tirar todas as suas dúvidas.",
      },
    ],
  },
  {
    id: "INFO_PROCEDIMENTO_GERAL",
    intentName: "INFORMACAO_PROCEDIMENTO",
    title: "Explicação geral do procedimento",
    description:
      "Explicação padrão sobre como funciona a remoção a laser, sessões e fatores que influenciam.",
    tags: ["informacao", "procedimento", "explicacao"],
    steps: [
      {
        order: 1,
        text: "A remoção é feita com um laser específico para pigmento, que fragmenta a tinta em partículas menores.",
      },
      {
        order: 2,
        text: "Depois, o próprio corpo vai eliminando esses fragmentos aos poucos através do sistema imunológico.",
      },
      {
        order: 3,
        text: "Na prática, funciona em sessões com intervalo entre elas para a pele se recuperar direitinho.",
      },
      {
        order: 4,
        title: "O que pode influenciar na quantidade de sessões?",
        text: [
          "• Tipo e cor do pigmento",
          "• Profundidade que foi aplicado",
          "• Tempo que foi feito",
          "• Resposta do seu organismo",
        ].join("\n"),
      },
      {
        order: 5,
        text: "Se você me disser se é tatuagem ou micro de sobrancelha, e mandar uma foto, eu consigo te orientar de forma bem mais específica 😉",
      },
    ],
  },
  {
    id: "FALLBACK_ATENDIMENTO_HUMANO",
    intentName: "FALLBACK",
    title: "Fallback – Encaminhar para humano",
    description:
      "Script quando o robô não entendeu bem a mensagem e precisa passar para atendimento humano.",
    tags: ["fallback", "humano"],
    steps: [
      {
        order: 1,
        text: "Recebi sua mensagem, mas não tenho certeza se entendi bem pra te responder automático aqui.",
      },
      {
        order: 2,
        text: "Vou encaminhar para atendimento humano analisar com carinho e te responder da melhor forma possível, tudo bem?",
      },
    ],
  },

  // PLAYBOOKS EXTRAS – FOLLOW-UP, PÓS-SESSÃO, REATIVAÇÃO
  {
    id: "FOLLOWUP_POS_AVALIACAO_SEM_FECHAMENTO",
    intentName: null,
    title: "Follow-up – Pós avaliação sem fechamento",
    description:
      "Script para entrar em contato com quem passou por avaliação, mas ainda não fechou o procedimento.",
    tags: ["followup", "avaliacao", "fechamento"],
    steps: [
      {
        order: 1,
        text: "Oi, {{nomeOpcional}}! Aqui é o time da RT Laser 😊",
      },
      {
        order: 2,
        text: "Vimos que você passou pela avaliação e ficou de pensar sobre a remoção. Só tô passando pra saber se ficou alguma dúvida ou receio que a gente possa te ajudar a esclarecer.",
      },
      {
        order: 3,
        text: "Se quiser, posso te lembrar rapidamente dos principais pontos que vimos na avaliação e dos próximos passos 😉",
      },
    ],
  },
  {
    id: "FOLLOWUP_POS_SESSAO_CUIDADOS",
    intentName: null,
    title: "Pós-sessão – Cuidados e proximos passos",
    description:
      "Mensagem padrão para enviar após a sessão, reforçando cuidados e fazendo check-in com o cliente.",
    tags: ["pos-sessao", "cuidados", "relacao"],
    steps: [
      {
        order: 1,
        text: "Oi, {{nomeOpcional}}! Tudo bem? Aqui é o time da RT Laser passando pra saber como você está após a sessão de hoje 👋",
      },
      {
        order: 2,
        text: "Lembrando alguns cuidados importantes:",
      },
      {
        order: 3,
        text: [
          "• Evitar sol direto na região",
          "• Não coçar ou arrancar casquinhas",
          "• Manter a área limpa e seca, conforme orientado",
          "• Usar os produtos/protetor indicados pelo profissional",
        ].join("\n"),
      },
      {
        order: 4,
        text: "Qualquer desconforto fora do esperado, manda uma mensagem aqui pra gente, tá? Estamos acompanhando seu processo de perto 💚",
      },
    ],
  },
  {
    id: "REATIVACAO_CLIENTE_PARADO",
    intentName: null,
    title: "Reativação – Cliente parou no meio do tratamento",
    description:
      "Script para retomar contato com cliente que iniciou sessões, mas está parado há algum tempo.",
    tags: ["reativacao", "cliente-parado", "engajamento"],
    steps: [
      {
        order: 1,
        text: "Oi, {{nomeOpcional}}! Tudo bem? Aqui é o time da RT Laser 👋",
      },
      {
        order: 2,
        text: "Acompanhando seu histórico, vimos que você iniciou o processo de remoção, mas está há algum tempo sem sessões.",
      },
      {
        order: 3,
        text: "Queria entender se houve alguma dificuldade, se ficou alguma dúvida ou se aconteceu algo no caminho. Podemos te ajudar com informação, ajuste de horário ou o que você precisar 😉",
      },
      {
        order: 4,
        text: "Se fizer sentido pra você, podemos rever seu caso e ver qual o melhor plano pra retomar de onde parou.",
      },
    ],
  },
  {
    id: "FOLLOWUP_ORCAMENTO_NAO_RESPONDEU",
    intentName: null,
    title: "Follow-up – Enviou orçamento e cliente não respondeu",
    description:
      "Mensagem para dar sequência em leads que receberam valor/explicação e depois sumiram.",
    tags: ["followup", "orcamento", "lead-frio"],
    steps: [
      {
        order: 1,
        text: "Oi, {{nomeOpcional}}! Tudo bem? Aqui é o time da RT Laser 👋",
      },
      {
        order: 2,
        text: "Passando só pra saber se conseguiu ver as informações e valores que te enviamos sobre a remoção 😊",
      },
      {
        order: 3,
        text: "Se ficou alguma dúvida, se quiser comparar opções ou ajustar algo (forma de pagamento, horário, unidade), me fala aqui que a gente vê a melhor forma de te ajudar.",
      },
    ],
  },
];
