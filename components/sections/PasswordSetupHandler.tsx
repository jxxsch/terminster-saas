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
    const isRecovery = hash.includes('type=recovery');

    if (!hasRecoveryToken) return;

    const openModalWithUser = (user: { email?: string; user_metadata?: Record<string, string> }) => {
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;

      const metadata = user.user_metadata || {};

      window.history.replaceState(null, '', window.location.pathname);

      openLoginPasswordSetup({
        email: user.email || '',
        firstName: metadata.first_name || '',
        lastName: metadata.last_name || '',
        phone: metadata.phone || '',
        isRecovery,
      });
    };

    // Check if user is already logged in (from previous token processing)
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !hasProcessedRef.current) {
        openModalWithUser(session.user);
      }
    };

    // Also listen for auth state changes (for fresh token processing)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')
          && session?.user && !hasProcessedRef.current) {
        openModalWithUser(session.user);
      }
    });

    // Check existing session after a small delay to let Supabase process the URL
    const timeout = setTimeout(checkExistingSession, 100);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [openLoginPasswordSetup]);

  return null;
}
