import { Resend } from 'resend';

// Resend Client initialisieren
const resend = new Resend(process.env.RESEND_API_KEY);

// Absender-E-Mail (muss in Resend verifiziert sein)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@beban-barbershop.de';
const FROM_NAME = 'Beban Barbershop';

// Typen
export interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  barberName: string;
  serviceName: string;
  date: string; // Format: "Montag, 20. Januar 2026"
  time: string; // Format: "14:00"
  duration: number; // in Minuten
  price: string; // Format: "20,00 €"
}

export interface CancellationEmailData {
  customerName: string;
  customerEmail: string;
  barberName: string;
  serviceName: string;
  date: string;
  time: string;
  reason?: string;
}

export interface ReminderEmailData {
  customerName: string;
  customerEmail: string;
  barberName: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
}

// Buchungsbestätigung senden
export async function sendBookingConfirmation(data: BookingEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `Terminbestätigung - ${data.date} um ${data.time}`,
      html: generateBookingConfirmationHtml(data),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email sending failed:', err);
    return { success: false, error: 'E-Mail konnte nicht gesendet werden' };
  }
}

// Terminerinnerung senden
export async function sendAppointmentReminder(data: ReminderEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `Erinnerung: Termin morgen um ${data.time}`,
      html: generateReminderHtml(data),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email sending failed:', err);
    return { success: false, error: 'E-Mail konnte nicht gesendet werden' };
  }
}

// Stornierungsbestätigung senden
export async function sendCancellationConfirmation(data: CancellationEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `Termin storniert - ${data.date}`,
      html: generateCancellationHtml(data),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email sending failed:', err);
    return { success: false, error: 'E-Mail konnte nicht gesendet werden' };
  }
}

// HTML-Templates

function generateBookingConfirmationHtml(data: BookingEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #d4a853; font-size: 24px; font-weight: 300; letter-spacing: 2px;">BEBAN</h1>
              <p style="margin: 8px 0 0; color: #888888; font-size: 12px; letter-spacing: 1px;">BARBERSHOP</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 24px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                Termin bestätigt ✓
              </h2>

              <p style="margin: 0 0 24px; color: #666666; font-size: 15px; line-height: 1.6;">
                Hallo ${data.customerName},<br><br>
                dein Termin wurde erfolgreich gebucht. Hier sind die Details:
              </p>

              <!-- Appointment Details Box -->
              <table role="presentation" style="width: 100%; background-color: #fafafa; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 13px;">Datum</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.date}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 13px;">Uhrzeit</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.time} Uhr</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 13px;">Service</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.serviceName}</span>
                          <span style="color: #999999; font-size: 13px;"> (${data.duration} Min.)</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 13px;">Barber</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.barberName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #999999; font-size: 13px;">Preis</span><br>
                          <span style="color: #d4a853; font-size: 17px; font-weight: 600;">${data.price}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; color: #666666; font-size: 14px; line-height: 1.6;">
                Falls du den Termin absagen oder verschieben möchtest, kontaktiere uns bitte rechtzeitig.
              </p>

              <!-- Location -->
              <table role="presentation" style="width: 100%; background-color: #1a1a1a; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 4px; color: #d4a853; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Adresse</p>
                    <p style="margin: 0; color: #ffffff; font-size: 14px; line-height: 1.5;">
                      Hauptstraße 123<br>
                      12345 Musterstadt
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Beban Barbershop<br>
                Diese E-Mail wurde automatisch gesendet.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function generateReminderHtml(data: ReminderEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #d4a853; font-size: 24px; font-weight: 300; letter-spacing: 2px;">BEBAN</h1>
              <p style="margin: 8px 0 0; color: #888888; font-size: 12px; letter-spacing: 1px;">BARBERSHOP</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 24px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                Erinnerung: Dein Termin morgen 📅
              </h2>

              <p style="margin: 0 0 24px; color: #666666; font-size: 15px; line-height: 1.6;">
                Hallo ${data.customerName},<br><br>
                wir möchten dich an deinen morgigen Termin erinnern:
              </p>

              <!-- Appointment Details Box -->
              <table role="presentation" style="width: 100%; background-color: #fafafa; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 13px;">Datum</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.date}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 13px;">Uhrzeit</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.time} Uhr</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 13px;">Service</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.serviceName}</span>
                          <span style="color: #999999; font-size: 13px;"> (${data.duration} Min.)</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #999999; font-size: 13px;">Barber</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.barberName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Wir freuen uns auf deinen Besuch!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Beban Barbershop<br>
                Diese E-Mail wurde automatisch gesendet.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function generateCancellationHtml(data: CancellationEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #d4a853; font-size: 24px; font-weight: 300; letter-spacing: 2px;">BEBAN</h1>
              <p style="margin: 8px 0 0; color: #888888; font-size: 12px; letter-spacing: 1px;">BARBERSHOP</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 24px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                Termin storniert
              </h2>

              <p style="margin: 0 0 24px; color: #666666; font-size: 15px; line-height: 1.6;">
                Hallo ${data.customerName},<br><br>
                dein folgender Termin wurde storniert:
              </p>

              <!-- Appointment Details Box -->
              <table role="presentation" style="width: 100%; background-color: #fafafa; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 13px;">Datum</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500; text-decoration: line-through;">${data.date}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 13px;">Uhrzeit</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500; text-decoration: line-through;">${data.time} Uhr</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 13px;">Service</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.serviceName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #999999; font-size: 13px;">Barber</span><br>
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.barberName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${data.reason ? `
              <p style="margin: 0 0 24px; color: #666666; font-size: 14px; line-height: 1.6;">
                <strong>Grund:</strong> ${data.reason}
              </p>
              ` : ''}

              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Du kannst jederzeit einen neuen Termin buchen. Wir freuen uns auf deinen nächsten Besuch!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Beban Barbershop<br>
                Diese E-Mail wurde automatisch gesendet.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// PIN-Reset E-Mail senden
export async function sendPinResetEmail(email: string, pin: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: 'Verwaltungs-PIN zurückgesetzt',
      html: generatePinResetHtml(pin),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email sending failed:', err);
    return { success: false, error: 'E-Mail konnte nicht gesendet werden' };
  }
}

function generatePinResetHtml(pin: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 400px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #d4a853; font-size: 20px; font-weight: 300; letter-spacing: 2px;">BEBAN</h1>
              <p style="margin: 4px 0 0; color: #888888; font-size: 10px; letter-spacing: 1px;">BARBERSHOP</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px; text-align: center;">
              <div style="width: 48px; height: 48px; margin: 0 auto 20px; background-color: #d4a853; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">🔐</span>
              </div>

              <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 18px; font-weight: 600;">
                Verwaltungs-PIN
              </h2>

              <p style="margin: 0 0 24px; color: #666666; font-size: 14px; line-height: 1.5;">
                Hier ist deine PIN für den Verwaltungsbereich:
              </p>

              <!-- PIN Display -->
              <div style="background-color: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${pin}</span>
              </div>

              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                Aus Sicherheitsgründen solltest du diese E-Mail nach dem Lesen löschen.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #fafafa; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; color: #999999; font-size: 11px;">
                Diese E-Mail wurde automatisch gesendet.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Hilfsfunktion zum Formatieren des Datums
export function formatDateForEmail(dateString: string): string {
  const date = new Date(dateString);
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  return `${days[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
}
