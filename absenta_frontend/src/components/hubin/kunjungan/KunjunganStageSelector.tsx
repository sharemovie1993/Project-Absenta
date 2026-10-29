import React from 'react';
import { Send, Activity, LogOut, AlertTriangle, Lock, Check } from 'lucide-react';

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
  hasPengantaran?: boolean;
  hasMonitoring?: boolean;
  hasPenjemputan?: boolean;
  isReadyForPenjemputan?: boolean;
  isEditing?: boolean;
}

export const KunjunganStageSelector: React.FC<KunjunganStageSelectorProps> = React.memo(({
  value,
  onChange,
  compact = false,
  hasPengantaran = false,
  hasMonitoring = false,
  hasPenjemputan = false,
  isReadyForPenjemputan = false,
  isEditing = false,
}) => {
  // Logika Proteksi Alur Supervisi Siklus Tertutup:
  // 1. Belum Pengantaran -> Hanya Pengantaran AKTIF
  // 2. Sudah Pengantaran, Belum Monitoring -> Pengantaran SELESAI, Monitoring AKTIF, Penjemputan TERKUNCI
  // 3. Masuk Tahap Penjemputan (Monitoring selesai) -> Monitoring SELESAI, Penjemputan AKTIF
  // 4. Sudah Penjemputan -> Seluruh tahap reguler SELESAI
  // 5. Mode Edit -> Bebas agar pembimbing bisa merevisi data lama
  const getStageState = (stageId: KunjunganOperationalStage): { disabled: boolean; reason?: string; isDone?: boolean } => {
    if (isEditing) {
      return { disabled: false };
    }

    // 1. Belum Pengantaran
    if (!hasPengantaran) {
      if (stageId === 'PENGANTARAN') return { disabled: false };
      return {
        disabled: true,
        reason: 'Terkunci: Wajib selesaikan tahap Pengantaran & Penyerahan terlebih dahulu',
      };
    }

    // 2. Sudah Pengantaran -> Pengantaran selesai
    if (stageId === 'PENGANTARAN') {
      return {
        disabled: true,
        reason: 'Selesai: Pengantaran & serah terima siswa sudah terlaksana',
        isDone: true,
      };
    }

    // 3. Sudah Penjemputan -> Penjemputan & Monitoring selesai
    if (hasPenjemputan) {
      if (stageId === 'PENJEMPUTAN') {
        return {
          disabled: true,
          reason: 'Selesai: Penjemputan & penarikan siswa sudah terlaksana',
          isDone: true,
        };
      }
      if (stageId === 'MONITORING') {
        return {
          disabled: true,
          reason: 'Selesai: Masa PKL telah selesai dan siswa sudah ditarik',
          isDone: true,
        };
      }
    }

    // 4. Belum Penjemputan, tapi belum pernah Monitoring -> Penjemputan belum dibuka
    if (!hasMonitoring && stageId === 'PENJEMPUTAN') {
      return {
        disabled: true,
        reason: 'Terkunci: Wajib lakukan minimal 1x Monitoring berkala sebelum penjemputan',
      };
    }

    // 5. Masuk Tahap Penjemputan (Monitoring selesai) -> Monitoring dinonaktifkan
    if (isReadyForPenjemputan && stageId === 'MONITORING') {
      return {
        disabled: true,
        reason: 'Selesai: Tahap monitoring berkala sudah terlaksana. Saatnya penjemputan',
        isDone: true,
      };
    }

    return { disabled: false };
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          Tahap Operasional Kunjungan
        </span>
        {!isEditing && (
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
            {!hasPengantaran
              ? 'Tahap 1: Pengantaran Awal'
              : !hasMonitoring
              ? 'Tahap 2: Monitoring Berkala'
              : !hasPenjemputan
              ? 'Tahap 3: Penjemputan Siswa'
              : 'Siklus Lengkap'}
          </span>
        )}
      </div>

      <div className={`grid ${compact ? 'grid-cols-2 gap-1.5' : 'grid-cols-2 sm:grid-cols-4 gap-2'}`}>
        {STAGE_OPTIONS.map((stage) => {
          const Icon = stage.icon;
          const isSelected = value === stage.id;
          const state = getStageState(stage.id);

          return (
            <button
              key={stage.id}
              type="button"
              disabled={state.disabled}
              onClick={() => {
                if (!state.disabled) {
                  onChange(stage.id, stage.defaultDraft);
                }
              }}
              title={state.reason || stage.label}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                state.disabled
                  ? state.isDone
                    ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-70'
                    : 'bg-slate-50/50 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-55'
                  : isSelected
                  ? `${stage.activeBg} shadow-xs ring-1 ring-current font-bold cursor-pointer`
                  : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon
                    size={14}
                    className={
                      state.disabled
                        ? 'text-slate-400 shrink-0'
                        : isSelected
                        ? 'currentColor shrink-0'
                        : `${stage.colorClass} shrink-0`
                    }
                  />
                  <span className="text-xs font-bold leading-tight block truncate">
                    {compact ? stage.shortLabel : stage.label}
                  </span>
                </div>
                {state.isDone ? (
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded">
                    <Check size={9} /> Selesai
                  </span>
                ) : state.disabled ? (
                  <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5 shrink-0 bg-slate-200/60 dark:bg-slate-800 px-1 py-0.2 rounded">
                    <Lock size={9} /> Terkunci
                  </span>
                ) : isSelected ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                ) : null}
              </div>
              <p className="text-[10px] opacity-75 line-clamp-1 leading-tight">
                {state.reason || stage.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Helper Context Alert */}
      {!isEditing && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] border bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/80 text-slate-600 dark:text-slate-400">
          {!hasPengantaran ? (
            <>
              <Send size={12} className="text-emerald-600 shrink-0" />
              <span>
                <strong>Proteksi Siklus 1:</strong> Wajib selesaikan tahap <em>Pengantaran & Penyerahan</em> sebelum monitoring dapat dicatat.
              </span>
            </>
          ) : !hasMonitoring ? (
            <>
              <Activity size={12} className="text-indigo-600 shrink-0" />
              <span>
                <strong>Proteksi Siklus 2:</strong> Siswa sudah diantar. Lakukan <em>Monitoring Berkala</em> untuk evaluasi jurnal & capaian CP.
              </span>
            </>
          ) : !hasPenjemputan ? (
            <>
              <LogOut size={12} className="text-purple-600 shrink-0" />
              <span>
                <strong>Proteksi Siklus Akhir:</strong> Pengantaran & Monitoring selesai. Saatnya melakukan <em>Penjemputan & Penarikan Siswa</em>.
              </span>
            </>
          ) : (
            <>
              <Check size={12} className="text-emerald-600 shrink-0" />
              <span>
                <strong>Siklus Lengkap:</strong> Seluruh tahap operasional PKL (Pengantaran, Monitoring, Penjemputan) telah selesai dilaksanakan.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default KunjunganStageSelector;
