import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  UserCheck,
  Printer,
  Save,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Button, Input } from '@/components/ui';
import { raporApi, type RaporSettingSummaryRow } from '@/api/rapor.api';
import { RaporMapelOrderingPanel } from './RaporMapelOrderingPanel';
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
  const [modalTab, setModalTab] = useState<'titimangsa' | 'penandatangan' | 'format' | 'urutan_mapel'>('titimangsa');
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
      size="lg"
      className={cn(
        'p-0 overflow-hidden rounded-2xl transition-all duration-200',
        modalTab === 'urutan_mapel' ? 'max-w-4xl' : 'max-w-lg'
      )}
    >
      <div className="flex flex-col bg-white dark:bg-slate-900">
        {/* Header Bersih & Ringkas */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              Slot Rapor • {yearRow.tahun_ajaran}
            </span>
            {yearRow.is_active && (
              <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Aktif
              </span>
            )}
          </div>
        </div>

        {/* Tab Switcher Bersih (Bebas Tabrakan Emoji) */}
        <div className="flex items-center gap-1 px-5 pt-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 overflow-x-auto">
          <button
            type="button"
            onClick={() => setModalTab('titimangsa')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap',
              modalTab === 'titimangsa'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Titimangsa</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('penandatangan')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap',
              modalTab === 'penandatangan'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Kepala Sekolah</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('format')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap',
              modalTab === 'format'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            )}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Format Blanko</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('urutan_mapel')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap',
              modalTab === 'urutan_mapel'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Urutan Mapel</span>
          </button>
        </div>

        {/* Body Ringkas & Nyaman */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* TAB 1: TITIMANGSA */}
          {modalTab === 'titimangsa' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Kota / Tempat Terbit
                </label>
                <Input
                  value={tempatTerbit}
                  onChange={(e) => setTempatTerbit(e.target.value)}
                  placeholder="Contoh: Purwakarta"
                  className="h-8.5 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tgl Rapor Ganjil
                  </label>
                  <Input
                    type="date"
                    value={tanggalRaporGanjil}
                    onChange={(e) => setTanggalRaporGanjil(e.target.value)}
                    className="h-8.5 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tgl Rapor Genap
                  </label>
                  <Input
                    type="date"
                    value={tanggalRaporGenap}
                    onChange={(e) => setTanggalRaporGenap(e.target.value)}
                    className="h-8.5 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Opsi Tambahan / Khusus (Collapsible Bersih) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedDates(!showAdvancedDates)}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>{showAdvancedDates ? '− Sembunyikan' : '+ Opsi Tambahan'} (PTS, P5, Pleno, Kelulusan)</span>
                </button>

                {showAdvancedDates && (
                  <div className="grid grid-cols-2 gap-2.5 pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">PTS Ganjil</label>
                      <Input type="date" value={tanggalPtsGanjil} onChange={(e) => setTanggalPtsGanjil(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">PTS Genap</label>
                      <Input type="date" value={tanggalPtsGenap} onChange={(e) => setTanggalPtsGenap(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">P5 Ganjil</label>
                      <Input type="date" value={tanggalP5Ganjil} onChange={(e) => setTanggalP5Ganjil(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">P5 Genap</label>
                      <Input type="date" value={tanggalP5Genap} onChange={(e) => setTanggalP5Genap(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Pleno Kenaikan</label>
                      <Input type="date" value={tanggalPlenoGenap} onChange={(e) => setTanggalPlenoGenap(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Kelulusan (SKL)</label>
                      <Input type="date" value={tanggalKelulusan} onChange={(e) => setTanggalKelulusan(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PEJABAT KEPALA SEKOLAH */}
          {modalTab === 'penandatangan' && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 py-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Status Jabatan:</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="kepsekStatus"
                    checked={kepsekStatus === 'DEFINITIF'}
                    onChange={() => setKepsekStatus('DEFINITIF')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Definitif</span>
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

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Lengkap &amp; Gelar
                </label>
                <Input
                  value={kepsekNama}
                  onChange={(e) => setKepsekNama(e.target.value)}
                  placeholder="Contoh: WAHYU TAMIMBARKAH, S.Pd."
                  className="h-8.5 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  NIP Kepala Sekolah
                </label>
                <Input
                  value={kepsekNip}
                  onChange={(e) => setKepsekNip(e.target.value)}
                  placeholder="Contoh: 197111022008011001 atau -"
                  className="h-8.5 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* TAB 3: FORMAT & CETAK */}
          {modalTab === 'format' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Ukuran Kertas
                  </label>
                  <select
                    value={ukuranKertas}
                    onChange={(e) => setUkuranKertas(e.target.value as 'A4' | 'F4')}
                    className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="A4">A4 (Standar)</option>
                    <option value="F4">F4 / Folio</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mode Lembar
                  </label>
                  <select
                    value={modeCetakRapor}
                    onChange={(e) => setModeCetakRapor(e.target.value as any)}
                    className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="CP_ONLY">Hanya Capaian Kompetensi (CP)</option>
                    <option value="SUMATIF_AND_CP">Sumatif Angka + CP</option>
                    <option value="SUMATIF_ONLY">Hanya Sumatif</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tampilkanKop}
                    onChange={(e) => setTampilkanKop(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Tampilkan Kop Surat Resmi</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tampilkanQr}
                    onChange={(e) => setTampilkanQr(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Sertakan QR Code Validasi Dokumen</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tampilkanKokurikuler}
                    onChange={(e) => setTampilkanKokurikuler(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Tampilkan Nilai Kokurikuler (P5)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: URUTAN & KELOMPOK MAPEL */}
          {modalTab === 'urutan_mapel' && (
            <div className="pt-1">
              <RaporMapelOrderingPanel
                tahunPelajaranId={yearRow.tahun_pelajaran_id}
                tahunAjaran={yearRow.tahun_ajaran}
                onSaved={onSuccess}
              />
            </div>
          )}
        </div>

        {/* Footer Rapi & Langsung Terlihat */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between gap-2 shrink-0">
          <div>
            {modalTab === 'urutan_mapel' && (
              <span className="text-[11px] text-slate-400">
                Perubahan pada tab ini disimpan melalui tombol Simpan di atas tabel.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={saveMutation.isPending}
              className="h-8 px-3 text-xs"
            >
              {modalTab === 'urutan_mapel' ? 'Selesai' : 'Batal'}
            </Button>

            {modalTab !== 'urutan_mapel' && (
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="h-8 px-4 text-xs font-bold gap-1.5 shadow-2xs"
              >
                {saveMutation.isPending ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
});

RaporYearConfigModal.displayName = 'RaporYearConfigModal';
