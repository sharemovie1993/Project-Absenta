import React, { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import {
  Link as LinkIcon,
  RefreshCw,
  CheckSquare,
  Square,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  FolderSearch,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { raporApi } from '@/api/rapor.api';

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
}

export interface RaporStagingFetchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (urls: string[]) => void;
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

    // State Step untuk mode folder (1: Input URL -> 2: Ceklis File)
    const [folderStep, setFolderStep] = useState<1 | 2>(1);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedFiles, setScannedFiles] = useState<ScannedFileItem[]>([]);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

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
          setSelectedUrls(new Set(files?.map((f) => f.url)));
          setFolderStep(2);
          toast.success(`Ditemukan ${files.length} berkas Google Sheet kelas.`);
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
      [folderUrl]
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

    // Toggle Pilih Semua / Batal Pilih Semua
    const isAllSelected = useMemo(() => {
      return (scannedFiles?.length || 0) > 0 && selectedUrls.size === scannedFiles.length;
    }, [scannedFiles, selectedUrls]);

    const handleToggleAll = useCallback(() => {
      if (isAllSelected) {
        setSelectedUrls(new Set());
      } else {
        setSelectedUrls(new Set(scannedFiles?.map((f) => f.url)));
      }
    }, [isAllSelected, scannedFiles]);

    // Simpan file hasil seleksi dari folder
    const handleConfirmFolderFiles = useCallback(() => {
      const urlsToProcess = Array.from(selectedUrls);
      if ((urlsToProcess?.length || 0) === 0) {
        toast.error('Pilih minimal satu file Google Sheet untuk disimpan ke wadah');
        return;
      }

      onSubmit(urlsToProcess);
    }, [selectedUrls, onSubmit]);

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

        onSubmit([singleUrl.trim()]);
      },
      [singleUrl, onSubmit]
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
        size={mode === 'folder' && folderStep === 2 ? '2xl' : 'lg'}
        title={modalTitle}
      >
        <div className="space-y-4 p-4 sm:p-6 pt-2 w-full max-w-full min-w-0">
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
            <div className="space-y-4 w-full">
              {/* Header Checklist & Action */}
              <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors cursor-pointer"
                  aria-label={isAllSelected ? 'Batal pilih semua berkas' : 'Pilih semua berkas'}
                >
                  {isAllSelected ? (
                    <CheckSquare size={16} className="text-indigo-600" aria-hidden="true" />
                  ) : (
                    <Square size={16} className="text-slate-400" aria-hidden="true" />
                  )}
                  <span>{isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua Berkas'}</span>
                </button>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span>Terpilih:</span>
                  <Badge variant="secondary" className="font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedUrls.size} dari {scannedFiles?.length || 0} Berkas
                  </Badge>
                </div>
              </div>

              {/* List Berkas dengan Checkbox */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-y-auto max-h-[320px] divide-y divide-slate-100 dark:divide-slate-800">
                {scannedFiles?.map((file, idx) => {
                  const isChecked = selectedUrls.has(file.url);
                  return (
                    <label
                      key={file.id || idx}
                      htmlFor={`file-check-${file.id}`}
                      className={cn(
                        'flex items-center justify-between gap-3 p-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors text-xs select-none',
                        isChecked && 'bg-indigo-50/40 dark:bg-indigo-950/20'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          id={`file-check-${file.id}`}
                          checked={isChecked}
                          onChange={() => handleToggleFile(file.url)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer shrink-0"
                          aria-label={`Pilih ${file.title}`}
                        />
                        <FileSpreadsheet size={16} className="text-indigo-600 shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {file.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block truncate">
                            ID: {file.id}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] shrink-0 font-medium',
                          isChecked
                            ? 'border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'text-slate-400'
                        )}
                      >
                        {isChecked ? 'Akan Disimpan' : 'Dilewati'}
                      </Badge>
                    </label>
                  );
                })}
              </div>

              {/* Tombol Aksi Step 2 */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
                    aria-label="Simpan berkas terpilih ke wadah penampung"
                  >
                    <RefreshCw size={13} className={cn(isPending && 'animate-spin')} aria-hidden="true" />
                    <span>
                      {isPending
                        ? 'Menyimpan...'
                        : `Tarik & Simpan (${selectedUrls.size} Berkas)`}
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
