import React from 'react';
import { Trophy, Star, Clock, FileText, Shield, X } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface StudentAttendancePointHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  rekapStats?: {
    HADIR?: number;
    TERLAMBAT?: number;
    SAKIT?: number;
    IZIN?: number;
    DISPEN?: number;
    ALPA?: number;
  };
  totalPoin?: number;
  bulanKey?: string;
  totalPelanggaran?: number;
}

export const StudentAttendancePointHistoryModal: React.FC<StudentAttendancePointHistoryModalProps> = React.memo(({
  isOpen,
  onClose,
  rekapStats,
  totalPoin = 15,
  bulanKey,
  totalPelanggaran = 0
}) => {
  if (!isOpen) return null;

  const hadirCount = rekapStats?.HADIR || 0;
  const telatCount = rekapStats?.TERLAMBAT || 0;
  const izinCount = (rekapStats?.SAKIT || 0) + (rekapStats?.IZIN || 0) + (rekapStats?.DISPEN || 0);

  const poinHadir = hadirCount * 10;
  const poinTelat = telatCount * 5;
  const poinIzin = izinCount * 2;
  const computedTotalPoin = totalPoin || (poinHadir + poinTelat + poinIzin);

  const monthYearLabel = bulanKey
    ? format(new Date(`${bulanKey}-01`), 'MMMM yyyy', { locale: id })
    : format(new Date(), 'MMMM yyyy', { locale: id });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 overflow-hidden space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        {/* MODAL HEADER */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Trophy size={20} />
          </div>
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">
            Riwayat Poin & Apresiasi
          </h2>
        </div>

        {/* TOTAL POIN BANNER */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">
                Total Poin Kedisiplinan
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Akumulasi Bulan {monthYearLabel}
              </p>
            </div>
          </div>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 shrink-0">
            +{computedTotalPoin} Pts
          </span>
        </div>

        {/* ATURAN POIN SECTION */}
        <div className="space-y-3">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Aturan Poin Kehadiran Resmi:
          </span>

          <div className="space-y-2.5">
            {/* ITEM 1: HADIR TEPAT WAKTU */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Star size={18} className="fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs">
                    Hadir Tepat Waktu (+10 Pts/hari)
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {hadirCount} hari x 10 Pts
                  </p>
                </div>
              </div>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm shrink-0">
                +{poinHadir} Pts
              </span>
            </div>

            {/* ITEM 2: HADIR TERLAMBAT */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs">
                    Hadir Terlambat (+5 Pts/hari)
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {telatCount} hari x 5 Pts
                  </p>
                </div>
              </div>
              <span className="font-extrabold text-orange-600 dark:text-orange-400 text-sm shrink-0">
                +{poinTelat} Pts
              </span>
            </div>

            {/* ITEM 3: IZIN / SAKIT / DISPEN */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs">
                    Izin / Sakit / Dispen (+2 Pts/hari)
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {izinCount} hari x 2 Pts
                  </p>
                </div>
              </div>
              <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm shrink-0">
                +{poinIzin} Pts
              </span>
            </div>

            {/* ITEM 4: CATATAN PELANGGARAN BK */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <Shield size={18} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs">
                    Catatan Pelanggaran BK
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    rekam pelanggaran
                  </p>
                </div>
              </div>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs shrink-0">
                {totalPelanggaran === 0 ? 'Bersih (0 Pelanggaran)' : `${totalPelanggaran} Pelanggaran`}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

export default StudentAttendancePointHistoryModal;
