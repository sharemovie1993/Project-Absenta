import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, User, FileText, Users, Link2, Check } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import {
  type RapatMasterItem,
  type CreateRapatPayload,
  type KategoriRapat,
  type TargetPesertaRapat,
  type StatusRapat,
} from '@/api/academic/rapat.api';
import toast from 'react-hot-toast';

export interface CreateEditRapatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateRapatPayload) => Promise<void>;
  initialData?: RapatMasterItem | null;
  isLoading?: boolean;
}

export const CreateEditRapatModal: React.FC<CreateEditRapatModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const isEditing = Boolean(initialData);

  const [judulRapat, setJudulRapat] = useState('');
  const [nomorSurat, setNomorSurat] = useState('');
  const [kategoriRapat, setKategoriRapat] = useState<KategoriRapat>('DEWAN_GURU');
  const [targetPeserta, setTargetPeserta] = useState<TargetPesertaRapat>('SEMUA_GURU');
  const [deskripsi, setDeskripsi] = useState('');
  const [tanggalRapat, setTanggalRapat] = useState(new Date().toISOString().split('T')[0]);
  const [jamMulai, setJamMulai] = useState('08:00');
  const [jamSelesai, setJamSelesai] = useState('11:30');
  const [tempat, setTempat] = useState('Aula Utama');
  const [linkDaring, setLinkDaring] = useState('');
  const [pimpinanRapat, setPimpinanRapat] = useState('');
  const [notulis, setNotulis] = useState('');
  const [agendaText, setAgendaText] = useState('');
  const [notulenHasil, setNotulenHasil] = useState('');
  const [status, setStatus] = useState<StatusRapat>('DIJADWALKAN');
  const [autoPopulatePeserta, setAutoPopulatePeserta] = useState(true);

  useEffect(() => {
    if (initialData) {
      setJudulRapat(initialData.judul_rapat || '');
      setNomorSurat(initialData.nomor_surat || '');
      setKategoriRapat(initialData.kategori_rapat || 'DEWAN_GURU');
      setTargetPeserta(initialData.target_peserta || 'SEMUA_GURU');
      setDeskripsi(initialData.deskripsi || '');
      setTanggalRapat(
        initialData.tanggal_rapat
          ? new Date(initialData.tanggal_rapat).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setJamMulai(initialData.jam_mulai || '08:00');
      setJamSelesai(initialData.jam_selesai || '11:30');
      setTempat(initialData.tempat || 'Aula Utama');
      setLinkDaring(initialData.link_daring || '');
      setPimpinanRapat(initialData.pimpinan_rapat || '');
      setNotulis(initialData.notulis || '');
      setAgendaText(
        Array.isArray(initialData.agenda)
          ? initialData.agenda.join('\n')
          : typeof initialData.agenda === 'string'
          ? initialData.agenda
          : ''
      );
      setNotulenHasil(initialData.notulen_hasil || '');
      setStatus(initialData.status || 'DIJADWALKAN');
      setAutoPopulatePeserta(false);
    } else {
      setJudulRapat('');
      setNomorSurat('');
      setKategoriRapat('DEWAN_GURU');
      setTargetPeserta('SEMUA_GURU');
      setDeskripsi('');
      setTanggalRapat(new Date().toISOString().split('T')[0]);
      setJamMulai('08:00');
      setJamSelesai('11:30');
      setTempat('Aula Utama');
      setLinkDaring('');
      setPimpinanRapat('');
      setNotulis('');
      setAgendaText('');
      setNotulenHasil('');
      setStatus('DIJADWALKAN');
      setAutoPopulatePeserta(true);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judulRapat.trim()) {
      toast.error('Judul rapat wajib diisi');
      return;
    }
    if (!tanggalRapat) {
      toast.error('Tanggal rapat wajib ditentukan');
      return;
    }
    if (!jamMulai) {
      toast.error('Jam mulai rapat wajib diisi');
      return;
    }

    const agendaList = agendaText
      .split('\n')
      .map((a) => a.trim())
      .filter(Boolean);

    const payload: CreateRapatPayload = {
      judul_rapat: judulRapat.trim(),
      nomor_surat: nomorSurat.trim() || undefined,
      kategori_rapat: kategoriRapat,
      target_peserta: targetPeserta,
      deskripsi: deskripsi.trim() || undefined,
      tanggal_rapat: tanggalRapat,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai || undefined,
      tempat: tempat.trim() || 'Aula Utama',
      link_daring: linkDaring.trim() || undefined,
      pimpinan_rapat: pimpinanRapat.trim() || undefined,
      notulis: notulis.trim() || undefined,
      agenda: agendaList,
      notulen_hasil: notulenHasil.trim() || undefined,
      status,
      autoPopulatePeserta: isEditing ? false : autoPopulatePeserta,
    };

    await onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Ubah Informasi & Notulen Rapat' : 'Jadwalkan Rapat Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Perbarui data agenda, notulen, dan status pelaksanaan rapat'
                  : 'Buat agenda rapat resmi institusi dan petakan peserta secara otomatis'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Baris 1: Judul & Nomor Surat */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Judul Rapat *</label>
              <Input
                value={judulRapat}
                onChange={(e) => setJudulRapat(e.target.value)}
                placeholder="Contoh: Rapat Dewan Guru KBM Semester Genap"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Nomor Surat Undangan</label>
              <Input
                value={nomorSurat}
                onChange={(e) => setNomorSurat(e.target.value)}
                placeholder="Contoh: 421.5/028/SMK-PK/2026"
              />
            </div>
          </div>

          {/* Baris 2: Kategori, Target Peserta, dan Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Kategori Rapat</label>
              <select
                value={kategoriRapat}
                onChange={(e) => setKategoriRapat(e.target.value as KategoriRapat)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="DEWAN_GURU">Rapat Dewan Guru (Dinas)</option>
                <option value="SOSIALISASI">Sosialisasi Platform / Proker</option>
                <option value="KURIKULUM">Rapat Kurikulum & KBM</option>
                <option value="KOMITE_ORANG_TUA">Rapat Komite / Wali Murid</option>
                <option value="PLENO_KENAIKAN_KELULUSAN">Rapat Pleno Kelulusan</option>
                <option value="JURUSAN_KAPROG">Rapat Program Keahlian / PKL</option>
                <option value="KOORDINASI_BK">Rapat Kasus / Koordinasi BK</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Target Peserta Rapat</label>
              <select
                value={targetPeserta}
                onChange={(e) => setTargetPeserta(e.target.value as TargetPesertaRapat)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                disabled={isEditing}
              >
                <option value="SEMUA_GURU">Semua Tenaga Pendidik (Guru)</option>
                <option value="GURU_DAN_STAF">Guru & Seluruh Tenaga Kependidikan</option>
                <option value="WALI_MURID">Wali Murid / Orang Tua Siswa</option>
                <option value="SISWA">Perwakilan Siswa / Seluruh Siswa</option>
                <option value="GURU_MAPEL">Guru Mata Pelajaran Tertentu</option>
                <option value="WALI_KELAS">Wali Kelas Saja</option>
                <option value="KOMITE_SEKOLAH">Komite Sekolah</option>
                <option value="CAMPURAN_UNDANGAN">Undangan Khusus / Campuran</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Status Pelaksanaan</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusRapat)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="DIJADWALKAN">📅 DIJADWALKAN</option>
                <option value="BERLANGSUNG">🔴 BERLANGSUNG (LIVE SCAN)</option>
                <option value="SELESAI">✅ SELESAI</option>
                <option value="DIBATALKAN">❌ DIBATALKAN</option>
              </select>
            </div>
          </div>

          {/* Baris 3: Tanggal, Waktu Mulai & Selesai */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Tanggal Pelaksanaan *
              </label>
              <Input
                type="date"
                value={tanggalRapat}
                onChange={(e) => setTanggalRapat(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Jam Mulai *
              </label>
              <Input
                type="time"
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Jam Selesai
              </label>
              <Input
                type="time"
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
                placeholder="Opsional"
              />
            </div>
          </div>

          {/* Baris 4: Tempat & Link Daring */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Lokasi / Ruangan Rapat *
              </label>
              <Input
                value={tempat}
                onChange={(e) => setTempat(e.target.value)}
                placeholder="Contoh: Aula Utama Lantai 2 / Ruang Guru"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-slate-400" />
                Tautan Daring (Zoom / Google Meet / Jitsi)
              </label>
              <Input
                value={linkDaring}
                onChange={(e) => setLinkDaring(e.target.value)}
                placeholder="Opsional (untuk rapat daring/hybrid)"
              />
            </div>
          </div>

          {/* Baris 5: Pimpinan & Notulis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Pimpinan Rapat
              </label>
              <Input
                value={pimpinanRapat}
                onChange={(e) => setPimpinanRapat(e.target.value)}
                placeholder="Contoh: Kepala Sekolah / Wakasek Kurikulum"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Notulis Rapat
              </label>
              <Input
                value={notulis}
                onChange={(e) => setNotulis(e.target.value)}
                placeholder="Contoh: Nama Guru / Staf Notulis"
              />
            </div>
          </div>

          {/* Baris 6: Agenda Pembahasan */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Agenda Pembahasan (Satu poin per baris)
            </label>
            <textarea
              value={agendaText}
              onChange={(e) => setAgendaText(e.target.value)}
              placeholder="Contoh:&#10;1. Evaluasi KBM Bulan Lalu&#10;2. Penjelasan Jadwal Ujian&#10;3. Tanya Jawab & Arahan Kepala Sekolah"
              rows={3}
              className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Baris 7: Notulen / Hasil Keputusan Rapat */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Notulen & Hasil Keputusan Rapat (Dapat diisi saat rapat berlangsung / selesai)
            </label>
            <textarea
              value={notulenHasil}
              onChange={(e) => setNotulenHasil(e.target.value)}
              placeholder="Tuliskan resume pembahasan, kesepakatan, dan tindak lanjut rapat di sini..."
              rows={4}
              className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-indigo-50/20"
            />
          </div>

          {/* Opsi Auto-Populate Peserta untuk rapat baru */}
          {!isEditing && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-3">
              <input
                type="checkbox"
                id="autoPopulate"
                checked={autoPopulatePeserta}
                onChange={(e) => setAutoPopulatePeserta(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="autoPopulate" className="text-xs text-slate-700 cursor-pointer">
                <span className="font-semibold text-slate-900">
                  Otomatis petakan daftar peserta awal dari basis data sekolah
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sistem akan langsung mengisi daftar hadir dengan seluruh guru, staf, atau siswa sesuai target peserta yang dipilih, sehingga tinggal scan QR atau checklist saat rapat.
                </p>
              </label>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            {isLoading ? (
              'Menyimpan...'
            ) : isEditing ? (
              'Simpan Perubahan'
            ) : (
              'Buat Agenda Rapat'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
