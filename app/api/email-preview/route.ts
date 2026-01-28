import { NextRequest, NextResponse } from 'next/server';
import { getSetting, getTeam } from '@/lib/supabase';

// Temporary route for email template preview
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') || 'booking';

  // Get logo URL from settings
  let logoUrl = '/logo.png';
  try {
    const data = await getSetting<{ value: string }>('logo_url');
    if (data?.value) logoUrl = data.value;
  } catch {
    // fallback
  }

  // Get actual team data for barber image
  let barberName = 'Sahir';
  let barberImage = '';
  let imagePosition = 'center 30%';
  try {
    const team = await getTeam();
    const barber = team[0]; // First active barber
    if (barber) {
      barberName = barber.name;
      barberImage = barber.image || '';
      imagePosition = barber.image_position || 'center 30%';
    }
  } catch {
    // fallback
  }

  const testData = {
    customerName: 'Max Mustermann',
    customerEmail: 'max@test.de',
    barberName,
    barberImage,
    imagePosition,
    serviceName: 'Haarschnitt',
    date: '2026-01-29',
    time: '14:00',
    duration: 30,
    price: '20,00 €',
    appointmentId: 'test-preview-123',
  };

  let html: string;

  if (type === 'reminder') {
    html = generateReminderHtml(testData, logoUrl);
  } else {
    html = generateBookingConfirmationHtml(testData, logoUrl);
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function generateBookingConfirmationHtml(data: { customerName: string; barberName: string; barberImage?: string; imagePosition?: string; serviceName: string; date: string; time: string; duration: number; price: string; appointmentId: string }, logoUrl: string): string {
  const dateFormatted = formatDateShort(data.date);
  const barberImage = data.barberImage || `https://terminster.com/team/default.webp`;
  const barberImagePosition = data.imagePosition || 'center 30%';
  const icsDownloadUrl = `https://terminster.com/api/calendar/${data.appointmentId}`;
  const cancelUrl = `https://terminster.com/de?cancel=${data.appointmentId}`;

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buchungsbestätigung - Vorschau</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; -webkit-font-smoothing: antialiased;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 24px 16px;">
        <table role="presentation" style="max-width: 420px; margin: 0 auto; background-color: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);">
          <tr>
            <td style="padding: 48px 24px 24px; text-align: center;">
              <div style="margin-bottom: 24px;">
                <a href="https://terminster.com/de" target="_blank" style="text-decoration: none;">
                  <img src="${logoUrl}" alt="Beban Barbershop" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover;">
                </a>
              </div>
              <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #1a1a1a; font-family: Georgia, 'Times New Roman', Times, serif; text-align: center;">Termin bestätigt!</h1>
              <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500; text-align: center;">Wir freuen uns auf deinen Besuch.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 24px;">
              <table role="presentation" style="width: 100%; background-color: #ffffff; border-radius: 20px; border: 1px solid #e5e7eb; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 28px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; color: #d4a853; text-transform: uppercase; letter-spacing: 2px;">DEIN TERMIN</p>
                    <p style="margin: 0 0 4px; font-size: 24px; font-weight: 700; color: #1a1a1a;">${dateFormatted} • ${data.time}</p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">${data.serviceName}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%; margin-bottom: 12px; table-layout: fixed;">
                <tr>
                  <td style="width: 50%; padding-right: 6px; vertical-align: top;">
                    <table role="presentation" style="width: 100%; height: 54px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td style="padding: 5px 10px; height: 54px; text-align: center;">
                          <table role="presentation" style="display: inline-table;">
                            <tr>
                              <td style="width: 42px; vertical-align: middle;">
                                <img src="${barberImage}" alt="${data.barberName}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; object-position: ${barberImagePosition};">
                              </td>
                              <td style="padding-left: 10px; vertical-align: middle; text-align: left;">
                                <p style="margin: 0 0 2px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">BARBER</p>
                                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">${data.barberName}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 50%; padding-left: 6px; vertical-align: top;">
                    <table role="presentation" style="width: 100%; height: 54px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td style="padding: 5px 10px; height: 54px; text-align: center;">
                          <table role="presentation" style="display: inline-table;">
                            <tr>
                              <td style="width: 42px; vertical-align: middle;">
                                <div style="width: 42px; height: 42px; background-color: #f0fdf4; border-radius: 50%; text-align: center; line-height: 42px;">
                                  <span style="display: inline-block; width: 14px; height: 14px; background-color: #22c55e; border-radius: 50%;"></span>
                                </div>
                              </td>
                              <td style="padding-left: 10px; vertical-align: middle; text-align: left;">
                                <p style="margin: 0 0 2px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">STATUS</p>
                                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #22c55e;">Bestätigt</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
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
                          <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">1,50 € pro Stunde</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <a href="${icsDownloadUrl}" target="_blank" style="display: block; background-color: #d4a853; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 18px 24px; border-radius: 16px; text-align: center; box-shadow: 0 10px 25px -5px rgba(212, 168, 83, 0.4);">Termin speichern (.ics)</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 16px; text-align: center;">
                    <a href="${cancelUrl}" target="_blank" style="display: inline-block; color: #6b7280; text-decoration: none; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Termin stornieren</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #d4a853; text-transform: uppercase; letter-spacing: 2px;">KONTAKT</p>
                    <p style="margin: 0 0 4px;"><a href="mailto:info@beban-barbershop.de" style="color: #4b5563; text-decoration: none; font-size: 14px; font-weight: 500;">info@beban-barbershop.de</a></p>
                    <p style="margin: 0;"><a href="tel:+4921475004590" style="color: #4b5563; text-decoration: none; font-size: 14px; font-weight: 500;">0214 7500 4590</a></p>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">© 2026 BEBAN BARBERSHOP</p>
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
</html>`;
}

function generateReminderHtml(data: { customerName: string; barberName: string; barberImage?: string; imagePosition?: string; serviceName: string; date: string; time: string; duration: number; price: string; appointmentId: string }, logoUrl: string): string {
  const dateFormatted = formatDateShort(data.date);
  const barberImage = data.barberImage || `https://terminster.com/team/default.webp`;
  const barberImagePosition = data.imagePosition || 'center 30%';
  const cancelUrl = `https://terminster.com/de?cancel=${data.appointmentId}`;

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terminerinnerung - Vorschau</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; -webkit-font-smoothing: antialiased;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 24px 16px;">
        <table role="presentation" style="max-width: 420px; margin: 0 auto; background-color: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);">
          <tr>
            <td style="padding: 48px 24px 24px; text-align: center;">
              <div style="margin-bottom: 24px;">
                <a href="https://terminster.com/de" target="_blank" style="text-decoration: none;">
                  <img src="${logoUrl}" alt="Beban Barbershop" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover;">
                </a>
              </div>
              <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #1a1a1a; font-family: Georgia, 'Times New Roman', Times, serif; text-align: center;">Dein Termin ist morgen!</h1>
              <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500; text-align: center;">Wir erinnern dich an deinen Termin.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 24px;">
              <table role="presentation" style="width: 100%; background-color: #ffffff; border-radius: 20px; border: 1px solid #e5e7eb; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 28px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; color: #d4a853; text-transform: uppercase; letter-spacing: 2px;">DEIN TERMIN</p>
                    <p style="margin: 0 0 4px; font-size: 24px; font-weight: 700; color: #1a1a1a;">${dateFormatted} • ${data.time}</p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">${data.serviceName}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%; margin-bottom: 12px; table-layout: fixed;">
                <tr>
                  <td style="width: 50%; padding-right: 6px; vertical-align: top;">
                    <table role="presentation" style="width: 100%; height: 54px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td style="padding: 5px 10px; height: 54px; text-align: center;">
                          <table role="presentation" style="display: inline-table;">
                            <tr>
                              <td style="width: 42px; vertical-align: middle;">
                                <img src="${barberImage}" alt="${data.barberName}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; object-position: ${barberImagePosition};">
                              </td>
                              <td style="padding-left: 10px; vertical-align: middle; text-align: left;">
                                <p style="margin: 0 0 2px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">BARBER</p>
                                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">${data.barberName}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 50%; padding-left: 6px; vertical-align: top;">
                    <a href="${cancelUrl}" target="_blank" style="text-decoration: none; display: block;">
                      <table role="presentation" style="width: 100%; height: 54px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
                        <tr>
                          <td style="padding: 5px 10px; height: 54px; text-align: center;">
                            <table role="presentation" style="display: inline-table;">
                              <tr>
                                <td style="width: 42px; vertical-align: middle;">
                                  <div style="width: 42px; height: 42px; background-color: #fef2f2; border-radius: 50%; text-align: center; line-height: 42px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                  </div>
                                </td>
                                <td style="padding-left: 10px; vertical-align: middle; text-align: left;">
                                  <p style="margin: 0 0 2px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">TERMIN</p>
                                  <p style="margin: 0; font-size: 14px; font-weight: 700; color: #ef4444;">Stornieren</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>
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
                          <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">1,50 € pro Stunde</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #d4a853; text-transform: uppercase; letter-spacing: 2px;">KONTAKT</p>
                    <p style="margin: 0 0 4px;"><a href="mailto:info@beban-barbershop.de" style="color: #4b5563; text-decoration: none; font-size: 14px; font-weight: 500;">info@beban-barbershop.de</a></p>
                    <p style="margin: 0;"><a href="tel:+4921475004590" style="color: #4b5563; text-decoration: none; font-size: 14px; font-weight: 500;">0214 7500 4590</a></p>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">© 2026 BEBAN BARBERSHOP</p>
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
</html>`;
}
