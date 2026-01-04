// src/modules/clinicorpClient/clinicorpClient.types.ts

export interface ClinicorpConfigInfo {
  baseUrl: string | null;
  apiTokenPresent: boolean;
  enabled: boolean;
}

/**
 * Entrada genérica para busca de paciente.
 * Pode ser CPF, e-mail, telefone ou outro identificador.
 */
export interface ClinicorpPatientLookupInput {
  query: string;
}

/**
 * Entrada genérica para "preview" de agenda / disponibilidade.
 */
export interface ClinicorpSchedulePreviewInput {
  date?: string; // formato sugerido: YYYY-MM-DD
  professionalId?: string;
  serviceId?: string;
}

/**
 * Representa como seria a requisição HTTP para a API do Clinicorp.
 */
export interface ClinicorpPreparedRequest {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: any;
}

/**
 * Resultado de uma tentativa de chamada HTTP real à API Clinicorp.
 */
export interface ClinicorpHttpResult {
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  rawResponseBody?: any;
  prepared: ClinicorpPreparedRequest;
}
