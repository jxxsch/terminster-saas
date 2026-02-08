import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface DeleteRequest {
  customerId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DeleteRequest = await request.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Kunden-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Kundendaten abrufen (um auth_id zu bekommen)
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('id, auth_id, name, email')
      .eq('id', customerId)
      .single();

    if (fetchError || !customer) {
      return NextResponse.json(
        { error: 'Kunde nicht gefunden' },
        { status: 404 }
      );
    }

    // 2. Auth-User löschen (über auth_id oder E-Mail-Suche)
    let authDeleted = false;
    if (customer.auth_id) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        customer.auth_id
      );
      if (authDeleteError) {
        console.error('Auth user delete error:', authDeleteError);
      } else {
        authDeleted = true;
      }
    }

    // Fallback: Auth-User über E-Mail suchen und löschen (falls auth_id fehlte oder Löschung fehlschlug)
    if (!authDeleted && customer.email) {
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const authUser = users?.find(
        (u) => u.email?.toLowerCase() === customer.email?.toLowerCase()
      );
      if (authUser) {
        const { error: fallbackDeleteError } = await supabase.auth.admin.deleteUser(authUser.id);
        if (fallbackDeleteError) {
          console.error('Auth user fallback delete error:', fallbackDeleteError);
        }
      }
    }

    // 3. Customer-Referenzen in appointments auf NULL setzen
    // (Termine bleiben erhalten mit customer_name/customer_phone)
    const { error: appointmentsError } = await supabase
      .from('appointments')
      .update({ customer_id: null })
      .eq('customer_id', customerId);

    if (appointmentsError) {
      console.error('Appointments update error:', appointmentsError);
    }

    // 4. Customer-Eintrag löschen
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (deleteError) {
      console.error('Customer delete error:', deleteError);
      return NextResponse.json(
        { error: 'Kunde konnte nicht gelöscht werden' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kundenkonto wurde vollständig gelöscht',
      deletedCustomer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        hadAuthAccount: !!customer.auth_id,
      },
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
