import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

// E-Mail-Adresse für Kontaktnachrichten (später auf Kunden-E-Mail umstellen)
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'jan@example.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    // Validierung
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, E-Mail und Nachricht sind erforderlich' },
        { status: 400 }
      );
    }

    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    // 1. In Datenbank speichern
    const { data: savedMessage, error: dbError } = await supabase
      .from('contact_messages')
      .insert({
        name,
        email,
        phone: phone || null,
        message,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Nachricht' },
        { status: 500 }
      );
    }

    // 2. E-Mail an Barbershop senden
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://terminster.com';
      const logoUrl = `${BASE_URL}/logo.png`;
      const currentYear = new Date().getFullYear();

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Beban Barbershop <noreply@beban-barbershop.de>',
        to: CONTACT_EMAIL,
        subject: `Neue Kontaktanfrage von ${name}`,
        html: `
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
                <a href="${BASE_URL}/de" target="_blank" style="text-decoration: none;">
                  <img src="${logoUrl}" alt="Beban Barbershop" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover;">
                </a>
              </div>
              <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #1a1a1a; font-family: Georgia, 'Times New Roman', Times, serif; text-align: center;">Neue Kontaktanfrage</h1>
              <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500; text-align: center;">Über das Kontaktformular eingegangen</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 24px 24px;">

              <!-- Absender & Kontaktdaten Box -->
              <table role="presentation" style="width: 100%; background-color: #ffffff; border-radius: 20px; border: 1px solid #e5e7eb; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" style="width: 100%;">
                      <!-- Name -->
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                          <div style="width: 28px; height: 28px; background-color: rgba(212, 168, 83, 0.1); border-radius: 8px; text-align: center; line-height: 28px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4a853" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          </div>
                        </td>
                        <td style="padding: 8px 0 8px 12px; vertical-align: middle;">
                          <span style="color: #1a1a1a; font-size: 16px; font-weight: 700;">${name}</span>
                        </td>
                      </tr>
                      <!-- E-Mail -->
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                          <div style="width: 28px; height: 28px; background-color: rgba(212, 168, 83, 0.1); border-radius: 8px; text-align: center; line-height: 28px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4a853" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                          </div>
                        </td>
                        <td style="padding: 8px 0 8px 12px; vertical-align: middle;">
                          <a href="mailto:${email}" style="color: #1a1a1a; text-decoration: none; font-size: 14px; font-weight: 600;">${email}</a>
                        </td>
                      </tr>
                      <!-- Telefon -->
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                          <div style="width: 28px; height: 28px; background-color: ${phone ? 'rgba(212, 168, 83, 0.1)' : '#f3f4f6'}; border-radius: 8px; text-align: center; line-height: 28px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${phone ? '#d4a853' : '#9ca3af'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          </div>
                        </td>
                        <td style="padding: 8px 0 8px 12px; vertical-align: middle;">
                          ${phone ? `<a href="tel:${phone.replace(/\s/g, '')}" style="color: #1a1a1a; text-decoration: none; font-size: 14px; font-weight: 600;">${phone}</a>` : `<span style="color: #9ca3af; font-size: 14px;">Nicht angegeben</span>`}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Nachricht Box -->
              <table role="presentation" style="width: 100%; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">NACHRICHT</p>
                    <p style="margin: 0; font-size: 14px; color: #1a1a1a; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                  </td>
                </tr>
              </table>

              <!-- Antworten Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <a href="mailto:${email}?subject=Re: Ihre Anfrage bei Beban Barbershop" target="_blank" style="display: block; background-color: #d4a853; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 18px 24px; border-radius: 16px; text-align: center; box-shadow: 0 10px 25px -5px rgba(212, 168, 83, 0.4);">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>Antworten
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                      Diese Nachricht wurde über das Kontaktformular gesendet.
                    </p>
                    <p style="margin: 0; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">© ${currentYear} BEBAN BARBERSHOP</p>
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
        `,
      });
    } catch (emailError) {
      // E-Mail-Fehler loggen, aber nicht abbrechen (Nachricht ist ja gespeichert)
      console.error('Email error:', emailError);
    }

    // 3. Bestätigungs-E-Mail an Absender (optional)
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Beban Barbershop <noreply@beban-barbershop.de>',
        to: email,
        subject: 'Ihre Nachricht an Beban Barbershop',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 32px; text-align: center;">
                  <h1 style="margin: 0; color: #D4AF37; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">
                    Vielen Dank für Ihre Nachricht
                  </h1>
                </div>

                <!-- Content -->
                <div style="padding: 32px;">
                  <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Hallo ${name},
                  </p>
                  <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    vielen Dank für Ihre Nachricht. Wir haben diese erhalten und werden uns schnellstmöglich bei Ihnen melden.
                  </p>

                  <div style="background: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 12px 0; color: #888; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Ihre Nachricht
                    </h3>
                    <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                  </div>

                  <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
                    Mit freundlichen Grüßen,<br>
                    <strong style="color: #1a1a1a;">Ihr Beban Barbershop Team</strong>
                  </p>
                </div>

                <!-- Footer -->
                <div style="background: #f9f9f9; padding: 20px 32px; text-align: center; border-top: 1px solid #eee;">
                  <p style="margin: 0 0 8px 0; color: #888; font-size: 12px;">
                    Beban Barber Shop 2.0 · City-Center Leverkusen
                  </p>
                  <p style="margin: 0; color: #888; font-size: 12px;">
                    Friedrich-Ebert-Platz 3a · 51373 Leverkusen
                  </p>
                </div>

              </div>
            </div>
          </body>
          </html>
        `,
      });
    } catch (emailError) {
      // Bestätigungs-E-Mail ist optional
      console.error('Confirmation email error:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Nachricht erfolgreich gesendet',
      id: savedMessage.id,
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
