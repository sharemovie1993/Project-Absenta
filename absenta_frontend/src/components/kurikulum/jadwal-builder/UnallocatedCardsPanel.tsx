import React from 'react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { BookOpen, User, Clock, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { getMapelColor } from '../../../utils/mapelColorHelper';
import { cn } from '../../../lib/utils';

export interface UnallocatedCardItem {
  id: string;
  nama_mapel: string;
  nama_guru?: string;
  nama_kelas?: string;
  total_jp: number;
  durasi_jp: number;
  jumlah_kartu: number;
  is_pembiasaan?: boolean;
  mapel_id?: string;
  guru_id?: string;
  kelas_id?: string;
}

interface Props {
  selectedKelasId?: string;
  selectedGuruId?: string;
  targetName?: string;
  unallocatedList: UnallocatedCardItem[];
  onCardClick?: (item: UnallocatedCardItem) => void;
  className?: string;
}

export const UnallocatedCardsPanel: React.FC<Props> = React.memo(({
  selectedKelasId,
  selectedGuruId,
  targetName,
  unallocatedList,
  onCardClick,
  className,
}) => {
  // Jika tidak ada kelas atau guru yang dipilih, sembunyikan panel
  if (!selectedKelasId && !selectedGuruId) {
    return null;
  }

  if (!unallocatedList || unallocatedList.length === 0) {
    return (
      <div
        className={cn(
          "px-4 py-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 font-semibold select-none shadow-2xs transition-all",
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="truncate">
            Seluruh kartu jadwal untuk <strong className="underline underline-offset-2">{targetName || (selectedKelasId ? 'Kelas Ini' : 'Guru Ini')}</strong> telah <strong>100% Terpasang</strong> di grid KBM!
          </span>
        </div>
        <Badge variant="success" className="text-[10.5px] font-black shrink-0">
          ✓ Lengkap (0 Unallocated)
        </Badge>
      </div>
    );
  }

  const totalRemainingJp = unallocatedList.reduce((acc, c) => acc + (c.durasi_jp || 0), 0);

  return (
    <Card
      className={cn(
        "p-3.5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 text-white rounded-2xl border border-slate-800/90 shadow-md space-y-2.5 transition-all",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="text-xs font-black text-slate-100 tracking-tight">
            Kartu Pelajaran Belum Diplott {targetName ? `(${targetName})` : ''}:
          </span>
          <Badge variant="warning" className="text-[10px] font-black px-2 py-0.5">
            {unallocatedList.length} Mapel Sisa ({totalRemainingJp} JP Belum Terpasang)
          </Badge>
        </div>
        <span className="text-[10.5px] text-slate-400 italic hidden sm:inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Klik kartu untuk langsung mengaktifkan kuas &amp; plot ke sel jam kosong
        </span>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-700">
        {unallocatedList.map((card) => {
          const isPembiasaan =
            card.is_pembiasaan ||
            card.nama_mapel.toUpperCase().includes('PEMBIASAAN') ||
            card.nama_mapel.toUpperCase().includes('UPACARA');
          const style = isPembiasaan
            ? { bg: 'bg-amber-500/20 text-amber-200 border-amber-500/40', dot: '#f59e0b' }
            : getMapelColor(card.nama_mapel);

          return (
            <div
              key={card.id}
              onClick={() => onCardClick && onCardClick(card)}
              className={cn(
                "flex-shrink-0 min-w-[145px] max-w-[180px] p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all duration-150 hover:scale-[1.03] hover:shadow-lg active:scale-95 relative group select-none bg-slate-800/90 border-slate-700/80 hover:border-indigo-400",
                isPembiasaan && style.bg
              )}
              style={{ borderLeftColor: style.dot, borderLeftWidth: 4 }}
              title={`Klik untuk mengaktifkan kuas ${card.nama_mapel} (${card.durasi_jp} JP tersisa)`}
            >
              <div className="space-y-1">
                <div className="text-[11px] font-black uppercase tracking-wide truncate text-white group-hover:text-indigo-300 transition-colors">
                  {card.nama_mapel}
                </div>
                {card.nama_guru && (
                  <div className="text-[9.5px] text-slate-300 flex items-center gap-1 truncate font-medium">
                    <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="truncate">{card.nama_guru}</span>
                  </div>
                )}
                {card.nama_kelas && (
                  <div className="text-[9.5px] text-slate-400 flex items-center gap-1 truncate font-medium">
                    <BookOpen className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="truncate">{card.nama_kelas}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-700/60 text-[9.5px] font-mono">
                <span className="text-amber-400 font-black flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Sisa {card.durasi_jp} JP
                </span>
                <span className="text-slate-400 font-semibold">
                  / {card.total_jp} JP
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
});
