'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useBooking } from '@/context/BookingContext';

export function PasswordSetupHandler() {
  const { openLoginPasswordSetup } = useBooking();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Check if we have a recovery/invite hash in URL
    const hash = window.location.hash;
    const hasRecoveryToken = hash.includes('type=recovery') || hash.includes('type=invite');

    console.log('[PasswordSetupHandler] Init - Hash:', hash ? 'vorhanden' : 'leer', 'Recovery:', hasRecoveryToken);

    if (!hasRecoveryToken) {
      console.log('[PasswordSetupHandler] Kein Recovery-Token in URL, beende');
      return;
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[PasswordSetupHandler] Auth Event:', event, 'Session:', !!session, 'User:', session?.user?.email);

      // Only process PASSWORD_RECOVERY or SIGNED_IN events with a session
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session?.user && !hasProcessedRef.current) {
        hasProcessedRef.current = true;

        const user = session.user;
        const metadata = user.user_metadata || {};
        const email = user.email || '';
        const firstName = metadata.first_name || '';
        const lastName = metadata.last_name || '';
        const phone = metadata.phone || '';

        console.log('[PasswordSetupHandler] User-Daten:', { email, firstName, lastName, phone });

        // URL Hash entfernen
        window.history.replaceState(null, '', window.location.pathname);

        // Modal öffnen
        console.log('[PasswordSetupHandler] Öffne Modal...');
        openLoginPasswordSetup({
          email,
          firstName,
          lastName,
          phone,
        });
        console.log('[PasswordSetupHandler] Modal geöffnet!');
      }
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [openLoginPasswordSetup]);

  return null;
}
