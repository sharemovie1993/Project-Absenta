

import React, { useState, useCallback } from 'react';
import { Modal, ModalFooter } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Upload } from 'lucide-react';
import { uploadSiswaDocument } from '../../../api/academic/siswa.api';
import { useToast } from '../../../hooks/useToast';

interface UploadSiswaDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId: string;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'SURAT_PERINGATAN', label: 'Surat Peringatan (SP)' },
  { value: 'LAPORAN_BK', label: 'Laporan Konseling/BK' },
  { value: 'SURAT_PERNYATAAN', label: 'Surat Pernyataan' },
  { value: 'LAINNYA', label: 'Dokumen Lainnya' }
];

export const UploadSiswaDocumentModal: React.FC<UploadSiswaDocumentModalProps> = React.memo(({
  isOpen,
  onClose,
  siswaId,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('SURAT_PERINGATAN');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) {
      showToast('Judul dokumen wajib diisi', 'error');
      return;
    }
    if (!file) {
      showToast('Pilih file berkas terlebih dahulu', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await uploadSiswaDocument(siswaId, file, judul.trim(), kategori);
      if (res.success) {
        showToast('Dokumen berhasil diunggah', 'success');
        setJudul('');
        setFile(null);
        onSuccess();
        onClose();
      } else {
        showToast(res.message || 'Gagal mengunggah dokumen', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Koneksi bermasalah', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [siswaId, file, judul, kategori, onSuccess, onClose, showToast]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Unggah Lampiran Baru">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="doc-judul" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Judul Dokumen</label>
          <Input
            id="doc-judul"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: Surat Peringatan 1"
            className="rounded-xl h-10 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="doc-kategori" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kategori Dokumen</label>
          <select
            id="doc-kategori"
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs focus:ring-blue-500 focus:border-blue-500 dark:text-white"
          >
            {(CATEGORIES || []).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="doc-file" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Berkas Dokumen (PDF/Gambar)</label>
          <div className="relative border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
            <input
              id="doc-file"
              type="file"
              onChange={handleFileChange}
              accept="application/pdf,image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              {file ? file.name : 'Pilih Berkas PDF/Gambar'}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Klik atau seret file ke sini'}
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={submitting || !file || !judul.trim()}>
            {submitting ? 'Mengunggah...' : 'Unggah Dokumen'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
});

UploadSiswaDocumentModal.displayName = 'UploadSiswaDocumentModal';
export default UploadSiswaDocumentModal;

