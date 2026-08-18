import React, { useState } from 'react';
import { UserCheck, Plus, Calendar, AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

interface CatatanItem {
  id: string;
  tanggal: string;
  namaSiswa: string;
  nis: string;
  kategori: 'KEDISIPLINAN' | 'AKADEMIK' | 'MOTIVASI' | 'HOME_VISIT';
  uraianMasalah: string;
  tindakLanjutWalas: string;
  status: 'SELESAI' | 'PANTAUAN' | 'RUJUK_BK';
}

const MOCK_CATATAN: CatatanItem[] = [
  {
    id: 'c-1',
    tanggal: '2026-08-16',
    namaSiswa: 'BAGAS PRATAMA',
    nis: '2425100508',
    kategori: 'KEDISIPLINAN',
    uraianMasalah: 'Terlambat masuk jam pertama sebanyak 2 kali dalam minggu ini.',
    tindakLanjutWalas: 'Pemanggilan siswa dan koordinasi dengan orang tua via WhatsApp. Siswa berkomitmen berangkat lebih pagi.',
    status: 'SELESAI',
  },
  {
    id: 'c-2',
    tanggal: '2026-08-14',
    namaSiswa: 'DEDI KURNIAWAN',
    nis: '2425100512',
    kategori: 'MOTIVASI',
    uraianMasalah: 'Sering terlihat kurang konsentrasi saat jam produktif akuntansi.',
    tindakLanjutWalas: 'Konseling empat mata di ruang walas, diberikan pendampingan tutor sebaya.',
    status: 'PANTAUAN',
  },
];

export const CatatanPembinaanPanel: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleOpenAdd = () => {
    toast('Form pencatatan pembinaan siswa walas siap dibuka!', { icon: '📝' });
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck size={16} className="text-blue-600 dark:text-blue-400" />
            <span>Buku Catatan Pembinaan & Konseling Siswa</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log pembinaan internal wali kelas, konseling tatap muka, dan pendampingan sebelum rujukan BK
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 shrink-0"
        >
          <Plus size={14} />
          <span>+ Catat Pembinaan</span>
        </button>
      </div>

      {/* List Catatan */}
      <div className="space-y-3">
        {MOCK_CATATAN.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                  {item.namaSiswa}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">({item.nis})</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-extrabold text-[10px]">
                  {item.kategori}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">{item.tanggal}</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                  {item.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Uraian Kasus / Masalah</label>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                  {item.uraianMasalah}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tindak Lanjut & Solusi Walas</label>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  {item.tindakLanjutWalas}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
