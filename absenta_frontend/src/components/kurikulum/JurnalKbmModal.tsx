
import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Textarea, Label } from '../ui';
import { BookOpen, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { upsertProgresMateri } from '../../api/attendanceGerbang.api';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../ui/Modal';

interface JurnalKbmModalProps {
  isOpen: boolean;
  onClose: () => void;
  sesiId: string;
  initialData?: any;
  onSuccess?: () => void;
  readOnly?: boolean;
}

export const JurnalKbmModal: React.FC<JurnalKbmModalProps> = ({
  isOpen,
  onClose,
  sesiId,
  initialData,
  onSuccess,
  readOnly = false
}) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    judul_materi: '',
    deskripsi: '',
    pencapaian_persen: 0,
    kendala: ''
  });

  // Reset or set initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        judul_materi: initialData?.judul_materi || '',
        deskripsi: initialData?.deskripsi || '',
        pencapaian_persen: initialData?.pencapaian_persen || 0,
        kendala: initialData?.kendala || ''
      });
    }
  }, [isOpen, initialData]);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!formData.judul_materi.trim()) {
      toast.error('Judul materi wajib diisi');
      return;
    }
    setShowConfirm(true);
  };

  const handleActualSubmit = async () => {
    if (readOnly) return;
    setLoading(true);
    try {
      await upsertProgresMateri(sesiId, formData);
      toast.success('Jurnal KBM berhasil disimpan');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan Jurnal KBM');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span>{readOnly ? 'Detail Jurnal KBM' : 'Isi Jurnal KBM'}</span>
          </div>
        }
        size="md"
      >
        <form onSubmit={handlePreSubmit} className="p-6 space-y-5">
          {!readOnly && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/50">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm text-amber-900 dark:text-amber-200 font-bold">
                  Penting
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/70 leading-relaxed">
                  Jurnal ini akan menjadi laporan progres pembelajaran yang dapat dilihat oleh Kurikulum dan Kepala Sekolah.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="judul_materi" className="text-gray-700 dark:text-gray-300 font-semibold">Judul Materi / Topik</Label>
              <Input
                id="judul_materi"
                placeholder={readOnly ? '-' : "Contoh: Pengenalan React Hooks"}
                value={formData.judul_materi}
                onChange={(e) => setFormData({...formData, judul_materi: e.target.value})}
                required
                disabled={readOnly}
                className="rounded-xl border-gray-200 dark:border-gray-700 focus:ring-indigo-500 disabled:opacity-100 disabled:bg-gray-50 dark:disabled:bg-gray-900/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deskripsi" className="text-gray-700 dark:text-gray-300 font-semibold">Ringkasan Pembahasan</Label>
              <Textarea
                id="deskripsi"
                placeholder={readOnly ? '-' : "Apa saja yang dibahas hari ini?"}
                value={formData.deskripsi}
                onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                rows={3}
                disabled={readOnly}
                className="rounded-xl border-gray-200 dark:border-gray-700 focus:ring-indigo-500 disabled:opacity-100 disabled:bg-gray-50 dark:disabled:bg-gray-900/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pencapaian" className="text-gray-700 dark:text-gray-300 font-semibold">Pencapaian (%)</Label>
                <div className="relative">
                  <Input
                    id="pencapaian"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.pencapaian_persen}
                    onChange={(e) => setFormData({...formData, pencapaian_persen: Number(e.target.value)})}
                    disabled={readOnly}
                    className="rounded-xl border-gray-200 dark:border-gray-700 pr-10 focus:ring-indigo-500 disabled:opacity-100 disabled:bg-gray-50 dark:disabled:bg-gray-900/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kendala" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Kendala / Catatan Khusus
              </Label>
              <Textarea
                id="kendala"
                placeholder={readOnly ? '-' : "Siswa kurang fokus, koneksi internet lambat, dsb."}
                value={formData.kendala}
                onChange={(e) => setFormData({...formData, kendala: e.target.value})}
                rows={2}
                disabled={readOnly}
                className="rounded-xl border-gray-200 dark:border-gray-700 focus:ring-indigo-500 disabled:opacity-100 disabled:bg-gray-50 dark:disabled:bg-gray-900/50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant={readOnly ? "primary" : "ghost"} onClick={onClose} className="rounded-xl font-bold">
              {readOnly ? 'Tutup' : 'Batal'}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 font-bold shadow-lg shadow-indigo-200 dark:shadow-none">
                {loading ? 'Memproses...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Simpan Jurnal
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleActualSubmit}
        title="Simpan Jurnal KBM?"
        message="Pastikan data yang Anda isi sudah benar. Jurnal yang disimpan akan tercatat secara permanen di sistem."
        confirmText="Ya, Simpan"
        cancelText="Periksa Lagi"
      />
    </>
  );
};
