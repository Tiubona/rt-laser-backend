// src/modules/clinicorpClient/clinicorpClient.service.ts

import {
  ClinicorpConfigInfo,
  ClinicorpPatientLookupInput,
  ClinicorpSchedulePreviewInput,
  ClinicorpPreparedRequest,
  ClinicorpHttpResult,
} from "./clinicorpClient.types";

/**
 * Lê configurações da API Clinicorp a partir de variáveis de ambiente.
 *
 * Esperadas:
 * - CLINICORP_API_BASE_URL
 * - CLINICORP_API_TOKEN
 * - CLINICORP_API_ENABLED (opcional: "true" / "false")
 */
export function getClinicorpConfig(): ClinicorpConfigInfo {
  const baseUrl = process.env.CLINICORP_API_BASE_URL || null;
  const apiToken = process.env.CLINICORP_API_TOKEN || "";
  const enabledEnv = process.env.CLINICORP_API_ENABLED || "";

  const apiTokenPresent = apiToken.trim().length > 0;
  const enabled =
    enabledEnv.trim().toLowerCase() === "true" && !!baseUrl && apiTokenPresent;

  return {
    baseUrl,
    apiTokenPresent,
    enabled,
  };
}

function ensureBaseUrl(): string {
  const baseUrl = process.env.CLINICORP_API_BASE_URL || "";
  if (!baseUrl.trim()) {
    throw new Error(
      "CLINICORP_API_BASE_URL não configurada. Defina no .env antes de ativar integrações reais."
    );
  }
  return baseUrl.replace(/\/+$/, "");
}

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = process.env.CLINICORP_API_TOKEN || "";
  if (token.trim()) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Prepara uma requisição para BUSCAR paciente no Clinicorp.
 * (preview)
 */
export function prepareClinicorpPatientLookupRequest(
  input: ClinicorpPatientLookupInput
): ClinicorpPreparedRequest {
  const baseUrl = ensureBaseUrl();
  const headers = buildAuthHeaders();

  const queryParam = encodeURIComponent(input.query.trim());
  const url = `${baseUrl}/patients/search?query=${queryParam}`;

  const prepared: ClinicorpPreparedRequest = {
    url,
    method: "GET",
    headers,
  };

  return prepared;
}

/**
 * Prepara uma requisição para visualizar disponibilidade/agenda.
 * (preview)
 */
export function prepareClinicorpSchedulePreviewRequest(
  input: ClinicorpSchedulePreviewInput
): ClinicorpPreparedRequest {
  const baseUrl = ensureBaseUrl();
  const headers = buildAuthHeaders();

  const url = `${baseUrl}/schedule/preview`;

  const body = {
    date: input.date || null,
    professionalId: input.professionalId || null,
    serviceId: input.serviceId || null,
    meta: {
      source: "rt-laser-backend",
      environment: process.env.NODE_ENV || "development",
    },
  };

  const prepared: ClinicorpPreparedRequest = {
    url,
    method: "POST",
    headers,
    body,
  };

  return prepared;
}

/**
 * Executa de fato a requisição à API Clinicorp,
 * usando um preparedRequest como base.
 */
export async function performClinicorpRequest(
  prepared: ClinicorpPreparedRequest
): Promise<ClinicorpHttpResult> {
  const config = getClinicorpConfig();

  if (!config.enabled) {
    return {
      success: false,
      errorMessage:
        "Clinicorp API não está habilitada (ver CLINICORP_API_ENABLED, baseUrl e token).",
      prepared,
    };
  }

  try {
    const response = await fetch(prepared.url, {
      method: prepared.method,
      headers: prepared.headers,
      body:
        prepared.method === "POST" && prepared.body
          ? JSON.stringify(prepared.body)
          : undefined,
    });

    let responseBody: any = null;
    try {
      responseBody = await response.json();
    } catch {
      // se não for JSON, ignoramos o parse
    }

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        errorMessage:
          (responseBody && responseBody.message) ||
          `Falha ao chamar Clinicorp (status ${response.status}).`,
        rawResponseBody: responseBody,
        prepared,
      };
    }

    return {
      success: true,
      statusCode: response.status,
      rawResponseBody: responseBody,
      prepared,
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage:
        err?.message ||
        "Erro de rede ou ambiente ao tentar chamar a API Clinicorp.",
      prepared,
    };
  }
}

/**
 * Atalhos de alto nível (real HTTP) para uso no router.
 */

export async function searchPatientOnClinicorp(
  input: ClinicorpPatientLookupInput
): Promise<ClinicorpHttpResult> {
  const prepared = prepareClinicorpPatientLookupRequest(input);
  return performClinicorpRequest(prepared);
}

export async function checkScheduleOnClinicorp(
  input: ClinicorpSchedulePreviewInput
): Promise<ClinicorpHttpResult> {
  const prepared = prepareClinicorpSchedulePreviewRequest(input);
  return performClinicorpRequest(prepared);
}
