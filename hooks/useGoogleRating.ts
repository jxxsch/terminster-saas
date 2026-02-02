'use client';

import { useState, useEffect } from 'react';
import { getSetting } from '@/lib/supabase';

interface GoogleRatingData {
  rating: number;
  reviewCount: number;
}

const DEFAULT_RATING: GoogleRatingData = {
  rating: 4.9,
  reviewCount: 100,
};

export function useGoogleRating() {
  const [data, setData] = useState<GoogleRatingData>(DEFAULT_RATING);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRating() {
      try {
        const rating = await getSetting<GoogleRatingData>('google_rating');
        if (rating) {
          setData(rating);
        }
      } catch (err) {
        console.error('Error fetching Google rating:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRating();
  }, []);

  return { data, isLoading };
}
