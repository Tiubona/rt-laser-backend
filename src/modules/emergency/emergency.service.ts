// src/modules/emergency/emergency.service.ts

import nodemailer from "nodemailer";
import { EmergencyEmail } from "@prisma/client";
import { emergencyStore } from "./emergency.store";
import { EmergencyAlertBody, EmergencyEmailDTO } from "./emergency.types";

function mapToDTO(email: EmergencyEmail): EmergencyEmailDTO {
  return {
    id: email.id,
    name: email.name,
    email: email.email,
    active: email.active,
    createdAt: email.createdAt?.toISOString?.(),
  };
}

export async function listEmergencyEmailsDTO(): Promise<EmergencyEmailDTO[]> {
  const emails = await emergencyStore.listAll();
  return emails.map(mapToDTO);
}

export async function createEmergencyEmailDTO(
  name: string,
  email: string
): Promise<EmergencyEmailDTO> {
  const created = await emergencyStore.create(name, email);
  return mapToDTO(created);
}

export async function deleteEmergencyEmailDTO(
  id: number
): Promise<boolean> {
  const deleted = await emergencyStore.softDelete(id);
  return !!deleted;
}

/**
 * Disparo de alerta de emergência
 * - Usa todos os e-mails ativos da tabela EmergencyEmail
 * - Envia um e-mail com subject + message
 *
 * IMPORTANTE:
 * - Depende das variáveis de ambiente para SMTP:
 *   EMERGENCY_MAIL_HOST
 *   EMERGENCY_MAIL_PORT
 *   EMERGENCY_MAIL_USER
 *   EMERGENCY_MAIL_PASS
 *   EMERGENCY_MAIL_FROM
 *
 * Se algo estiver faltando, a função não lança erro pra quebrar o sistema,
 * mas retorna false (falha no disparo).
 */
export async function sendEmergencyAlert(
  body: EmergencyAlertBody
): Promise<{ sent: number; success: boolean }> {
  const recipients = await emergencyStore.listActive();

  if (!recipients.length) {
    console.warn(
      "[Emergency] Nenhum e-mail de emergência ativo cadastrado."
    );
    return { sent: 0, success: false };
  }

  const {
    EMERGENCY_MAIL_HOST,
    EMERGENCY_MAIL_PORT,
    EMERGENCY_MAIL_USER,
    EMERGENCY_MAIL_PASS,
    EMERGENCY_MAIL_FROM,
  } = process.env;

  if (
    !EMERGENCY_MAIL_HOST ||
    !EMERGENCY_MAIL_PORT ||
    !EMERGENCY_MAIL_USER ||
    !EMERGENCY_MAIL_PASS ||
    !EMERGENCY_MAIL_FROM
  ) {
    console.warn(
      "[Emergency] Configuração SMTP de emergência incompleta. Verifique variáveis de ambiente."
    );
    return { sent: 0, success: false };
  }

  const transporter = nodemailer.createTransport({
    host: EMERGENCY_MAIL_HOST,
    port: Number(EMERGENCY_MAIL_PORT),
    secure: false,
    auth: {
      user: EMERGENCY_MAIL_USER,
      pass: EMERGENCY_MAIL_PASS,
    },
  });

  const subject =
    body.subject || "Alerta de Emergência – RT Laser (Sistema Automático)";
  const message = body.message;

  try {
    const info = await transporter.sendMail({
      from: EMERGENCY_MAIL_FROM,
      to: recipients.map((e) => e.email).join(","),
      subject,
      text: message,
    });

    console.log("[Emergency] Alert e-mail sent. MessageId:", info.messageId);

    return { sent: recipients.length, success: true };
  } catch (err) {
    console.error("[Emergency] Erro ao enviar e-mail de emergência:", err);
    return { sent: 0, success: false };
  }
}
