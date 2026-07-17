import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { kurikulumApi } from '../../api/kurikulum.api';
import { toast } from 'react-hot-toast';
import { HelpCircle, Award, Target, FileText } from 'lucide-react';

interface SupervisiSelfAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supervisiId: string;
  initialData?: {
    target_pembelajaran?: string | null;
    nilai_self?: number | null;
    catatan_self?: string | null;
  };
  onSuccess: () => void;
}

export const SupervisiSelfAssessmentModal: React.FC<SupervisiSelfAssessmentModalProps> = ({
  isOpen,
  onClose,
  supervisiId,
  initialData,
  onSuccess
}) => {
  const [targetPembelajaran, setTargetPembelajaran] = useState(initialData?.target_pembelajaran || '');
  const [nilaiSelf, setNilaiSelf] = useState<number>(initialData?.nilai_self || 80);
  const [catatanSelf, setCatatanSelf] = useState(initialData?.catatan_self || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPembelajaran.trim()) {
      toast.error('Target pembelajaran wajib diisi.');
      return;
    }
    if (targetPembelajaran.length < 10) {
      toast.error('Target pembelajaran minimal 10 karakter.');
      return;
    }

    try {
      setLoading(true);
      await kurikulumApi.submitSupervisiSelfAssessment(supervisiId, {
        target_pembelajaran: targetPembelajaran,
        nilai_self: Number(nilaiSelf),
        catatan_self: catatanSelf || undefined
      });
      toast.success('Evaluasi diri berhasil disimpan.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan evaluasi diri.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Evaluasi Diri Guru (Pra-Observasi)"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl flex gap-3">
          <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed font-medium">
            Formulir ini diisi oleh guru sebagai persiapan pra-observasi sebelum supervisor melakukan kunjungan kelas. Isilah target kompetensi yang ingin Anda capai dalam KBM ini.
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Target size={14} className="text-indigo-500" />
            Target Pembelajaran *
          </label>
          <textarea
            value={targetPembelajaran}
            onChange={(e) => setTargetPembelajaran(e.target.value)}
            placeholder="Tuliskan kompetensi dasar, indikator, atau materi khusus yang ingin dicapai siswa dalam pertemuan ini..."
            rows={4}
            className="w-full text-xs rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/30 p-3.5 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
            required
          />
          <p className="text-[10px] text-gray-400 font-medium">Minimal 10 karakter.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Award size={14} className="text-indigo-500" />
              Skor Evaluasi Mandiri (0 - 100)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={nilaiSelf}
                onChange={(e) => setNilaiSelf(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <span className="w-12 text-center text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 py-1 px-2.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">
                {nilaiSelf}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Nilai estimasi kesiapan Anda untuk mengajar (0-100).</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileText size={14} className="text-indigo-500" />
            Catatan Tambahan
          </label>
          <textarea
            value={catatanSelf}
            onChange={(e) => setCatatanSelf(e.target.value)}
            placeholder="Tuliskan kendala pra-observasi, kebutuhan khusus siswa, atau bantuan yang diharapkan dari supervisor..."
            rows={3}
            className="w-full text-xs rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/30 p-3.5 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-2xl"
          >
            Batal
          </Button>
          <Button
            type="submit"
            loading={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            Simpan Evaluasi Diri
          </Button>
        </div>
      </form>
    </Modal>
  );
};
