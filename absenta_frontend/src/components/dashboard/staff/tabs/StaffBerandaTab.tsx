import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, ClipboardList } from 'lucide-react';
import { Button } from '../../../ui';

interface StaffBerandaTabProps {
  waliKelasNama?: string;
  onNavigateTab: (tabId: string) => void;
}

export const StaffBerandaTab: React.FC<StaffBerandaTabProps> = ({
  waliKelasNama,
  onNavigateTab,
}) => {
  return (
    <motion.div
      key="tab-ringkasan"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* 3 SUMMARY STAT CARDS (Adopsi Layout Gambar Guru) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Stat 1: Jam Mengajar Hari Ini */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <BookOpen size={22} />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Jam Mengajar Hari Ini
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              4 JP <span className="text-xs font-bold text-slate-400">(180 Menit)</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              Sesi KBM Active: Lab Komputer 2
            </p>
          </div>
        </div>

        {/* Stat 2: Rombel Binaan Walas */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Rombel Binaan Walas
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {waliKelasNama || 'XI RPL 1'} <span className="text-xs font-bold text-slate-400">(36 Siswa)</span>
            </div>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
              34 Hadir, 1 Sakit, 1 Alpa
            </p>
          </div>
        </div>

        {/* Stat 3: Surat Izin Menunggu */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ClipboardList size={22} />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Surat Izin Menunggu
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              1 Pengajuan
            </div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              Butuh Validasi Wali Kelas
            </p>
          </div>
        </div>
      </div>

      {/* ACTIVE KBM SESSION CARD (Adopsi Gambar Guru) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white uppercase tracking-wider">
            KBM Berlangsung
          </span>
          <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
            {waliKelasNama || 'XI RPL 1'} — Pemrograman Web &amp; Perangkat Bergerak
          </h3>
          <p className="text-xs font-medium text-slate-400">
            Lab Komputer 2 • Jam Ke 1 - 4 (07.00 - 09.15 WIB)
          </p>
        </div>

        <Button
          onClick={() => onNavigateTab('jadwal')}
          className="w-full sm:w-auto h-10 px-5 rounded-2xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white border-none shrink-0 cursor-pointer shadow-lg shadow-blue-600/20"
        >
          Buka Input Presensi KBM
        </Button>
      </div>
    </motion.div>
  );
};
