import React, { useState, useCallback } from 'react';
import { z } from 'zod';
import { Link as LinkIcon, RefreshCw, Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

// ── Zod Schema Validation Guard (Pilar 25 / Form Security) ──
const fetchUrlsSchema = z.object({
  urlsText: z
    .string({ required_error: 'Tautan Google Sheet wajib diisi' })
    .min(10, 'Masukkan minimal satu tautan Google Sheet yang valid'),
});

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
    const [urlInput, setUrlInput] = useState('');

    const handleSubmit = useCallback(
      (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Zod Validation Guard
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
          toast.error('Masukkan minimal satu tautan Google Sheet');
          return;
        }

        onSubmit(urls);
      },
      [urlInput, onSubmit]
    );

    if (!isOpen) return null;

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={
          <div className="flex items-center gap-2">
            <LinkIcon size={18} className="text-indigo-600" aria-hidden="true" />
            <span>Hubungkan Link Google Sheet Rapor</span>
          </div>
        }
        description="Salin dan tempel tautan Google Sheet rapor kelas. Anda dapat memasukkan banyak tautan sekaligus (satu tautan per baris)."
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6 pt-2 w-full max-w-full min-w-0">
          <div className="space-y-1.5 w-full">
            <label htmlFor="google-sheet-urls" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tautan Berkas Google Sheet Kelas (Satu baris per tautan)
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Gunakan tautan berkas per kelas (format: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">https://docs.google.com/spreadsheets/d/.../edit</code>). Jika memiliki folder Drive, buka file rapor di dalamnya lalu salin tautannya.
            </p>
            <Textarea
              id="google-sheet-urls"
              rows={5}
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1R6-4FyKNiIWwV1sOQ_7ZJYOYj59ccLKIAQdlM0AVfiA/edit&#10;https://docs.google.com/spreadsheets/d/1CkcIl9oCPfrJ5R-A-CW0lyUy0IvHqSmhRQq088SDIZU/edit"
              className="text-xs font-mono rounded-xl resize-none w-full"
              aria-label="Tautan Berkas Google Sheet Kelas"
            />
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 p-3 rounded-2xl flex items-start gap-2.5">
            <Info size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-indigo-950 dark:text-indigo-200">
                Adaptif Multi-Tahun & Akurasi Otomatis:
              </p>
              <p>
                Sistem menggunakan <em>Dynamic Variable Scanner</em> berbasis label sel pada sheet <code>SETTING</code>, <code>INPUT SUMATIF</code>, dan <code>INPUT CP</code>. Pergeseran baris atau penambahan fitur di lembar rapor Google Sheet tidak akan merusak parsing.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs rounded-xl"
              aria-label="Batal input tautan Google Sheet"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
              aria-label="Tarik dan simpan ke penampung"
            >
              <RefreshCw size={13} className={cn(isPending && 'animate-spin')} aria-hidden="true" />
              <span>{isPending ? 'Sedang Membaca & Mengekstrak...' : 'Tarik & Simpan ke Wadah'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    );
  }
);
