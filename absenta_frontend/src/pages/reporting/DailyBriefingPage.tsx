/**
 * DailyBriefingPage.tsx
 * Halaman Publik Standalone untuk Laporan Harian Eksekutif (Daily Briefing).
 *
 * Mengambil parameter `?token=...` dari URL dan merender `DailyBriefingView`.
 * Halaman ini dapat diakses secara publik tanpa login karena otentikasi
 * dijaga oleh signed cryptographic token.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { DailyBriefingView } from '@/components/reporting/daily-briefing/DailyBriefingView';

export const DailyBriefingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || undefined;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <DailyBriefingView token={token} />
    </div>
  );
};

export default DailyBriefingPage;
