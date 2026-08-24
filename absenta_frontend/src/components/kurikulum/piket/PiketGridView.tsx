import React from 'react';
import { JadwalPiketGuru } from '@/api/piketGuru.api';
import { Clock, FileText, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui';

interface PiketGridViewProps {
  schedules: JadwalPiketGuru[];
  currentGuruId?: string;
  isKurikulumAdmin: boolean;
  onEdit: (item: JadwalPiketGuru) => void;
  onDelete: (id: string) => void;
}

export const PiketGridView: React.FC<PiketGridViewProps> = React.memo(({
  schedules,
  currentGuruId,
  isKurikulumAdmin,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {schedules?.map((item) => {
        const isMe = currentGuruId && item.guru_id === currentGuruId;
        return (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
              isMe
                ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 ring-1 ring-indigo-400/40'
                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {item.Guru?.nama_guru?.substring(0, 2).toUpperCase() || 'GP'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {item.Guru?.nama_guru || 'Guru'}
                    </h4>
                    <p className="text-[10px] text-slate-400">NIP: {item.Guru?.nip || '-'}</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {item.pos_piket || 'Piket Umum'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Clock size={12} className="text-slate-400 shrink-0" />
                  <span>Slot Jam: Ke-{item.slot_mulai || 1} s/d {item.slot_selesai || 10} ({item.jam_mulai} - {item.jam_selesai})</span>
                </div>
                {item.catatan && (
                  <div className="flex items-start gap-1.5 text-[11px] italic text-slate-400">
                    <FileText size={12} className="shrink-0 mt-0.5" />
                    <span>"{item.catatan}"</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400">Hari: <strong className="text-slate-700 dark:text-slate-300">{item.hari}</strong></span>
              {isKurikulumAdmin ? (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="w-7 h-7 text-indigo-600">
                    <Edit size={13} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="w-7 h-7 text-rose-600">
                    <Trash2 size={13} />
                  </Button>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle size={12} /> Terjadwal
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default PiketGridView;
