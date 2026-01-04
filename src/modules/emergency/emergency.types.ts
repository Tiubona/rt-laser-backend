// src/modules/emergency/emergency.types.ts

export interface EmergencyEmailDTO {
  id: number;
  name: string;
  email: string;
  active: boolean;
  createdAt?: string;
}

export interface CreateEmergencyEmailBody {
  name: string;
  email: string;
}

export interface EmergencyAlertBody {
  subject?: string;
  message: string;
}
