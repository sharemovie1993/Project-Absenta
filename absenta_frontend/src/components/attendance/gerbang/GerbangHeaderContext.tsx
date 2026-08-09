import React from 'react';
import { Badge } from '../../ui/Badge';
import { User, MapPin, Activity, CheckCircle2 } from 'lucide-react';

/**
 * Komponen presentational.
 * Tidak mengandung logic bisnis atau fetch data.
 */
export const GerbangHeaderContext = React.memo(function GerbangHeaderContext({
  modeLabel,
  roleLabel,
  petugasLabel,
  petugasVariant,
  kelasLabel,
  petugasName,
  kelasUuid,
}: {
  modeLabel: string;
  roleLabel: string;
  petugasLabel: string;
  petugasVariant: 'success' | 'destructive' | 'outline';
  kelasLabel?: string;
  petugasName?: string;
  kelasUuid?: string;
}) {
  const isKelasEmpty = !kelasLabel || kelasLabel === '-' || kelasLabel === 'N/A';
  
  const statusColors = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    destructive: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
    outline: 'bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
      {/* Detail Section */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {/* petugas */}
        <div className="flex items-center gap-2 group">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 transition-colors group-hover:bg-indigo-100">
            <User size={14} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col -space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Bertugas</span>
            <span className="font-semibold text-gray-700 dark:text-gray-200">{petugasName || roleLabel || '-'}</span>
          </div>
        </div>

        {/* Kelas - Only show if not empty */}
        {!isKelasEmpty && (
          <div className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 transition-colors group-hover:bg-amber-100">
              <MapPin size={14} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col -space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Lokasi/Kelas</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200" title={kelasUuid || undefined}>{kelasLabel}</span>
            </div>
          </div>
        )}

        {/* Mode info (Subtle) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700">
          <Activity size={12} className="text-gray-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{modeLabel}</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center">
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all hover:shadow-md ${statusColors[petugasVariant]}`}>
          {petugasVariant === 'success' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          <span className="uppercase tracking-wide">{petugasLabel}</span>
        </div>
      </div>
    </div>
  );
});
