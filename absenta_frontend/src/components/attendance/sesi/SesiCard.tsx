import React from 'react';
import { motion } from 'framer-motion';
import { Badge, Button } from '../../ui';
import { 
  BookOpen, 
  Trash, 
  CheckCircle2, 
  Clock, 
  School, 
  AlertCircle, 
  Fingerprint, 
  Users,
  Cpu,
  PencilLine
} from 'lucide-react';

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

type Props = {
  sesi: any;
  isExpanded: boolean;
  counts: Record<string, number>;
  guruStatusText: string;
  guruStatusVariant: BadgeVariant;
  canFinish: boolean;
  onToggleExpand: () => void;
  onFinish: () => void;
  onDelete: () => void;
  onScan: () => void;
  isGuru: boolean;
  jenisBadgeVariant: BadgeVariant;
  Icon: React.ComponentType<any>;
  iconClass: string;
  mapelLabel: (id?: string) => string;
  guruLabel: (id?: string) => string;
  waktuMulaiText: string;
  waktuSelesaiText: string;
  showScanGuru: boolean;
  showScanSiswa: boolean;
  canManage?: boolean;
  onOpenJournal?: () => void;
};

export const SesiCard = React.memo(function SesiCard({
  sesi,
  isExpanded,
  counts,
  guruStatusText,
  guruStatusVariant,
  canFinish,
  onToggleExpand,
  onFinish,
  onDelete,
  onScan,
  isGuru,
  canManage,
  jenisBadgeVariant,
  Icon,
  iconClass,
  mapelLabel,
  guruLabel,
  waktuMulaiText,
  waktuSelesaiText,
  showScanGuru,
  showScanSiswa,
  onOpenJournal,
}: Props) {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const rawJenis = String(sesi?.jenis_kegiatan || '').trim();
  const metaNama = String((sesi as any)?.jenis_kegiatan_nama || '').trim();
  const slotKbm = (sesi as any)?.slot_kbm ? String((sesi as any).slot_kbm) : '';
  const jk = (() => {
    if (metaNama) return metaNama;
    if (rawJenis && !uuidRe.test(rawJenis)) return rawJenis;
    if (rawJenis.toUpperCase() === 'KBM' && slotKbm) return `KBM ${slotKbm}`;
    return '-';
  })();
  const isFinished = String(sesi.status || '').toUpperCase() === 'SELESAI';
  const canDelete = canManage && !isFinished;
  const now = new Date();
  const startAt = (sesi as any)?.waktu_mulai ? new Date((sesi as any).waktu_mulai) : null;
  const endAt = (sesi as any)?.waktu_selesai ? new Date((sesi as any).waktu_selesai) : null;
  const hasValidTime = !!startAt && !!endAt && !Number.isNaN(startAt.getTime()) && !Number.isNaN(endAt.getTime());
  const isLiveByTime = hasValidTime && now >= (startAt as Date) && now <= (endAt as Date);
  const isPastByTime = hasValidTime && now > (endAt as Date);
  const isFutureByTime = hasValidTime && now < (startAt as Date);
  const isLive = !isFinished && isLiveByTime;
  const isOverdue = !isFinished && isPastByTime;
  const isUpcoming = !isFinished && isFutureByTime;

  // Source badge: TEMPLATE = otomatis/sistem, else = manual
  const sumberSesi = String((sesi as any)?.sumber_sesi || '').toUpperCase();
  const isOtomatis = sumberSesi === 'TEMPLATE';

  const containerClassName = (() => {
    if (isLive) {
      return 'relative border rounded-xl p-3 sm:p-4 flex flex-col gap-3 bg-gradient-to-br from-indigo-50/70 to-white dark:from-indigo-900/20 dark:to-gray-800 dark:border-indigo-800 shadow-sm transition-all hover:shadow-md ring-1 ring-indigo-200/60';
    }
    if (isFinished) {
      return 'relative border rounded-xl p-3 sm:p-4 flex flex-col gap-3 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800/60 shadow-sm transition-all hover:shadow-md';
    }
    if (isOverdue) {
      return 'relative border rounded-xl p-3 sm:p-4 flex flex-col gap-3 bg-gray-50/70 dark:bg-gray-900/20 dark:border-gray-700 shadow-sm transition-all hover:shadow-md opacity-80';
    }
    return 'relative border rounded-xl p-3 sm:p-4 flex flex-col gap-3 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm transition-all hover:shadow-md';
  })();

  const mapelText = (() => {
    const fromRel = String((sesi as any)?.Mapel?.nama_mapel || (sesi as any)?.Mapel?.nama || '').trim();
    if (fromRel) return fromRel;
    const fromLabel = String(mapelLabel((sesi as any)?.mapel_id)).trim();
    if (fromLabel && fromLabel !== '-') return fromLabel;
    return jk;
  })();

  const guruText = (() => {
    const fromRel = String((sesi as any)?.Guru?.nama_guru || (sesi as any)?.guru_nama || '').trim();
    if (fromRel) return fromRel;
    const id = (sesi as any)?.guru_id;
    if (!id) return '-';
    return String(guruLabel(id)).trim() || '-';
  })();

  const kelasText = (() => {
    const fromRel = String((sesi as any)?.Kelas?.nama_kelas || (sesi as any)?.kelas_nama || (sesi as any)?.kelas || '').trim();
    return fromRel || '-';
  })();

  const stGuru = String(guruStatusText || '').toUpperCase();
  const isGuruHadir = !stGuru.includes('BELUM') && (stGuru === 'HADIR' || stGuru.includes('HADIR') || stGuru === 'TEPAT_WAKTU');

  // Suggested Logic: What should the user do next?
  const suggestedAction = (() => {
    if (isFinished) return null;
    if (isLive) {
      if (!isGuruHadir && showScanGuru) return { label: 'Konfirmasi Guru', color: 'indigo' };
      if (showScanSiswa) return { label: 'Input Presensi', color: 'emerald' };
    }
    return null;
  })();

  return (
    <div 
      className={`${containerClassName} group/card overflow-hidden cursor-pointer active:scale-[0.98] transition-all rounded-xl sm:rounded-3xl border p-2.5 sm:p-4 space-y-1.5 sm:space-y-2.5`}
      onClick={onScan}
    >
      {isLive && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 pointer-events-none" />
      )}
      
      {/* Line 1: Header Badge Row */}
      <div className="flex items-center justify-between gap-1.5 relative z-10">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0">
          <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[11px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            {kelasText}
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 font-bold shrink-0">
            • {waktuMulaiText} – {waktuSelesaiText}
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-1">
          {isLive && (
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 animate-pulse">
              LIVE
            </span>
          )}
          {isFinished && (
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              SELESAI
            </span>
          )}
          {isOverdue && (
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              TERLEWAT
            </span>
          )}
          {isUpcoming && (
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
              MENDATANG
            </span>
          )}
        </div>
      </div>

      {/* Line 2: Subject Title & Info */}
      <div className="space-y-0.5 relative z-10">
        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug tracking-tight line-clamp-2">
          {mapelText}
        </h3>

        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
              Guru: {guruText}
            </span>
            <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isGuruHadir ? 'bg-emerald-500' : 'bg-amber-500'}`} title={guruStatusText} />
          </div>

          <div className="font-mono font-extrabold text-slate-700 dark:text-slate-300 shrink-0">
            Hadir: <span className="text-indigo-600 dark:text-indigo-400">{((counts.HADIR ?? counts.hadir ?? 0) + (counts.TERLAMBAT ?? counts.terlambat ?? 0))}</span>/{(counts.TOTAL ?? counts.total ?? (sesi as any)?._summary?.total ?? 0)}
          </div>
        </div>
      </div>

      {/* Line 3: Compact Action Bar */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800/80 relative z-10">
        {/* Left: Badges */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] sm:text-[10px] font-extrabold text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
            {jk}
          </span>
          {isOtomatis ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded bg-blue-500/10 text-[9px] sm:text-[10px] font-extrabold text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Cpu className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Sistem
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded bg-amber-500/10 text-[9px] sm:text-[10px] font-extrabold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <PencilLine className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Manual
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isFinished && onOpenJournal && (rawJenis.toUpperCase().includes('KBM')) && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenJournal?.(); }}
              className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 text-[9px] sm:text-[10px] font-black border border-blue-200 dark:border-blue-800/60 transition-colors shadow-2xs"
            >
              <BookOpen size={11} />
              <span>Jurnal</span>
            </button>
          )}

          {canManage && !isFinished && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Hapus Sesi"
              >
                <Trash size={13} />
              </button>
              <button
                type="button"
                className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                onClick={(e) => { e.stopPropagation(); onFinish(); }}
                title="Selesaikan Sesi"
              >
                <CheckCircle2 size={13} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black transition-all cursor-pointer ${
              isExpanded 
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
            }`}
          >
            {isExpanded ? 'Tutup' : 'Log Hadir'}
          </button>
        </div>
      </div>
    </div>
  );
});

// Dummy/Empty wrapper to maintain layout if needed
const DropdownWrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;
