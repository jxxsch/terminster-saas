import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Migrations-Endpoint — nur in Development verfügbar
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    // Add email image fields to team table
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE team ADD COLUMN IF NOT EXISTS image_position_email text DEFAULT '50% 50%'"
    });

    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE team ADD COLUMN IF NOT EXISTS image_scale_email real DEFAULT 1.7"
    });

    // Fallback: try direct insert to check if columns exist
    if (error1 || error2) {
      // Try adding via a workaround - update a row with the new fields
      const { error: testError } = await supabase
        .from('team')
        .select('image_position_email, image_scale_email')
        .limit(1);

      if (testError) {
        return NextResponse.json({
          success: false,
          error: 'Columns do not exist. Please run this SQL in Supabase Dashboard:',
          sql: "ALTER TABLE team ADD COLUMN IF NOT EXISTS image_position_email text DEFAULT '50% 50%'; ALTER TABLE team ADD COLUMN IF NOT EXISTS image_scale_email real DEFAULT 1.7;"
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
