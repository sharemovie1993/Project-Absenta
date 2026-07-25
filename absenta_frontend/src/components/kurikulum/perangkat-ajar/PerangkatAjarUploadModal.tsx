import React from 'react';
import { Upload } from 'lucide-react';
import { Modal, Button, SearchableSelect } from '../../ui';
import { z } from 'zod';

export const uploadSchema = z.object({
  judul: z.string().min(1, 'Judul dokumen wajib diisi'),
  jenis: z.string().min(1, 'Jenis perangkat wajib dipilih'),
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  guru_id: z.string().min(1, 'Guru pengajar wajib dipilih'),
  file: z.instanceof(File, { message: 'File dokumen wajib dipilih' })
});

export type UploadFormData = z.infer<typeof uploadSchema>;

interface Option {
  label: string;
  value: string;
}

interface PerangkatAjarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadForm: {
    judul: string;
    jenis: string;
    mapel_id: string;
    guru_id: string;
    file: File | null;
  };
  setUploadForm: React.Dispatch<React.SetStateAction<{
    judul: string;
    jenis: string;
    mapel_id: string;
    guru_id: string;
    file: File | null;
  }>>;
  filterJenisOptions: Option[];
  mapelOptions: Option[];
  teacherOptions: Option[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function PerangkatAjarUploadModal({
  isOpen,
  onClose,
  uploadForm,
  setUploadForm,
  filterJenisOptions,
  mapelOptions,
  teacherOptions,
  isSubmitting,
  onSubmit,
}: PerangkatAjarUploadModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unggah Perangkat Ajar Baru"
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="upload-judul" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Judul Perangkat / Berkas <span className="text-rose-500">*</span>
          </label>
          <input
            id="upload-judul"
            type="text"
            required
            value={uploadForm.judul}
            onChange={(e) => setUploadForm((prev) => ({ ...prev, judul: e.target.value }))}
            placeholder="Contoh: Modul Ajar Matematika Kls X Bab 1"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="upload-jenis" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Jenis Berkas <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="upload-jenis"
              value={uploadForm.jenis}
              onValueChange={(val) => setUploadForm((prev) => ({ ...prev, jenis: val }))}
              options={filterJenisOptions.filter((o) => o.value !== '')}
              placeholder="Pilih Jenis Berkas"
            />
          </div>

          <div>
            <label htmlFor="upload-mapel" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="upload-mapel"
              value={uploadForm.mapel_id}
              onValueChange={(val) => setUploadForm((prev) => ({ ...prev, mapel_id: val }))}
              options={mapelOptions}
              placeholder="Pilih Mapel"
            />
          </div>
        </div>

        <div>
          <label htmlFor="upload-guru" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Guru Pengajar <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            id="upload-guru"
            value={uploadForm.guru_id}
            onValueChange={(val) => setUploadForm((prev) => ({ ...prev, guru_id: val }))}
            options={teacherOptions}
            placeholder="Pilih Guru Pengajar"
          />
        </div>

        <div>
          <label htmlFor="upload-file" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Berkas Fisik (PDF, DOC, DOCX, XLSX) <span className="text-rose-500">*</span>
          </label>
          <input
            id="upload-file"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            required
            onChange={(e) => setUploadForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 dark:file:bg-indigo-950 dark:file:text-indigo-400 hover:file:bg-indigo-100"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl font-bold">
            BATAL
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            disabled={isSubmitting}
            className="rounded-xl font-bold"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {isSubmitting ? 'MENGUNGGAH...' : 'UNGGAH BERKAS'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
