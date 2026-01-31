import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Diese Route erstellt 20 Test-Benutzer mit Auth-Konten
// NUR für Entwicklungszwecke!

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: Request) {
  // Sicherheitscheck
  const { secret } = await request.json();
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
  }

  // Admin-Client mit Service Role Key
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const testUsers = [
    { email: 'test1@beban-test.de', firstName: 'Thomas', lastName: 'Müller' },
    { email: 'test2@beban-test.de', firstName: 'Michael', lastName: 'Schmidt' },
    { email: 'test3@beban-test.de', firstName: 'Andreas', lastName: 'Schneider' },
    { email: 'test4@beban-test.de', firstName: 'Stefan', lastName: 'Fischer' },
    { email: 'test5@beban-test.de', firstName: 'Christian', lastName: 'Weber' },
    { email: 'test6@beban-test.de', firstName: 'Markus', lastName: 'Meyer' },
    { email: 'test7@beban-test.de', firstName: 'Daniel', lastName: 'Wagner' },
    { email: 'test8@beban-test.de', firstName: 'Frank', lastName: 'Becker' },
    { email: 'test9@beban-test.de', firstName: 'Peter', lastName: 'Hoffmann' },
    { email: 'test10@beban-test.de', firstName: 'Klaus', lastName: 'Schulz' },
    { email: 'test11@beban-test.de', firstName: 'Jürgen', lastName: 'Koch' },
    { email: 'test12@beban-test.de', firstName: 'Wolfgang', lastName: 'Richter' },
    { email: 'test13@beban-test.de', firstName: 'Martin', lastName: 'Klein' },
    { email: 'test14@beban-test.de', firstName: 'Bernd', lastName: 'Wolf' },
    { email: 'test15@beban-test.de', firstName: 'Uwe', lastName: 'Schröder' },
    { email: 'test16@beban-test.de', firstName: 'Ralf', lastName: 'Neumann' },
    { email: 'test17@beban-test.de', firstName: 'Dieter', lastName: 'Schwarz' },
    { email: 'test18@beban-test.de', firstName: 'Matthias', lastName: 'Zimmermann' },
    { email: 'test19@beban-test.de', firstName: 'Jörg', lastName: 'Braun' },
    { email: 'test20@beban-test.de', firstName: 'Torsten', lastName: 'Krüger' },
  ];

  const password = 'Test123!';
  const results: { email: string; success: boolean; error?: string }[] = [];

  for (const user of testUsers) {
    try {
      // Erstelle Auth-Benutzer
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true, // Automatisch bestätigt
        user_metadata: {
          first_name: user.firstName,
          last_name: user.lastName,
        },
      });

      if (authError) {
        results.push({ email: user.email, success: false, error: authError.message });
        continue;
      }

      if (authData.user) {
        // Verknüpfe mit existierendem Customer
        const { error: updateError } = await supabaseAdmin
          .from('customers')
          .update({ auth_id: authData.user.id })
          .eq('email', user.email);

        if (updateError) {
          results.push({ email: user.email, success: false, error: `Auth created but customer link failed: ${updateError.message}` });
        } else {
          results.push({ email: user.email, success: true });
        }
      }
    } catch (err) {
      results.push({ email: user.email, success: false, error: String(err) });
    }
  }

  const successCount = results.filter(r => r.success).length;

  return NextResponse.json({
    message: `${successCount} von ${testUsers.length} Test-Benutzern erstellt`,
    password: password,
    results,
  });
}
