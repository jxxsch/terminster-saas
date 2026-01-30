'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useBooking } from '@/context/BookingContext';

export function PasswordSetupHandler() {
  const { openLoginPasswordSetup } = useBooking();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleRecoveryToken = async () => {
      // Parse hash from URL
      const hash = window.location.hash;
      if (!hash || isProcessing) return;

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      // Nur bei Recovery-Token (Passwort setzen/zurücksetzen)
      if (type !== 'recovery' || !accessToken) return;

      setIsProcessing(true);

      try {
        // Session mit dem Token setzen
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          console.error('Session error:', error);
          setIsProcessing(false);
          return;
        }

        if (data.user) {
          // User Metadata auslesen
          const metadata = data.user.user_metadata || {};
          const email = data.user.email || '';
          const firstName = metadata.first_name || '';
          const lastName = metadata.last_name || '';
          const phone = metadata.phone || '';

          // URL Hash entfernen
          window.history.replaceState(null, '', window.location.pathname);

          // LoginModal im Password-Setup-Modus öffnen
          openLoginPasswordSetup({
            email,
            firstName,
            lastName,
            phone,
          });
        }
      } catch (err) {
        console.error('Recovery token handling error:', err);
      } finally {
        setIsProcessing(false);
      }
    };

    handleRecoveryToken();
  }, [openLoginPasswordSetup, isProcessing]);

  return null;
}
