import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, X, FileText } from 'lucide-react';
import { Button } from '../../../ui';
import { cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';

interface KbmSiswa {
  id: string;
  nama: string;
  nisn: string;
  status: string;
}

interface StaffKbmAbsenTabProps {
  waliKelasNama?: string;
  kbmSiswaList: KbmSiswa[];
  jurnalMateri: string;
  onMarkAllHadir: () => void;
  onStatusChange: (id: string, status: string) => void;
  onJurnalChange: (text: string) => void;
}

export const StaffKbmAbsenTab: React.FC<StaffKbmAbsenTabProps> = ({
  waliKelasNama,
  kbmSiswaList,
  jurnalMateri,
  onMarkAllHadir,
  onStatusChange,
  onJurnalChange,
}) => {
  return (
    <motion.div
      key="tab-jadwal"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="p-5 sm:p-7 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6"
    >
      {/* Header Row: Title, Pill Badge, Subtitle & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Input Presensi Sesi KBM Matapelajaran
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
              SESI DIBUKA
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400">
            {waliKelasNama || 'Kelas XI RPL 1'} • Lab Komputer 2
          </p>
        </div>

        {/* Header Right Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={onMarkAllHadir}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-transparent text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/50 flex items-center gap-2 cursor-pointer transition-all"
          >
            <CheckCircle2 size={14} />
            <span>Mark Semua Hadir (1-Click)</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => toast.success('Sesi KBM telah ditutup!')}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white border-none flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-900/30"
          >
            <X size={14} />
            <span>Tutup Sesi KBM</span>
          </Button>
        </div>
      </div>

      {/* Daftar Presensi Siswa Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Daftar Presensi Siswa ({kbmSiswaList.length} Siswa)
        </h3>

        <div className="space-y-2.5">
          {kbmSiswaList.map((siswa) => (
            <div
              key={siswa.id}
              className="p-3.5 px-4.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
            >
              {/* Student Info */}
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white tracking-tight">
                  {siswa.nama}
                </h4>
                <p className="text-[11px] font-mono text-slate-400 font-semibold">
                  NISN: {siswa.nisn}
                </p>
              </div>

              {/* Segmented Attendance Status Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
                {[
                  { key: 'HADIR', label: 'Hadir', activeClass: 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm' },
                  { key: 'TERLAMBAT', label: 'Terlambat', activeClass: 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' },
                  { key: 'SAKIT', label: 'Sakit', activeClass: 'bg-blue-600 text-white font-extrabold shadow-sm' },
                  { key: 'IZIN', label: 'Izin', activeClass: 'bg-purple-600 text-white font-extrabold shadow-sm' },
                  { key: 'ALPA', label: 'Alpa', activeClass: 'bg-rose-600 text-white font-extrabold shadow-sm' },
                ].map((st) => {
                  const isSelected = siswa.status === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => onStatusChange(siswa.id, st.key)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none",
                        isSelected
                          ? cn(st.activeClass, "border-transparent")
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Jurnal Mengajar & Catatan Pembelajaran Section */}
      <div className="space-y-2.5 pt-3 border-t border-slate-800">
        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
          Jurnal Mengajar &amp; Catatan Pembelajaran
        </label>
        <textarea
          rows={3}
          value={jurnalMateri}
          onChange={(e) => onJurnalChange(e.target.value)}
          placeholder="Tuliskan materi pembelajaran hari ini..."
          className="w-full p-4 rounded-2xl border border-slate-800 bg-slate-950/90 text-white text-xs font-medium focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-500"
        />

        <Button
          type="button"
          onClick={() => toast.success('Jurnal & Data Presensi berhasil disimpan!')}
          className="h-10 px-5 rounded-2xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-900/30 transition-all"
        >
          <FileText size={15} />
          <span>Simpan Jurnal &amp; Presensi</span>
        </Button>
      </div>
    </motion.div>
  );
};
