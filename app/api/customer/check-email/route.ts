import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'E-Mail erforderlich' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Prüfen ob bereits ein Auth-User mit dieser E-Mail existiert
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingAuthUser) {
      return NextResponse.json({ hasAccount: true });
    }

    // 2. Prüfen ob Customer mit dieser E-Mail bereits ein Konto hat (auth_id ist gesetzt)
    const { data: customer } = await supabase
      .from('customers')
      .select('id, auth_id')
      .eq('email', email.toLowerCase())
      .single();

    // hasAccount = true wenn Customer existiert UND auth_id gesetzt ist
    const hasAccount = !!(customer?.auth_id);

    return NextResponse.json({ hasAccount });
  } catch {
    return NextResponse.json({ hasAccount: false });
  }
}
