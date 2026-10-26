import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  QrCode,
  AlertCircle,
  FileText,
  Sparkles,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { StudentBadge, SiswaGamification } from '../types';

export interface SiswaHeaderBannerProps {
  studentName: string;
  studentInitials: string;
  studentPhotoUrl: string | null;
  currentNisn: string;
  currentJurusan: string;
  currentClassName: string;
  isPetugasKelas: boolean;
  studentBadges: StudentBadge[];
  gamification: SiswaGamification;
  onOpenDigitalCard: () => void;
  onOpenBelumAbsen: () => void;
}

export const SiswaHeaderBanner: React.FC<SiswaHeaderBannerProps> = ({
  studentName,
  studentInitials,
  studentPhotoUrl,
  currentNisn,
  currentJurusan,
  currentClassName,
  isPetugasKelas,
  studentBadges,
  gamification,
  onOpenDigitalCard,
  onOpenBelumAbsen,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Student Identity Left */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="relative shrink-0">
            {studentPhotoUrl ? (
              <img
                src={studentPhotoUrl}
                alt={studentName}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-md shadow-blue-500/10"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xl flex items-center justify-center ring-2 ring-blue-500/30 shadow-md shadow-blue-500/10">
                {studentInitials}
              </div>
            )}
            {/* Gamification Level Pill on Avatar */}
            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 ring-2 ring-white dark:ring-slate-900 flex items-center gap-0.5 shadow-xs">
              <Sparkles size={9} />
              <span>Lv.{gamification.level}</span>
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                {studentName}
              </h1>
              {gamification.streakDays > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                  <Flame size={12} className="animate-pulse" />
                  <span>{gamification.streakDays} Hari Streak</span>
                </span>
              )}
            </div>

            {/* Badges Flow */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {studentBadges.map((badge) => {
                const BadgeIcon = badge.icon;
                return (
                  <span
                    key={badge.key}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] border',
                      badge.color
                    )}
                  >
                    {BadgeIcon && <BadgeIcon size={11} />}
                    <span>{badge.label}</span>
                  </span>
                );
              })}
            </div>

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
              <span>NISN: {currentNisn}</span>
              {currentJurusan && currentJurusan !== '-' && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span>{currentJurusan}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons on Right */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 self-stretch sm:self-auto justify-start sm:justify-end">
          {isPetugasKelas && (
            <>
              <Button
                size="sm"
                onClick={() => navigate('/attendance/ops?tab=sesi')}
                className="h-9 sm:h-10 px-3.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 border-none cursor-pointer"
                title={`Presensi Kelas Saya (${currentClassName})`}
              >
                <CheckCircle2 size={15} />
                <span>Presensi Kelas</span>
              </Button>

              <Button
                size="sm"
                onClick={onOpenBelumAbsen}
                className="h-9 sm:h-10 px-3.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white border-none flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
                title={`Cek Siswa Belum Absen & Presensi Manual (${currentClassName})`}
              >
                <AlertCircle size={15} />
                <span>Belum Absensi</span>
              </Button>

              <Button
                size="sm"
                onClick={() => navigate('/attendance/ops?tab=jurnal')}
                className="h-9 sm:h-10 px-3.5 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700/80 flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Input Jurnal KBM Kelas"
              >
                <FileText size={15} />
                <span>Jurnal KBM</span>
              </Button>
            </>
          )}

          <Button
            size="sm"
            onClick={onOpenDigitalCard}
            className="h-9 sm:h-10 px-3.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
            title="Buka Kartu Pelajar Digital"
          >
            <QrCode size={15} />
            <span>Kartu Digital</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
