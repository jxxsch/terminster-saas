import { NextRequest, NextResponse } from 'next/server';
import { supabase, extendSeriesAppointments } from '@/lib/supabase';

// Cron-Job: Verlängert alle aktiven Serien um weitere 52 Wochen
// Schedule: Jeden Montag 02:00 UTC (in vercel.json)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const today = new Date().toISOString().split('T')[0];

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

    const results = [];
    for (const series of activeSeries || []) {
      const result = await extendSeriesAppointments(series.id);
      results.push({ seriesId: series.id, ...result });
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

    return NextResponse.json({
      success: true,
      seriesProcessed: results.length,
      totalCreated,
      totalSkipped,
    });
  } catch (err) {
    console.error('Error in series extend cron:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
