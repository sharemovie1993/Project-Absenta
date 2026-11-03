import React, { useState, useId, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { kurikulumApi, type Supervisi } from '../../api/kurikulum.api';
import { toast } from 'react-hot-toast';
import { Award, CheckCircle2, FileText, Sparkles, User, Calendar, BookOpen, Clock, Target, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/layoutUtils';

interface SupervisiPenilaianModalProps {
  isOpen: boolean;
  onClose: () => void;
  supervisi: Supervisi | null;
  onSuccess: () => void;
}

// 🌟 Preset Nilai Kinerja Observasi
const SCORE_PRESETS = [
  { score: 75, label: 'Cukup' },
  { score: 85, label: 'Baik (Standar)' },
  { score: 90, label: 'Sangat Baik' },
  { score: 95, label: 'Unggul' },
];

// 💡 Template Rekomendasi & Catatan Supervisor Cepat
const SUPERVISOR_NOTE_PRESETS = [
  '👏 Apresiasi: Penguasaan materi pembelajaran sangat baik dan interaksi dengan siswa hidup.',
  '⏱️ Saran: Optimalkan alokasi waktu pada fase penutup dan refleksi bersama siswa.',
  '💡 Saran: Berikan variasi pertanyaan pemantik untuk memancing keaktifan siswa yang pasif.',
  '🛠️ Saran: Maksimalkan pemanfaatan alat peraga dan media digital pendukung pembelajaran.',
  '🎯 Rekomendasi: Pembelajaran sudah sesuai modul ajar, lanjutkan ke pengayaan berbasis proyek.',
];

export const SupervisiPenilaianModal: React.FC<SupervisiPenilaianModalProps> = React.memo(({
  isOpen,
  onClose,
  supervisi,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const catatanId = useId();
  const nilaiId = useId();

  const [nilai, setNilai] = useState<number | ''>(supervisi?.nilai ?? 85);
  const [catatan, setCatatan] = useState<string>(supervisi?.catatan || '');
  const [status, setStatus] = useState<string>(supervisi?.status === 'COMPLETED' ? 'COMPLETED' : 'COMPLETED');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supervisi) {
      setNilai(supervisi.nilai ?? 85);
      setCatatan(supervisi.catatan || '');
      setStatus(supervisi.status || 'COMPLETED');
    }
  }, [supervisi]);

  // Evaluasi label predikat skor observasi
  const scoreTier = React.useMemo(() => {
    const num = Number(nilai);
    if (!nilai || num < 1) {
      return {
        label: 'Belum Dinilai',
        colorClass: 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      };
    }
    if (num >= 90) {
      return {
        label: '🌟 Amat Baik (Sangat Memuaskan)',
        colorClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      };
    }
    if (num >= 80) {
      return {
        label: '👍 Baik (Memenuhi Standar KBM)',
        colorClass: 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
      };
    }
    if (num >= 70) {
      return {
        label: '👌 Cukup (Perlu Pembenahan Minor)',
        colorClass: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      };
    }
    return {
      label: '⚠️ Perlu Tindak Lanjut & Bimbingan Khusus',
      colorClass: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
    };
  }, [nilai]);

  const handleApplyNotePreset = (presetText: string) => {
    setCatatan((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return presetText;
      if (trimmed.includes(presetText)) return trimmed;
      return `${trimmed}\n${presetText}`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisi?.id) return;

    if (nilai === '' || Number(nilai) < 0 || Number(nilai) > 100) {
      toast.error('Nilai observasi harus berupa angka antara 0 hingga 100.');
      return;
    }

    try {
      setLoading(true);
      await kurikulumApi.updateSupervisi(supervisi.id, {
        nilai: Number(nilai),
        catatan: catatan.trim(),
        status,
      });

      toast.success('Penilaian dan umpan balik supervisi berhasil disimpan.');
      queryClient.invalidateQueries({ queryKey: ['supervisi-list'] });
      queryClient.invalidateQueries({ queryKey: ['supervisi-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      queryClient.invalidateQueries({ queryKey: ['evaluasi-kinerja-guru'] });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan penilaian supervisi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lembar Penilaian & Umpan Balik Observasi"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar">

          {/* 1. Header Identitas Guru & Sesi KBM */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {supervisi?.Guru?.nama_guru || 'Guru Pengajar'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    NIP: {supervisi?.Guru?.nip || '-'}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Observasi Kelas
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-indigo-100/60 dark:border-indigo-900/40">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                {supervisi?.mapel || '-'}
              </span>
              <span>•</span>
              <span>Kelas: <strong>{supervisi?.kelas || '-'}</strong></span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Jam ke-{supervisi?.jam_ke || '-'}
              </span>
              {supervisi?.tanggal && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatDate(supervisi.tanggal)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 2. Refleksi & Target Mandiri Guru (Acuan Penilaian Supervisor) */}
          {(supervisi?.target_pembelajaran || supervisi?.catatan_self) ? (
            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Target & Refleksi Guru (Pra-Observasi)</span>
              </div>
              <div className="text-[11px] text-amber-900/90 dark:text-amber-300/90 leading-relaxed whitespace-pre-wrap">
                {supervisi.target_pembelajaran && (
                  <p><strong>Target KBM:</strong> {supervisi.target_pembelajaran}</p>
                )}
                {supervisi.catatan_self && (
                  <p className="mt-1"><strong>Catatan Khusus:</strong> {supervisi.catatan_self}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 italic flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Guru belum mengisi refleksi target pembelajaran pra-observasi.</span>
            </div>
          )}

          {/* 3. Input Skor Nilai Observasi (0 - 100) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor={nilaiId} className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Award size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Skor Penilaian Observasi KBM <span className="text-rose-500">*</span></span>
              </label>

              <div className="flex items-center gap-1.5">
                <input
                  id={nilaiId}
                  type="number"
                  min="0"
                  max="100"
                  value={nilai}
                  onChange={(e) => setNilai(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-16 h-8 text-center text-sm font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <span className="text-[10px] font-bold text-slate-400">/ 100</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="50"
              max="100"
              step="1"
              value={nilai === '' ? 85 : nilai}
              onChange={(e) => setNilai(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />

            {/* Preset Buttons & Status Tier Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium mr-1">Pilihan Cepat:</span>
                {SCORE_PRESETS.map((preset) => (
                  <button
                    key={preset.score}
                    type="button"
                    onClick={() => setNilai(preset.score)}
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all',
                      nilai === preset.score
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                    )}
                  >
                    {preset.score} ({preset.label})
                  </button>
                ))}
              </div>

              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border text-center', scoreTier.colorClass)}>
                {scoreTier.label}
              </span>
            </div>
          </div>

          {/* 4. Status Pelaksanaan Supervisi */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Status Observasi</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('COMPLETED')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all',
                  status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                )}
              >
                <span>Selesai Diobservasi</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('SCHEDULED')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all',
                  status === 'SCHEDULED'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                )}
              >
                <span>Masih Terjadwal</span>
              </button>
            </div>
          </div>

          {/* 5. Catatan, Umpan Balik & Rekomendasi Supervisor */}
          <div className="space-y-1.5">
            <label htmlFor={catatanId} className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Catatan, Apresiasi & Umpan Balik Supervisor</span>
            </label>
            <textarea
              id={catatanId}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Tuliskan catatan observasi pembelajaran, apresiasi metode mengajar guru, serta poin rekomendasi tindak lanjut..."
              rows={3}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-2xs leading-relaxed"
            />

            {/* Quick Presets Chips */}
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Rekomendasi Cepat Supervisor:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUPERVISOR_NOTE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyNotePreset(p)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700 transition-colors text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 rounded-b-2xl">
          <p className="text-[10px] text-slate-400 hidden sm:block">
            Hasil observasi ini akan langsung terlihat oleh guru di sub-tab Supervisi Saya.
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
              <span>Simpan Penilaian Observasi</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
});

SupervisiPenilaianModal.displayName = 'SupervisiPenilaianModal';
