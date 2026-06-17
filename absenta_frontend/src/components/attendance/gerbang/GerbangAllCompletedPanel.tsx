import React from 'react';
import { CheckCircle } from 'lucide-react';
/**
 * Komponen presentational.
 * Tidak mengandung logic bisnis atau fetch data.
 */
export function GerbangAllCompletedPanel() {
  return (
    <div className="p-6 border rounded-lg bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 flex flex-col md:flex-row items-center md:items-start gap-4">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        <div>
          <div className="text-lg font-semibold">Absensi Gerbang Selesai</div>
          <div className="text-sm">Semua siswa telah direkam hari ini.</div>
        </div>
      </div>
    </div>
  );
}
