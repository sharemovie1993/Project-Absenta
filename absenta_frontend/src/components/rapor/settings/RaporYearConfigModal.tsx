import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Save,
  CheckCircle2,
  Sparkles,
  X,
  Calendar,
  UserCheck,
  Settings2,
  RotateCcw,
  Printer,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Button, Input } from '@/components/ui';
import { raporApi, type RaporSettingSummaryRow } from '@/api/rapor.api';
import { cn } from '@/lib/utils';

// Zod Schema Validation Guard (Pilar 25)
const raporSlotSchema = z.object({
  tempatTerbit: z.string().min(2, 'Tempat terbit minimal 2 karakter'),
  tanggalRaporGanjil: z.string().optional(),
  tanggalRaporGenap: z.string().optional(),
  kepsekNama: z.string().optional(),
  kepsekNip: z.string().optional(),
});

export interface RaporYearConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearRow: RaporSettingSummaryRow | null;
  onSuccess?: () => void;
}

export const RaporYearConfigModal: React.FC<RaporYearConfigModalProps> = React.memo(({
  isOpen,
  onClose,
  yearRow,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [modalTab, setModalTab] = useState<'titimangsa' | 'penandatangan' | 'format'>('titimangsa');
  const [showAdvancedDates, setShowAdvancedDates] = useState(false);

  // Form States: Titimangsa
  const [tempatTerbit, setTempatTerbit] = useState('Purwakarta');
  const [tanggalRaporGanjil, setTanggalRaporGanjil] = useState('');
  const [tanggalRaporGenap, setTanggalRaporGenap] = useState('');
  const [tanggalP5Ganjil, setTanggalP5Ganjil] = useState('');
  const [tanggalPtsGanjil, setTanggalPtsGanjil] = useState('');
  const [tanggalP5Genap, setTanggalP5Genap] = useState('');
  const [tanggalPtsGenap, setTanggalPtsGenap] = useState('');
  const [tanggalPlenoGenap, setTanggalPlenoGenap] = useState('');
  const [tanggalKelulusan, setTanggalKelulusan] = useState('');

  // Form States: Penandatangan
  const [kepsekStatus, setKepsekStatus] = useState<'DEFINITIF' | 'PLT'>('DEFINITIF');
  const [kepsekNama, setKepsekNama] = useState('');
  const [kepsekNip, setKepsekNip] = useState('');

  // Form States: Format & Mode Cetak
  const [ukuranKertas, setUkuranKertas] = useState<'A4' | 'F4'>('A4');
  const [tampilkanKop, setTampilkanKop] = useState(true);
  const [tampilkanQr, setTampilkanQr] = useState(true);
  const [tampilkanKokurikuler, setTampilkanKokurikuler] = useState(true);
  const [modeCetakRapor, setModeCetakRapor] = useState<'CP_ONLY' | 'SUMATIF_AND_CP' | 'SUMATIF_ONLY'>('CP_ONLY');
  const [sumberNilaiRapor, setSumberNilaiRapor] = useState<'FORMULA_SUMATIF' | 'MURNI_CP_MANUAL'>('FORMULA_SUMATIF');

  // Populate state when modal opens or row changes
  useEffect(() => {
    if (yearRow && isOpen) {
      setTempatTerbit(yearRow.tempat_terbit || 'Purwakarta');
      setTanggalRaporGanjil(yearRow.tanggal_rapor_ganjil || '');
      setTanggalRaporGenap(yearRow.tanggal_rapor_genap || '');
      setTanggalP5Ganjil(yearRow.tanggal_p5_ganjil || '');
      setTanggalPtsGanjil(yearRow.tanggal_pts_ganjil || '');
      setTanggalP5Genap(yearRow.tanggal_p5_genap || '');
      setTanggalPtsGenap(yearRow.tanggal_pts_genap || '');
      setTanggalPlenoGenap(yearRow.tanggal_pleno_genap || '');
      setTanggalKelulusan(yearRow.tanggal_kelulusan || '');

      setKepsekStatus(yearRow.kepsek_status || 'DEFINITIF');
      setKepsekNama(yearRow.kepsek_nama || '');
      setKepsekNip(yearRow.kepsek_nip || '');

      setUkuranKertas(yearRow.ukuran_kertas || 'A4');
      setTampilkanKop(yearRow.tampilkan_kop !== false);
      setTampilkanQr(yearRow.tampilkan_qr !== false);
      setTampilkanKokurikuler(yearRow.tampilkan_kokurikuler !== false);
      setModeCetakRapor(yearRow.mode_cetak_rapor || 'CP_ONLY');
      setSumberNilaiRapor(yearRow.sumber_nilai_rapor || 'FORMULA_SUMATIF');
      setModalTab('titimangsa');
      setShowAdvancedDates(Boolean(yearRow.tanggal_p5_ganjil || yearRow.tanggal_pts_ganjil || yearRow.tanggal_pleno_genap));
    }
  }, [yearRow, isOpen]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => raporApi.updateRaporSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-settings-summary'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-settings'] });
      toast.success(`Pengaturan slot ${yearRow?.tahun_ajaran} berhasil disimpan!`);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan pengaturan slot';
      toast.error(msg);
    },
  });

  const handleSave = useCallback(() => {
    if (!yearRow) return;

    // Validate using Zod
    const result = raporSlotSchema.safeParse({
      tempatTerbit,
      tanggalRaporGanjil,
      tanggalRaporGenap,
      kepsekNama,
      kepsekNip,
    });

    if (!result.success) {
      toast.error(result.error.issues[0]?.message || 'Input tidak valid');
      return;
    }

    saveMutation.mutate({
      tahun_pelajaran_id: yearRow.tahun_pelajaran_id,
      tempat_terbit: tempatTerbit.trim(),
      tanggal_rapor_ganjil: tanggalRaporGanjil,
      tanggal_rapor_genap: tanggalRaporGenap,
      tanggal_p5_ganjil: tanggalP5Ganjil,
      tanggal_pts_ganjil: tanggalPtsGanjil,
      tanggal_p5_genap: tanggalP5Genap,
      tanggal_pts_genap: tanggalPtsGenap,
      tanggal_pleno_genap: tanggalPlenoGenap,
      tanggal_kelulusan: tanggalKelulusan,
      kepsek_status: kepsekStatus,
      kepsek_nama: kepsekNama.trim(),
      kepsek_nip: kepsekNip.trim(),
      ukuran_kertas: ukuranKertas,
      tampilkan_kop: tampilkanKop,
      tampilkan_qr: tampilkanQr,
      tampilkan_kokurikuler: tampilkanKokurikuler,
      mode_cetak_rapor: modeCetakRapor,
      sumber_nilai_rapor: sumberNilaiRapor,
    });
  }, [
    yearRow,
    tempatTerbit,
    tanggalRaporGanjil,
    tanggalRaporGenap,
    tanggalP5Ganjil,
    tanggalPtsGanjil,
    tanggalP5Genap,
    tanggalPtsGenap,
    tanggalPlenoGenap,
    tanggalKelulusan,
    kepsekStatus,
    kepsekNama,
    kepsekNip,
    ukuranKertas,
    tampilkanKop,
    tampilkanQr,
    tampilkanKokurikuler,
    modeCetakRapor,
    sumberNilaiRapor,
    saveMutation,
  ]);

  if (!isOpen || !yearRow) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      className="p-0 overflow-hidden rounded-2xl max-w-3xl"
    >
      <div className="flex flex-col h-full max-h-[88vh] bg-white dark:bg-slate-900">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Konfigurasi Slot Rapor • {yearRow.tahun_ajaran}
                </h3>
                {yearRow.is_active && (
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur titimangsa resmi, identitas kepala sekolah, dan standar blanko rapor untuk tahun pelajaran ini.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Inner Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={() => setModalTab('titimangsa')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-colors',
              modalTab === 'titimangsa'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>📅 Titimangsa Rapor</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('penandatangan')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-colors',
              modalTab === 'penandatangan'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>✍️ Kepala Sekolah</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('format')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-colors',
              modalTab === 'format'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            )}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>📄 Format & Cetak</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: TITIMANGSA */}
          {modalTab === 'titimangsa' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
                <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-0.5">
                  Titimangsa Pokok Pembagian Rapor
                </span>
                <span className="text-indigo-700 dark:text-indigo-400 text-[11px] block">
                  Tanggal ini dicetak otomatis pada seluruh lembar Rapor Capaian, Rapor P5, Transkrip, dan Rapor PKL.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tempat Terbit Dokumen (Kota)
                </label>
                <Input
                  value={tempatTerbit}
                  onChange={(e) => setTempatTerbit(e.target.value)}
                  placeholder="Contoh: Purwakarta"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200">
                      Tgl Rapor Semester Ganjil
                    </label>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                      Desember
                    </span>
                  </div>
                  <Input
                    type="date"
                    value={tanggalRaporGanjil}
                    onChange={(e) => setTanggalRaporGanjil(e.target.value)}
                    className="h-9 text-xs bg-white dark:bg-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Penyerahan buku rapor pertengahan/akhir semester 1.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200">
                      Tgl Rapor Semester Genap
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      Juni
                    </span>
                  </div>
                  <Input
                    type="date"
                    value={tanggalRaporGenap}
                    onChange={(e) => setTanggalRaporGenap(e.target.value)}
                    className="h-9 text-xs bg-white dark:bg-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Penyerahan rapor kenaikan kelas & kelulusan siswa.
                  </span>
                </div>
              </div>

              {/* Collapsible Advanced Dates */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvancedDates(!showAdvancedDates)}
                  className="flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Opsi Titimangsa Tambahan / Khusus (PTS, P5, Pleno, Kelulusan)</span>
                  </span>
                  {showAdvancedDates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showAdvancedDates && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Tgl PTS Ganjil (Opsi)
                      </label>
                      <Input
                        type="date"
                        value={tanggalPtsGanjil}
                        onChange={(e) => setTanggalPtsGanjil(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Tgl PTS Genap (Opsi)
                      </label>
                      <Input
                        type="date"
                        value={tanggalPtsGenap}
                        onChange={(e) => setTanggalPtsGenap(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Tgl Projek P5 Ganjil
                      </label>
                      <Input
                        type="date"
                        value={tanggalP5Ganjil}
                        onChange={(e) => setTanggalP5Ganjil(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Tgl Projek P5 Genap
                      </label>
                      <Input
                        type="date"
                        value={tanggalP5Genap}
                        onChange={(e) => setTanggalP5Genap(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Tgl Rapat Pleno Kenaikan
                      </label>
                      <Input
                        type="date"
                        value={tanggalPlenoGenap}
                        onChange={(e) => setTanggalPlenoGenap(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Tgl Surat Kelulusan (SKL)
                      </label>
                      <Input
                        type="date"
                        value={tanggalKelulusan}
                        onChange={(e) => setTanggalKelulusan(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PEJABAT PENANDATANGAN */}
          {modalTab === 'penandatangan' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl">
                <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                  Pejabat Kepala Sekolah Penandatangan
                </span>
                <span className="text-amber-700 dark:text-amber-400 text-[11px] block">
                  Identitas resmi kepala sekolah yang dicetak pada halaman biodata, rapor akhir, transkrip, dan buku induk.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Status Jabatan
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="radio"
                      name="kepsekStatus"
                      checked={kepsekStatus === 'DEFINITIF'}
                      onChange={() => setKepsekStatus('DEFINITIF')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Kepala Sekolah Definitif</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="radio"
                      name="kepsekStatus"
                      checked={kepsekStatus === 'PLT'}
                      onChange={() => setKepsekStatus('PLT')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Pelaksana Tugas (Plt.)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Lengkap &amp; Gelar Kepala Sekolah
                </label>
                <Input
                  value={kepsekNama}
                  onChange={(e) => setKepsekNama(e.target.value)}
                  placeholder="Contoh: WAHYU TAMIMBARKAH, S.Pd."
                  className="h-9 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  NIP Kepala Sekolah
                </label>
                <Input
                  value={kepsekNip}
                  onChange={(e) => setKepsekNip(e.target.value)}
                  placeholder="Contoh: 197111022008011001"
                  className="h-9 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Ketik strip (-) jika belum memiliki NIP resmi.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: FORMAT & CETAK */}
          {modalTab === 'format' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl">
                <span className="font-bold text-blue-900 dark:text-blue-300 block mb-0.5">
                  Tata Letak Lembar &amp; Model Penilaian Rapor
                </span>
                <span className="text-blue-700 dark:text-blue-400 text-[11px] block">
                  Standar fisik kertas dan formula nilai rapor resmi untuk tahun pelajaran {yearRow.tahun_ajaran}.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Ukuran Kertas Blanko
                  </label>
                  <select
                    value={ukuranKertas}
                    onChange={(e) => setUkuranKertas(e.target.value as 'A4' | 'F4')}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="A4">A4 (210 mm × 297 mm) - Standar Kurikulum Merdeka</option>
                    <option value="F4">F4 / Folio (215 mm × 330 mm)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mode Lembar Rapor
                  </label>
                  <select
                    value={modeCetakRapor}
                    onChange={(e) => setModeCetakRapor(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="CP_ONLY">Hanya Capaian Kompetensi (CP)</option>
                    <option value="SUMATIF_AND_CP">Sumatif Angka + Capaian Kompetensi (Rekomendasi)</option>
                    <option value="SUMATIF_ONLY">Hanya Nilai Sumatif Angka</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Tampilkan Kop Surat Resmi (Dinas &amp; Sekolah)
                  </span>
                  <input
                    type="checkbox"
                    checked={tampilkanKop}
                    onChange={(e) => setTampilkanKop(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Sertakan QR Code Validasi Dokumen Digital
                  </span>
                  <input
                    type="checkbox"
                    checked={tampilkanQr}
                    onChange={(e) => setTampilkanQr(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Tampilkan Kolom Nilai Kokurikuler (P5)
                  </span>
                  <input
                    type="checkbox"
                    checked={tampilkanKokurikuler}
                    onChange={(e) => setTampilkanKokurikuler(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saveMutation.isPending}
            className="h-9 px-4 text-xs font-semibold"
          >
            Batal
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="h-9 px-5 text-xs font-bold gap-2 shadow-xs"
          >
            {saveMutation.isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Slot</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

RaporYearConfigModal.displayName = 'RaporYearConfigModal';
