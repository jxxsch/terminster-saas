import { NextRequest, NextResponse } from 'next/server';
import { supabase, generateSeriesAppointments, updateSeries } from '@/lib/supabase';
import type { Series } from '@/lib/supabase';

// Einmalige Migration: Generiert echte Appointment-Rows für alle bestehenden Serien
// Aufruf: GET /api/series/migrate?secret=CRON_SECRET

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = request.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secret !== cronSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Alle aktiven Serien laden
    const { data: allSeries, error } = await supabase
      .from('series')
      .select('*')
      .or(`end_date.is.null,end_date.gt.${today}`);

    if (error) {
      console.error('Error fetching series for migration:', error);
      return NextResponse.json(
        { error: 'Failed to fetch series' },
        { status: 500 }
      );
    }

    const results = [];

    for (const series of (allSeries || []) as Series[]) {
      const fromDate = series.start_date > today ? series.start_date : today;

      const result = await generateSeriesAppointments(series, fromDate, 52);

      // last_generated_date setzen
      const endLimit = new Date(today);
      endLimit.setDate(endLimit.getDate() + 52 * 7);
      await updateSeries(series.id, {
        last_generated_date: endLimit.toISOString().split('T')[0],
      } as Partial<Series>);

      results.push({
        seriesId: series.id,
        customerName: series.customer_name,
        barber_id: series.barber_id,
        ...result,
      });
    }

    // Bestehende Pause-Appointments markieren
    const { data: pauseUpdated, error: pauseError } = await supabase
      .from('appointments')
      .update({ is_pause: true })
      .ilike('customer_name', '%pause%')
      .eq('is_pause', false)
      .select('id');

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

    return NextResponse.json({
      success: true,
      seriesMigrated: results.length,
      totalCreated,
      totalSkipped,
      pauseAppointmentsMarked: pauseUpdated?.length || 0,
      pauseError: pauseError?.message || null,
      details: results,
    });
  } catch (err) {
    console.error('Error in series migration:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
