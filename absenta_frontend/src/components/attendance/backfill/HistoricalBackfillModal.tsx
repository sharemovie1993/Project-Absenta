import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
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
  tahunPelajaranId?: string;
  semesterId?: string;
  onSuccess?: () => void;
}

export const HistoricalBackfillModal: React.FC<HistoricalBackfillModalProps> = ({
  isOpen,
  onClose,
  kelasId,
  kelasNama = 'Kelas',
  tahunPelajaranId,
  semesterId,
  onSuccess,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BackfillPreviewResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Download Template Excel
  const handleDownloadTemplate = async () => {
    if (!kelasId) {
      toast.error('Pilih kelas terlebih dahulu.');
      return;
    }
    try {
      setIsDownloading(true);
      toast('Menyiapkan template Excel untuk kelas ' + kelasNama + '...', {
        icon: 'ℹ️',
      });
      await historicalBackfillApi.downloadTemplate({
        kelasId,
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
      const res = await historicalBackfillApi.previewExcel(kelasId, file);
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
    if (!previewData || !kelasId) {
      toast.error('Data pratinjau belum siap.');
      return;
    }

    try {
      setIsExecuting(true);
      const res = await historicalBackfillApi.execute({
        kelasId,
        tahunPelajaranId,
        semesterId,
        dateList: previewData.dateList,
        students: previewData.students.map((s) => ({
          nis: s.nis,
          studentId: s.studentId || undefined,
          statusMap: s.statusMap,
        })),
      });

      toast.success(res.message || 'Presensi semester ganjil berhasil disinkronkan ke sesi!');
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
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Backfill Presensi Semester Ganjil
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    Terhubung ke Sesi KBM
                  </Badge>
                </h2>
                <p className="text-xs text-slate-500">
                  Impor data presensi historis untuk kebutuhan analitik dan rekap rapor — Kelas <span className="font-semibold text-slate-700 dark:text-slate-300">{kelasNama}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Download Template */}
        <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Unduh Template Format Excel Resmi</span>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isDownloading || !kelasId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8 px-3 rounded-lg"
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
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Berkas Excel sudah otomatis terisi <span className="font-semibold">seluruh nama siswa di kelas {kelasNama}</span> dan kolom tanggal hari sekolah aktif selama semester ganjil.
          </p>
          <div className="flex items-center gap-2 text-[10px] text-emerald-800 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 font-mono">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>
              <strong>Tip Praktis:</strong> Cukup ketik <strong>S</strong> (Sakit), <strong>I</strong> (Izin), atau <strong>A</strong> (Alpa) pada tanggal siswa tidak masuk. Sel yang kosong otomatis dihitung <strong>HADIR</strong>.
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
            disabled={!previewData || isExecuting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 h-9 px-4 rounded-lg shadow-sm"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyinkronkan ke Sesi KBM...</span>
              </>
            ) : (
              <>
                <span>Terapkan & Sinkronkan ke Sesi KBM</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
