// Client-seitige Funktionen zum Senden von E-Mails über die API

export interface SendEmailParams {
  type: 'booking_confirmation' | 'reminder' | 'cancellation';
  data: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    barberName: string;
    serviceName: string;
    date: string;
    time: string;
    duration?: number;
    price?: string;
    reason?: string;
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
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  price: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    type: 'booking_confirmation',
    data,
  });
}

// Stornierungsbestätigung senden
export async function sendCancellationEmail(data: {
  customerName: string;
  customerEmail: string;
  barberName: string;
  serviceName: string;
  date: string;
  time: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    type: 'cancellation',
    data,
  });
}
