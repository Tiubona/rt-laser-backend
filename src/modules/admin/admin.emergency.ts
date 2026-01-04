import { EmergencyEmailDispatcher, EmergencyEmail } from "../emergency/emergencyEmailDispatcher";

// Lista em memória de e-mails de emergência
let emergencyEmails: EmergencyEmail[] = [
  {
    id: "1",
    name: "Admin RT Laser",
    email: "admin@rtlaser.com",
  },
];

// Dispatcher que usa a lista acima
const dispatcher = new EmergencyEmailDispatcher(() => emergencyEmails);

export const adminEmergencyService = {
  listEmails(): EmergencyEmail[] {
    return emergencyEmails;
  },

  addEmail(name: string, email: string): EmergencyEmail {
    const newEmail: EmergencyEmail = {
      id: Date.now().toString(),
      name,
      email,
    };

    emergencyEmails.push(newEmail);
    return newEmail;
  },

  deleteEmail(id: string): void {
    emergencyEmails = emergencyEmails.filter((item) => item.id !== id);
  },

  async sendEmergencyAlert(subject: string, message: string): Promise<void> {
    await dispatcher.sendToAll(subject, message);
  },
};
