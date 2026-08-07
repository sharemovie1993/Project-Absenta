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

export function SesiCard({
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
      className={`${containerClassName} group/card overflow-hidden cursor-pointer active:scale-[0.98] transition-all`}
      onClick={onScan}
    >
      {isLive && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 pointer-events-none" />
      )}
      
      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
             <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-indigo-500/60 dark:text-indigo-400/60 uppercase tracking-widest">{kelasText}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span className="text-xs font-bold text-gray-400">{waktuMulaiText} – {waktuSelesaiText}</span>
             </div>

             <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                  {mapelText}
                </h3>
                {isLive && <Badge className="bg-indigo-600 text-white border-none text-[10px] px-3 font-black uppercase tracking-widest animate-pulse">Live</Badge>}
                {isFinished && <Badge className="bg-emerald-500 text-white border-none text-[10px] px-3 font-black uppercase tracking-widest">Selesai</Badge>}
                {isOverdue && <Badge variant="destructive" className="text-[10px] px-3 font-black uppercase tracking-widest">Terlewat</Badge>}
             </div>

             <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700">
                      <Users className="w-4 h-4 text-gray-400" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Hadir</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {((counts.HADIR ?? counts.hadir ?? 0) + (counts.TERLAMBAT ?? counts.terlambat ?? 0))} 
                        <span className="text-gray-400 text-[10px]"> / {(counts.TOTAL ?? counts.total ?? (sesi as any)?._summary?.total ?? 0)}</span>
                      </p>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isGuruHadir ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                      <Fingerprint className="w-4 h-4" />
                   </div>
                   <div>
                      <div className="flex items-center gap-1.5">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Pengajar</p>
                         <Badge 
                           variant={guruStatusVariant} 
                           className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-tight"
                         >
                           {guruStatusText}
                         </Badge>
                      </div>
                      <p className={`text-sm font-bold ${isGuruHadir ? 'text-emerald-600' : 'text-amber-600'}`}>{guruText}</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end gap-2">
             {suggestedAction ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`bg-${suggestedAction.color}-600 text-white p-1 rounded-xl flex items-center gap-1 shadow-lg shadow-${suggestedAction.color}-600/20`}
                >
                   <Button 
                     size="sm" 
                     className={`bg-white text-${suggestedAction.color}-600 hover:bg-${suggestedAction.color}-50 border-none rounded-xl font-black text-[11px] uppercase tracking-widest px-4 h-9 shadow-sm`}
                     onClick={(e) => { e.stopPropagation(); onScan(); }}
                   >
                     {suggestedAction.label}
                   </Button>
                   <div className="px-3 py-1 hidden lg:block">
                      <p className="text-[9px] font-black uppercase tracking-wider text-white/80 leading-tight">Aksi<br/>Saran</p>
                   </div>
                </motion.div>
             ) : isFinished && onOpenJournal && (rawJenis.toUpperCase().includes('KBM')) ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-blue-50/50 text-blue-600 border-blue-100 hover:bg-blue-100 rounded-xl font-black text-[11px] uppercase tracking-widest px-4 h-10 gap-2"
                  onClick={(e) => { e.stopPropagation(); onOpenJournal?.(); }}
                >
                  <BookOpen className="w-4 h-4" /> Jurnal Ajar
                </Button>
             ) : (
                <Badge variant="outline" className="h-10 px-4 rounded-xl border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                   {isFinished ? 'Arsip Sesi' : isUpcoming ? 'Segera Mulai' : 'Siap Pantau'}
                </Badge>
             )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
           <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-tighter border border-gray-100 dark:border-gray-700">
                {jk}
              </span>
              {/* Sumber Sesi Badge */}
              {isOtomatis ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter border border-blue-100 dark:border-blue-800">
                  <Cpu className="w-3 h-3" />
                  Sistem
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tighter border border-amber-100 dark:border-amber-800">
                  <PencilLine className="w-3 h-3" />
                  Manual
                </span>
              )}
           </div>

           <div className="flex items-center gap-2">
              <DropdownWrapper>
                 <div className="flex items-center gap-2">
                    {canManage && !isFinished && (
                       <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-100 dark:border-gray-800">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                            onClick={(e) => { e.stopPropagation(); onFinish(); }}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                       </div>
                    )}
                    
                    <div className="flex gap-2">
                       {canManage && (
                          <div className="hidden lg:flex gap-1">
                             <Button size="sm" variant="ghost" className="h-8 text-[10px] font-black uppercase tracking-widest px-3 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); onScan(); }}>Scan Universal</Button>
                          </div>
                       )}
                       <Button
                         size="sm"
                         variant={isExpanded ? 'secondary' : 'primary'}
                         onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                         className={`h-8 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${isExpanded ? '' : 'shadow-lg shadow-indigo-600/10'}`}
                       >
                         {isExpanded ? 'Tutup' : 'Log Hadir'}
                       </Button>
                    </div>
                 </div>
              </DropdownWrapper>
           </div>
        </div>
      </div>
    </div>
  );
}

// Dummy/Empty wrapper to maintain layout if needed
const DropdownWrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;
