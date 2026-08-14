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
  hideKelas?: boolean;
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
  hideKelas = false,
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
      return 'relative border rounded-2xl p-3 sm:p-3.5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border-blue-500/30 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20 backdrop-blur-md transition-all hover:shadow-lg border-l-4 border-l-blue-500';
    }
    if (isFinished) {
      return 'relative border rounded-2xl p-3 sm:p-3.5 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/90 shadow-xs transition-all hover:shadow-md hover:border-emerald-500/30 border-l-4 border-l-emerald-400';
    }
    if (isOverdue) {
      return 'relative border rounded-2xl p-3 sm:p-3.5 bg-amber-50/40 dark:bg-amber-950/10 border-slate-200/70 dark:border-slate-800 shadow-xs transition-all hover:shadow-md hover:border-amber-400/50 border-l-4 border-l-amber-400';
    }
    // Upcoming / default
    return 'relative border rounded-2xl p-3 sm:p-3.5 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-xs transition-all hover:shadow-md hover:border-slate-400/40 border-l-4 border-l-slate-300 dark:border-l-slate-600';
  })();

  const mapelText = (() => {
    const fromRel = String((sesi as any)?.Mapel?.nama_mapel || (sesi as any)?.Mapel?.nama || (sesi as any)?.mapel_nama || (sesi as any)?.mapel || '').trim();
    if (fromRel) return fromRel;
    const fromLabel = String(mapelLabel((sesi as any)?.mapel_id)).trim();
    if (fromLabel && fromLabel !== '-') return fromLabel;
    return jk && jk !== '-' ? jk : 'Mata Pelajaran KBM';
  })();

  const guruText = (() => {
    const fromRel = String((sesi as any)?.Guru?.nama_guru || (sesi as any)?.guru_nama || '').trim();
    if (fromRel) return fromRel;
    const id = (sesi as any)?.guru_id;
    if (!id) return 'Guru Pengajar';
    const label = String(guruLabel(id)).trim();
    return label && label !== '-' ? label : 'Guru Pengajar';
  })();

  const kelasText = (() => {
    const fromRel = String((sesi as any)?.Kelas?.nama_kelas || (sesi as any)?.kelas_nama || (sesi as any)?.kelas || '').trim();
    return fromRel || 'Kelas';
  })();

  const stGuru = String(guruStatusText || '').toUpperCase();
  const isGuruHadir = !stGuru.includes('BELUM') && (stGuru === 'HADIR' || stGuru.includes('HADIR') || stGuru === 'TEPAT_WAKTU');

  return (
    <div 
      className={`${containerClassName} group/card overflow-hidden cursor-pointer active:scale-[0.98] transition-all`}
      onClick={onScan}
    >
      {isLive && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 pointer-events-none" />
      )}
      
      <div className="flex flex-row items-stretch justify-between gap-2.5 relative z-10">
        {/* LEFT COLUMN: Informasional Sesi */}
        <div className="flex-1 space-y-1.5 min-w-0 pr-1">
          {/* Header Tag */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {!hideKelas && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                {kelasText}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              hideKelas 
                ? 'bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/20' 
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>{waktuMulaiText} – {waktuSelesaiText}</span>
            </span>
          </div>

          {/* Subject Title */}
          <h3 className="text-[10px] sm:text-[11px] font-black text-slate-900 dark:text-white leading-tight tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {mapelText}
          </h3>

          {/* Guru & Teacher Status Label */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 flex-wrap">
            <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
              {guruText}
            </span>
            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
              guruStatusVariant === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' :
              guruStatusVariant === 'destructive' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' :
              'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
            }`}>
              Guru: {guruStatusText}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Badges & Akses Cepat Vertikal */}
        <div className="w-28 sm:w-32 shrink-0 flex flex-col items-end justify-between gap-1 pl-2.5 border-l border-slate-100 dark:border-slate-800/80">
          {/* Status Badge */}
          <div className="shrink-0">
            {isLive && (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs shadow-blue-600/30 animate-pulse">
                LIVE
              </span>
            )}
            {isFinished && (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                SELESAI
              </span>
            )}
            {isOverdue && (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                TERLEWAT
              </span>
            )}
            {isUpcoming && (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                MENDATANG
              </span>
            )}
          </div>

          {/* Hadir Count Badge */}
          <div className="shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-[10px] font-mono font-extrabold text-slate-700 dark:text-slate-300 inline-block border border-slate-200/60 dark:border-slate-700/60">
              Hadir: <span className="text-blue-600 dark:text-blue-400">{((counts.HADIR ?? counts.hadir ?? 0) + (counts.TERLAMBAT ?? counts.terlambat ?? 0))}</span>/{(counts.TOTAL ?? counts.total ?? (sesi as any)?._summary?.total ?? 0)}
            </span>
          </div>

          {/* Non-KBM Activity Badge (if applicable) */}
          {jk && !jk.toUpperCase().includes('KBM') && jk !== '-' && (
            <div className="flex items-center gap-1 flex-wrap justify-end">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-extrabold text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
                {jk}
              </span>
            </div>
          )}

          {/* Vertical Buttons Stack */}
          <div className="flex flex-col items-end gap-1 w-full pt-1">
            {isFinished && onOpenJournal && (rawJenis.toUpperCase().includes('KBM')) && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenJournal?.(); }}
                className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-extrabold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <BookOpen size={11} />
                <span>Jurnal</span>
              </button>
            )}

            <div className="flex items-center gap-1 w-full justify-end">
              {canManage && !isFinished && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    title="Hapus Sesi"
                  >
                    <Trash size={12} />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onFinish(); }}
                    title="Selesaikan Sesi"
                  >
                    <CheckCircle2 size={12} />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                className={`w-full px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer text-center ${
                  isExpanded 
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-600/20'
                }`}
              >
                {isExpanded ? 'Tutup' : 'Log Hadir'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Dummy/Empty wrapper to maintain layout if needed
const DropdownWrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;
