import React from 'react';
import { Clock, UserCheck, AlertCircle, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface InvalItem {
  id: string;
  tanggal: string;
  jamKe: string;
  kelas: string;
  mapel: string;
  guruAsli: string;
  alasan: string;
  tugasTersedia: string;
  status: 'MENUNGGU' | 'BERLANGSUNG' | 'SELESAI';
}

const MOCK_INVAL_LIST: InvalItem[] = [
  {
    id: 'inv-1',
    tanggal: '2026-08-18',
    jamKe: 'Jam Ke 5 - 6 (10:15 - 11:45)',
    kelas: 'X AKL 2',
    mapel: 'Bahasa Indonesia',
    guruAsli: 'Dra. Hj. Siti Rohmah',
    alasan: 'Tugas Dinas Luar (Workshop MGMP)',
    tugasTersedia: 'Membaca Cerpen Bab 3 dan mengerjakan analisis unsur intrinsik di buku tugas.',
    status: 'MENUNGGU',
  },
];

export const JadwalInvalPanel: React.FC = () => {
  const handleMasukKelas = (inval: InvalItem) => {
    toast.success(`Memasuki sesi Inval kelas ${inval.kelas}!`);
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UserCheck size={16} className="text-purple-600 dark:text-purple-400" />
          <span>Penugasan Guru Inval / Pengganti KBM</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Daftar kelas yang didelegasikan oleh Guru Piket untuk didampingi hari ini
        </p>
      </div>

      {/* List Inval */}
      {MOCK_INVAL_LIST.length > 0 ? (
        <div className="space-y-3">
          {MOCK_INVAL_LIST.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-extrabold text-[11px]">
                    INVAL: {item.kelas}
                  </span>
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {item.mapel}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {item.jamKe}
                  </span>
                </div>

                <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase self-start sm:self-auto">
                  {item.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Guru Pengampu Utama</label>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {item.guruAsli} <span className="text-slate-400 font-normal">({item.alasan})</span>
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Modul / Penugasan Mandiri Siswa</label>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    {item.tugasTersedia}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleMasukKelas(item)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                >
                  <UserCheck size={13} />
                  <span>Dampingi Kelas Ini</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs font-medium">
          Tidak ada penugasan Inval aktif saat ini.
        </div>
      )}
    </div>
  );
};
