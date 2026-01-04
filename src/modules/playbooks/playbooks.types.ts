// src/modules/playbooks/playbooks.types.ts

export interface PlaybookStepDTO {
  order: number;
  title?: string;
  text: string;
}

export interface PlaybookDefinitionDTO {
  id: string;
  intentName?: string | null;
  title: string;
  description: string;
  tags?: string[];
  steps: PlaybookStepDTO[];
}
