import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Laptop,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import type { CbtSoal } from '@/types/cbt.types';
import { CbtContentRenderer } from '../common/CbtContentRenderer';
import { CbtOptionsRenderer } from '../common/CbtOptionsRenderer';
import { cn } from '@/lib/utils';

export interface CbtStudentLivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankJudul: string;
  mapelNama?: string;
  tingkat?: string | number;
  soalList: CbtSoal[];
  initialIndex?: number;
}

export const CbtStudentLivePreviewModal: React.FC<CbtStudentLivePreviewModalProps> = ({
  isOpen,
  onClose,
  bankJudul,
  mapelNama,
  tingkat,
  soalList,
  initialIndex = 0,
}) => {
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showKeyHint, setShowKeyHint] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFsChange = () => {
      setIsBrowserFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore if blocked by browser policy
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentIdx(Math.min(Math.max(0, initialIndex), Math.max(0, soalList.length - 1)));
      setSelectedAnswers({});
      setShowKeyHint(false);
    }
  }, [isOpen, initialIndex, soalList.length]);

  // Shortcut Keyboard: Tekan A-E untuk memilih jawaban, ArrowLeft/ArrowRight untuk pindah soal
  useEffect(() => {
    if (!isOpen || soalList.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const activeSoal = soalList[currentIdx];
      if (!activeSoal) return;

      const keyUpper = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(keyUpper)) {
        const matchedOpt = (activeSoal.opsi_jawaban_json || []).find(
          (opt) => (opt.kode || '').toUpperCase().trim() === keyUpper
        );
        if (matchedOpt) {
          e.preventDefault();
          setSelectedAnswers((prev) => ({ ...prev, [activeSoal.id]: matchedOpt.kode }));
        }
        return;
      }

      if (e.key === 'ArrowLeft' && currentIdx > 0) {
        e.preventDefault();
        setCurrentIdx((idx) => Math.max(0, idx - 1));
      } else if (e.key === 'ArrowRight' && currentIdx < soalList.length - 1) {
        e.preventDefault();
        setCurrentIdx((idx) => Math.min(soalList.length - 1, idx + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIdx, soalList]);

  if (!isOpen || soalList.length === 0) return null;

  const currentSoal = soalList[currentIdx] || soalList[0];
  const currentAnswer = selectedAnswers[currentSoal.id] || null;
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[70] flex flex-col w-screen h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
    >
      {/* ── Header Simulasi Ruang Ujian Siswa ── */}
      <div className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Laptop size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Simulasi Layar Siswa
                </span>
                {mapelNama && (
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                    {mapelNama} {tingkat ? `• Kelas ${tingkat}` : ''}
                  </span>
                )}
              </div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                {bankJudul}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock size={13} className="text-indigo-500" />
              <span>01:30:00</span>
            </div>

            <button
              type="button"
              onClick={() => setShowKeyHint((prev) => !prev)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer',
                showKeyHint
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              )}
            >
              {showKeyHint ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>{showKeyHint ? `Kunci: ${currentSoal.kunci_jawaban}` : 'Intip Kunci'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAnswers({})}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              title="Reset jawaban simulasi"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={toggleBrowserFullscreen}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              title="Toggle Layar Penuh Browser"
            >
              {isBrowserFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="hidden sm:inline">{isBrowserFullscreen ? 'Normal' : 'Fullscreen'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 flex items-center gap-1 cursor-pointer"
              title="Tutup Preview Siswa"
            >
              <X size={14} />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* ── Konten Utama: Kiri Soal (Identik CbtExamRoomPage), Kanan Navigasi Nomor ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Area Soal Utama */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-black tracking-wide">
                  SOAL NO. {currentIdx + 1} / {soalList.length}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Bobot: {Number(currentSoal.bobot) || 1} Poin
                </span>
              </div>

              {/* Konten Pertanyaan & Gambar (Komponen Resmi CbtContentRenderer) */}
              <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/70 shadow-sm border-l-4 border-l-indigo-600">
                <CbtContentRenderer
                  content={currentSoal.konten_pertanyaan}
                  imageUrl={currentSoal.gambar_stimulus_url}
                  imageAlt={`Stimulus Soal Nomor ${currentIdx + 1}`}
                  className="text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-relaxed"
                />
              </div>

              {/* Pilihan Jawaban A-E (Komponen Resmi CbtOptionsRenderer modeContext="exam") */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="block text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    PILIHAN JAWABAN:
                  </span>
                  <span className="hidden md:inline-block text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    ⌨️ Tekan <strong>A–E</strong> untuk menjawab • <strong>← / →</strong> pindah soal
                  </span>
                </div>
                <CbtOptionsRenderer
                  options={currentSoal.opsi_jawaban_json}
                  selectedAnswer={currentAnswer}
                  onSelectAnswer={(kode) =>
                    setSelectedAnswers((prev) => ({ ...prev, [currentSoal.id]: kode }))
                  }
                  modeContext="exam"
                  readOnly={false}
                />
              </div>

              {/* Navigasi Sebelumnya / Selanjutnya */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                  <span>Sebelumnya</span>
                </Button>

                <Button
                  type="button"
                  disabled={currentIdx >= soalList.length - 1}
                  onClick={() => setCurrentIdx((i) => Math.min(soalList.length - 1, i + 1))}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight size={15} />
                </Button>
              </div>
            </div>

            {/* Panel Navigasi Nomor Soal */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3 lg:sticky lg:top-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Navigasi Nomor Soal
                </h3>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  {answeredCount}/{soalList.length} Terjawab
                </span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
                {soalList.map((s, idx) => {
                  const isCurrent = idx === currentIdx;
                  const ans = selectedAnswers[s.id];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={cn(
                        'h-10 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex flex-col items-center justify-center leading-none',
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300 shadow-xs'
                          : ans
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      )}
                    >
                      <span>{idx + 1}</span>
                      {ans && <span className="text-[9px] font-black mt-0.5">{ans}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};
