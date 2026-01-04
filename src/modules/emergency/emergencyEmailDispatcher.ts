import { emailService } from '../../services/email.service';

export interface EmergencyEmail {
  id: string;
  name: string;
  email: string;
}

export class EmergencyEmailDispatcher {
  constructor(
    private readonly getEmailsCallback: () => EmergencyEmail[]
  ) {}

  async sendToAll(subject: string, message: string): Promise<void> {
    const emails = this.getEmailsCallback();

    if (emails.length === 0) {
      console.warn('⚠️ Nenhum e-mail de emergência cadastrado.');
      return;
    }

    for (const entry of emails) {
      try {
        await emailService.sendEmail({
          to: entry.email,
          subject,
          text: message,
          html: `<p>${message}</p>`,
        });

        console.log(`📨 E-mail de emergência enviado para: ${entry.email}`);
      } catch (error) {
        console.error(`❌ Falha ao enviar e-mail para: ${entry.email}`, error);
      }
    }
  }
}
