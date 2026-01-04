// src/modules/config/personas.config.ts

export type PersonaId = "julia" | "laura";

export interface PersonaDefinition {
  id: PersonaId;
  displayName: string;
  label: string; // prefixo usado nas mensagens, ex: **Júlia:**
  role: string;
  emojiAllowed: boolean;
  canSendPricing: boolean;
  canRequestPhotos: boolean;
  canExplainProcedures: boolean;
  canConvertLead: boolean;
  initialGreetings: string[];
  closingMessages: string[];
}

export interface PersonaSchedule {
  id: string;
  label: string;
  personaId: PersonaId;
  daysOfWeek: number[]; // 0 = domingo, 1 = segunda, ..., 6 = sábado
  startTime: string;    // "HH:mm"
  endTime: string;      // "HH:mm"
  enabled: boolean;
}

export interface HolidayOverride {
  date: string;      // "YYYY-MM-DD"
  personaId: PersonaId;
  label?: string;    // ex.: "Natal"
}

export interface PersonasConfig {
  defaultTimezone: string;
  personas: Record<PersonaId, PersonaDefinition>;
  schedules: PersonaSchedule[];
  holidayOverrides: HolidayOverride[];
}

export const personasConfig: PersonasConfig = {
  defaultTimezone: "America/Sao_Paulo",

  personas: {
    julia: {
      id: "julia",
      displayName: "Júlia",
      label: "**Júlia:**",
      role: "atendimento_expediente",
      emojiAllowed: true,
      canSendPricing: true,
      canRequestPhotos: true,
      canExplainProcedures: true,
      canConvertLead: true,
      initialGreetings: [
        "Oi! Aqui é a **Júlia** da RT Laser 😊 Como posso te ajudar hoje?",
        "Olá! Aqui é a **Júlia**, da equipe RT Laser. Me conta o que você precisa?",
        "Bom dia! Aqui é a **Júlia**. Como posso te orientar?",
        "Oiê! **Júlia** falando. Como posso te ajudar por aí?",
        "Olá! Que bom falar com você! Aqui é a **Júlia**, posso ajudar?"
      ],
      closingMessages: [
        "**Júlia:** Qualquer coisa me chama ❤️",
        "**Júlia:** Fico à disposição sempre 💛",
        "**Júlia:** Pode contar comigo!",
        "**Júlia:** Se precisar, me manda aqui!"
      ]
    },

    laura: {
      id: "laura",
      displayName: "Laura",
      label: "**Laura:**",
      role: "atendimento_fora_expediente",
      emojiAllowed: false,
      canSendPricing: false,
      canRequestPhotos: false,
      canExplainProcedures: false,
      canConvertLead: false,
      initialGreetings: [
        "Oi! Aqui é a **Laura**. Nosso horário de atendimento é das 07h às 20h, mas já deixei tudo separadinho aqui pra te responder direitinho assim que abrirmos, tudo bem?",
        "Olá! Aqui é a **Laura**. Estamos fora do horário, mas deixei sua mensagem organizadinha pra te responder certinho no próximo período de atendimento.",
        "Oi! Sou a **Laura**. Assim que iniciarmos o atendimento às 07h, já deixei sua mensagem priorizada pra Júlia te ajudar direitinho.",
        "Olá! Aqui é a **Laura**. Estamos fora do expediente agora, mas já separei sua mensagem pra responder com carinho assim que abrirmos."
      ],
      closingMessages: [
        "**Laura:** Assim que abrirmos, te respondemos certinho.",
        "**Laura:** Já deixei sua mensagem organizada para responder às 07h.",
        "**Laura:** Assim que o horário voltar, olhamos com carinho pra você."
      ]
    }
  },

  // Horários que definimos: Júlia no expediente, Laura fora
  schedules: [
    // Segunda a sexta – JÚLIA (07:00–19:59)
    {
      id: "weekday_business_julia",
      label: "Segunda a sexta – expediente (Júlia)",
      personaId: "julia",
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "07:00",
      endTime: "19:59",
      enabled: true
    },

    // Segunda a sexta – LAURA madrugada (00:00–06:59)
    {
      id: "weekday_early_laura",
      label: "Segunda a sexta – madrugada (Laura)",
      personaId: "laura",
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "00:00",
      endTime: "06:59",
      enabled: true
    },

    // Segunda a sexta – LAURA noite (20:00–23:59)
    {
      id: "weekday_night_laura",
      label: "Segunda a sexta – noite (Laura)",
      personaId: "laura",
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "20:00",
      endTime: "23:59",
      enabled: true
    },

    // Sábado – JÚLIA (07:00–16:59)
    {
      id: "saturday_business_julia",
      label: "Sábado – expediente (Júlia)",
      personaId: "julia",
      daysOfWeek: [6],
      startTime: "07:00",
      endTime: "16:59",
      enabled: true
    },

    // Sábado – LAURA (17:00–23:59)
    {
      id: "saturday_night_laura",
      label: "Sábado – noite (Laura)",
      personaId: "laura",
      daysOfWeek: [6],
      startTime: "17:00",
      endTime: "23:59",
      enabled: true
    },

    // Domingo – LAURA 24h
    {
      id: "sunday_all_laura",
      label: "Domingo – 24h (Laura)",
      personaId: "laura",
      daysOfWeek: [0],
      startTime: "00:00",
      endTime: "23:59",
      enabled: true
    }
  ],

  holidayOverrides: [
    // Exemplo:
    // { date: "2025-12-25", personaId: "laura", label: "Natal" }
  ]
};

export function getActivePersonaForDate(now: Date): PersonaDefinition {
  const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const day = now.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;

  // 1) Se for feriado, sempre usa a persona configurada ali
  const holiday = personasConfig.holidayOverrides.find(
    (h) => h.date === todayStr
  );
  if (holiday) {
    return personasConfig.personas[holiday.personaId];
  }

  // 2) Procura um schedule compatível com o dia + horário
  for (const schedule of personasConfig.schedules) {
    if (!schedule.enabled) continue;
    if (!schedule.daysOfWeek.includes(day)) continue;

    const [startH, startM] = schedule.startTime.split(":").map(Number);
    const [endH, endM] = schedule.endTime.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return personasConfig.personas[schedule.personaId];
    }
  }

  // 3) Fallback de segurança: Júlia
  return personasConfig.personas.julia;
}
