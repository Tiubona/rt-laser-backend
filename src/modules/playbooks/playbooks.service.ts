// src/modules/playbooks/playbooks.service.ts

import { PLAYBOOKS } from "./playbooks.data";
import {
  PlaybookDefinitionDTO,
  PlaybookStepDTO,
} from "./playbooks.types";

export function listPlaybooks(): PlaybookDefinitionDTO[] {
  return PLAYBOOKS.slice().sort((a, b) => a.id.localeCompare(b.id));
}

export function getPlaybookById(
  id: string
): PlaybookDefinitionDTO | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}

export function getPlaybookByIntentName(
  intentName: string
): PlaybookDefinitionDTO | undefined {
  return PLAYBOOKS.find(
    (p) =>
      p.intentName &&
      p.intentName.toUpperCase() === intentName.toUpperCase()
  );
}

/**
 * Junta os steps de um playbook em um único texto,
 * substituindo {{nomeOpcional}} se fornecido.
 */
export function buildTextFromPlaybook(
  playbook: PlaybookDefinitionDTO,
  contactName?: string | null
): string {
  const nome =
    (contactName || "").trim() ||
    ""; // se vazio, removemos o placeholder depois

  const parts: string[] = [];

  const stepsOrdered: PlaybookStepDTO[] = playbook.steps
    .slice()
    .sort((a, b) => a.order - b.order);

  for (const step of stepsOrdered) {
    let text = step.text || "";

    if (nome) {
      text = text.replace("{{nomeOpcional}}", nome);
    } else {
      text = text.replace("{{nomeOpcional}}", "").replace("  ", " ");
    }

    parts.push(text.trim());
  }

  return parts.filter(Boolean).join("\n\n");
}
