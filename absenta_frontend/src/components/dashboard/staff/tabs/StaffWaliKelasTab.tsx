import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../../ui';
import { toast } from 'react-hot-toast';

interface StaffWaliKelasTabProps {
  waliKelasNama?: string;
}

export const StaffWaliKelasTab: React.FC<StaffWaliKelasTabProps> = ({
  waliKelasNama,
}) => {
  return (
    <motion.div
      key="tab-binaan"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="p-5 sm:p-7 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6"
    >
      {/* Header Title */}
      <div className="pb-3 border-b border-slate-800">
        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
          Validasi Surat Izin Orang Tua Siswa (Rombel {waliKelasNama || 'XI RPL 1'})
        </h2>
      </div>

      {/* List of Permit Validation Cards */}
      <div className="space-y-4">
        {/* Permit Item 1 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Elvina Nurul Zahra
              </h3>
              <p className="text-[11px] font-semibold text-slate-400">
                Orang Tua: Ahmad Dahlan • Jenis: Sakit
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40 self-start sm:self-auto">
              Disetujui Wali Kelas
            </span>
          </div>

          {/* Description Box */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
            <p className="text-xs font-medium italic text-slate-300">
              "Demam tinggi dan flu berat, saran dokter istirahat total 2 hari."
            </p>
          </div>

          {/* Attachment Thumbnail */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
              <img 
                src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=100&auto=format&fit=crop&q=80" 
                alt="Surat Dokter" 
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => toast('Membuka lampiran surat dokter...', { icon: '📄' })}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              Lihat Lampiran Surat Dokter
            </button>
          </div>
        </div>

        {/* Permit Item 2 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Bagas Prasetyo
              </h3>
              <p className="text-[11px] font-semibold text-slate-400">
                Orang Tua: Eko Prasetyo • Jenis: Pulang Cepat
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40 self-start sm:self-auto">
              Menunggu Persetujuan
            </span>
          </div>

          {/* Description Box */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
            <p className="text-xs font-medium italic text-slate-300">
              "Mengikuti seleksi tim sepakbola daerah jam 11.00 WIB"
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              size="sm"
              onClick={() => toast.error('Surat izin ditolak.')}
              className="h-8.5 px-4 rounded-xl text-xs font-extrabold bg-white hover:bg-slate-100 text-rose-600 border-none cursor-pointer"
            >
              Tolak
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => toast.success('Surat izin disetujui Wali Kelas!')}
              className="h-8.5 px-4 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-none shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              Setujui Surat Izin
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
