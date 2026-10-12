import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import { Calendar, User, Users, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { JadwalPembinaUpacaraItem, CreatePembinaUpacaraPayload, StatusPelaksanaanUpacara } from '@/api/attendance/pembinaUpacara.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePembinaUpacaraPayload) => Promise<void>;
  editingItem?: JadwalPembinaUpacaraItem | null;
  guruList: Array<{ id: string; nama_guru: string; nip?: string | null }>;
  classList: Array<{ id: string; nama_kelas: string }>;
  tahunPelajaranId: string;
  semesterId?: string;
}

export const PembinaUpacaraFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  guruList,
  classList,
  tahunPelajaranId,
  semesterId,
}) => {
  const [tanggal, setTanggal] = useState('');
  const [guruId, setGuruId] = useState('');
  const [guruPenggantiId, setGuruPenggantiId] = useState('');
  const [kelasPetugasId, setKelasPetugasId] = useState('');
  const [temaAmanat, setTemaAmanat] = useState('');
  const [catatan, setCatatan] = useState('');
  const [status, setStatus] = useState<StatusPelaksanaanUpacara>('DIJADWALKAN');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setTanggal(editingItem.tanggal ? new Date(editingItem.tanggal).toISOString().split('T')[0] : '');
      setGuruId(editingItem.guru_id || '');
      setGuruPenggantiId(editingItem.guru_pengganti_id || '');
      setKelasPetugasId(editingItem.kelas_petugas_id || '');
      setTemaAmanat(editingItem.tema_amanat || '');
      setCatatan(editingItem.catatan || '');
      setStatus(editingItem.status || 'DIJADWALKAN');
    } else {
      // Default ke Senin berikutnya jika buat baru
      const today = new Date();
      const day = today.getDay();
      const diff = day === 1 ? 0 : (1 + 7 - day) % 7;
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + diff);
      setTanggal(nextMonday.toISOString().split('T')[0]);

      setGuruId('');
      setGuruPenggantiId('');
      setKelasPetugasId('');
      setTemaAmanat('');
      setCatatan('');
      setStatus('DIJADWALKAN');
    }
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggal || !guruId) return;

    setLoading(true);
    try {
      await onSubmit({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId || null,
        tanggal,
        guru_id: guruId,
        guru_pengganti_id: guruPenggantiId || null,
        kelas_petugas_id: kelasPetugasId || null,
        tema_amanat: temaAmanat || null,
        catatan: catatan || null,
        status,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit Jadwal Pembina Upacara' : 'Tambah Jadwal Pembina Upacara'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tanggal Pelaksanaan */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Tanggal Pelaksanaan (Hari Senin) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* Pembina Utama */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Pembina Upacara Utama <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={guruId}
            onChange={(e) => setGuruId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="">-- Pilih Guru Pembina --</option>
            {guruList.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nama_guru} {g.nip ? `(${g.nip})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Guru Pengganti (Handover jika berhalangan) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Guru Pengganti (Opsional jika utama berhalangan)
          </label>
          <select
            value={guruPenggantiId}
            onChange={(e) => setGuruPenggantiId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="">-- Tidak ada (Hadir Utama) --</option>
            {guruList
              .filter((g) => g.id !== guruId)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama_guru} {g.nip ? `(${g.nip})` : ''}
                </option>
              ))}
          </select>
        </div>

        {/* Kelas Petugas Upacara */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Kelas Petugas Upacara (Pengibar, MC, Padus)
          </label>
          <select
            value={kelasPetugasId}
            onChange={(e) => setKelasPetugasId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="">-- Pilih Rombel Petugas (Opsional) --</option>
            {classList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama_kelas}
              </option>
            ))}
          </select>
        </div>

        {/* Tema Amanat Upacara */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Tema / Judul Amanat Upacara
          </label>
          <input
            type="text"
            placeholder="Misal: Disiplin & Integritas Siswa, Anti Bullying, dll."
            value={temaAmanat}
            onChange={(e) => setTemaAmanat(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Status Pelaksanaan & Catatan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Status Pelaksanaan
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusPelaksanaanUpacara)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="DIJADWALKAN">Dijadwalkan</option>
              <option value="SELESAI">Selesai</option>
              <option value="DIGANTIKAN">Digantikan</option>
              <option value="DIBATALKAN">Dibatalkan</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Catatan Khusus
            </label>
            <input
              type="text"
              placeholder="Catatan protokol..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="rounded-xl shadow-md">
            {loading ? 'Menyimpan...' : editingItem ? 'Perbarui Jadwal' : 'Simpan Jadwal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
