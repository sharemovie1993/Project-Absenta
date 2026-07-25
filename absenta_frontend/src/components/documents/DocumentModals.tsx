import React from 'react';
import { Download, Loader } from 'lucide-react';
import { 
  Button, 
  Modal, 
  ModalFooter, 
  Textarea, 
  Input,
  Loader as ComponentLoader 
} from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { formatDateTime } from '@/utils/layoutUtils';
import { 
  type DocumentItem, 
  type DocumentVersionItem, 
} from '@/api/documents.api';
import type { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';

const BASE_CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'Semua Dokumen' },
  { value: 'ADMINISTRATIVE', label: 'Administrasi' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'OTHER', label: 'Lainnya' },
];

function formatBytes(bytes: number): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '-';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

export interface UploadFormValues {
  title: string;
  category: 'ADMINISTRATIVE' | 'LEGAL' | 'MANUAL' | 'OTHER';
  description?: string;
  file: File | undefined;
}

export interface MouFormValues {
  title?: string;
  description?: string;
  tanggal?: string;
  nomor?: string;
  pihak_kedua_nama?: string;
  pihak_kedua_alamat?: string;
}

export interface EditMetadataFormValues {
  title: string;
  category: 'ADMINISTRATIVE' | 'LEGAL' | 'MANUAL' | 'OTHER';
  description?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  register: UseFormRegister<UploadFormValues>;
  errors: FieldErrors<UploadFormValues>;
  isValid: boolean;
  isSubmitting: boolean;
  formCategory: string;
  setValue: UseFormSetValue<UploadFormValues>;
  formFile: File | undefined;
  uploadProgress: number | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen, onClose, onSubmit, register, errors, isValid, isSubmitting, formCategory, setValue, formFile, uploadProgress
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Upload Dokumen" description="Unggah dokumen baru ke Document Center" size="md">
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="upload-title" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Judul</label>
        <Input id="upload-title" className="w-full rounded-xl" placeholder="Contoh: Panduan Penggunaan" {...register('title')} error={errors.title?.message} />
      </div>
      <div className="space-y-1">
        <label htmlFor="upload-category" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Kategori</label>
        <SearchableSelect
          id="upload-category"
          aria-label="Kategori"
          value={formCategory}
          onValueChange={(v) => setValue('category', v as 'ADMINISTRATIVE' | 'LEGAL' | 'MANUAL' | 'OTHER', { shouldValidate: true })}
          options={(BASE_CATEGORY_OPTIONS ?? [])?.filter((o) => o.value !== 'ALL')}
          placeholder="Pilih kategori"
          triggerClassName="h-10 rounded-xl"
        />
        {errors?.category && <div className="text-[10px] text-red-600 font-bold mt-1 ml-1">{errors.category?.message}</div>}
      </div>
      <div className="space-y-1">
        <label htmlFor="upload-description" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Deskripsi</label>
        <Textarea id="upload-description" rows={3} placeholder="Opsional" className="w-full rounded-xl" {...register('description')} />
      </div>
      <div className="space-y-1">
        <label htmlFor="upload-file" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">File</label>
        <div className="relative group">
            <input id="upload-file" type="file" className="w-full text-xs" onChange={(e) => setValue('file', e.target.files?.[0] || undefined, { shouldValidate: true })} />
            {formFile && <div className="text-[10px] text-slate-500 font-mono mt-1">{formFile.name} ({formatBytes(formFile.size)})</div>}
            {errors?.file && <div className="text-[10px] text-red-600 font-bold mt-1 ml-1">{errors.file?.message}</div>}
        </div>
        {typeof uploadProgress === 'number' && (
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-black text-blue-600 uppercase tracking-widest">
              <span>Uploading</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
      </div>
      <ModalFooter>
        <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl h-10 px-6 font-bold uppercase tracking-widest text-[10px]">Batal</Button>
        <Button type="submit" disabled={!isValid || isSubmitting} className="rounded-xl h-10 px-8 font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white">
          {isSubmitting ? 'Mengunggah...' : 'Upload'}
        </Button>
      </ModalFooter>
    </form>
  </Modal>
);

interface MouModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  register: UseFormRegister<MouFormValues>;
  errors: FieldErrors<MouFormValues>;
  isValid: boolean;
  isSubmitting: boolean;
}

export const MouModal: React.FC<MouModalProps> = ({
  isOpen, onClose, onSubmit, register, errors, isValid, isSubmitting
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Generate MoU" description="Generate MoU dalam bentuk PDF dan simpan ke Document Center" size="md">
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="mou-title" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Judul</label>
        <Input id="mou-title" className="w-full rounded-xl" placeholder="Opsional" {...register('title')} error={errors.title?.message} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="mou-nomor" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nomor</label>
          <Input id="mou-nomor" className="w-full rounded-xl" placeholder="Opsional" {...register('nomor')} error={errors.nomor?.message} />
        </div>
        <div className="space-y-1">
          <label htmlFor="mou-tanggal" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Tanggal</label>
          <Input id="mou-tanggal" type="date" className="w-full rounded-xl" {...register('tanggal')} error={errors.tanggal?.message} />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="mou-pihak-kedua-nama" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Pihak Kedua (Nama)</label>
        <Input id="mou-pihak-kedua-nama" className="w-full rounded-xl" placeholder="Opsional" {...register('pihak_kedua_nama')} error={errors.pihak_kedua_nama?.message} />
      </div>
      <div className="space-y-1">
        <label htmlFor="mou-pihak-kedua-alamat" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Pihak Kedua (Alamat)</label>
        <Textarea id="mou-pihak-kedua-alamat" rows={2} placeholder="Opsional" className="w-full rounded-xl" {...register('pihak_kedua_alamat')} />
      </div>
      <div className="space-y-1">
        <label htmlFor="mou-description" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Deskripsi</label>
        <Textarea id="mou-description" rows={3} placeholder="Opsional" className="w-full rounded-xl" {...register('description')} />
      </div>
      <ModalFooter>
        <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl h-10 px-6 font-bold uppercase tracking-widest text-[10px]">Batal</Button>
        <Button type="submit" disabled={!isValid || isSubmitting} className="rounded-xl h-10 px-8 font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white">
          {isSubmitting ? 'Memproses...' : 'Generate'}
        </Button>
      </ModalFooter>
    </form>
  </Modal>
);

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: DocumentItem | null;
  loading: boolean;
  items: DocumentVersionItem[];
  onDownload: (doc: DocumentItem, version: number) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen, onClose, target, loading, items, onDownload
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Riwayat Versi" description={target ? `Riwayat versi untuk "${target.title}"` : 'Riwayat versi dokumen'} size="md">
    {loading ? (
      <div className="flex justify-center items-center py-10"><ComponentLoader size="lg" /></div>
    ) : (items || [])?.length === 0 ? (
      <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">Belum ada versi yang tersimpan.</div>
    ) : (
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        {(items || [])?.map((v) => (
          <div key={v.id} className="flex items-start justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:border-blue-200 transition-all">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Versi {v.version}</span>
                <span className="text-[10px] font-mono text-slate-400">({formatBytes(v.size_bytes)})</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate font-mono mb-1">{v.file_original_name}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDateTime(v.created_at)}</div>
            </div>
            {target && (
              <Button size="sm" variant="outline" onClick={() => onDownload(target, v.version)} className="h-9 w-9 p-0 rounded-xl bg-white dark:bg-slate-850">
                <Download className="w-4 h-4 text-blue-600" />
              </Button>
            )}
          </div>
        ))}
      </div>
    )}
  </Modal>
);

interface EditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  register: UseFormRegister<EditMetadataFormValues>;
  errors: FieldErrors<EditMetadataFormValues>;
  isValid: boolean;
  isSubmitting: boolean;
  formCategory: string;
  setValue: UseFormSetValue<EditMetadataFormValues>;
  target: DocumentItem | null;
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  isOpen, onClose, onSubmit, register, errors, isValid, isSubmitting, formCategory, setValue, target
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Edit Metadata" description={target ? `Perbarui metadata untuk "${target.title}"` : 'Perbarui metadata dokumen'} size="md">
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="edit-title" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Judul</label>
        <Input id="edit-title" className="w-full rounded-xl" placeholder="Judul dokumen" {...register('title')} error={errors.title?.message} />
      </div>
      <div className="space-y-1">
        <label htmlFor="edit-category" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Kategori</label>
        <SearchableSelect
          id="edit-category"
          aria-label="Kategori"
          value={formCategory}
          onValueChange={(v) => setValue('category', v as 'ADMINISTRATIVE' | 'LEGAL' | 'MANUAL' | 'OTHER', { shouldValidate: true })}
          options={(BASE_CATEGORY_OPTIONS ?? [])?.filter((o) => o.value !== 'ALL')}
          placeholder="Pilih kategori"
          triggerClassName="h-10 rounded-xl"
        />
        {errors?.category && <div className="text-[10px] text-red-600 font-bold mt-1 ml-1">{errors.category?.message}</div>}
      </div>
      <div className="space-y-1">
        <label htmlFor="edit-description" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Deskripsi</label>
        <Textarea id="edit-description" rows={3} placeholder="Opsional" className="w-full rounded-xl" {...register('description')} />
      </div>
      <ModalFooter>
        <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl h-10 px-6 font-bold uppercase tracking-widest text-[10px]">Batal</Button>
        <Button type="submit" disabled={!isValid || isSubmitting} className="rounded-xl h-10 px-8 font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white">
          {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </ModalFooter>
    </form>
  </Modal>
);
