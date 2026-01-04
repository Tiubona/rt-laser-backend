import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const fromName = process.env.SMTP_FROM_NAME || 'RT Laser';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    await this.transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }
}

export const emailService = new EmailService();
