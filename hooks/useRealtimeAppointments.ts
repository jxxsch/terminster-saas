'use client';

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeAppointmentsOptions {
  // Filter für spezifischen Kunden (optional)
  customerId?: string;
  // Filter für Datumsbereich (optional)
  startDate?: string;
  endDate?: string;
  // Callback wenn sich Daten ändern
  onUpdate: () => void;
  // Ob Realtime aktiv sein soll
  enabled?: boolean;
}

/**
 * Hook für Echtzeit-Synchronisation von Terminen
 * Wird benachrichtigt bei INSERT, UPDATE, DELETE auf appointments-Tabelle
 */
export function useRealtimeAppointments({
  customerId,
  startDate,
  endDate,
  onUpdate,
  enabled = true,
}: UseRealtimeAppointmentsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onUpdateRef = useRef(onUpdate);

  // Callback-Ref aktualisieren
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const setupSubscription = useCallback(() => {
    if (!enabled) return;

    // Alten Channel entfernen falls vorhanden
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Neuen Channel erstellen
    const channelName = customerId
      ? `appointments-customer-${customerId}`
      : `appointments-all-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'appointments',
          // Filter nur für spezifischen Kunden wenn angegeben
          ...(customerId && { filter: `customer_id=eq.${customerId}` }),
        },
        (payload) => {
          console.log('Realtime appointment change:', payload.eventType, payload);

          // Bei Datumsfilter prüfen ob relevante Änderung
          if (startDate && endDate && payload.new) {
            const appointmentDate = (payload.new as { date?: string }).date;
            if (appointmentDate && (appointmentDate < startDate || appointmentDate > endDate)) {
              return; // Außerhalb des Datumsbereichs
            }
          }

          // Daten neu laden
          onUpdateRef.current();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;
  }, [enabled, customerId, startDate, endDate]);

  useEffect(() => {
    setupSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupSubscription]);

  // Manuelle Neuverbindung ermöglichen
  const reconnect = useCallback(() => {
    setupSubscription();
  }, [setupSubscription]);

  return { reconnect };
}
