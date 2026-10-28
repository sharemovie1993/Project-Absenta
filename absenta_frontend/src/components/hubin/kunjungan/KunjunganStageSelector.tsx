import React from 'react';
import { Send, Activity, LogOut, AlertTriangle } from 'lucide-react';

export type KunjunganOperationalStage = 'PENGANTARAN' | 'MONITORING' | 'PENJEMPUTAN' | 'INSIDENTAL';

export interface StageOption {
  id: KunjunganOperationalStage;
  label: string;
  shortLabel: string;
  desc: string;
  icon: React.ElementType;
  colorClass: string;
  activeBg: string;
  defaultDraft: string;
}

export const STAGE_OPTIONS: StageOption[] = [
  {
    id: 'PENGANTARAN',
    label: 'Pengantaran & Penyerahan',
    shortLabel: 'Pengantaran',
    desc: 'Serah terima awal siswa & orientasi industri',
    icon: Send,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    activeBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200',
    defaultDraft:
      'Telah dilaksanakan serah terima dan penyerahan siswa ke pihak DU/DI dalam keadaan lengkap dan siap melaksanakan PKL sesuai jadwal yang disepakati.',
  },
  {
    id: 'MONITORING',
    label: 'Monitoring Berkala',
    shortLabel: 'Monitoring',
    desc: 'Pemeriksaan jurnal, capaian CP & kendala',
    icon: Activity,
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    activeBg: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200',
    defaultDraft:
      'Monitoring berkala pelaksanaan PKL, pemeriksaan keaktifan dan jurnal harian siswa, serta evaluasi capaian kompetensi bersama mentor lapangan.',
  },
  {
    id: 'PENJEMPUTAN',
    label: 'Penjemputan & Penarikan',
    shortLabel: 'Penjemputan',
    desc: 'Penarikan resmi, format nilai & sertifikat',
    icon: LogOut,
    colorClass: 'text-purple-600 dark:text-purple-400',
    activeBg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200',
    defaultDraft:
      'Telah dilaksanakan penjemputan dan penarikan resmi siswa PKL setelah menyelesaikan seluruh masa penugasan di industri dalam keadaan baik dan tertib.',
  },
  {
    id: 'INSIDENTAL',
    label: 'Kunjungan Khusus',
    shortLabel: 'Insidental',
    desc: 'Penyelesaian masalah mendesak/konseling',
    icon: AlertTriangle,
    colorClass: 'text-amber-600 dark:text-amber-400',
    activeBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200',
    defaultDraft:
      'Kunjungan khusus bimbingan dan penyelesaian kendala teknis serta kedisiplinan siswa di tempat PKL.',
  },
];

export interface KunjunganStageSelectorProps {
  value: KunjunganOperationalStage;
  onChange: (stage: KunjunganOperationalStage, draftText?: string) => void;
  compact?: boolean;
}

export const KunjunganStageSelector: React.FC<KunjunganStageSelectorProps> = React.memo(({
  value,
  onChange,
  compact = false,
}) => {
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
        Tahap Operasional Kunjungan
      </span>
      <div className={`grid ${compact ? 'grid-cols-2 gap-1.5' : 'grid-cols-2 sm:grid-cols-4 gap-2'}`}>
        {STAGE_OPTIONS.map((stage) => {
          const Icon = stage.icon;
          const isSelected = value === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onChange(stage.id, stage.defaultDraft)}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? `${stage.activeBg} shadow-xs ring-1 ring-current font-bold`
                  : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={14} className={isSelected ? 'currentColor' : stage.colorClass} />
                <span className="text-xs font-bold leading-tight block truncate">
                  {compact ? stage.shortLabel : stage.label}
                </span>
              </div>
              <p className="text-[10px] opacity-75 line-clamp-1 leading-tight">
                {stage.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default KunjunganStageSelector;
