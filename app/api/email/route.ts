import { NextRequest, NextResponse } from 'next/server';
import {
  sendBookingConfirmation,
  sendAppointmentReminder,
  sendCancellationConfirmation,
  formatDateForEmail,
  BookingEmailData,
  CancellationEmailData,
  ReminderEmailData,
} from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Typ und Daten sind erforderlich' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'booking_confirmation': {
        const emailData: BookingEmailData = {
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          barberName: data.barberName,
          barberImage: data.barberImage,
          serviceName: data.serviceName,
          date: data.date, // ISO Format: YYYY-MM-DD
          time: data.time,
          duration: data.duration,
          price: data.price,
          appointmentId: data.appointmentId,
        };
        result = await sendBookingConfirmation(emailData);
        break;
      }

      case 'reminder': {
        const reminderData: ReminderEmailData = {
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          barberName: data.barberName,
          serviceName: data.serviceName,
          date: data.date.includes(',') ? data.date : formatDateForEmail(data.date),
          time: data.time,
          duration: data.duration,
        };
        result = await sendAppointmentReminder(reminderData);
        break;
      }

      case 'cancellation': {
        const cancellationData: CancellationEmailData = {
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          barberName: data.barberName,
          serviceName: data.serviceName,
          date: data.date.includes(',') ? data.date : formatDateForEmail(data.date),
          time: data.time,
          reason: data.reason,
        };
        result = await sendCancellationConfirmation(cancellationData);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unbekannter E-Mail-Typ: ${type}` },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error || 'E-Mail-Versand fehlgeschlagen' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
