import React from 'react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { BookOpen, User, Clock, AlertCircle } from 'lucide-react';
import { getMapelColor } from '../../../utils/mapelColorHelper';
import { cn } from '../../../lib/utils';

interface UnallocatedCardItem {
  id: string;
  nama_mapel: string;
  nama_guru?: string;
  nama_kelas?: string;
  total_jp: number;
  durasi_jp: number;
  jumlah_kartu: number;
  is_pembiasaan?: boolean;
}

interface Props {
  selectedKelasId?: string;
  selectedGuruId?: string;
  unallocatedList: UnallocatedCardItem[];
  onCardClick?: (item: UnallocatedCardItem) => void;
}

export const UnallocatedCardsPanel: React.FC<Props> = ({
  selectedKelasId,
  selectedGuruId,
  unallocatedList,
  onCardClick,
}) => {
  if (!unallocatedList || unallocatedList.length === 0) {
    return (
      <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold select-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Seluruh Kartu Pelajaran untuk kelas/guru ini telah 100% Diplott / Terpasang di Grid Jadwal!</span>
        </div>
        <Badge variant="success" className="text-[10px]">Lengkap (0 Unallocated)</Badge>
      </div>
    );
  }

  return (
    <Card className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 animate-bounce" />
          <span className="text-xs font-bold text-slate-200">
            Kartu Pelajaran Belum Diplott (Unallocated Cards):
          </span>
          <Badge variant="warning" className="text-[10px] font-black">
            {unallocatedList.length} Kartu Sisa
          </Badge>
        </div>
        <span className="text-[10px] text-slate-400 italic">
          Klik atau geser kartu ke sel jam di Visual Builder untuk mem-plot
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-700">
        {unallocatedList.map(card => {
          const isPembiasaan = card.is_pembiasaan || card.nama_mapel.toUpperCase().includes('PEMBIASAAN') || card.nama_mapel.toUpperCase().includes('UPACARA');
          const style = isPembiasaan
            ? { bg: 'bg-amber-500/20 text-amber-200 border-amber-500/40', dot: '#f59e0b' }
            : getMapelColor(card.nama_mapel);

          return (
            <div
              key={card.id}
              onClick={() => onCardClick && onCardClick(card)}
              className={cn(
                "flex-shrink-0 min-w-[130px] p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-105 hover:shadow-lg relative group select-none",
                isPembiasaan ? style.bg : "bg-slate-800 border-slate-700 hover:border-slate-500"
              )}
              style={{ borderLeftColor: style.dot, borderLeftWidth: 4 }}
            >
              <div className="space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wide truncate text-slate-100">
                  {card.nama_mapel}
                </div>
                {card.nama_guru && (
                  <div className="text-[9px] text-slate-400 flex items-center gap-1 truncate">
                    <User className="w-2.5 h-2.5" />
                    {card.nama_guru}
                  </div>
                )}
                {card.nama_kelas && (
                  <div className="text-[9px] text-slate-400 flex items-center gap-1 truncate">
                    <BookOpen className="w-2.5 h-2.5" />
                    {card.nama_kelas}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-700/60 text-[9px] font-mono">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {card.durasi_jp} JP
                </span>
                <span className="text-slate-400">
                  {card.total_jp} JP Total
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
