RT LASER – STACK DO ROBÔ + PAINEL ADMIN
=======================================

ESTRUTURA DE PASTAS
---------------------------------------
- rt-laser-backend-etapa1/
  Backend em Node/Express + Prisma.
  Responsável por:
    • Webhook do ChatGuru (/webhook/chatguru)
    • Intents, playbooks, IA assistiva
    • Limites, logs, métricas, relatórios
    • Integrações:
        - ChatGuru (envio de mensagens)
        - Clinicorp (pacientes + agenda, via endpoints admin)
        - Agendamento semi-automático (níveis 1, 2 e 3)

- admin-rtlaser/
  Frontend em Next.js/React.
  Responsável por:
    • Painel administrador RT Laser
    • Configuração de modos/limites
    • Visualização de logs, métricas e relatórios
    • Telas de laboratório ChatGuru (/chatguru)
    • Tela de laboratório Clinicorp (/clinicorp)
    • Telas de IA assistiva, playbooks, etc. (conforme fases do projeto)

---------------------------------------
1) COMO PREPARAR O BACKEND
---------------------------------------

1.1) Entrar na pasta:

  cd rt-laser-backend-etapa1

1.2) Criar o arquivo de ambiente a partir do exemplo:

  cp .env.example .env

Editar o `.env` e configurar principalmente:

  • DATABASE_URL
  • JWT_SECRET
  • CHATGURU_API_BASE_URL / TOKEN (opcional)
  • CLINICORP_API_BASE_URL / TOKEN (opcional)
  • Flags de agendamento (ver seção 8)

1.3) Instalar dependências:

  npm install

1.4) Rodar migrações do Prisma (se banco estiver rodando):

  npx prisma migrate dev --name init_db

1.5) Subir o backend em modo desenvolvimento:

  npm run dev

Por padrão: porta 3001 (configurável via PORT no .env).

1.6) Endpoints principais:

  • GET /health
      - Status básico do serviço.

  • POST /webhook/chatguru
      - Webhook oficial do ChatGuru: todas as mensagens de WhatsApp
        passam por aqui para análise do robô.

  • Rotas /admin/*
      - Usadas exclusivamente pelo painel admin (admin-rtlaser).

IMPORTANTE:
  - O envio automático de respostas via ChatGuru pelo webhook
    só acontece se:
      • CHATGURU_API_BASE_URL configurada
      • CHATGURU_API_TOKEN configurado
      • CHATGURU_API_ENABLED=true
      • CHATGURU_AUTO_SEND_ENABLED=true

  - Enquanto isso estiver "false", o sistema funciona em modo
    laboratório: calcula reply, registra logs, mas não envia.

---------------------------------------
2) COMO PREPARAR O FRONTEND (ADMIN)
---------------------------------------

2.1) Entrar na pasta do admin:

  cd admin-rtlaser

2.2) Criar o arquivo de ambiente:

  cp .env.local.example .env.local

Ajustar se necessário:

  NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

2.3) Instalar dependências:

  npm install

2.4) Rodar em modo desenvolvimento:

  npm run dev

Por padrão, o Next sobe em:

  http://localhost:3000

---------------------------------------
3) LOGIN NO PAINEL ADMIN
---------------------------------------

O sistema possui autenticação admin (JWT).

Fluxo padrão:

  - Acessar: http://localhost:3000
  - Informar e-mail/senha do admin (conforme seed / config interna)
  - Após login, o admin pode:
      • Ver logs (/logs)
      • Ver métricas (/metrics, se implementado)
      • Configurar limites/modos (/config, etc.)
      • Usar tela ChatGuru (/chatguru)
      • Usar tela Clinicorp (/clinicorp)
      • Usar módulos de IA assistiva (/ai, etc.)

---------------------------------------
4) LABORATÓRIO CHATGURU
---------------------------------------

No painel admin:

  - Tela: /chatguru

Permite:

  • Ver status da configuração ChatGuru:
      - baseUrl
      - se há token
      - se a API está marcada como "enabled"

  • Gerar PREVIEW de requisição (sem envio real):
      - POST /admin/chatguru/preview-text

  • Enviar mensagem REAL de teste (admin-only):
      - POST /admin/chatguru/send-text

Envio automático pelo webhook é controlado por:

  - CHATGURU_API_ENABLED
  - CHATGURU_AUTO_SEND_ENABLED

Se qualquer um estiver desligado → sem auto-send, apenas cálculo interno.

---------------------------------------
5) LABORATÓRIO CLINICORP
---------------------------------------

No painel admin:

  - Tela: /clinicorp

Funcionalidades:

  • Ver status da config Clinicorp:
      - baseUrl
      - token presente
      - CLINICORP_API_ENABLED

  • PREVIEW (sem chamadas reais):
      - Buscar paciente (preview-patient)
      - Consultar agenda (preview-schedule)

  • Chamadas REAIS (admin-only):
      - Buscar paciente:
          POST /admin/clinicorp/search-patient
      - Consultar agenda:
          POST /admin/clinicorp/check-schedule

Nada disso está ligado diretamente ao webhook por padrão;
são ferramentas de laboratório / apoio ao atendimento.

---------------------------------------
6) MODO DE ATENDIMENTO E SEGURANÇA
---------------------------------------

Configuração no backend (.env):

  ROBOT_ATENDIMENTO_MODE=
    • HUMANO
    • AUTO
    • MISTO

  ROBOT_ENABLED=true/false
  ROBOT_HORARIO_INICIO=HH:mm
  ROBOT_HORARIO_FIM=HH:mm
  ROBOT_TIMEZONE=America/Sao_Paulo

Comportamento:

  • HUMANO:
      - Robô nunca responde diretamente.
      - Sempre handoffToHuman = true.

  • AUTO:
      - Robô responde sempre que possível
        (respeitando limite de mensagens automáticas por contato).

  • MISTO:
      - Algumas intents pré-definidas o robô responde sozinho
        (ex.: SAUDACAO, ORCAMENTO_REMOVER_TATUAGEM, ORCAMENTO_REMOVER_MICRO).
      - Outras intents são encaminhadas diretamente para humano.

Limitador de mensagens automáticas:

  AUTO_REPLY_LIMIT_PER_CONTACT_PER_DAY

    - Ex.: 5 → máx. 5 respostas automáticas por dia por contato.
    - Ao estourar o limite:
        • o robô para de responder automaticamente
        • handoffToHuman passa a ser true.

---------------------------------------
7) LOGS E MONITORAMENTO
---------------------------------------

Backend registra:

  - AdminLog (tabela de logs administrativos):
      • WEBHOOK_MESSAGE
      • WEBHOOK_ERROR
      • LOGIN
      • CONFIG_CHANGE
      • etc.

  - WebhookMessageRecord:
      • intentName
      • handoffToHuman
      • ignored

Nas entradas de WEBHOOK_MESSAGE no AdminLog:

  data inclui, entre outros:

    - intentName
    - handoffToHuman
    - reason
    - aiSuggestionText  (texto gerado pela IA assistiva)
    - chatGuruSendInfo  (detalhes de envio automático, se houver)
    - clinicorpScheduleInfo (quando agendamento estiver habilitado)

---------------------------------------
8) AGENDAMENTO – NÍVEIS 1, 2 E 3
---------------------------------------

O sistema de agendamento foi desenhado em camadas de segurança:

NÍVEL 1 – PROBE DE AGENDA (INTERNO)
-----------------------------------
Controlado por:

  CLINICORP_SCHEDULING_PROBE_ENABLED
  CLINICORP_SCHED_DEFAULT_PROFESSIONAL_ID
  CLINICORP_SCHED_DEFAULT_SERVICE_ID

Comportamento:

  - Quando a intent é de agendamento (ex.:
      AGENDAR_AVALIACAO_TATUAGEM,
      AGENDAR_AVALIACAO_MICRO,
      AGENDAR_AVALIACAO_GERAL,
      AGENDAR_RETORNO, etc.)
  - Se CLINICORP_SCHEDULING_PROBE_ENABLED=true
    e CLINICORP_API_ENABLED=true (com baseUrl e token configurados),
  - O backend faz uma chamada de consulta de agenda ao Clinicorp
    usando os IDs padrão configurados.
  - O resultado bruto é guardado em:
      AdminLog.data.clinicorpScheduleInfo
  - Nada é confirmado para o cliente nesta etapa.

Uso:
  - A equipe olha o log e enxerga a disponibilidade do Clinicorp
    no contexto daquela conversa.

NÍVEL 2 – IA ASSISTIVA PARA AGENDAMENTO
---------------------------------------
Sem alterar a resposta automática ao cliente.

Comportamento:

  - Para intents de agendamento, o backend usa:
      • Texto original do cliente
      • Nome da intent
      • clinicorpScheduleInfo (se existir)
  - Gera uma sugestão de resposta completa, pensada para:
      “Texto que o ATENDENTE HUMANO pode copiar, adaptar e enviar.”
  - Essa sugestão fica em:
      AdminLog.data.aiSuggestionText

Importante:
  - Essa resposta NUNCA é enviada direto ao cliente.
  - Serve apenas como apoio ao atendente.

NÍVEL 3 – PRIMEIRA PERGUNTA AUTOMÁTICA
---------------------------------------
Controlado por:

  SCHEDULING_FIRST_QUESTION_ENABLED
  SCHEDULING_FIRST_QUESTION_TEXT

Comportamento:

  - Se:
      • a intenção é de agendamento
      • ROBOT_ATENDIMENTO_MODE ≠ HUMANO
      • ainda não existe outra reply definida
      • SCHEDULING_FIRST_QUESTION_ENABLED=true
    então:

    - reply do webhook passa a ser a PRIMEIRA pergunta automática,
      por exemplo:
        “Perfeito! Para agilizar seu atendimento, qual é o melhor dia
         e período para você? Manhã, tarde ou noite?”

  - Essa pergunta:
      • não confirma horários
      • não marca nada no Clinicorp
      • apenas coleta informação inicial do cliente

  - A conversa segue com apoio do humano, que:
      • vê clinicorpScheduleInfo nos logs
      • vê aiSuggestionText com mensagens prontas
      • usa as respostas do cliente para fechar o horário.

---------------------------------------
9) VISÃO GERAL DO ESTADO ATUAL
---------------------------------------

Com os arquivos e módulos criados, a stack atual permite:

  • Rodar backend e painel admin localmente.
  • Operar o robô em modos HUMANO / AUTO / MISTO.
  • Ativar/desativar envio automático ChatGuru via .env.
  • Integrar com Clinicorp via endpoints admin (laboratório).
  • Usar agendamento semi-automático em 3 níveis:
      - Nível 1: probe de agenda (interno).
      - Nível 2: texto pronto de agendamento para o atendente.
      - Nível 3: primeira pergunta automática ao cliente (sem marcar).

Toda decisão “crítica” (enviar automático, consultar agenda, iniciar fluxo de agendamento) é controlada por flags no .env, para você ligar/desligar rapidamente conforme estratégia.

---------------------------------------
FIM DO README
---------------------------------------
