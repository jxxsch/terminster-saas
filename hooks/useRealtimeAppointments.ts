'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeAppointmentsOptions {
  customerId?: string;
  startDate?: string;
  endDate?: string;
  onUpdate: () => void;
  enabled?: boolean;
}

/**
 * Hook für Echtzeit-Synchronisation von Terminen.
 *
 * Stabile Subscription:
 * - Nur `enabled` und `customerId` verursachen Re-Subscribe
 *   (customerId ändert den Supabase-Filter, enabled schaltet an/aus)
 * - `startDate`, `endDate`, `onUpdate` werden über Refs gelesen → kein Re-Subscribe
 * - Stabiler Channel-Name (kein Date.now())
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
  const startDateRef = useRef(startDate);
  const endDateRef = useRef(endDate);

  // Refs aktualisieren (kein Re-Subscribe nötig)
  onUpdateRef.current = onUpdate;
  startDateRef.current = startDate;
  endDateRef.current = endDate;

  useEffect(() => {
    // Aufräumen falls bereits aktiv
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!enabled) return;

    // Stabiler Channel-Name
    const channelName = customerId
      ? `appointments-customer-${customerId}`
      : 'appointments-all';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          ...(customerId && { filter: `customer_id=eq.${customerId}` }),
        },
        (payload) => {
          // Client-seitiger Datumsfilter
          if (startDateRef.current && endDateRef.current && payload.new) {
            const appointmentDate = (payload.new as { date?: string }).date;
            if (appointmentDate && (appointmentDate < startDateRef.current || appointmentDate > endDateRef.current)) {
              return;
            }
          }
          onUpdateRef.current();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [enabled, customerId]);
}
