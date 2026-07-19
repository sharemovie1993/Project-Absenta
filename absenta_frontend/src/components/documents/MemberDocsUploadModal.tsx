import React, { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { Upload, X, FileText, Image, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button, Input, Label, Loader } from '../ui';
import { Modal } from '../ui/Modal';
import { TabSwitcher } from '../ui/TabSwitcher';
import { cn } from '../../lib/utils';
import {
  KATEGORI_OPTIONS,
  formatBytes,
  uploadSiswaDocument,
  uploadGuruDocument,
} from '../../api/memberDocs.api';
import type { MemberDocEntityType } from '../../api/memberDocs.api';

const SearchableSelect = lazy(() =>
  import('../ui/SearchableSelect').then(m => ({ default: m.SearchableSelect }))
);

// ─── Validation ───────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const uploadSchema = z.object({
  judul:    z.string().min(1, 'Judul berkas wajib diisi'),
  kategori: z.string().min(1, 'Kategori wajib dipilih'),
  entityId: z.string().min(1, 'Pemilik berkas wajib dipilih'),
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface EntityOption {
  label: string;
  value: string;
  nis?: string | null;
  nisn?: string | null;
}

interface MemberDocsUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  siswaOptions: EntityOption[];
  guruOptions:  EntityOption[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MemberDocsUploadModal: React.FC<MemberDocsUploadModalProps> = ({
  isOpen, onClose, onSuccess, siswaOptions, guruOptions,
}) => {
  const [entityType,   setEntityType]   = useState<MemberDocEntityType>('SISWA');
  const [entityId,     setEntityId]     = useState('');
  const [judul,        setJudul]        = useState('');
  const [kategori,     setKategori]     = useState('');
  const [file,         setFile]         = useState<File | null>(null);
  const [isDragging,   setIsDragging]   = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [uploading,    setUploading]    = useState(false);
  const [fileError,    setFileError]    = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const TAB_OPTIONS = [
    { id: 'SISWA', label: 'Siswa' },
    { id: 'GURU',  label: 'Guru' },
  ];

  const reset = useCallback(() => {
    setEntityType('SISWA');
    setEntityId('');
    setJudul('');
    setKategori('');
    setFile(null);
    setProgress(0);
    setFileError('');
  }, []);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  // Auto-fill judul berkas dari nama pemilik & kategori (kombinasi NIS/NISN)
  React.useEffect(() => {
    if (kategori && entityId) {
      const options = entityType === 'SISWA' ? siswaOptions : guruOptions;
      const owner = options.find(o => o.value === entityId);
      if (owner) {
        if (entityType === 'SISWA') {
          const nisOrNisn = owner.nis ? owner.nis : (owner.nisn ? owner.nisn : '');
          const labelPrefix = nisOrNisn ? `${nisOrNisn} - ` : '';
          setJudul(`${kategori} - ${labelPrefix}${owner.label}`);
        } else {
          setJudul(`${kategori} - ${owner.label}`);
        }
      }
    }
  }, [kategori, entityId, entityType, siswaOptions, guruOptions]);

  const validateFile = (f: File): string => {
    if (!ALLOWED_TYPES.includes(f.type)) return 'Format tidak didukung. Gunakan PDF, JPG, PNG, atau WEBP.';
    if (f.size > MAX_BYTES) return `Ukuran file terlalu besar (maks. ${formatBytes(MAX_BYTES)}).`;
    return '';
  };

  const applyFile = (f: File) => {
    const err = validateFile(f);
    setFileError(err);
    if (err) return;
    setFile(f);
    if (!judul) setJudul(f.name.replace(/\.[^.]+$/, ''));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) applyFile(dropped);
  }, [judul]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) applyFile(picked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error('Pilih file terlebih dahulu'); return; }

    const validation = uploadSchema.safeParse({ judul, kategori, entityId });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Data tidak valid');
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      if (entityType === 'SISWA') {
        await uploadSiswaDocument({ siswaId: entityId, file, judul, kategori, onProgress: setProgress });
      } else {
        await uploadGuruDocument({ guruId: entityId, file, judul, kategori, onProgress: setProgress });
      }
      toast.success('Berkas berhasil diupload');
      reset();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengupload berkas';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const isImage = file && file.type.startsWith('image/');
  const isPdf   = file && file.type === 'application/pdf';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Berkas Warga Sekolah">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Entity type switcher */}
        <div>
          <Label>Jenis Pemilik Berkas</Label>
          <div className="mt-1">
            <TabSwitcher
              options={TAB_OPTIONS}
              activeTab={entityType}
              onChange={(id) => { setEntityType(id as MemberDocEntityType); setEntityId(''); }}
            />
          </div>
        </div>

        {/* Entity picker */}
        <div>
          <Label htmlFor="entity-select">
            {entityType === 'SISWA' ? 'Nama Siswa' : 'Nama Guru'}
          </Label>
          <Suspense fallback={<Loader />}>
            <SearchableSelect
              id="entity-select"
              value={entityId}
              onValueChange={setEntityId}
              options={entityType === 'SISWA' ? siswaOptions : guruOptions}
              placeholder={`Cari ${entityType === 'SISWA' ? 'siswa' : 'guru'}...`}
              searchPlaceholder="Ketik nama..."
            />
          </Suspense>
        </div>

        {/* Kategori */}
        <div>
          <Label htmlFor="kategori-select">Kategori Berkas</Label>
          <Suspense fallback={<Loader />}>
            <SearchableSelect
              id="kategori-select"
              value={kategori}
              onValueChange={setKategori}
              options={KATEGORI_OPTIONS}
              placeholder="Pilih jenis berkas..."
            />
          </Suspense>
        </div>

        {/* Judul */}
        <div>
          <Label htmlFor="judul-input">Judul Berkas</Label>
          <Input
            id="judul-input"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="cth. KK - Ahmad Fauzi 2024"
            aria-label="Judul berkas"
          />
        </div>

        {/* Drag-drop zone */}
        <div>
          <Label>File (PDF / JPG / PNG / WEBP · maks. 10 MB)</Label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'mt-1 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 select-none',
              isDragging
                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                : file
                  ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50/10',
            )}
          >
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={onFileChange} />

            {file ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                    {isImage ? <Image size={18} className="text-emerald-600" /> : <FileText size={18} className="text-emerald-600" />}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{file.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{formatBytes(file.size)} · {isPdf ? 'PDF' : 'Gambar'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setProgress(0); }}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Seret & lepas file di sini, atau <span className="text-indigo-500">klik untuk browse</span>
                </p>
                <p className="text-[10px] text-gray-400">PDF, JPG, PNG, WEBP · Maks. 10 MB</p>
              </div>
            )}
          </div>

          {fileError && (
            <div className="mt-2 flex items-center gap-1.5 text-rose-500">
              <AlertCircle size={12} />
              <span className="text-[11px] font-bold">{fileError}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {uploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-gray-400">
              <span>Mengupload...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>
            Batal
          </Button>
          <Button type="submit" disabled={!file || !!fileError || uploading}>
            {uploading ? <><Loader className="w-3 h-3 mr-1.5" /> Mengupload...</> : 'Upload Berkas'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MemberDocsUploadModal;
