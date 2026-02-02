'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useBooking } from '@/context/BookingContext';

export function PasswordSetupHandler() {
  const { openLoginPasswordSetup } = useBooking();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    const hasRecoveryToken = hash.includes('type=recovery') || hash.includes('type=invite');

    if (!hasRecoveryToken) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session?.user && !hasProcessedRef.current) {
        hasProcessedRef.current = true;

        const user = session.user;
        const metadata = user.user_metadata || {};

        window.history.replaceState(null, '', window.location.pathname);

        openLoginPasswordSetup({
          email: user.email || '',
          firstName: metadata.first_name || '',
          lastName: metadata.last_name || '',
          phone: metadata.phone || '',
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [openLoginPasswordSetup]);

  return null;
}
