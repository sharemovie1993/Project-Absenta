import React from 'react';
import { Upload, CheckCircle2, Loader2, FileText } from 'lucide-react';
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
  uploadProgress?: number;
  isGuruContext?: boolean;
  currentTeacherName?: string;
  onSubmit: (e: React.FormEvent) => void;
}

export default React.memo(function PerangkatAjarUploadModal({
  isOpen,
  onClose,
  uploadForm,
  setUploadForm,
  filterJenisOptions,
  mapelOptions,
  teacherOptions,
  isSubmitting,
  uploadProgress = 0,
  isGuruContext = false,
  currentTeacherName,
  onSubmit,
}: PerangkatAjarUploadModalProps) {
  const isCurrentlyUploading = isSubmitting || uploadProgress > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
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
            disabled={isSubmitting}
            value={uploadForm.judul}
            onChange={(e) => setUploadForm((prev) => ({ ...prev, judul: e.target.value }))}
            placeholder="Contoh: Modul Ajar Matematika Kls X Bab 1"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-800"
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              onValueChange={(val) => setUploadForm((prev) => ({ ...prev, mapel_id: val }))}
              options={mapelOptions}
              placeholder="Pilih Mapel"
            />
          </div>
        </div>

        {isGuruContext ? (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Guru Pengajar <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center justify-between px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {currentTeacherName || 'Akun Guru Terverifikasi'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" /> Akun Terverifikasi
              </span>
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="upload-guru" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Guru Pengajar <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="upload-guru"
              value={uploadForm.guru_id}
              disabled={isSubmitting}
              onValueChange={(val) => setUploadForm((prev) => ({ ...prev, guru_id: val }))}
              options={teacherOptions}
              placeholder="Pilih Guru Pengajar"
            />
          </div>
        )}

        <div>
          <label htmlFor="upload-file" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Berkas Fisik (PDF, DOC, DOCX, XLSX) <span className="text-rose-500">*</span>
          </label>
          <input
            id="upload-file"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            required
            disabled={isSubmitting}
            onChange={(e) => setUploadForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 dark:file:bg-indigo-950 dark:file:text-indigo-400 hover:file:bg-indigo-100 disabled:opacity-60"
          />
        </div>

        {/* Real-time Upload Progress Bar */}
        {isCurrentlyUploading && (
          <div className="p-3.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-indigo-900 dark:text-indigo-200">
                <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span>
                  {uploadProgress >= 100
                    ? 'Menyimpan & memproses dokumen di server...'
                    : `Mengunggah berkas (${uploadProgress}%)...`}
                </span>
              </div>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {uploadProgress}%
              </span>
            </div>

            {/* Visual Progress Bar Track */}
            <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(5, uploadProgress))}%` }}
              />
            </div>

            {uploadForm.file && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span className="inline-flex items-center gap-1.5 truncate max-w-[280px]" title={uploadForm.file.name}>
                  <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  <span className="truncate">{uploadForm.file.name}</span>
                </span>
                <span className="tabular-nums font-medium">
                  {(uploadForm.file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl font-bold"
          >
            BATAL
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            disabled={isSubmitting}
            className="rounded-xl font-bold min-w-[150px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {uploadProgress >= 100 ? 'MENYIMPAN...' : `MENGUNGGAH (${uploadProgress}%)...`}
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                UNGGAH BERKAS
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
});
