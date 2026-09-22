import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Modal, Button, Input } from '@/components/ui';
import { updateSecurityLog, LogAksesItem } from '@/api/attendanceGerbang.api';

// Zod Validation Guard (Pilar 26)
const guestEditSchema = z.object({
  nama_tamu: z.string().min(1, 'Nama tamu wajib diisi'),
  keperluan_tamu: z.string().min(1, 'Keperluan kunjungan wajib diisi'),
  instansi_tamu: z.string().optional(),
  kontak_tamu: z.string().optional(),
  arah: z.enum(['MASUK', 'KELUAR']),
  catatan: z.string().optional(),
  kategori_buku: z.enum(['UMUM', 'KHUSUS']).optional(),
  jabatan_tamu: z.string().optional(),
  pejabat_dituju: z.string().optional(),
  nomor_surat_tugas: z.string().optional(),
  pesan_kesan: z.string().optional(),
});

interface GuestEditModalProps {
  item: LogAksesItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GuestEditModal: React.FC<GuestEditModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [editNama, setEditNama] = useState('');
  const [editInstansi, setEditInstansi] = useState('');
  const [editKeperluan, setEditKeperluan] = useState('');
  const [editKontak, setEditKontak] = useState('');
  const [editArah, setEditArah] = useState<'MASUK' | 'KELUAR'>('MASUK');
  const [editCatatan, setEditCatatan] = useState('');
  const [editKategoriBuku, setEditKategoriBuku] = useState<'UMUM' | 'KHUSUS'>('UMUM');
  const [editJabatan, setEditJabatan] = useState('');
  const [editPejabatDituju, setEditPejabatDituju] = useState('');
  const [editNoSuratTugas, setEditNoSuratTugas] = useState('');
  const [editPesanKesan, setEditPesanKesan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setEditNama(item.nama_tamu || item.nama_snapshot || '');
      setEditInstansi(item.instansi_tamu || '');
      setEditKeperluan(item.keperluan_tamu || '');
      setEditKontak(item.kontak_tamu || '');
      setEditArah(item.arah || 'MASUK');
      setEditCatatan(item.catatan || '');
      setEditKategoriBuku((item.kategori_buku as 'UMUM' | 'KHUSUS') || 'UMUM');
      setEditJabatan(item.jabatan_tamu || '');
      setEditPejabatDituju(item.pejabat_dituju || '');
      setEditNoSuratTugas(item.nomor_surat_tugas || '');
      setEditPesanKesan(item.pesan_kesan || '');
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const validationResult = guestEditSchema.safeParse({
      nama_tamu: editNama.trim(),
      keperluan_tamu: editKeperluan.trim(),
      instansi_tamu: editInstansi.trim() || undefined,
      kontak_tamu: editKontak.trim() || undefined,
      arah: editArah,
      catatan: editCatatan.trim() || undefined,
      kategori_buku: editKategoriBuku,
      jabatan_tamu: editJabatan.trim() || undefined,
      pejabat_dituju: editPejabatDituju.trim() || undefined,
      nomor_surat_tugas: editNoSuratTugas.trim() || undefined,
      pesan_kesan: editPesanKesan.trim() || undefined,
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0]?.message || 'Data form tidak valid');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSecurityLog(item.id, validationResult.data);
      toast.success('Data tamu berhasil diperbarui');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(errorObj?.response?.data?.message || errorObj?.message || 'Gagal memperbarui data tamu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Ubah Data Tamu"
      description="Perbarui informasi catatan tamu atau pengunjung sekolah"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-modal-nama-tamu" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Nama Tamu <span className="text-red-500">*</span>
          </label>
          <Input
            id="edit-modal-nama-tamu"
            type="text"
            value={editNama}
            onChange={(e) => setEditNama(e.target.value)}
            placeholder="Masukkan nama lengkap tamu"
            aria-label="Nama Tamu"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="edit-modal-instansi-tamu" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Instansi / Lembaga / Hubungan
            </label>
            <span className="text-[10px] text-slate-400">Preset cepat</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {[
              'Orang Tua Siswa',
              'Alumni Sekolah',
              'Wali Murid',
              'Dinas Pendidikan',
              'Mitra Industri (DU/DI)',
              'Vendor / Ekspedisi',
              'Masyarakat Umum'
            ].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setEditInstansi(p)}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                  editInstansi === p
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-medium'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Input
            id="edit-modal-instansi-tamu"
            type="text"
            value={editInstansi}
            onChange={(e) => setEditInstansi(e.target.value)}
            placeholder="Contoh: Dinas Pendidikan, Orang Tua Siswa, Alumni, Vendor"
            aria-label="Instansi Tamu"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="edit-modal-keperluan-tamu" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Keperluan Kunjungan <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-slate-400">Preset cepat</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {[
              'Legalisir Ijazah / SKL',
              'Pengambilan Ijazah Asli',
              'Menjemput Siswa Sakit / Izin Pulang',
              'Mengantar Barang / Keperluan',
              'Konsultasi Wali Kelas / BK',
              'Urusan Administrasi / SPP',
              'Kunjungan Dinas / Monitoring',
              'Pengiriman Paket / Dokumen'
            ].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setEditKeperluan(p)}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                  editKeperluan === p
                    ? 'bg-purple-600 text-white border-purple-600 font-medium'
                    : 'bg-purple-50/60 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 hover:bg-purple-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Input
            id="edit-modal-keperluan-tamu"
            type="text"
            value={editKeperluan}
            onChange={(e) => setEditKeperluan(e.target.value)}
            placeholder="Contoh: Menemui Kepala Sekolah, Pengiriman Barang"
            aria-label="Keperluan Tamu"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="edit-modal-kontak-tamu" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            No. Kontak / WhatsApp
          </label>
          <Input
            id="edit-modal-kontak-tamu"
            type="tel"
            value={editKontak}
            onChange={(e) => setEditKontak(e.target.value)}
            placeholder="08xxxxxxxxxx"
            aria-label="Kontak Tamu"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Arah Akses
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEditArah('MASUK')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors ${
                editArah === 'MASUK'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              MASUK (Masuk Sekolah)
            </button>
            <button
              type="button"
              onClick={() => setEditArah('KELUAR')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors ${
                editArah === 'KELUAR'
                  ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              KELUAR (Meninggalkan Sekolah)
            </button>
          </div>
        </div>

        {/* Toggle Kategori Buku Tamu */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Kategori Buku Tamu
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEditKategoriBuku('UMUM')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors ${
                editKategoriBuku === 'UMUM'
                  ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              Buku Tamu Umum
            </button>
            <button
              type="button"
              onClick={() => setEditKategoriBuku('KHUSUS')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors ${
                editKategoriBuku === 'KHUSUS'
                  ? 'bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              Buku Tamu Khusus (Kedinasan)
            </button>
          </div>
        </div>

        {editKategoriBuku === 'KHUSUS' && (
          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/50 space-y-3">
            <div>
              <label htmlFor="edit-modal-jabatan-tamu" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Jabatan Resmi Tamu Kedinasan
              </label>
              <Input
                id="edit-modal-jabatan-tamu"
                type="text"
                value={editJabatan}
                onChange={(e) => setEditJabatan(e.target.value)}
                placeholder="Contoh: Pengawas Pembina / Asesor BAN-S/M"
                aria-label="Jabatan Tamu"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="edit-modal-pejabat-dituju" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Pejabat Sekolah yang Dituju
              </label>
              <Input
                id="edit-modal-pejabat-dituju"
                type="text"
                value={editPejabatDituju}
                onChange={(e) => setEditPejabatDituju(e.target.value)}
                placeholder="Contoh: Kepala Sekolah / Wakasek Kurikulum"
                aria-label="Pejabat Dituju"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="edit-modal-surat-tugas" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nomor Surat Tugas Kedinasan
              </label>
              <Input
                id="edit-modal-surat-tugas"
                type="text"
                value={editNoSuratTugas}
                onChange={(e) => setEditNoSuratTugas(e.target.value)}
                placeholder="Contoh: 800/123/Disdik/2026"
                aria-label="Nomor Surat Tugas"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="edit-modal-pesan-kesan" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Pesan / Kesan / Catatan Pembinaan Dinas
              </label>
              <textarea
                id="edit-modal-pesan-kesan"
                value={editPesanKesan}
                onChange={(e) => setEditPesanKesan(e.target.value)}
                rows={2}
                placeholder="Catatan rekomendasi dan supervisi untuk akreditasi..."
                aria-label="Pesan Kesan"
                disabled={isSubmitting}
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="edit-modal-catatan-tamu" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Catatan Tambahan
          </label>
          <textarea
            id="edit-modal-catatan-tamu"
            value={editCatatan}
            onChange={(e) => setEditCatatan(e.target.value)}
            rows={2}
            placeholder="Keterangan opsional..."
            aria-label="Catatan Tamu"
            disabled={isSubmitting}
            className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            size="toolbar"
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
