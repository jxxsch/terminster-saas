'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TimeSlotsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/zeiten?tab=slots');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
