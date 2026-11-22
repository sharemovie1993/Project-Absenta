import React from 'react';
import {
  Laptop,
  Clock,
  MapPin,
  KeyRound,
  AlertTriangle,
  ArrowRight,
  X,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CbtStudentExamItem } from '@/types/cbt.types';

export interface SiswaExamDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeExams: CbtStudentExamItem[];
  studentName?: string;
  classNameTitle?: string;
  onGoToCbtTab?: () => void;
}

export const SiswaExamDispatchModal: React.FC<SiswaExamDispatchModalProps> = ({
  isOpen,
  onClose,
  activeExams,
  studentName,
  classNameTitle,
  onGoToCbtTab,
}) => {
  if (!isOpen || !activeExams || activeExams.length === 0) return null;

  const primaryExam = activeExams[0];

  const handleEnterExam = (exam: CbtStudentExamItem) => {
    // Record dismiss so modal doesn't immediately reappear on navigation back
    try {
      sessionStorage.setItem(`cbt_student_dispatch_${exam.id}`, 'true');
    } catch (_) {}

    const url = `/cbt/ruang-ujian?jadwal_id=${encodeURIComponent(exam.id)}${
      exam.token_ujian ? `&token=${encodeURIComponent(exam.token_ujian)}` : ''
    }`;
    window.location.assign(url);
  };

  const handleDismiss = () => {
    try {
      activeExams.forEach((exam) => {
        sessionStorage.setItem(`cbt_student_dispatch_${exam.id}`, 'true');
      });
    } catch (_) {}
    onClose();
  };

  const formatScheduleTime = (startStr?: string, endStr?: string) => {
    if (!startStr) return '';
    try {
      const d1 = new Date(startStr);
      const t1 = d1.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      if (!endStr) return t1;
      const d2 = new Date(endStr);
      const t2 = d2.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return `${t1} - ${t2} WIB`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow Accent Top Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-500" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-950/20 to-transparent">
          <div className="flex items-start gap-3">
            <div className="relative p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25 shrink-0">
              <Laptop size={22} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  🔴 UJIAN LIVE BERLANGSUNG
                </span>
                {activeExams.length > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    {activeExams.length} Sesi Terjadwal
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                Panggilan Sesi Ujian CBT
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {studentName ? `Halo ${studentName}, sesi` : 'Sesi'} ujian sekolah telah dibuka dan siap dikerjakan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Greeting Card */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
              <Sparkles size={14} className="text-indigo-500" />
              <span>Prioritas Asesmen Diaktifkan</span>
            </div>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              Formulir onboarding profil siswa sementara dinonaktifkan agar Anda dapat langsung fokus mengikuti ujian CBT tepat waktu tanpa hambatan.
            </p>
          </div>

          {/* Exam Cards */}
          <div className="space-y-3">
            {activeExams.map((exam, idx) => {
              const isFirst = idx === 0;
              const isInProgress = exam.status_peserta === 'IN_PROGRESS';
              const timeRange = formatScheduleTime(exam.tanggal_mulai, exam.tanggal_selesai);
              const room = exam.ruang_ujian || exam.ruang_ujian_nama || 'Ruang CBT';

              return (
                <div
                  key={exam.id}
                  className={cn(
                    'p-4 rounded-2xl border transition-all',
                    isFirst
                      ? 'bg-gradient-to-b from-white to-slate-50/60 dark:from-slate-850 dark:to-slate-900 border-indigo-300 dark:border-indigo-700/60 shadow-sm'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {exam.nama_sesi || `Sesi #${idx + 1}`}
                        </span>
                        {isInProgress ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                            Sedang Berjalan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                            Siap Dikerjakan
                          </span>
                        )}
                        {exam.is_tokenless && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                            Bebas Token
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                        {exam.mapel || exam.judul_bank}
                      </h4>
                      {exam.judul_bank && exam.judul_bank !== exam.mapel && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {exam.judul_bank}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {exam.durasi_menit} Menit
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {exam.total_soal} Butir Soal
                      </div>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{room}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{timeRange || `${exam.durasi_menit} Menit`}</span>
                    </div>
                  </div>

                  {/* Token Row (if required) */}
                  {!exam.is_tokenless && (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <KeyRound size={13} className="text-amber-500" />
                        <span>Token Masuk:</span>
                      </div>
                      {exam.token_ujian ? (
                        <span className="font-mono font-black text-slate-900 dark:text-white tracking-widest text-xs px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          {exam.token_ujian}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          Tanyakan ke Pengawas Ruang
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Button for Card */}
                  <div className="mt-3.5">
                    <button
                      type="button"
                      onClick={() => handleEnterExam(exam)}
                      className={cn(
                        'w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm',
                        isInProgress
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                      )}
                    >
                      <span>{isInProgress ? '⚡ Lanjutkan Pengerjaan Ujian' : '🚀 Masuk ke Ruang Ujian CBT Sekarang'}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Forensic / Exam Readiness Notice */}
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-0.5 leading-relaxed">
              <strong className="font-black">Tata Tertib &amp; Rekam Forensik Layar:</strong>
              <p>
                Sistem secara otomatis mendeteksi dan mencatat perpindahan tab, screenshot, dan durasi pengerjaan tiap butir. Kerjakan secara mandiri dan jujur.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            Nanti Saja (Tutup Pengarahan)
          </button>

          {onGoToCbtTab && (
            <button
              type="button"
              onClick={() => {
                handleDismiss();
                onGoToCbtTab();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <BookOpen size={14} />
              <span>Buka Menu Tab Ujian CBT</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiswaExamDispatchModal;
