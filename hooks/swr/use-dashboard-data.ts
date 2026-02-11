'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useSyncExternalStore, useCallback } from 'react';

// ============================================
// SCOPED MUTATE (für Custom Cache Provider)
// ============================================
// globalMutate aus 'swr' erreicht NICHT den Custom Cache Provider.
// Wir speichern den scoped mutate aus useSWRConfig() in einer Modul-Referenz,
// damit alle Mutation-Helpers den richtigen Cache invalidieren.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _scopedMutate: ((...args: any[]) => any) | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setScopedMutate(mutate: (...args: any[]) => any): void {
  _scopedMutate = mutate;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMutate(): (...args: any[]) => any {
  return _scopedMutate || globalMutate;
}
import {
  getTeam,
  getAllTeam,
  getCalendarServices,
  getServices,
  getAllServices,
  getTimeSlots,
  getAllTimeSlots,
  getAppointments,
  getSeries,
  getStaffTimeOff,
  getStaffTimeOffForDateRange,
  getClosedDates,
  getOpenSundays,
  getOpenSundayStaff,
  getOpeningHours,
  getAllSettings,
  getAllProducts,
  getProducts,
  getAllCustomers,
  getOpenHolidays,
  getStaffWorkingHours,
  getFreeDayExceptions,
  getFreeDayExceptionsForDateRange,
  getGalleryImages,
  getAllGalleryImages,
  getReviews,
  getAllReviews,
  type TeamMember,
  type Service,
  type TimeSlot,
  type Appointment,
  type Series,
  type StaffTimeOff,
  type ClosedDate,
  type OpenSunday,
  type OpenSundayStaff,
  type OpeningHours,
  type Product,
  type OpenHoliday,
  type StaffWorkingHours,
  type FreeDayException,
  type GalleryImage,
  type Review,
} from '@/lib/supabase';

// ============================================
// DASHBOARD HOOKS (Public data)
// ============================================

export function useTeam() {
  return useSWR<TeamMember[]>('team', () => getTeam(), {
    dedupingInterval: 5 * 60 * 1000, // 5 min
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useCalendarServices() {
  return useSWR<Service[]>('services:calendar', () => getCalendarServices(), {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useAppointments(startDate: string | undefined, endDate: string | undefined) {
  return useSWR<Appointment[]>(
    startDate && endDate ? `appointments:${startDate}:${endDate}` : null,
    () => getAppointments(startDate!, endDate!),
    {
      dedupingInterval: 5 * 1000, // 5s
      refreshInterval: 15 * 1000, // 15s polling
      revalidateOnFocus: true,
      fallbackData: [],
    }
  );
}

export function useSeries() {
  return useSWR<Series[]>('series', () => getSeries(), {
    dedupingInterval: 60 * 1000, // 1 min
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useStaffTimeOff(startDate?: string, endDate?: string) {
  const key = startDate && endDate ? `staffTimeOff:${startDate}:${endDate}` : 'staffTimeOff:all';
  return useSWR<StaffTimeOff[]>(
    key,
    () => startDate && endDate ? getStaffTimeOffForDateRange(startDate, endDate) : getStaffTimeOff(),
    {
      dedupingInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      fallbackData: [],
    }
  );
}

export function useClosedDates() {
  return useSWR<ClosedDate[]>('closedDates', () => getClosedDates(), {
    dedupingInterval: 10 * 60 * 1000, // 10 min
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useOpenSundays() {
  return useSWR<OpenSunday[]>('openSundays', () => getOpenSundays(), {
    dedupingInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useOpenSundayStaff() {
  return useSWR<OpenSundayStaff[]>('openSundayStaff', () => getOpenSundayStaff(), {
    dedupingInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useTimeSlots() {
  return useSWR<TimeSlot[]>('timeSlots', () => getTimeSlots(), {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useOpeningHours() {
  return useSWR<OpeningHours[]>('openingHours', () => getOpeningHours(), {
    dedupingInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useOpenHolidays() {
  return useSWR<OpenHoliday[]>('openHolidays', () => getOpenHolidays(), {
    dedupingInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useStaffWorkingHours() {
  return useSWR<StaffWorkingHours[]>('staffWorkingHours', () => getStaffWorkingHours(), {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useFreeDayExceptions(startDate?: string, endDate?: string) {
  const key = startDate && endDate ? `freeDayExceptions:${startDate}:${endDate}` : 'freeDayExceptions:all';
  return useSWR<FreeDayException[]>(
    key,
    () => startDate && endDate ? getFreeDayExceptionsForDateRange(startDate, endDate) : getFreeDayExceptions(),
    {
      dedupingInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      fallbackData: [],
    }
  );
}

// ============================================
// ADMIN HOOKS (All data including inactive)
// ============================================

export function useAllTeam() {
  return useSWR<TeamMember[]>('team:all', () => getAllTeam(), {
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: true,
    fallbackData: [],
  });
}

export function useAllServices() {
  return useSWR<Service[]>('services:all', () => getAllServices(), {
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: true,
    fallbackData: [],
  });
}

export function useAllTimeSlots() {
  return useSWR<TimeSlot[]>('timeSlots:all', () => getAllTimeSlots(), {
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: true,
    fallbackData: [],
  });
}

export function useServices() {
  return useSWR<Service[]>('services', () => getServices(), {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useAllSettings() {
  return useSWR<Record<string, unknown>>('settings:all', () => getAllSettings(), {
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: true,
  });
}

export function useAllProducts() {
  return useSWR<Product[]>('products:all', () => getAllProducts(), {
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: true,
    fallbackData: [],
  });
}

export function useProducts() {
  return useSWR<Product[]>('products', () => getProducts(), {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useAllCustomers() {
  return useSWR('customers:all', () => getAllCustomers(), {
    dedupingInterval: 30 * 1000,
    revalidateOnFocus: true,
    fallbackData: [],
  });
}

export function useStaffTimeOffAll() {
  return useSWR<StaffTimeOff[]>('staffTimeOff:all', () => getStaffTimeOff(), {
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: true,
    fallbackData: [],
  });
}

export function useGalleryImages() {
  return useSWR<GalleryImage[]>('gallery', () => getGalleryImages(), {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useAllGalleryImages() {
  return useSWR<GalleryImage[]>('gallery:all', () => getAllGalleryImages(), {
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: true,
    fallbackData: [],
  });
}

export function useReviews() {
  return useSWR<Review[]>('reviews', () => getReviews(), {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useAllReviews() {
  return useSWR<Review[]>('reviews:all', () => getAllReviews(), {
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: true,
    fallbackData: [],
  });
}

// ============================================
// MUTATION HELPERS (nutzen scopedMutate statt globalMutate)
// ============================================

// Invalidate specific SWR cache keys
export function invalidateSWR(pattern?: string): void {
  const mutate = getMutate();
  if (!pattern) {
    mutate(() => true, undefined, { revalidate: true });
    return;
  }

  mutate(
    (key: string) => typeof key === 'string' && key.includes(pattern),
    undefined,
    { revalidate: true }
  );
}

// Specific invalidation helpers
export const mutateTeam = () => {
  const mutate = getMutate();
  mutate('team');
  mutate('team:all');
};

export const mutateServices = () => {
  const mutate = getMutate();
  mutate('services');
  mutate('services:all');
  mutate('services:calendar');
};

export const mutateAppointments = () => {
  const mutate = getMutate();
  mutate(
    (key: unknown) => typeof key === 'string' && key.startsWith('appointments:'),
    undefined,
    { revalidate: true }
  );
};

export const mutateSeries = () => {
  getMutate()('series');
};

export const mutateTimeSlots = () => {
  const mutate = getMutate();
  mutate('timeSlots');
  mutate('timeSlots:all');
};

export const mutateStaffTimeOff = () => {
  getMutate()(
    (key: unknown) => typeof key === 'string' && key.startsWith('staffTimeOff:'),
    undefined,
    { revalidate: true }
  );
};

export const mutateClosedDates = () => {
  getMutate()('closedDates');
};

export const mutateOpenSundays = () => {
  const mutate = getMutate();
  mutate('openSundays');
  mutate('openSundayStaff');
};

export const mutateOpeningHours = () => {
  getMutate()('openingHours');
};

export const mutateSettings = () => {
  getMutate()('settings:all');
};

export const mutateProducts = () => {
  const mutate = getMutate();
  mutate('products');
  mutate('products:all');
};

export const mutateCustomers = () => {
  getMutate()('customers:all');
};

export const mutateGallery = () => {
  const mutate = getMutate();
  mutate('gallery');
  mutate('gallery:all');
};

export const mutateReviews = () => {
  const mutate = getMutate();
  mutate('reviews');
  mutate('reviews:all');
};

export const mutateOpenHolidays = () => {
  getMutate()('openHolidays');
};

export const mutateStaffWorkingHours = () => {
  getMutate()('staffWorkingHours');
};

export const mutateFreeDayExceptions = () => {
  getMutate()(
    (key: unknown) => typeof key === 'string' && key.startsWith('freeDayExceptions:'),
    undefined,
    { revalidate: true }
  );
};

// ============================================
// ONLINE STATUS HOOK
// ============================================

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);
}

// ============================================
// RE-EXPORT mutate for direct use
// ============================================
export { globalMutate as mutate };

// Backward compatibility: invalidateCache → invalidateSWR
export const invalidateCache = invalidateSWR;
