import React, { useState, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { kurikulumApi } from '../../api/kurikulum.api';
import { toast } from 'react-hot-toast';
import { Target, Award, FileText, Sparkles, ShieldCheck, Calendar, BookOpen, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/formatters';

interface SupervisiSessionContext {
  id?: string;
  mapel?: string | null;
  kelas?: string | null;
  jam_ke?: number | null;
  tanggal?: string | null;
  target_pembelajaran?: string | null;
  nilai_self?: number | null;
  catatan_self?: string | null;
  Supervisor?: { nama_guru?: string | null } | null;
}

interface SupervisiSelfAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supervisiId: string;
  item?: SupervisiSessionContext | null;
  initialData?: {
    target_pembelajaran?: string | null;
    nilai_self?: number | null;
    catatan_self?: string | null;
  };
  onSuccess: () => void;
}

// 🎯 Template Target Pembelajaran Cepat (Pra-Observasi)
const QUICK_TARGET_PRESETS = [
  {
    label: '🎯 Pemahaman Konsep',
    text: 'Siswa mampu memahami konsep dasar, teori kunci, dan menjelaskan kembali dengan bahasa sendiri secara mandiri.',
  },
  {
    label: '🛠️ Praktik & Keterampilan',
    text: 'Siswa mampu mendemonstrasikan langkah kerja praktik sesuai SOP dengan tertib dan mematuhi keselamatan kerja.',
  },
  {
    label: '💡 Problem-Based Learning',
    text: 'Siswa mampu menganalisis studi kasus nyata, berdiskusi memecahkan masalah, dan merumuskan solusi bersama kelompok.',
  },
  {
    label: '👥 Diskusi & Presentasi',
    text: 'Siswa aktif berkolaborasi dalam kelompok serta mempresentasikan hasil tugas dengan percaya diri dan komunikatif.',
  },
];

// 📝 Template Catatan / Permintaan Bantuan ke Supervisor
const QUICK_NOTE_PRESETS = [
  '⏱️ Butuh masukan terkait manajemen dan efisiensi waktu KBM.',
  '💡 Mohon umpan balik untuk teknik pertanyaan pemantik & apersepsi.',
  '👥 Karakter kelas sangat aktif dan heterogen.',
  '💻 Pembelajaran memanfaatkan media digital dan presentasi interaktif.',
];

// 🌟 Preset Nilai Kesiapan Mandiri
const READINESS_PRESETS = [
  { score: 75, label: 'Cukup Siap' },
  { score: 85, label: 'Siap & Terencana' },
  { score: 90, label: 'Sangat Siap' },
  { score: 95, label: 'Siap Prima' },
];

export const SupervisiSelfAssessmentModal: React.FC<SupervisiSelfAssessmentModalProps> = React.memo(({
  isOpen,
  onClose,
  supervisiId,
  item,
  initialData,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const targetId = useId();
  const catatanId = useId();
  const sliderId = useId();

  const [targetPembelajaran, setTargetPembelajaran] = useState<string>(
    item?.target_pembelajaran || initialData?.target_pembelajaran || ''
  );
  const [nilaiSelf, setNilaiSelf] = useState<number>(
    item?.nilai_self ?? initialData?.nilai_self ?? 85
  );
  const [catatanSelf, setCatatanSelf] = useState<string>(
    item?.catatan_self || initialData?.catatan_self || ''
  );
  const [loading, setLoading] = useState(false);

  // Evaluasi label predikat kesiapan mandiri secara real-time
  const readinessTier = React.useMemo(() => {
    if (nilaiSelf >= 90) {
      return {
        label: '🌟 Sangat Siap & Percaya Diri (Media & Modul Prima)',
        colorClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      };
    }
    if (nilaiSelf >= 80) {
      return {
        label: '👍 Siap & Terencana (Modul & Materi Lengkap)',
        colorClass: 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
      };
    }
    if (nilaiSelf >= 70) {
      return {
        label: '👌 Cukup Siap (Perlu Pemantapan Alur Ajar)',
        colorClass: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      };
    }
    return {
      label: '⚠️ Butuh Bimbingan / Pendampingan Supervisor',
      colorClass: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
    };
  }, [nilaiSelf]);

  // Handler penambahan chip target pembelajaran
  const handleApplyTargetPreset = (text: string) => {
    setTargetPembelajaran((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      if (trimmed.includes(text)) return trimmed;
      return `${trimmed}\n• ${text}`;
    });
  };

  // Handler penambahan chip catatan
  const handleApplyNotePreset = (text: string) => {
    setCatatanSelf((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      if (trimmed.includes(text)) return trimmed;
      return `${trimmed}; ${text}`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPembelajaran.trim()) {
      toast.error('Target pembelajaran wajib diisi.');
      return;
    }
    if (targetPembelajaran.trim().length < 10) {
      toast.error('Target pembelajaran minimal 10 karakter.');
      return;
    }

    try {
      setLoading(true);
      await kurikulumApi.submitSupervisiSelfAssessment(supervisiId, {
        target_pembelajaran: targetPembelajaran.trim(),
        nilai_self: Number(nilaiSelf),
        catatan_self: catatanSelf.trim() || undefined
      });
      toast.success('Refleksi dan evaluasi diri pra-observasi berhasil disimpan.');
      queryClient.invalidateQueries({ queryKey: ['supervisi-list'] });
      queryClient.invalidateQueries({ queryKey: ['supervisi-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      queryClient.invalidateQueries({ queryKey: ['evaluasi-kinerja-guru'] });
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
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[82vh]">
        {/* Scrollable Container dengan zero clipped padding */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar">
          
          {/* 1. Header Ringkasan Konteks Sesi KBM */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {item?.mapel || 'Mata Pelajaran'}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>Kelas: <strong>{item?.kelas || '-'}</strong></span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Jam ke-{item?.jam_ke || '-'}
                    </span>
                    {item?.tanggal && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(item.tanggal)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {item?.Supervisor?.nama_guru && (
                <div className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-900/40 text-[10px] flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Supervisor: {item.Supervisor.nama_guru}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Target Pembelajaran dengan Quick Preset Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor={targetId} className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Target size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Target Pembelajaran Pertemuan Ini <span className="text-rose-500">*</span></span>
              </label>
              <span className="text-[10px] text-slate-400">Minimal 10 karakter</span>
            </div>

            <textarea
              id={targetId}
              value={targetPembelajaran}
              onChange={(e) => setTargetPembelajaran(e.target.value)}
              placeholder="Contoh: Siswa mampu mempraktikkan perakitan komponen elektronika dasar secara aman, mandiri, dan memahami fungsi masing-masing modul..."
              rows={3}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-2xs leading-relaxed"
              required
            />

            {/* Quick Template Chips */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Rekomendasi Cepat (Klik untuk menyalin):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TARGET_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTargetPreset(p.text)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800/80 dark:hover:bg-indigo-950/40 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700 transition-colors font-medium text-left"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Skor Kesiapan Mandiri (Slider + Preset Tombol + Badge Status) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor={sliderId} className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Award size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Estimasi Kesiapan Mengajar Anda</span>
              </label>
              
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {nilaiSelf}
                </span>
                <span className="text-[10px] font-bold text-slate-400">/ 100</span>
              </div>
            </div>

            {/* Range Slider */}
            <input
              id={sliderId}
              type="range"
              min="50"
              max="100"
              step="5"
              value={nilaiSelf}
              onChange={(e) => setNilaiSelf(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />

            {/* Quick Readiness Presets & Dynamic Tier Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium mr-1">Preset:</span>
                {READINESS_PRESETS.map((preset) => (
                  <button
                    key={preset.score}
                    type="button"
                    onClick={() => setNilaiSelf(preset.score)}
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all',
                      nilaiSelf === preset.score
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                    )}
                  >
                    {preset.score} ({preset.label})
                  </button>
                ))}
              </div>

              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border text-center', readinessTier.colorClass)}>
                {readinessTier.label}
              </span>
            </div>
          </div>

          {/* 4. Catatan Tambahan (Opsional) */}
          <div className="space-y-1.5">
            <label htmlFor={catatanId} className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Catatan Tambahan untuk Supervisor (Opsional)</span>
            </label>
            <textarea
              id={catatanId}
              value={catatanSelf}
              onChange={(e) => setCatatanSelf(e.target.value)}
              placeholder="Sampaikan kendala persiapan, karakter siswa di kelas ini, atau poin spesifik yang Anda harapkan supervisor berikan masukan..."
              rows={2}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-2xs leading-relaxed"
            />

            {/* Quick Note Chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {QUICK_NOTE_PRESETS.map((note, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyNotePreset(note)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-700 text-left"
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* 5. Sticky Footer Actions */}
        <div className="p-4 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 rounded-b-2xl">
          <p className="text-[10px] text-slate-400 hidden sm:block">
            Form ini dapat diperbarui kapan saja sebelum jadwal observasi dimulai.
          </p>

          <div className="flex items-center gap-2.5 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={onClose}
              className="rounded-xl text-xs h-9 px-4 font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              loading={loading}
              className="rounded-xl text-xs h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs gap-1.5"
            >
              <span>Simpan Evaluasi Diri</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
});

SupervisiSelfAssessmentModal.displayName = 'SupervisiSelfAssessmentModal';
