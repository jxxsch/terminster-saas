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
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Beban Barbershop <noreply@beban-barbershop.de>',
        to: CONTACT_EMAIL,
        subject: `Neue Kontaktanfrage von ${name}`,
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
                    Neue Kontaktanfrage
                  </h1>
                </div>

                <!-- Content -->
                <div style="padding: 32px;">
                  <div style="background: #f9f9f9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #888; font-size: 13px; width: 100px;">Name:</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-size: 15px; font-weight: 500;">${name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #888; font-size: 13px;">E-Mail:</td>
                        <td style="padding: 8px 0;">
                          <a href="mailto:${email}" style="color: #D4AF37; text-decoration: none; font-size: 15px;">${email}</a>
                        </td>
                      </tr>
                      ${phone ? `
                      <tr>
                        <td style="padding: 8px 0; color: #888; font-size: 13px;">Telefon:</td>
                        <td style="padding: 8px 0;">
                          <a href="tel:${phone.replace(/\s/g, '')}" style="color: #D4AF37; text-decoration: none; font-size: 15px;">${phone}</a>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>

                  <div style="margin-bottom: 24px;">
                    <h3 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Nachricht
                    </h3>
                    <div style="background: #f9f9f9; border-radius: 12px; padding: 20px; color: #333; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
                  </div>

                  <a href="mailto:${email}?subject=Re: Ihre Anfrage bei Beban Barbershop" style="display: inline-block; background: #D4AF37; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                    Antworten
                  </a>
                </div>

                <!-- Footer -->
                <div style="background: #f9f9f9; padding: 20px 32px; text-align: center; border-top: 1px solid #eee;">
                  <p style="margin: 0; color: #888; font-size: 12px;">
                    Diese Nachricht wurde über das Kontaktformular auf beban-barbershop.de gesendet.
                  </p>
                </div>

              </div>
            </div>
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
