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
  barberImage?: string; // URL zum Barber-Bild
  serviceName: string;
  date: string; // Format: "2026-01-27" (ISO)
  time: string; // Format: "14:00"
  duration: number; // in Minuten
  price: string; // Format: "20,00 €"
  appointmentId: string; // Für Stornierungslink
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
    // .ics Datei generieren
    const icsContent = generateIcsContent({
      title: `${data.serviceName} bei Beban Barbershop`,
      date: data.date,
      time: data.time,
      duration: data.duration,
      location: 'Beban Barbershop, Friedrich-Ebert-Platz 3a, 51373 Leverkusen',
      description: `Dein Termin bei Beban Barbershop mit ${data.barberName}`,
    });

    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `Terminbestätigung - ${formatDateShort(data.date)} um ${data.time}`,
      html: generateBookingConfirmationHtml(data),
      attachments: [
        {
          filename: 'termin.ics',
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar',
        },
      ],
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
  const dateFormatted = formatDateShort(data.date);
  const barberImage = data.barberImage || `https://terminster.com/team/default.webp`;
  const icsDownloadUrl = `https://terminster.com/de/api/calendar/${data.appointmentId}`;
  const cancelUrl = `https://terminster.com/de/stornieren?id=${data.appointmentId}`;

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; -webkit-font-smoothing: antialiased;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 24px 16px;">
        <!-- Main Card -->
        <table role="presentation" style="max-width: 420px; margin: 0 auto; background-color: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);">

          <!-- Header mit Logo -->
          <tr>
            <td style="padding: 48px 24px 24px; text-align: center;">
              <div style="margin-bottom: 24px;">
                <a href="https://terminster.com/de" target="_blank" style="text-decoration: none;">
                  <img src="https://terminster.com/logo.png" alt="Beban Barbershop" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover;">
                </a>
              </div>
              <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #1a1a1a; font-family: Georgia, 'Times New Roman', Times, serif; text-align: center;">Termin bestätigt!</h1>
              <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500; text-align: center;">Wir freuen uns auf deinen Besuch.</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 24px 24px;">

              <!-- Termin Box -->
              <table role="presentation" style="width: 100%; background-color: #ffffff; border-radius: 20px; border: 1px solid #e5e7eb; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 28px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; color: #d4a853; text-transform: uppercase; letter-spacing: 2px;">DEIN TERMIN</p>
                    <p style="margin: 0 0 4px; font-size: 24px; font-weight: 700; color: #1a1a1a;">${dateFormatted} • ${data.time}</p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">${data.serviceName}</p>
                  </td>
                </tr>
              </table>

              <!-- Barber & Status Row -->
              <table role="presentation" style="width: 100%; margin-bottom: 12px; table-layout: fixed;">
                <tr>
                  <td style="width: 50%; padding-right: 6px; vertical-align: top;">
                    <!-- Barber Box -->
                    <table role="presentation" style="width: 100%; height: 54px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td style="padding: 10px 12px; height: 54px; text-align: center;">
                          <table role="presentation" style="display: inline-table;">
                            <tr>
                              <td style="width: 34px; vertical-align: middle;">
                                <img src="${barberImage}" alt="${data.barberName}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; object-position: center 20%;">
                              </td>
                              <td style="padding-left: 10px; vertical-align: middle; text-align: left;">
                                <p style="margin: 0 0 1px; font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">BARBER</p>
                                <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1a1a1a;">${data.barberName}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 50%; padding-left: 6px; vertical-align: top;">
                    <!-- Status Box -->
                    <table role="presentation" style="width: 100%; height: 54px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td style="padding: 10px 12px; height: 54px; text-align: center;">
                          <table role="presentation" style="display: inline-table;">
                            <tr>
                              <td style="width: 34px; vertical-align: middle;">
                                <div style="width: 34px; height: 34px; background-color: #f0fdf4; border-radius: 50%; text-align: center; line-height: 34px;">
                                  <span style="display: inline-block; width: 10px; height: 10px; background-color: #22c55e; border-radius: 50%;"></span>
                                </div>
                              </td>
                              <td style="padding-left: 10px; vertical-align: middle; text-align: left;">
                                <p style="margin: 0 0 1px; font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">STATUS</p>
                                <p style="margin: 0; font-size: 13px; font-weight: 700; color: #22c55e;">Bestätigt</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Standort Box -->
              <a href="https://maps.google.com/?q=Beban+Barbershop,+Friedrich-Ebert-Platz+3a,+51373+Leverkusen" target="_blank" style="text-decoration: none; display: block;">
                <table role="presentation" style="width: 100%; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; margin-bottom: 12px;">
                  <tr>
                    <td style="padding: 20px;">
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td style="width: 44px; vertical-align: top;">
                            <div style="width: 44px; height: 44px; background-color: rgba(212, 168, 83, 0.1); border-radius: 12px; text-align: center; line-height: 44px;">
                              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4a853" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                            </div>
                          </td>
                          <td style="padding-left: 16px; vertical-align: top;">
                            <p style="margin: 0 0 2px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">STANDORT</p>
                            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Rathaus Galerie Leverkusen</p>
                            <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1a1a1a;">Obergeschoss</p>
                            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">Friedrich-Ebert-Platz 3a<br>51373 Leverkusen</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </a>

              <!-- Parken Box -->
              <table role="presentation" style="width: 100%; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 44px; vertical-align: top;">
                          <div style="width: 44px; height: 44px; background-color: #f3f4f6; border-radius: 12px; text-align: center; line-height: 44px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8"/><path d="M7 14h.01"/><path d="M17 14h.01"/><rect width="18" height="8" x="3" y="10" rx="2"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>
                          </div>
                        </td>
                        <td style="padding-left: 16px; vertical-align: top;">
                          <p style="margin: 0 0 2px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">PARKEN</p>
                          <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1a1a1a;">Parkhaus Rathaus Galerie</p>
                          <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">1,50 € pro Stunde · Max. 15 € pro Tag</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Buttons -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <!-- Kalender Button -->
                    <a href="${icsDownloadUrl}" target="_blank" style="display: block; background-color: #d4a853; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 18px 24px; border-radius: 16px; text-align: center; box-shadow: 0 10px 25px -5px rgba(212, 168, 83, 0.4);">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>Termin speichern (.ics)
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 16px; text-align: center;">
                    <!-- Stornieren Link -->
                    <a href="${cancelUrl}" target="_blank" style="display: inline-block; color: #6b7280; text-decoration: none; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid transparent;">
                      Termin stornieren
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">

              <!-- Kontakt -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #d4a853; text-transform: uppercase; letter-spacing: 2px;">KONTAKT</p>
                    <p style="margin: 0 0 4px;">
                      <a href="mailto:info@beban-barbershop.de" style="color: #4b5563; text-decoration: none; font-size: 14px; font-weight: 500;">info@beban-barbershop.de</a>
                    </p>
                    <p style="margin: 0;">
                      <a href="tel:+4921475004590" style="color: #4b5563; text-decoration: none; font-size: 14px; font-weight: 500;">0214 7500 4590</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Öffnungszeiten -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #d4a853; text-transform: uppercase; letter-spacing: 2px;">ÖFFNUNGSZEITEN</p>
                    <p style="margin: 0 0 4px; font-size: 14px; color: #4b5563; font-weight: 500;">Mo – Sa: 10:00 – 19:00 Uhr</p>
                    <p style="margin: 0; font-size: 14px; color: #9ca3af; font-weight: 500;">So: Geschlossen</p>
                  </td>
                </tr>
              </table>

              <!-- Social Media -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px; border-top: 1px solid #e5e7eb; padding-top: 24px;">
                <tr>
                  <td style="text-align: center; padding-top: 24px;">
                    <a href="https://www.instagram.com/beban_barber_shop2.0/" target="_blank" style="display: inline-block; width: 40px; height: 40px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 50%; text-align: center; line-height: 38px; text-decoration: none; margin: 0 4px;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                    </a>
                    <a href="https://www.facebook.com/share/1MtAAD8TAW/" target="_blank" style="display: inline-block; width: 40px; height: 40px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 50%; text-align: center; line-height: 38px; text-decoration: none; margin: 0 4px;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    </a>
                    <a href="https://www.youtube.com/@barbershopbeban7716" target="_blank" style="display: inline-block; width: 40px; height: 40px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 50%; text-align: center; line-height: 38px; text-decoration: none; margin: 0 4px;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Copyright -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">© ${new Date().getFullYear()} BEBAN BARBERSHOP</p>
                    <p style="margin: 0;">
                      <a href="https://terminster.com/de/datenschutz" target="_blank" style="color: #9ca3af; text-decoration: none; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Datenschutz</a>
                      <span style="color: #d1d5db; margin: 0 8px;">•</span>
                      <a href="https://terminster.com/de/impressum" target="_blank" style="color: #9ca3af; text-decoration: none; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Impressum</a>
                    </p>
                  </td>
                </tr>
              </table>

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

              <!-- Barber Box -->
              <table role="presentation" style="width: 100%; background-color: #fafafa; border-radius: 12px; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 16px;">
                    <span style="color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Barber</span>
                    <p style="margin: 8px 0 0; color: #1a1a1a; font-size: 15px; font-weight: 600;">${data.barberName}</p>
                  </td>
                </tr>
              </table>

              <!-- Appointment Details Box -->
              <table role="presentation" style="width: 100%; background-color: #fafafa; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Datum</span>
                          <p style="margin: 4px 0 0; color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.date}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Uhrzeit</span>
                          <p style="margin: 4px 0 0; color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.time} Uhr</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Service</span>
                          <p style="margin: 4px 0 0; color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.serviceName} <span style="color: #999999; font-size: 13px; font-weight: 400;">(${data.duration} Min.)</span></p>
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

              <!-- Barber & Status Row -->
              <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                <tr>
                  <td style="width: 50%; padding-right: 8px; vertical-align: top;">
                    <table role="presentation" style="width: 100%; background-color: #fafafa; border-radius: 12px;">
                      <tr>
                        <td style="padding: 16px;">
                          <span style="color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Barber</span>
                          <p style="margin: 8px 0 0; color: #1a1a1a; font-size: 15px; font-weight: 600;">${data.barberName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 50%; padding-left: 8px; vertical-align: top;">
                    <table role="presentation" style="width: 100%; background-color: #fafafa; border-radius: 12px;">
                      <tr>
                        <td style="padding: 16px;">
                          <span style="color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Status</span>
                          <p style="margin: 8px 0 0; color: #ef4444; font-size: 15px; font-weight: 600;">
                            <span style="display: inline-block; width: 8px; height: 8px; background-color: #ef4444; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>
                            Storniert
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Appointment Details Box -->
              <table role="presentation" style="width: 100%; background-color: #fafafa; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Datum</span>
                          <p style="margin: 4px 0 0; color: #999999; font-size: 15px; font-weight: 500; text-decoration: line-through;">${data.date}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">
                          <span style="color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Uhrzeit</span>
                          <p style="margin: 4px 0 0; color: #999999; font-size: 15px; font-weight: 500; text-decoration: line-through;">${data.time} Uhr</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Service</span>
                          <p style="margin: 4px 0 0; color: #1a1a1a; font-size: 15px; font-weight: 500;">${data.serviceName}</p>
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

// Formatiert Datum als TT.MM.JJJJ
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// Generiert .ics Kalender-Datei Inhalt
export function generateIcsContent(data: {
  title: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  description: string;
}): string {
  const startDate = new Date(`${data.date}T${data.time}:00`);
  const endDate = new Date(startDate.getTime() + data.duration * 60000);

  const formatIcsDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Beban Barbershop//Termin//DE
BEGIN:VEVENT
UID:${Date.now()}@terminster.com
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(startDate)}
DTEND:${formatIcsDate(endDate)}
SUMMARY:${data.title}
LOCATION:${data.location}
DESCRIPTION:${data.description}
END:VEVENT
END:VCALENDAR`;
}

// Base URL für die Website
const BASE_URL = 'https://terminster.com/de';
