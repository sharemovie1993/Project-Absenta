import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Users,
  Sparkles,
  ArrowRight,
  Info,
  RefreshCw,
  Shield,
  Lock,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { attendanceStagingApi } from '../../../api/attendance-staging.api';
import toast from 'react-hot-toast';
import { Modal, Button, Badge } from '../../ui';
import {
  historicalBackfillApi,
  type BackfillPreviewResponse,
} from '../../../api/attendance/historicalBackfill.api';

interface HistoricalBackfillModalProps {
  isOpen: boolean;
  onClose: () => void;
  kelasId: string;
  kelasNama?: string;
  mapelId?: string;
  mapelNama?: string;
  guruId?: string;
  jenisKegiatan?: 'KBM' | 'MAPEL' | 'KETARUNAAN';
  jadwalKegiatanId?: string;
  kelasList?: { value: string; label: string }[];
  onKelasChange?: (kelasId: string, kelasNama: string) => void;
  tahunPelajaranId?: string;
  semesterId?: string;
  onSuccess?: () => void;
}

export const HistoricalBackfillModal: React.FC<HistoricalBackfillModalProps> = ({
  isOpen,
  onClose,
  kelasId,
  kelasNama = 'Kelas',
  mapelId,
  mapelNama,
  guruId,
  jenisKegiatan = 'KBM',
  jadwalKegiatanId,
  kelasList,
  onKelasChange,
  tahunPelajaranId,
  semesterId,
  onSuccess,
}) => {
  const [activeKelasId, setActiveKelasId] = useState(kelasId);
  const [activeKelasNama, setActiveKelasNama] = useState(kelasNama);
  const [selectedHari, setSelectedHari] = useState<string>('SEMUA_JADWAL');

  useEffect(() => {
    setActiveKelasId(kelasId);
    setActiveKelasNama(kelasNama);
  }, [kelasId, kelasNama]);

  const isKetarunaan = jenisKegiatan === 'KETARUNAAN';

  const handleKelasSelectChange = (newKelasId: string) => {
    setActiveKelasId(newKelasId);
    const found = kelasList?.find((k) => k.value === newKelasId);
    const newName = found ? found.label : newKelasId;
    setActiveKelasNama(newName);
    onKelasChange?.(newKelasId, newName);
    // Reset preview data saat ganti kelas
    setPreviewData(null);
    setSelectedFile(null);
  };
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isTogglingGuard, setIsTogglingGuard] = useState(false);

  const queryClient = useQueryClient();
  const { isAdmin } = useCapabilities();

  const { data: guardRes, isLoading: isGuardLoading, refetch: refetchStagingGuard } = useQuery({
    queryKey: ['attendance-staging-guard'],
    queryFn: () => attendanceStagingApi.getGuardStatus(),
    enabled: isOpen,
    staleTime: 30_000,
  });

  const guardStatus = guardRes?.data;
  const isGuardEnabled = Boolean(guardStatus?.enabled);

  const handleToggleGuard = async (nextEnabled: boolean) => {
    setIsTogglingGuard(true);
    try {
      const res = await attendanceStagingApi.updateGuardStatus({
        enabled: nextEnabled,
      });
      if (res.success) {
        toast.success(res.message);
        await refetchStagingGuard();
        queryClient.invalidateQueries({ queryKey: ['attendance-staging-guard'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-info'] });
      } else {
        toast.error(res.message || 'Gagal memperbarui status Guard.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memperbarui status Guard.');
    } finally {
      setIsTogglingGuard(false);
    }
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BackfillPreviewResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Download Template Excel
  const handleDownloadTemplate = async () => {
    if (!activeKelasId) {
      toast.error('Pilih kelas terlebih dahulu.');
      return;
    }
    try {
      setIsDownloading(true);
      const labelDesc = isKetarunaan
        ? `Program Ketarunaan - Rombel ${activeKelasNama}`
        : mapelNama
        ? `Kelas ${activeKelasNama} - Mapel ${mapelNama}`
        : `Kelas ${activeKelasNama}`;

      toast(`Menyiapkan template Excel untuk ${labelDesc}...`, {
        icon: 'ℹ️',
      });
      await historicalBackfillApi.downloadTemplate({
        kelasId: activeKelasId,
        mapelId,
        jenisKegiatan,
        jadwalKegiatanId,
        hari: isKetarunaan && selectedHari !== 'SEMUA_JADWAL' ? selectedHari : undefined,
        tahunPelajaranId,
        semesterId,
      });
      toast.success('Template Excel berhasil diunduh!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengunduh template Excel.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 2. Pilih & Pratinjau File Excel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Format berkas harus berupa file Excel (.xlsx atau .xls).');
      return;
    }

    setSelectedFile(file);
    try {
      setIsUploading(true);
      const res = await historicalBackfillApi.previewExcel(activeKelasId, file);
      setPreviewData(res);
      toast.success('Berkas Excel berhasil divalidasi!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memvalidasi berkas Excel.');
      setPreviewData(null);
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. Eksekusi Backfill ke Database
  const handleExecute = async () => {
    if (!previewData || !activeKelasId) {
      toast.error('Data pratinjau belum siap.');
      return;
    }

    try {
      setIsExecuting(true);
      const res = await historicalBackfillApi.execute({
        kelasId: activeKelasId,
        mapelId,
        guruId,
        jenisKegiatan,
        jadwalKegiatanId,
        tahunPelajaranId,
        semesterId,
        dateList: previewData.dateList,
        students: previewData.students.map((s) => ({
          nis: s.nis,
          studentId: s.studentId || undefined,
          statusMap: s.statusMap,
        })),
      });

      const successMsg = isKetarunaan
        ? 'Presensi kegiatan Ketarunaan berhasil disinkronkan ke sesi!'
        : res.message || 'Presensi semester ganjil berhasil disinkronkan ke sesi!';

      toast.success(successMsg);
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengeksekusi backfill presensi.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewData(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-3xl">
      <div className="p-6 space-y-6">
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl ${isKetarunaan ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'}`}>
                {isKetarunaan ? <Shield className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {isKetarunaan
                    ? 'Backfill Rekap Presensi Ketarunaan'
                    : mapelNama
                    ? 'Backfill Presensi Mata Pelajaran'
                    : 'Backfill Presensi Semester Ganjil'}
                  <Badge variant="outline" className={`text-[10px] ${isKetarunaan ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {isKetarunaan
                      ? 'Sesi Ketarunaan (06:30 - 07:30)'
                      : mapelNama
                      ? 'Terhubung ke Sesi Mapel'
                      : 'Terhubung ke Sesi KBM'}
                  </Badge>
                </h2>
                <p className="text-xs text-slate-500">
                  {isKetarunaan ? (
                    <>
                      Impor data presensi rekonsiliasi Program Ketarunaan — Peleton / Rombel <span className="font-semibold text-slate-700 dark:text-slate-300">{activeKelasNama}</span> &bull; Semester Ganjil
                    </>
                  ) : mapelNama ? (
                    <>
                      Impor data presensi historis Semester Ganjil — Kelas <span className="font-semibold text-slate-700 dark:text-slate-300">{activeKelasNama}</span> &bull; Mapel <span className="font-semibold text-indigo-600 dark:text-indigo-400">{mapelNama}</span>
                    </>
                  ) : (
                    <>
                      Impor data presensi historis untuk kebutuhan analitik dan rekap rapor — Kelas <span className="font-semibold text-slate-700 dark:text-slate-300">{activeKelasNama}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pemilih Kelas / Peleton jika disediakan opsi */}
        { isGuardEnabled ? (
          <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Unlock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                    Guard Terbuka • Mode Event Resmi Rekonsiliasi Aktif
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0">
                    DISETUJUI ADMIN
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
                  Pengguna diizinkan melakukan rekap backfill presensi ke belakang selama Event Resmi berlangsung.
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isTogglingGuard}
                onClick={() => handleToggleGuard(false)}
                className="shrink-0 h-7 px-2.5 text-[11px] font-bold border-rose-300 bg-white hover:bg-rose-50 text-rose-700 rounded-lg gap-1"
              >
                <Lock className="w-3 h-3" />
                <span>{isTogglingGuard ? 'Mengunci...' : 'Kunci Guard'}</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50/95 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-amber-950 dark:text-amber-100">
                    Guard Keamanan Aktif • Eksekusi Backfill Dikunci
                  </span>
                  <Badge className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0">
                    DI LUAR EVENT RESMI
                  </Badge>
                </div>
                <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  Untuk mencegah manipulasi data presensi ke belakang, penyimpanan backfill dikunci di luar Event Resmi. Anda tetap dapat mengunduh format Excel dan menguji pratinjau berkas, namun tombol eksekusi hanya terbuka bila Guard diaktifkan oleh Admin.
                </p>
              </div>
            </div>
            {isAdmin ? (
              <Button
                type="button"
                size="sm"
                disabled={isTogglingGuard || isGuardLoading}
                onClick={() => handleToggleGuard(true)}
                className="shrink-0 h-8 px-3 text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{isTogglingGuard ? 'Membuka...' : 'Aktifkan Event Resmi (Buka Guard)'}</span>
              </Button>
            ) : (
              <div className="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 border border-amber-300 text-[10px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Dikunci Admin</span>
              </div>
            )}
          </div>
        )}

        {kelasList && kelasList.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Pilih {isKetarunaan ? 'Peleton / Rombel' : 'Kelas'}:
              </span>
            </div>
            <select
              value={activeKelasId}
              onChange={(e) => handleKelasSelectChange(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
            >
              {kelasList.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 1: Download Template */}
        <div className={`rounded-xl border p-4 space-y-3 ${isKetarunaan ? 'border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20' : 'border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              <span className={`w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] ${isKetarunaan ? 'bg-amber-600' : 'bg-indigo-600'}`}>1</span>
              <span>Unduh Template Format Excel Resmi</span>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isDownloading || !activeKelasId}
              className={`${isKetarunaan ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} text-xs gap-1.5 h-8 px-3 rounded-lg`}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyiapkan...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Format Excel (.xlsx)</span>
                </>
              )}
            </Button>
          </div>

          {/* Opsi Filter Hari jika Kegiatan Ketarunaan */}
          {isKetarunaan && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Pilihan Hari Sesi:</span>
              <select
                value={selectedHari}
                onChange={(e) => setSelectedHari(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                <option value="SEMUA_JADWAL">Sesuai Jadwal Resmi (Selasa, Rabu, Kamis)</option>
                <option value="SELASA">Selasa Saja</option>
                <option value="RABU">Rabu Saja</option>
                <option value="KAMIS">Kamis Saja</option>
                <option value="SEMUA">Semua Hari Sekolah (Senin - Sabtu)</option>
              </select>
            </div>
          )}

          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Berkas Excel sudah otomatis terisi <span className="font-semibold">seluruh nama siswa di {isKetarunaan ? 'peleton/rombel' : 'kelas'} {activeKelasNama}</span>
            {isKetarunaan ? (
              <> sesuai jadwal resmi kegiatan Ketarunaan (pukul 06:30 - 07:30) selama semester ganjil.</>
            ) : mapelNama ? (
              <> untuk mata pelajaran <span className="font-semibold text-indigo-600 dark:text-indigo-400">{mapelNama}</span> dan kolom tanggal hari sekolah aktif selama semester ganjil.</>
            ) : (
              <> dan kolom tanggal hari sekolah aktif selama semester ganjil.</>
            )}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-emerald-800 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 font-mono">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>
              <strong>Tip Praktis:</strong> Cukup ketik <strong>S</strong> (Sakit), <strong>I</strong> (Izin), atau <strong>A</strong> (Alpa) pada tanggal siswa tidak hadir. Sel yang kosong otomatis dihitung <strong>HADIR</strong>.
            </span>
          </div>
        </div>

        {/* Step 2: Upload Excel File */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Unggah Berkas Excel Hasil Pengisian</span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />

          {!previewData ? (
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-900/30 group"
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-xs font-semibold">Sedang membaca dan memvalidasi berkas Excel...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Klik untuk memilih berkas Excel atau seret berkas ke sini
                    </p>
                    <p className="text-[10px] text-slate-500">Mendukung format .xlsx dan .xls</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {selectedFile?.name || 'Berkas Excel Presensi'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Rentang: {previewData.summary.startDate} s.d. {previewData.summary.endDate} ({previewData.summary.totalHariKbm} Hari KBM)
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewData(null);
                    setSelectedFile(null);
                  }}
                  className="text-xs gap-1 h-7 px-2 border-slate-300"
                >
                  <RefreshCw className="w-3 h-3" /> Ganti Berkas
                </Button>
              </div>

              {/* Grid Statistik Pratinjau */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-center">
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Siswa Terdata</p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {previewData.summary.totalSiswa} Siswa
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase">Hadir</p>
                  <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                    {previewData.summary.counts.totalHadir.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800/60">
                  <p className="text-[10px] font-semibold text-blue-600 uppercase">Sakit (S)</p>
                  <p className="text-sm font-extrabold text-blue-700 dark:text-blue-400">
                    {previewData.summary.counts.totalSakit.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase">Izin (I)</p>
                  <p className="text-sm font-extrabold text-amber-700 dark:text-amber-400">
                    {previewData.summary.counts.totalIzin.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-red-200 dark:border-red-800/60 col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-semibold text-red-600 uppercase">Alpa (A)</p>
                  <p className="text-sm font-extrabold text-red-700 dark:text-red-400">
                    {previewData.summary.counts.totalAlpa.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Warning box if any */}
              {previewData.warnings && previewData.warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40 text-[10.5px] text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Catatan Validasi ({previewData.warnings.length}):</span>
                  </div>
                  <ul className="list-disc list-inside max-h-20 overflow-y-auto space-y-0.5 text-[9.5px]">
                    {previewData.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isExecuting}
            className="text-xs"
          >
            Batal
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleExecute}
            disabled={!previewData || isExecuting || !isGuardEnabled}
            title={!isGuardEnabled ? 'Guard Keamanan sedang dikunci oleh Admin (Di Luar Event Resmi)' : undefined}
            className={`${isKetarunaan ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50 text-white text-xs gap-1.5 h-9 px-4 rounded-lg shadow-sm`}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {isKetarunaan
                    ? 'Menyinkronkan ke Sesi Ketarunaan...'
                    : mapelNama
                    ? 'Menyinkronkan ke Sesi Mapel...'
                    : 'Menyinkronkan ke Sesi KBM...'}
                </span>
              </>
            ) : (
              <>
                <span>
                  {isKetarunaan
                    ? 'Terapkan & Sinkronkan ke Sesi Ketarunaan'
                    : mapelNama
                    ? 'Terapkan & Sinkronkan ke Sesi Mapel'
                    : 'Terapkan & Sinkronkan ke Sesi KBM'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
