import React, { useState } from 'react';
import { X, Calendar, Upload, Send, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface PengajuanIzinGuruModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherName?: string;
}

export const PengajuanIzinGuruModal: React.FC<PengajuanIzinGuruModalProps> = ({
  isOpen,
  onClose,
  teacherName = 'Guru',
}) => {
  const [jenisIzin, setJenisIzin] = useState('DINAS_LUAR');
  const [tglMulai, setTglMulai] = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [alasan, setAlasan] = useState('');
  const [tugasInval, setTugasInval] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Pengajuan izin/dinas luar berhasil dikirim ke Kepala Sekolah & Waka!', { icon: '🚀' });
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Form Pengajuan Izin / Cuti / Dinas Luar
              </h3>
              <p className="text-[11px] text-slate-400">
                Pemohon: {teacherName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Jenis Izin */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Jenis Perizinan
            </label>
            <select
              value={jenisIzin}
              onChange={e => setJenisIzin(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="DINAS_LUAR">Tugas Dinas Luar / Workshop / Pelatihan</option>
              <option value="SAKIT">Sakit (Dengan Keterangan Dokter)</option>
              <option value="CUTI_TAHUNAN">Cuti Tahunan / Melahirkan</option>
              <option value="KEPERLUAN_PENTING">Izin Keperluan Keluarga / Mendesak</option>
            </select>
          </div>

          {/* Tanggal Mulai & Selesai */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Dari Tanggal
              </label>
              <input
                type="date"
                required
                value={tglMulai}
                onChange={e => setTglMulai(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Sampai Tanggal
              </label>
              <input
                type="date"
                required
                value={tglSelesai}
                onChange={e => setTglSelesai(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
          </div>

          {/* Alasan / Keperluan */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Keterangan / Keperluan
            </label>
            <textarea
              required
              rows={2}
              value={alasan}
              onChange={e => setAlasan(e.target.value)}
              placeholder="Contoh: Mengikuti Bimbingan Teknis Kurikulum Merdeka di LPMP..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Modul / Tugas Inval Kelas */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Tugas untuk Kelas yang Ditinggalkan (Inval)
            </label>
            <textarea
              rows={2}
              value={tugasInval}
              onChange={e => setTugasInval(e.target.value)}
              placeholder="Tuliskan petunjuk tugas mandiri atau materi modul ajar untuk disampaikan Guru Piket..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Send size={13} />
              <span>{isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
