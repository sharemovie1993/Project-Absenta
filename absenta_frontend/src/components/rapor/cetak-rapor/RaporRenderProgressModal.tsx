import React, { useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  ExternalLink,
  Loader2,
  Sparkles,
  Layers,
  Database,
  Printer,
} from 'lucide-react';
import { useRaporRenderStore, RaporRenderStage } from '../../../store/raporRenderStore';
import { Progress } from '../../ui/Progress';

const STAGES: Array<{ id: RaporRenderStage; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'fetching', label: 'Data Akademik', icon: Database },
  { id: 'processing', label: 'Kompilasi & CP', icon: Layers },
  { id: 'rendering', label: 'Render PDF', icon: Printer },
  { id: 'ready', label: 'Selesai', icon: Sparkles },
];

export const RaporRenderProgressModal: React.FC = () => {
  const {
    isOpen,
    title,
    stage,
    stageText,
    progressPercent,
    current,
    total,
    detail,
    blobUrl,
    filename,
    errorMessage,
    closeModal,
  } = useRaporRenderStore();

  const handleOpenPdf = useCallback(() => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  }, [blobUrl]);

  const handleDownloadPdf = useCallback(() => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'Dokumen_Rapor.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [blobUrl, filename]);

  if (!isOpen) return null;

  const isCompleted = stage === 'ready';
  const isFailed = stage === 'error';
  const isBusy = !isCompleted && !isFailed;

  const getStageIndex = (currentStage: RaporRenderStage): number => {
    switch (currentStage) {
      case 'fetching':
        return 0;
      case 'processing':
        return 1;
      case 'rendering':
        return 2;
      case 'ready':
        return 3;
      default:
        return 0;
    }
  };

  const activeIndex = getStageIndex(stage);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rapor-render-title"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        {/* Header Ribbon / Status Bar */}
        <div
          className={`h-2 w-full transition-colors duration-500 ${
            isCompleted
              ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500'
              : isFailed
              ? 'bg-rose-500'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 animate-pulse'
          }`}
        />

        <div className="p-6">
          {/* Header Section */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl flex items-center justify-center shadow-inner transition-colors duration-300 ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : isFailed
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 animate-bounce" />
                ) : isFailed ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin" />
                )}
              </div>
              <div>
                <h3 id="rapor-render-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  {title || 'Proses Rendering Rapor'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isCompleted
                    ? 'Kompilasi berkas PDF selesai dan siap ditinjau'
                    : isFailed
                    ? 'Terjadi kendala saat merender dokumen'
                    : 'Mohon tunggu, dokumen sedang disusun dan dirender'}
                </p>
              </div>
            </div>

            {/* Close button (allowed anytime or when done) */}
            <button
              type="button"
              onClick={closeModal}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper indicator */}
          {!isFailed && (
            <div className="mt-6 grid grid-cols-4 gap-2">
              {(STAGES ?? []).map((step, idx) => {
                const Icon = step.icon;
                const isStepCompleted = activeIndex > idx || isCompleted;
                const isStepActive = activeIndex === idx && !isCompleted;

                return (
                  <div key={step.id} className="flex flex-col items-center text-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mb-1.5 transition-all duration-300 ${
                        isStepCompleted
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200 dark:ring-emerald-900'
                          : isStepActive
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 dark:ring-blue-800 animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isStepCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] leading-tight font-medium ${
                        isStepActive
                          ? 'text-blue-600 dark:text-blue-400 font-bold'
                          : isStepCompleted
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Progress Bar & Realtime Percentage */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate pr-2">
                {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 inline" />}
                {stageText || 'Memproses berkas...'}
              </span>
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                }`}
              >
                {progressPercent}%
              </span>
            </div>

            <Progress
              value={progressPercent}
              className="h-2.5 bg-slate-100 dark:bg-slate-800"
              indicatorClassName={
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : isFailed
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
              }
            />
          </div>

          {/* Detailed Batch Counter / Context Box */}
          {detail && (
            <div className="mt-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300 truncate font-medium">
                {detail}
              </span>
              {total > 1 && (
                <span className="ml-2 font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                  {current} / {total} Siswa
                </span>
              )}
            </div>
          )}

          {/* Error Message Box */}
          {isFailed && (
            <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                Kompilasi Gagal
              </p>
              <p className="text-rose-600 dark:text-rose-400 pl-5">
                {errorMessage || 'Terjadi kesalahan sistem yang tidak terduga. Silakan coba kembali.'}
              </p>
            </div>
          )}

          {/* Completion Helper Message (Resolves Browser Popup Blocker Silence) */}
          {isCompleted && (
            <div className="mt-4 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Dokumen PDF Telah Berhasil Dibuat!</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Jika tab baru tidak terbuka otomatis karena blokir pop-up browser, klik tombol <strong>Buka PDF</strong> di bawah ini.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            {isCompleted ? (
              <>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenPdf}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md hover:shadow-lg transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka PDF Sekarang</span>
                </button>
              </>
            ) : isFailed ? (
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Tutup
              </button>
            ) : (
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition-colors"
              >
                Jalankan di Latar Belakang
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
