import React from 'react';
import {
  Laptop,
  Clock,
  MapPin,
  KeyRound,
  ArrowRight,
  X,
  Sparkles,
  BookOpen,
  FileText,
  ShieldCheck,
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

  // Nama panggilan ramah siswa (first name)
  const firstName = studentName
    ? studentName.trim().split(' ')[0].toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
    : 'Siswa';

  const handleEnterExam = (exam: CbtStudentExamItem) => {
    const url = `/cbt/ruang-ujian?jadwal_id=${encodeURIComponent(exam.id)}${
      exam.token_ujian ? `&token=${encodeURIComponent(exam.token_ujian)}` : ''
    }`;
    window.location.assign(url);
  };

  const handleDismiss = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Soft Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />

        {/* Header - Friendly & Calming */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
              <Laptop size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sesi Ujian Aktif
                </span>
                {activeExams.length > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {activeExams.length} Sesi
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Semangat Ujian, {firstName}! ✨
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sesi ujianmu sudah dibuka dan siap untuk dikerjakan.
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
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar">
          {/* Exam Cards */}
          <div className="space-y-3">
            {activeExams.map((exam, idx) => {
              const isInProgress = exam.status_peserta === 'IN_PROGRESS';
              const isRemedial = Boolean(
                exam.nama_sesi?.toUpperCase()?.includes('REMEDIAL') ||
                exam.nama_sesi?.toUpperCase()?.includes('SUSULAN')
              );
              const room = exam.ruang_ujian || exam.ruang_ujian_nama || 'Ruang Kelas';

              return (
                <div
                  key={exam.id}
                  className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3"
                >
                  {/* Badge Tipe & Status */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wide',
                        isRemedial
                          ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
                          : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60'
                      )}
                    >
                      {isRemedial ? '⏱️ Remedial & Susulan' : '📝 Asesmen Sumatif CBT'}
                    </span>

                    {isInProgress ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                        Sedang Berjalan
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                        Siap Mulai
                      </span>
                    )}
                  </div>

                  {/* Judul Mata Pelajaran */}
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                      {exam.mapel || exam.judul_bank || exam.nama_sesi}
                    </h4>
                    {exam.judul_bank && exam.judul_bank !== exam.mapel && !isRemedial && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {exam.judul_bank}
                      </p>
                    )}
                  </div>

                  {/* Ringkasan Metadata: Pills Bersih & Jelas */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 font-medium">
                      <Clock size={13} className="text-indigo-500 shrink-0" />
                      <span>{exam.durasi_menit} Menit</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 font-medium">
                      <FileText size={13} className="text-sky-500 shrink-0" />
                      <span>{exam.total_soal} Butir Soal</span>
                    </span>

                    {exam.is_tokenless ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium">
                        <KeyRound size={13} className="text-emerald-500 shrink-0" />
                        <span>Bebas Token</span>
                      </span>
                    ) : exam.token_ujian ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white">
                        <KeyRound size={13} className="text-amber-500 shrink-0" />
                        <span>Token: {exam.token_ujian}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-medium">
                        <KeyRound size={13} className="text-amber-500 shrink-0" />
                        <span>Token Pengawas</span>
                      </span>
                    )}

                    {room && !room.includes('Ruang CBT') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                        <MapPin size={13} className="shrink-0" />
                        <span className="truncate max-w-[150px]">{room}</span>
                      </span>
                    )}
                  </div>

                  {/* Tombol Aksi Utama */}
                  <div className="pt-1">
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
                      <span>{isInProgress ? '⚡ Lanjutkan Pengerjaan Ujian' : 'Mulai Kerjakan Ujian Sekarang'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Friendly Tips & Kejujuran (Calming & Encouraging) */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={16} />
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Kerjakan dengan tenang, percaya diri, dan jujur ya! 🌟
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pastikan tetap berada di layar ujian dan hindari berpindah aplikasi agar sesimu berjalan lancar.
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Sederhana & Tenang */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Nanti Saja
          </button>

          {onGoToCbtTab && (
            <button
              type="button"
              onClick={() => {
                handleDismiss();
                onGoToCbtTab();
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors flex items-center gap-1.5"
            >
              <BookOpen size={13} />
              <span>Buka Menu CBT</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiswaExamDispatchModal;
