import { NextRequest, NextResponse } from 'next/server';
import { supabase, extendSeriesAppointments, SeriesGenerationResult, formatDateLocal } from '@/lib/supabase';

// Cron-Job: Verlängert alle aktiven Serien um weitere 52 Wochen
// Schedule: Jeden Montag 02:00 UTC (in vercel.json)
// Idempotent: Exception-Check in batch_insert_series_appointments verhindert Duplikate

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const today = formatDateLocal(new Date());

    // Alle aktiven Serien laden (end_date IS NULL oder > today)
    const { data: activeSeries, error } = await supabase
      .from('series')
      .select('id')
      .or(`end_date.is.null,end_date.gt.${today}`);

    if (error) {
      console.error('Error fetching active series:', error);
      return NextResponse.json(
        { error: 'Failed to fetch series' },
        { status: 500 }
      );
    }

    const results: (SeriesGenerationResult & { seriesId: string })[] = [];
    const errors: { seriesId: string; error: string }[] = [];

    // Pro Serie: try/catch für isolierte Fehlerbehandlung
    for (const series of activeSeries || []) {
      try {
        const result = await extendSeriesAppointments(series.id);
        results.push({ seriesId: series.id, ...result });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error extending series ${series.id}:`, errorMsg);
        errors.push({ seriesId: series.id, error: errorMsg });
      }
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalExceptionSkipped = results.reduce((sum, r) => sum + r.exceptionSkipped, 0);

    return NextResponse.json({
      success: true,
      seriesProcessed: results.length,
      totalCreated,
      totalSkipped,
      totalExceptionSkipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Error in series extend cron:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
