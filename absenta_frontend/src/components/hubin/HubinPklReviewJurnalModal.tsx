import React from 'react';
import { FileText, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { Modal, Button, Textarea } from '../ui';
import { SimpleFormField } from '../ui/SimpleFormField';

interface SelectedPklReviewJurnal {
  id: string;
  Siswa?: { nama_siswa: string };
  Mitra?: { nama: string };
  jurnal_json?: {
    submitted_at?: string;
    file_url?: string;
  };
}

interface ReviewJurnalMutation {
  mutate: (variables: { id: string; status: 'DISETUJUI' | 'REVISI'; catatan: string }) => void;
  isPending: boolean;
}

interface HubinPklReviewJurnalModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPkl: SelectedPklReviewJurnal | null;
  reviewJurnalStatus: 'DISETUJUI' | 'REVISI';
  setReviewJurnalStatus: (val: 'DISETUJUI' | 'REVISI') => void;
  reviewJurnalCatatan: string;
  setReviewJurnalCatatan: (val: string) => void;
  reviewJurnalMutation: ReviewJurnalMutation;
}

export const HubinPklReviewJurnalModal: React.FC<HubinPklReviewJurnalModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedPkl,
  reviewJurnalStatus,
  setReviewJurnalStatus,
  reviewJurnalCatatan,
  setReviewJurnalCatatan,
  reviewJurnalMutation,
}) => {
  const handleSelectDisetujui = React.useCallback(() => {
    setReviewJurnalStatus('DISETUJUI');
  }, [setReviewJurnalStatus]);

  const handleSelectRevisi = React.useCallback(() => {
    setReviewJurnalStatus('REVISI');
  }, [setReviewJurnalStatus]);

  const handleSubmit = React.useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPkl) return;
    reviewJurnalMutation.mutate({
      id: selectedPkl.id,
      status: reviewJurnalStatus,
      catatan: reviewJurnalCatatan
    });
  }, [selectedPkl, reviewJurnalStatus, reviewJurnalCatatan, reviewJurnalMutation]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-indigo-650 dark:text-indigo-400" />
          <span>Review Jurnal & Portofolio Akhir</span>
        </div>
      }
    >
      {selectedPkl && selectedPkl.jurnal_json && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Siswa Magang</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedPkl.Siswa?.nama_siswa}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Mitra Industri (DUDI)</p>
              <p className="text-xs text-slate-700 dark:text-slate-350">{selectedPkl.Mitra?.nama}</p>
            </div>
            {selectedPkl.jurnal_json.submitted_at && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Tanggal Pengumpulan</p>
                <p className="text-xs text-slate-700 dark:text-slate-350">
                  {format(new Date(selectedPkl.jurnal_json.submitted_at), 'd MMMM yyyy, HH:mm', { locale: localeID })}
                </p>
              </div>
            )}
          </div>

          {/* View/Download File Link */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} />
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Berkas Jurnal & Portofolio</p>
                <p className="text-[10px] text-slate-400">Format digital / PDF</p>
              </div>
            </div>
            <a 
              href={selectedPkl.jurnal_json.file_url} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-black text-indigo-650 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-indigo-150 shadow-sm transition-colors"
            >
              Buka Berkas <ExternalLink size={12} />
            </a>
          </div>

          {/* Form Review */}
          <form 
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Kelayakan Berkas</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSelectDisetujui}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    reviewJurnalStatus === 'DISETUJUI'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm shadow-emerald-50'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 size={16} /> Disetujui
                </button>
                <button
                  type="button"
                  onClick={handleSelectRevisi}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    reviewJurnalStatus === 'REVISI'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm shadow-rose-50'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle size={16} /> Perlu Revisi
                </button>
              </div>
            </div>

            <SimpleFormField 
              htmlFor="review-catatan"
              label={reviewJurnalStatus === 'REVISI' ? "Catatan Masukan Revisi (Wajib)" : "Catatan / Umpan Balik Evaluasi (Opsional)"}
              required={reviewJurnalStatus === 'REVISI'}
            >
              <Textarea
                id="review-catatan"
                value={reviewJurnalCatatan}
                onChange={(e) => setReviewJurnalCatatan(e.target.value)}
                rows={3}
                required={reviewJurnalStatus === 'REVISI'}
                placeholder={
                  reviewJurnalStatus === 'REVISI'
                    ? "Uraikan bagian jurnal/portofolio yang perlu diperbaiki oleh siswa..."
                    : "Tuliskan apresiasi atau catatan kelayakan akhir..."
                }
              />
            </SimpleFormField>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button 
                type="submit" 
                variant={reviewJurnalStatus === 'REVISI' ? 'danger' : 'primary'}
                isLoading={reviewJurnalMutation.isPending}
              >
                Simpan Review
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
});
