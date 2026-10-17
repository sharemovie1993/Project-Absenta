import React, { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import {
  Link as LinkIcon,
  RefreshCw,
  Info,
  CheckSquare,
  Square,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FolderSearch,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { raporApi } from '@/api/rapor.api';

// ── Zod Schema Validation Guard (Pilar 25 / Form Security) ──
const fetchUrlsSchema = z.object({
  urlsText: z
    .string({ required_error: 'Tautan Google Sheet atau Folder wajib diisi' })
    .min(10, 'Masukkan minimal satu tautan Google Sheet atau Folder yang valid'),
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

export const RaporStagingFetchModal: React.FC<RaporStagingFetchModalProps> = React.memo(
  function RaporStagingFetchModal({
    isOpen,
    onClose,
    onSubmit,
    isPending,
  }) {
    // Step 1: Input URL, Step 2: Ceklis File
    const [step, setStep] = useState<1 | 2>(1);
    const [urlInput, setUrlInput] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scannedFiles, setScannedFiles] = useState<ScannedFileItem[]>([]);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

    // Reset state saat modal ditutup atau dibuka
    const handleCloseModal = useCallback(() => {
      setStep(1);
      setIsScanning(false);
      onClose();
    }, [onClose]);

    // Step 1: Scan link untuk mengekstrak daftar file
    const handleScan = useCallback(
      async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validation = fetchUrlsSchema.safeParse({ urlsText: urlInput });
        if (!validation.success) {
          const msg = validation.error.errors[0]?.message || 'Input tautan tidak valid';
          toast.error(msg);
          return;
        }

        const urls = urlInput
          .split('\n')
          ?.map((u) => u.trim())
          .filter((u) => u.length > 0);

        if ((urls?.length || 0) === 0) {
          toast.error('Masukkan minimal satu tautan Google Sheet atau Folder');
          return;
        }

        try {
          setIsScanning(true);
          const res = await raporApi.scanGoogleDriveFolder(urls);
          const files: ScannedFileItem[] = (res?.data?.files || []) as ScannedFileItem[];
          const errors = res?.data?.errors || [];

          if (errors.length > 0) {
            errors?.map((errItem: { url: string; error: string }) => {
              toast.error(errItem.error, { duration: 7000 });
              return null;
            });
          }

          if (files.length === 0) {
            toast.error('Tidak ditemukan berkas Google Sheet yang valid dari tautan yang dimasukkan.');
            setIsScanning(false);
            return;
          }

          setScannedFiles(files);
          // Default: seluruh file terpilih
          setSelectedUrls(new Set(files?.map((f) => f.url)));
          setStep(2);
          toast.success(`Ditemukan ${files.length} Google Sheet kelas. Silakan pilih file yang ingin disimpan.`);
        } catch (err: unknown) {
          const errorMsg =
            (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
            (err as Error)?.message ||
            'Gagal memindai tautan Google Drive';
          toast.error(errorMsg);
        } finally {
          setIsScanning(false);
        }
      },
      [urlInput]
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

    // Step 2: Konfirmasi simpan file yang diceklis
    const handleConfirmSave = useCallback(() => {
      const urlsToProcess = Array.from(selectedUrls);
      if ((urlsToProcess?.length || 0) === 0) {
        toast.error('Pilih minimal satu file Google Sheet untuk disimpan ke wadah');
        return;
      }

      onSubmit(urlsToProcess);
    }, [selectedUrls, onSubmit]);

    if (!isOpen) return null;

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleCloseModal}
        size={step === 2 ? '2xl' : 'lg'}
        title={
          <div className="flex items-center gap-2">
            <LinkIcon size={18} className="text-indigo-600 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <span className="block truncate font-bold text-slate-900 dark:text-slate-100">
                Hubungkan Link Google Sheet Rapor
              </span>
              <span className="block text-[11px] font-normal text-slate-500">
                {step === 1 ? 'Langkah 1 dari 2: Masukkan Tautan' : `Langkah 2 dari 2: Pilih Berkas (${selectedUrls.size} dipilih)`}
              </span>
            </div>
          </div>
        }
        description={
          step === 1
            ? 'Masukkan tautan folder Google Drive atau tautan berkas spreadsheet kelas.'
            : 'Centang berkas kelas mana saja yang ingin diekstrak dan disimpan ke Wadah Penampung Absenta.'
        }
      >
        {step === 1 ? (
          /* ── STEP 1: FORM INPUT LINK ── */
          <form onSubmit={handleScan} className="space-y-4 p-4 sm:p-6 pt-2 w-full max-w-full min-w-0">
            <div className="space-y-1.5 w-full">
              <label htmlFor="google-sheet-urls" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tautan Berkas Google Sheet atau Folder Google Drive (Satu baris per tautan)
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mendukung tautan berkas per kelas (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">https://docs.google.com/spreadsheets/d/.../edit</code>) maupun tautan Folder Google Drive induk (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">https://drive.google.com/drive/folders/...</code>).
              </p>
              <Textarea
                id="google-sheet-urls"
                rows={5}
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Tempelkan tautan di sini (satu tautan per baris)...&#10;Contoh tautan folder: https://drive.google.com/drive/folders/15-2Kyn9WDbOS6iIuE-pLwHM980SnU6sq?usp=sharing&#10;Contoh tautan berkas: https://docs.google.com/spreadsheets/d/1CkcIl9oCPfrJ5R-A-CW0lyUy0IvHqSmhRQq088SDIZU/edit"
                className="text-xs font-mono rounded-xl resize-none w-full"
                aria-label="Tautan Berkas Google Sheet atau Folder Google Drive"
              />
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 p-3 rounded-2xl flex items-start gap-2.5">
              <Info size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-indigo-950 dark:text-indigo-200">
                  Penyaring Cerdas & Konfirmasi Berkas:
                </p>
                <p>
                  Sistem akan memindai folder Google Drive dan mendeteksi berkas <strong>Google Sheets</strong> (file PDF dan format lain otomatis diabaikan). Pada langkah berikutnya, Anda dapat memilih berkas kelas mana saja yang ingin disimpan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseModal}
                className="text-xs rounded-xl"
                aria-label="Batal input tautan Google Sheet"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isScanning}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
                aria-label="Pindai tautan dan tampilkan daftar berkas"
              >
                <FolderSearch size={14} className={cn(isScanning && 'animate-spin')} aria-hidden="true" />
                <span>{isScanning ? 'Memindai Berkas di Google Drive...' : 'Pindai Berkas & Pilih'}</span>
                {!isScanning && <ArrowRight size={13} aria-hidden="true" />}
              </Button>
            </div>
          </form>
        ) : (
          /* ── STEP 2: CEKLIS DAFTAR BERKAS GOOGLE SHEET ── */
          <div className="space-y-4 p-4 sm:p-6 pt-2 w-full max-w-full min-w-0">
            {/* Action Bar Pemilihan Cepat */}
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
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-y-auto max-h-[360px] divide-y divide-slate-100 dark:divide-slate-800">
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
                onClick={() => setStep(1)}
                className="text-xs rounded-xl gap-1.5"
                aria-label="Kembali ke langkah input tautan"
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
                  onClick={handleConfirmSave}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
                  aria-label="Simpan berkas terpilih ke penampung"
                >
                  <RefreshCw size={13} className={cn(isPending && 'animate-spin')} aria-hidden="true" />
                  <span>
                    {isPending
                      ? 'Sedang Menyimpan Data...'
                      : `Tarik & Simpan (${selectedUrls.size} Berkas)`}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    );
  }
);
