import React, { useState, useEffect } from 'react';
import { Edit3, Sparkles, Save, Trash2, X, History } from 'lucide-react';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';

export interface EditingMitraSlot {
  mitra_id: string;
  mitra_nama: string;
  siswa_count: number;
  rombel_list: string[];
  deskripsi_tp?: string;
  saved_id?: string;
  previous_tp?: string;
  previous_tahun?: string;
}

export interface PklDeskripsiTpModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: EditingMitraSlot | null;
  kaprogJurusan?: { id?: string; nama?: string; singkatan?: string } | null;
  tahunPelajaranId?: string;
  onSave: (payload: { mitra_id: string; jurusan_id?: string; tahun_pelajaran_id?: string; deskripsi_tp: string }) => void;
  onDelete?: (savedId: string) => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export const PklDeskripsiTpModal: React.FC<PklDeskripsiTpModalProps> = ({
  isOpen,
  onClose,
  slot,
  kaprogJurusan,
  tahunPelajaranId,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}) => {
  const [editorText, setEditorText] = useState('');

  useEffect(() => {
    if (slot) {
      setEditorText(slot.deskripsi_tp || '');
    } else {
      setEditorText('');
    }
  }, [slot]);

  if (!isOpen || !slot) return null;

  // Terapkan Template Baku Kurikulum Merdeka
  const handleApplyTemplate = () => {
    const jurusanNama = kaprogJurusan?.nama || 'kompetensi kejuruan';
    const template = `Peserta didik mampu memahami alur proses bisnis dan budaya kerja industri, menerapkan keselamatan dan kesehatan kerja (K3LH), serta mempraktikkan penguasaan kompetensi kejuruan ${jurusanNama} sesuai dengan Standar Operasional Prosedur (SOP) di ${slot.mitra_nama}.`;
    setEditorText(template);
    toast.success('Template capaian Kurikulum Merdeka berhasil disisipkan!');
  };

  const handleSave = () => {
    if (!editorText.trim() || editorText.trim().length < 5) {
      toast.error('Deskripsi TP minimal 5 karakter');
      return;
    }

    onSave({
      mitra_id: slot.mitra_id,
      jurusan_id: kaprogJurusan?.id || undefined,
      tahun_pelajaran_id: tahunPelajaranId || undefined,
      deskripsi_tp: editorText.trim(),
    });
  };

  const handleDelete = () => {
    if (!slot.saved_id) return;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus deskripsi TP untuk ${slot.mitra_nama}? Status slot akan kembali menjadi belum diisi.`)) {
      return;
    }
    onDelete?.(slot.saved_id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                {slot.mitra_nama}
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                {slot.rombel_list?.join(', ') || 'Semua Rombel'} • {slot.siswa_count} Siswa PKL
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label htmlFor="tp-modal-editor-text" className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Deskripsi Capaian Pembelajaran (TP)
            </label>
            <div className="flex items-center gap-2.5">
              {slot.previous_tp && (
                <button
                  type="button"
                  onClick={() => {
                    setEditorText(slot.previous_tp || '');
                    toast.success(`Berhasil menyalin rumusan TP dari ${slot.previous_tahun || 'tahun lalu'}!`);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Salin dari {slot.previous_tahun || 'Tahun Lalu'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleApplyTemplate}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gunakan Template</span>
              </button>
            </div>
          </div>

          <textarea
            id="tp-modal-editor-text"
            rows={4}
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            placeholder="Peserta didik mampu memahami alur proses bisnis industri, menerapkan K3LH, serta mempraktikkan..."
            className="w-full p-3 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed resize-none"
          />

          <p className="text-[11px] text-slate-400 leading-normal">
            Gunakan kata kerja operasional terukur (memahami, mempraktikkan, menganalisis) sesuai bidang pekerjaan industri. Deskripsi ini otomatis tercetak pada buku rapor PKL siswa jurusan.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div>
            {slot.saved_id && onDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className="rounded-xl text-xs font-bold text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Hapus TP'}</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Deskripsi TP'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PklDeskripsiTpModal;
