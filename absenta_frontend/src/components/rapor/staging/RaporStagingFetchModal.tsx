import React, { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Link as LinkIcon,
  RefreshCw,
  CheckSquare,
  Square,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  FolderSearch,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { raporApi } from '@/api/rapor.api';
import { getKelasForDropdown } from '@/api/dropdown.api';

// ── Zod Schema Validation Guard (Pilar 25 / Form Security) ──
const folderInputSchema = z.object({
  url: z
    .string({ required_error: 'Tautan folder wajib diisi' })
    .trim()
    .min(10, 'Masukkan tautan folder Google Drive yang valid')
    .refine(
      (val) => val.includes('drive.google.com'),
      'Tautan harus merupakan tautan Google Drive yang valid'
    ),
});

const singleFileInputSchema = z.object({
  url: z
    .string({ required_error: 'Tautan file Google Sheet wajib diisi' })
    .trim()
    .min(10, 'Masukkan tautan file Google Sheet yang valid')
    .refine(
      (val) => val.includes('docs.google.com/spreadsheets') || val.includes('drive.google.com'),
      'Tautan harus merupakan tautan Google Sheet yang valid'
    ),
});

export interface ScannedFileItem {
  id: string;
  url: string;
  title: string;
  is_already_staged?: boolean;
  staged_info?: {
    id: string;
    nama_kelas: string;
    tahun_pelajaran: string;
    semester: string;
    status: string;
    updated_at?: string;
  } | null;
}

/**
 * Heuristik deteksi berkas: memeriksa apakah nama berkas kemungkinan besar
 * merupakan lembar rapor kelas atau berkas lain di dalam folder (seperti data master, rekap, panduan, jadwal).
 */
export function isLikelyRaporClassFile(title?: string): boolean {
  if (!title) return true;
  const lower = title.toLowerCase();
  if (
    lower.includes('master') ||
    lower.includes('rekap') ||
    lower.includes('daftar siswa') ||
    lower.includes('panduan') ||
    lower.includes('jadwal') ||
    lower.includes('blanko') ||
    lower.includes('template')
  ) {
    return false;
  }
  return true;
}

export interface DropdownKelasItem {
  value: string;
  label: string;
  nama_kelas: string;
  tingkat?: number | string;
  jurusan_nama?: string;
}

/**
 * Heuristik pencocokan judul file rapor ke kelas sistem Absenta.
 * Menangani kasus perbedaan nama penulisan seperti:
 * - "XII AKL 1" di file Google Sheet <-> "XII AK 1" di sistem Absenta
 * - "X TKJ 1" <-> "X TJKT 1"
 * - "XI PH 1" <-> "XI PHT 1"
 */
export function guessClassIdFromTitle(
  title: string,
  kelasList: DropdownKelasItem[]
): string | undefined {
  if (!title || (kelasList?.length || 0) === 0) return undefined;
  const upperTitle = title.toUpperCase().replace(/[-_]/g, ' ');

  // 1. Coba kecocokan nama persis (exact word boundary match)
  for (const k of kelasList) {
    const kName = k.nama_kelas.toUpperCase();
    const regex = new RegExp(`\\b${kName.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(upperTitle)) {
      return k.value;
    }
  }

  // 2. Normalisasi perbedaan singkatan: (XII|XI|X) + KODE + NOMOR
  const match = upperTitle.match(/\b(XII|XI|X)\s+([A-Z0-9]+)\s+(\d+)\b/);
  if (match) {
    const [, tingkat, kode, no] = match;
    const normalizedKode =
      kode === 'AKL' ? 'AK' :
      kode === 'AK' ? 'AKL' :
      kode === 'TKJ' ? 'TJKT' :
      kode === 'TJKT' ? 'TKJ' :
      kode === 'PH' ? 'PHT' :
      kode === 'PHT' ? 'PH' : kode;

    const candidate = kelasList.find((k) => {
      const kUpper = k.nama_kelas.toUpperCase();
      const kMatch = kUpper.match(/\b(XII|XI|X)\s+([A-Z0-9]+)\s+(\d+)\b/);
      if (kMatch) {
        const [, kLevel, kKode, kNo] = kMatch;
        if (kLevel === tingkat && kNo === no) {
          if (
            kKode === kode ||
            kKode === normalizedKode ||
            kode.startsWith(kKode) ||
            kKode.startsWith(kode)
          ) {
            return true;
          }
        }
      }
      return false;
    });

    if (candidate) return candidate.value;
  }

  return undefined;
}

export interface RaporStagingFetchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (urls: string[], classMappings?: Record<string, string>) => void;
  isPending: boolean;
}

type FetchMode = 'folder' | 'single';

const MODE_OPTIONS = [
  {
    id: 'folder',
    label: 'Folder Google Drive',
    icon: FolderSearch,
  },
  {
    id: 'single',
    label: 'File Google Sheet',
    icon: FileSpreadsheet,
  },
];

export const RaporStagingFetchModal: React.FC<RaporStagingFetchModalProps> = React.memo(
  function RaporStagingFetchModal({
    isOpen,
    onClose,
    onSubmit,
    isPending,
  }) {
    // Mode Switch: 'folder' (pindai folder lalu pilih file) vs 'single' (satu link file langsung simpan)
    const [mode, setMode] = useState<FetchMode>('folder');

    // State Input
    const [folderUrl, setFolderUrl] = useState('');
    const [singleUrl, setSingleUrl] = useState('');
    const [singleKelasId, setSingleKelasId] = useState('');

    // State Step untuk mode folder (1: Input URL -> 2: Ceklis File & Pemetaan Kelas)
    const [folderStep, setFolderStep] = useState<1 | 2>(1);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedFiles, setScannedFiles] = useState<ScannedFileItem[]>([]);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
    const [classMappings, setClassMappings] = useState<Record<string, string>>({});

    // Fetch daftar kelas dari sistem Absenta untuk pemetaan
    const { data: kelasOptions = [] } = useQuery<DropdownKelasItem[]>({
      queryKey: ['kelas-dropdown-options'],
      queryFn: async () => {
        const res = await getKelasForDropdown();
        return (res || []) as DropdownKelasItem[];
      },
      staleTime: 5 * 60 * 1000,
    });

    // Reset state saat modal ditutup
    const handleCloseModal = useCallback(() => {
      setFolderStep(1);
      setIsScanning(false);
      onClose();
    }, [onClose]);

    // Handle Tab Switch
    const handleModeChange = useCallback((newModeId: string) => {
      setMode(newModeId as FetchMode);
      setFolderStep(1);
    }, []);

    // ── SUBMIT MODE 1: SCAN FOLDER (Step 1 -> Step 2) ──
    const handleScanFolder = useCallback(
      async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validation = folderInputSchema.safeParse({ url: folderUrl });
        if (!validation.success) {
          const msg = validation.error.errors[0]?.message || 'Tautan folder tidak valid';
          toast.error(msg);
          return;
        }

        try {
          setIsScanning(true);
          const res = await raporApi.scanGoogleDriveFolder([folderUrl.trim()]);
          const files: ScannedFileItem[] = (res?.data?.files || []) as ScannedFileItem[];
          const errors = res?.data?.errors || [];

          if (errors.length > 0) {
            errors?.map((errItem: { url: string; error: string }) => {
              toast.error(errItem.error, { duration: 7000 });
              return null;
            });
          }

          if (files.length === 0) {
            toast.error('Tidak ditemukan berkas Google Sheet di dalam folder tersebut.');
            setIsScanning(false);
            return;
          }

          setScannedFiles(files);

          // Cek berkas yang terindikasi rapor vs non-rapor
          const raporOnlyFiles = files.filter((f) => isLikelyRaporClassFile(f.title));
          const nonRaporCount = files.length - raporOnlyFiles.length;

          // Cek berkas baru vs berkas yang sudah ada di wadah (idempoten)
          const newFilesList = files.filter((f) => !f.is_already_staged && isLikelyRaporClassFile(f.title));

          // Heuristik Pemetaan Kelas Awal otomatis (Auto-Match Kelas)
          const initialClassMappings: Record<string, string> = {};
          let autoMatchedCount = 0;
          files.forEach((f) => {
            const guessed = guessClassIdFromTitle(f.title, kelasOptions);
            if (guessed) {
              initialClassMappings[f.url] = guessed;
              autoMatchedCount++;
            }
          });
          setClassMappings(initialClassMappings);

          if (newFilesList.length > 0 && newFilesList.length < raporOnlyFiles.length) {
            // Campuran berkas baru dan lama: default centang hanya berkas baru (yang bertipe rapor)
            setSelectedUrls(new Set(newFilesList.map((f) => f.url)));
            toast.success(
              `Ditemukan ${files.length} berkas: ${newFilesList.length} baru dicentang${nonRaporCount > 0 ? `, ${nonRaporCount} berkas non-rapor dilewati` : ''}${autoMatchedCount > 0 ? `, ${autoMatchedCount} terpetakan ke kelas` : ''}.`
            );
          } else {
            // Default centang semua berkas rapor yang valid
            setSelectedUrls(new Set(raporOnlyFiles.map((f) => f.url)));
            if (nonRaporCount > 0) {
              toast.success(
                `Ditemukan ${files.length} berkas (${raporOnlyFiles.length} rapor dicentang, ${nonRaporCount} berkas non-rapor dilewati${autoMatchedCount > 0 ? `, ${autoMatchedCount} terpetakan ke kelas` : ''}).`
              );
            } else if (files.length > 0 && newFilesList.length === 0) {
              toast.success(`Ditemukan ${files.length} berkas (seluruhnya sudah ada di wadah, siap diperbarui secara idempoten).`);
            } else {
              toast.success(`Ditemukan ${files.length} berkas Google Sheet kelas baru (${autoMatchedCount} terpetakan ke kelas).`);
            }
          }

          setFolderStep(2);
        } catch (err: unknown) {
          const errorMsg =
            (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
            (err as Error)?.message ||
            'Gagal memindai folder Google Drive';
          toast.error(errorMsg);
        } finally {
          setIsScanning(false);
        }
      },
      [folderUrl, kelasOptions]
    );

    // Toggle satu checkbox file
    const handleToggleFile = useCallback((url: string) => {
      setSelectedUrls((prev) => {
        const next = new Set(prev);
        if (next.has(url)) {
          next.delete(url);
        } else {
          next.add(url);
        }
        return next;
      });
    }, []);

    // Handler Perubahan Pemetaan Kelas Per File
    const handleClassMappingChange = useCallback((url: string, kelasId: string) => {
      setClassMappings((prev) => {
        const next = { ...prev };
        if (!kelasId) {
          delete next[url];
        } else {
          next[url] = kelasId;
        }
        return next;
      });
    }, []);

    // Tombol Cepat: Auto-Match Seluruh Kelas Berdasarkan Judul Berkas
    const handleAutoMatchClasses = useCallback(() => {
      const updated = { ...classMappings };
      let count = 0;
      scannedFiles.forEach((f) => {
        const guessed = guessClassIdFromTitle(f.title, kelasOptions);
        if (guessed) {
          updated[f.url] = guessed;
          count++;
        }
      });
      setClassMappings(updated);
      toast.success(`Berhasil mencocokkan ${count} dari ${scannedFiles.length} berkas ke kelas target.`);
    }, [scannedFiles, kelasOptions, classMappings]);

    // Toggle Pilih Semua / Batal Pilih Semua
    const isAllSelected = useMemo(() => {
      return (scannedFiles?.length || 0) > 0 && selectedUrls.size === scannedFiles.length;
    }, [scannedFiles, selectedUrls]);

    const stats = useMemo(() => {
      const total = scannedFiles.length;
      const alreadyStaged = scannedFiles.filter((f) => f.is_already_staged).length;
      const newFiles = total - alreadyStaged;
      const nonRaporFiles = scannedFiles.filter((f) => !isLikelyRaporClassFile(f.title)).length;
      const selectedTotal = selectedUrls.size;
      const selectedAlreadyStaged = scannedFiles.filter((f) => f.is_already_staged && selectedUrls.has(f.url)).length;
      const selectedNew = selectedTotal - selectedAlreadyStaged;
      const mappedCount = Object.keys(classMappings).filter((u) => selectedUrls.has(u)).length;

      return {
        total,
        alreadyStaged,
        newFiles,
        nonRaporFiles,
        selectedTotal,
        selectedAlreadyStaged,
        selectedNew,
        mappedCount,
      };
    }, [scannedFiles, selectedUrls, classMappings]);

    const handleToggleAll = useCallback(() => {
      if (isAllSelected) {
        setSelectedUrls(new Set());
      } else {
        setSelectedUrls(new Set(scannedFiles?.map((f) => f.url)));
      }
    }, [isAllSelected, scannedFiles]);

    const handleSelectOnlyNew = useCallback(() => {
      const newUrls = scannedFiles.filter((f) => !f.is_already_staged && isLikelyRaporClassFile(f.title)).map((f) => f.url);
      setSelectedUrls(new Set(newUrls));
    }, [scannedFiles]);

    const handleSelectOnlyRapor = useCallback(() => {
      const raporUrls = scannedFiles.filter((f) => isLikelyRaporClassFile(f.title)).map((f) => f.url);
      setSelectedUrls(new Set(raporUrls));
    }, [scannedFiles]);

    // Simpan file hasil seleksi dari folder (membawa classMappings untuk override nama kelas)
    const handleConfirmFolderFiles = useCallback(() => {
      const urlsToProcess = Array.from(selectedUrls);
      if ((urlsToProcess?.length || 0) === 0) {
        toast.error('Pilih minimal satu file Google Sheet untuk disimpan ke wadah');
        return;
      }

      const activeMappings: Record<string, string> = {};
      urlsToProcess.forEach((u) => {
        if (classMappings[u]) {
          activeMappings[u] = classMappings[u];
        }
      });

      onSubmit(urlsToProcess, activeMappings);
    }, [selectedUrls, classMappings, onSubmit]);

    // ── SUBMIT MODE 2: SINGLE FILE (Langsung Simpan) ──
    const handleSingleFileSubmit = useCallback(
      (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validation = singleFileInputSchema.safeParse({ url: singleUrl });
        if (!validation.success) {
          const msg = validation.error.errors[0]?.message || 'Tautan file Google Sheet tidak valid';
          toast.error(msg);
          return;
        }

        const activeMappings = singleKelasId ? { [singleUrl.trim()]: singleKelasId } : undefined;
        onSubmit([singleUrl.trim()], activeMappings);
      },
      [singleUrl, singleKelasId, onSubmit]
    );

    if (!isOpen) return null;

    const modalTitle = (
      <div className="flex items-center gap-2">
        <LinkIcon size={18} className="text-indigo-600 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <span className="block truncate font-bold text-slate-900 dark:text-slate-100">
            Tarik Rapor Google Sheet
          </span>
          <span className="block text-[11px] font-normal text-slate-500">
            {mode === 'folder' && folderStep === 2
              ? `Langkah 2: Pilih Berkas (${selectedUrls.size} dari ${scannedFiles.length} terpilih)`
              : 'Pilih metode penarikan tautan Google Drive'}
          </span>
        </div>
      </div>
    );

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleCloseModal}
        size={mode === 'folder' && folderStep === 2 ? 'full' : 'xl'}
        className={
          mode === 'folder' && folderStep === 2
            ? 'w-[96vw] max-w-6xl h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden'
            : undefined
        }
        contentClassName={
          mode === 'folder' && folderStep === 2
            ? 'p-0 flex flex-col h-full overflow-hidden flex-1'
            : undefined
        }
        title={modalTitle}
      >
        <div
          className={cn(
            'w-full max-w-full min-w-0',
            mode === 'folder' && folderStep === 2
              ? 'flex flex-col h-full overflow-hidden p-4 sm:p-6 space-y-3'
              : 'space-y-4 p-4 sm:p-6 pt-2'
          )}
        >
          {/* ── Mode Switcher Tab (Hanya tampil di Step 1) ── */}
          {(mode === 'single' || folderStep === 1) && (
            <div className="flex items-center justify-center w-full">
              <TabSwitcher
                options={MODE_OPTIONS}
                activeTab={mode}
                onChange={handleModeChange}
                className="w-full sm:w-auto justify-center"
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* MODE 1: FOLDER GOOGLE DRIVE                       */}
          {/* ══════════════════════════════════════════════════ */}
          {mode === 'folder' && folderStep === 1 && (
            <form onSubmit={handleScanFolder} className="space-y-4 w-full">
              <div className="space-y-1.5 w-full">
                <Input
                  id="google-drive-folder-url"
                  label="Tautan Folder Google Drive"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={folderUrl}
                  onChange={(e) => setFolderUrl(e.target.value)}
                  required
                  className="text-xs font-mono rounded-xl w-full"
                  aria-label="Tautan Folder Google Drive"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sistem akan memindai folder dan menyajikan daftar seluruh berkas Google Sheet kelas.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  className="text-xs rounded-xl"
                  aria-label="Batal"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isScanning || !folderUrl.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
                  aria-label="Pindai Berkas di dalam folder"
                >
                  <FolderSearch size={14} className={cn(isScanning && 'animate-spin')} aria-hidden="true" />
                  <span>{isScanning ? 'Memindai Folder...' : 'Pindai Berkas & Pilih'}</span>
                  {!isScanning && <ArrowRight size={13} aria-hidden="true" />}
                </Button>
              </div>
            </form>
          )}

          {mode === 'folder' && folderStep === 2 && (
            <div className="flex flex-col h-full min-h-0 space-y-3 w-full overflow-hidden">
              {/* Idempotency Informational Alert */}
              {stats.alreadyStaged === stats.total && stats.total > 0 ? (
                <div className="shrink-0 flex items-start gap-2.5 p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl text-xs text-sky-800 dark:text-sky-300">
                  <ShieldCheck size={18} className="shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold">Idempotensi Terjamin:</span> Seluruh{' '}
                    <strong>{stats.total} berkas</strong> pada folder ini sudah terdaftar di wadah staging.
                    Menarik ulang akan <strong>memperbarui (update) data rapor</strong> secara aman tanpa
                    menduplikasi entri rombel kelas.
                  </div>
                </div>
              ) : stats.newFiles > 0 && stats.alreadyStaged > 0 ? (
                <div className="shrink-0 flex items-start gap-2.5 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-900 dark:text-indigo-300">
                  <ShieldCheck size={18} className="shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                  <div className="leading-relaxed">
                    Ditemukan <strong>{stats.newFiles} berkas baru</strong> dan{' '}
                    <strong>{stats.alreadyStaged} berkas sudah ada</strong> di wadah. Berkas yang sudah ada
                    akan diperbarui secara idempoten jika tetap dicentang.
                  </div>
                </div>
              ) : null}

              {/* Header Checklist & Action Controls (Bersih & Rapi) */}
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors cursor-pointer"
                    aria-label={isAllSelected ? 'Batal pilih semua berkas' : 'Pilih semua berkas'}
                  >
                    {isAllSelected ? (
                      <CheckSquare size={16} className="text-indigo-600" aria-hidden="true" />
                    ) : (
                      <Square size={16} className="text-slate-400" aria-hidden="true" />
                    )}
                    <span>{isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
                  </button>

                  {stats.nonRaporFiles > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectOnlyRapor}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer text-xs"
                      title="Hanya centang berkas rapor kelas, lewati berkas master/rekap"
                    >
                      <Sparkles size={12} className="text-indigo-600" />
                      <span>Hanya Rapor ({stats.total - stats.nonRaporFiles})</span>
                    </button>
                  )}

                  {stats.total > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoMatchClasses}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-purple-700 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer text-xs"
                      title="Cocokkan judul berkas rapor ke kelas resmi di sistem Absenta secara otomatis"
                    >
                      <Sparkles size={12} className="text-purple-600" />
                      <span>Auto-Petakan Kelas ({stats.mappedCount}/{stats.selectedTotal})</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400 font-normal">Terpilih:</span>
                  <Badge variant="secondary" className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40">
                    {stats.selectedTotal} dari {stats.total} Berkas
                  </Badge>
                </div>
              </div>

              {/* Tabel Berkas Rapor High-Density (Bersih, Ramping & Bebas Noise) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex-1 min-h-[360px] flex flex-col bg-white dark:bg-slate-900 shadow-2xs">
                <div className="overflow-x-auto overflow-y-auto flex-1">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100/90 dark:bg-slate-800/90 sticky top-0 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10 backdrop-blur-xs select-none">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <span className="sr-only">Pilih</span>
                        </th>
                        <th className="py-2.5 px-3 min-w-[280px]">
                          Berkas Rapor Google Sheet
                        </th>
                        <th className="py-2.5 px-3 w-72 sm:w-80">
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
                            <span>Petakan ke Kelas Sistem</span>
                          </div>
                        </th>
                        <th className="py-2.5 px-3 w-32 text-center">
                          Status Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {scannedFiles?.map((file, idx) => {
                        const isChecked = selectedUrls.has(file.url);
                        const isLikelyRapor = isLikelyRaporClassFile(file.title);
                        const isMapped = Boolean(classMappings[file.url]);

                        return (
                          <tr
                            key={file.id || idx}
                            onClick={() => handleToggleFile(file.url)}
                            className={cn(
                              'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors',
                              isChecked && 'bg-indigo-50/25 dark:bg-indigo-950/20',
                              !isChecked && 'opacity-50 bg-slate-50/30 dark:bg-slate-900/30'
                            )}
                          >
                            {/* Kolom 1: Checkbox */}
                            <td
                              className="py-2 px-3 text-center align-middle"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleFile(file.url)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer align-middle"
                                aria-label={`Pilih ${file.title}`}
                              />
                            </td>

                            {/* Kolom 2: Berkas Rapor Google Sheet (Bebas Noise ID) */}
                            <td className="py-2 px-3 align-middle">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileSpreadsheet
                                  size={16}
                                  className={cn(
                                    'shrink-0',
                                    !isLikelyRapor
                                      ? 'text-amber-500'
                                      : file.is_already_staged
                                      ? 'text-sky-600'
                                      : 'text-emerald-600'
                                  )}
                                  aria-hidden="true"
                                />
                                <div className="min-w-0 flex-1 flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {file.title}
                                  </span>
                                  {!isLikelyRapor && (
                                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 px-1.5 py-0.2 rounded-md shrink-0">
                                      Non-Rapor
                                    </span>
                                  )}
                                  {file.is_already_staged && file.staged_info && (
                                    <span className="text-[10px] text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.2 rounded-md shrink-0 font-medium border border-sky-200 dark:border-sky-800">
                                      Sudah di Wadah ({file.staged_info.nama_kelas})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Kolom 3: Kolom Petakan Khusus (Single-line Compact Dropdown) */}
                            <td
                              className="py-2 px-3 align-middle"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isChecked ? (
                                <select
                                  value={classMappings[file.url] || ''}
                                  onChange={(e) => handleClassMappingChange(file.url, e.target.value)}
                                  className={cn(
                                    'text-xs h-8 px-2.5 rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full transition-all truncate',
                                    isMapped
                                      ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 font-medium text-emerald-900 dark:text-emerald-200'
                                      : 'border-slate-200 dark:border-slate-700'
                                  )}
                                  aria-label={`Petakan berkas ${file.title} ke kelas`}
                                >
                                  <option value="">(Otomatis sesuai nama di file)</option>
                                  {kelasOptions.map((k) => (
                                    <option key={k.value} value={k.value}>
                                      {k.nama_kelas} {k.jurusan_nama ? `(${k.jurusan_nama})` : ''}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 pl-2">-</span>
                              )}
                            </td>

                            {/* Kolom 4: Status Aksi (Ramping & Jelas) */}
                            <td className="py-2 px-3 text-center align-middle whitespace-nowrap">
                              {!isChecked ? (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                                  Dilewati
                                </span>
                              ) : file.is_already_staged ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300"
                                >
                                  🔄 Update
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300"
                                >
                                  ✨ Baru
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tombol Aksi Step 2 (Sticky Footer yang Lega) */}
              <div className="shrink-0 flex items-center justify-between gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFolderStep(1)}
                  className="text-xs rounded-xl gap-1.5"
                  aria-label="Kembali ke langkah input tautan folder"
                >
                  <ArrowLeft size={13} aria-hidden="true" />
                  <span>Ubah Tautan</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCloseModal}
                    className="text-xs rounded-xl"
                    aria-label="Batal"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending || selectedUrls.size === 0}
                    onClick={handleConfirmFolderFiles}
                    className={cn(
                      'text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5',
                      stats.selectedNew > 0
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-sky-600 hover:bg-sky-700'
                    )}
                    aria-label="Simpan berkas terpilih ke wadah penampung"
                  >
                    <RefreshCw size={13} className={cn(isPending && 'animate-spin')} aria-hidden="true" />
                    <span>
                      {isPending
                        ? 'Menyimpan...'
                        : stats.selectedNew > 0 && stats.selectedAlreadyStaged === 0
                        ? `Tarik & Simpan (${stats.selectedTotal} Berkas Baru)`
                        : stats.selectedAlreadyStaged > 0 && stats.selectedNew === 0
                        ? `Perbarui Data di Wadah (${stats.selectedTotal} Berkas)`
                        : `Tarik & Perbarui (${stats.selectedTotal} Berkas)`}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* MODE 2: SINGLE FILE GOOGLE SHEET                  */}
          {/* ══════════════════════════════════════════════════ */}
          {mode === 'single' && (
            <form onSubmit={handleSingleFileSubmit} className="space-y-4 w-full">
              <div className="space-y-1.5 w-full">
                <Input
                  id="google-sheet-single-url"
                  label="Tautan Berkas Google Sheet"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  required
                  className="text-xs font-mono rounded-xl w-full"
                  aria-label="Tautan Berkas Google Sheet"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Masukkan tautan spreadsheet rapor untuk satu kelas yang ingin langsung disimpan.
                </p>
              </div>

              <div className="space-y-1.5 w-full">
                <label
                  htmlFor="single-file-kelas-mapping"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                >
                  Petakan ke Kelas Sistem (Opsional):
                </label>
                <select
                  id="single-file-kelas-mapping"
                  value={singleKelasId}
                  onChange={(e) => setSingleKelasId(e.target.value)}
                  className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 cursor-pointer w-full"
                  aria-label="Petakan ke Kelas Sistem"
                >
                  <option value="">(Otomatis sesuai isi file Google Sheet)</option>
                  {kelasOptions.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.nama_kelas} - Tingkat {k.tingkat} {k.jurusan_nama ? `(${k.jurusan_nama})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gunakan jika penulisan nama kelas di file Google Sheet berbeda dengan nama resmi di Absenta (misal: XII AKL 1 vs XII AK 1).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  className="text-xs rounded-xl"
                  aria-label="Batal"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !singleUrl.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
                  aria-label="Tarik dan simpan berkas Google Sheet ke wadah"
                >
                  <RefreshCw size={13} className={cn(isPending && 'animate-spin')} aria-hidden="true" />
                  <span>{isPending ? 'Menyimpan...' : 'Tarik & Simpan ke Wadah'}</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    );
  }
);

export default RaporStagingFetchModal;
