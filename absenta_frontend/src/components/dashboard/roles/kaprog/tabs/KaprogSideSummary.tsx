import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface KaprogSideSummaryProps {
  agendaHariIni?: Array<{ jam: string; agenda: string; tipe?: string }>;
  tpStatus: {
    totalMitra: number;
    filledMitra: number;
    pendingMitra: number;
    completionPercentage: number;
  };
}

export const KaprogSideSummary: React.FC<KaprogSideSummaryProps> = React.memo(({
  agendaHariIni = [],
  tpStatus,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-5 pb-16">
      {/* Agenda Hari Ini */}
      <Card noPadding className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Agenda Hari Ini
          </h4>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
        </div>
        <div className="space-y-2.5">
          {(agendaHariIni || [])?.map((ag, i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                  {ag.jam}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">{ag.tipe || 'KBM'}</span>
              </div>
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {ag.agenda}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 6 Quick Action Shortcuts */}
      <Card noPadding className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Akses Cepat
        </h4>
        <div className="space-y-1">
          {[
            { label: 'Formulasi TP PKL', path: '/hubin/nilai-pkl?tab=deskripsi' },
            { label: 'Rekapitulasi Nilai', path: '/hubin/nilai-pkl?tab=dudi' },
            { label: 'Presensi Kelas Harian', path: '/attendance/sesi' },
            { label: 'Jurnal & Logbook PKL', path: '/hubin/absensi' },
            { label: 'Inventaris Bengkel / Lab', path: '/sarpras/inventaris' },
            { label: 'Tracer Study Alumni', path: '/hubin/tracer' },
          ]?.map((btn, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => navigate(btn.path)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 flex items-center justify-between transition-colors cursor-pointer group"
            >
              <span>{btn.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </Card>

      {/* Status Sistem Operasional Jurusan */}
      <Card noPadding className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Status Operasional
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Presensi Siswa PKL</span>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Aktif</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Instrumen TP DUDI</span>
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  (tpStatus?.pendingMitra || 0) === 0 ? 'bg-emerald-500' : 'bg-amber-500'
                )}
              />
              <span
                className={
                  (tpStatus?.pendingMitra || 0) === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }
              >
                {(tpStatus?.pendingMitra || 0) === 0 ? '100% Siap' : `${tpStatus?.pendingMitra || 0} Pending`}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Sertifikat PKL</span>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Format Siap</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">UKK Kejuruan</span>
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>Semester Genap</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

KaprogSideSummary.displayName = 'KaprogSideSummary';
