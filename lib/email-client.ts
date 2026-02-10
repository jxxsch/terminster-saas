// Client-seitige Funktionen zum Senden von E-Mails über die API

export interface SendEmailParams {
  type: 'booking_confirmation' | 'reminder' | 'reschedule';
  data: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    barberName?: string;
    barberImage?: string;
    imagePosition?: string;
    imageScale?: number;
    serviceName: string;
    date?: string;
    time?: string;
    duration?: number;
    price?: string;
    appointmentId?: string;
    // Reschedule-spezifisch
    oldBarberName?: string;
    oldBarberImage?: string;
    oldImagePosition?: string;
    oldDate?: string;
    oldTime?: string;
    newBarberName?: string;
    newBarberImage?: string;
    newImagePosition?: string;
    newImageScale?: number;
    newDate?: string;
    newTime?: string;
    barberChanged?: boolean;
  };
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'E-Mail-Versand fehlgeschlagen' };
    }

    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: 'Netzwerkfehler beim E-Mail-Versand' };
  }
}

// Buchungsbestätigung senden
export async function sendBookingConfirmationEmail(data: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  barberName: string;
  barberImage?: string;
  imagePosition?: string;
  imageScale?: number;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  price: string;
  appointmentId: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    type: 'booking_confirmation',
    data,
  });
}

// Terminverschiebungs-E-Mail senden
export async function sendRescheduleEmail(data: {
  customerName: string;
  customerEmail: string;
  oldBarberName: string;
  oldBarberImage?: string;
  oldImagePosition?: string;
  oldDate: string;
  oldTime: string;
  newBarberName: string;
  newBarberImage?: string;
  newImagePosition?: string;
  newImageScale?: number;
  newDate: string;
  newTime: string;
  serviceName: string;
  duration: number;
  price: string;
  appointmentId: string;
  barberChanged: boolean;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    type: 'reschedule',
    data,
  });
}

