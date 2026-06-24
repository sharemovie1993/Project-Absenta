

import React, { useState, useCallback } from 'react';
import { Modal, ModalFooter } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { AlertTriangle, Upload } from 'lucide-react';
import { completeSiswaExit } from '../../../api/academic/siswa.api';
import { useToast } from '../../../hooks/useToast';

interface CompleteSiswaExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId: string;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: 'KELUAR', label: 'Keluar (Lainnya)' },
  { value: 'MUTASI', label: 'Pindah / Mutasi' },
  { value: 'DO', label: 'Dikeluarkan / Drop Out' }
];

export const CompleteSiswaExitModal: React.FC<CompleteSiswaExitModalProps> = React.memo(({
  isOpen,
  onClose,
  siswaId,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [status, setStatus] = useState('KELUAR');
  const [alasan, setAlasan] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      showToast('Wajib mengunggah bukti pindaian Dapodik', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await completeSiswaExit(siswaId, file, status, alasan.trim() || undefined);
      if (res.success) {
        showToast('Siswa berhasil dinyatakan keluar resmi', 'success');
        setAlasan('');
        setFile(null);
        onSuccess();
        onClose();
      } else {
        showToast(res.message || 'Gagal mengeluarkan siswa', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Koneksi bermasalah', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [siswaId, file, status, alasan, onSuccess, onClose, showToast]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finalisasi Keluar Siswa" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700 dark:text-red-400 font-semibold leading-relaxed">
            Peringatan: Tindakan ini akan secara permanen menonaktifkan akun LMS/login siswa, menghapus data RFID, dan mengubah status siswa di sistem.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="exit-status" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Jenis Status Keluar</label>
          <select
            id="exit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs focus:ring-red-500 focus:border-red-500 dark:text-white"
          >
            {(STATUS_OPTIONS || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="exit-alasan" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Catatan / Alasan Keluar</label>
          <textarea
            id="exit-alasan"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Contoh: Pindah ke SMA Negeri 2 Bandung karena mengikuti dinas orang tua."
            className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs focus:ring-red-500 focus:border-red-500 h-20 resize-none dark:text-white"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="exit-file" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Unggah Bukti Dapodik (PDF/Gambar)</label>
          <div className="relative border-2 border-dashed border-red-100 dark:border-red-900/30 rounded-xl p-6 flex flex-col items-center justify-center bg-red-50/10 dark:bg-red-950/5 hover:bg-red-50/20 transition-colors">
            <input
              id="exit-file"
              type="file"
              onChange={handleFileChange}
              accept="application/pdf,image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              {file ? file.name : 'Pilih Bukti Dapodik'}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Dokumen bukti resmi penarikan Dapodik'}
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" variant="danger" disabled={submitting || !file}>
            {submitting ? 'Memproses...' : 'Keluarkan Siswa'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
});

CompleteSiswaExitModal.displayName = 'CompleteSiswaExitModal';
export default CompleteSiswaExitModal;

