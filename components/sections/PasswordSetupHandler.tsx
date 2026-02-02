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
      console.log('[PasswordSetupHandler] Hash:', hash ? 'vorhanden' : 'leer');
      if (!hash || isProcessing) return;

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      console.log('[PasswordSetupHandler] Type:', type, 'Token:', accessToken ? 'vorhanden' : 'fehlt');

      // Bei Recovery- oder Invite-Token (Passwort setzen)
      if ((type !== 'recovery' && type !== 'invite') || !accessToken) return;

      console.log('[PasswordSetupHandler] Verarbeite Recovery-Token...');
      setIsProcessing(true);

      try {
        console.log('[PasswordSetupHandler] Rufe setSession auf mit Token:', accessToken?.substring(0, 20) + '...');
        console.log('[PasswordSetupHandler] Refresh Token:', refreshToken ? 'vorhanden' : 'fehlt');

        // Session mit dem Token setzen
        let data, error;
        try {
          const result = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          data = result.data;
          error = result.error;
        } catch (setSessionError) {
          console.error('[PasswordSetupHandler] setSession Exception:', setSessionError);
          setIsProcessing(false);
          return;
        }

        console.log('[PasswordSetupHandler] setSession Ergebnis:', {
          hasData: !!data,
          hasSession: !!data?.session,
          hasUser: !!data?.user,
          errorMessage: error?.message,
          errorCode: error?.code,
          userEmail: data?.user?.email
        });

        if (error) {
          console.error('[PasswordSetupHandler] Session error:', error);
          setIsProcessing(false);
          return;
        }

        console.log('[PasswordSetupHandler] Session gesetzt, User:', data.user?.email);

        if (data.user) {
          // User Metadata auslesen
          const metadata = data.user.user_metadata || {};
          const email = data.user.email || '';
          const firstName = metadata.first_name || '';
          const lastName = metadata.last_name || '';
          const phone = metadata.phone || '';

          console.log('[PasswordSetupHandler] User-Daten:', { email, firstName, lastName, phone });

          // URL Hash entfernen
          window.history.replaceState(null, '', window.location.pathname);

          // LoginModal im Password-Setup-Modus öffnen
          console.log('[PasswordSetupHandler] Öffne Modal mit:', { email, firstName, lastName, phone });
          console.log('[PasswordSetupHandler] openLoginPasswordSetup Funktion:', typeof openLoginPasswordSetup);

          try {
            openLoginPasswordSetup({
              email,
              firstName,
              lastName,
              phone,
            });
            console.log('[PasswordSetupHandler] Modal geöffnet!');
          } catch (modalError) {
            console.error('[PasswordSetupHandler] Modal Fehler:', modalError);
          }
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
