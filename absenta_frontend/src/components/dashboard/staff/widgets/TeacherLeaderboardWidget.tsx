import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Award, 
  ChevronRight, 
  Sparkles, 
  TrendingUp, 
  BookOpen, 
  CheckCircle2, 
  User, 
  ShieldCheck 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PersonPhoto } from '@/components/ui/PersonPhoto';
import type { LeaderboardGuruItem } from '@/api/attendanceGerbang.api';

interface TeacherLeaderboardWidgetProps {
  leaderboard?: LeaderboardGuruItem[];
  isLoading?: boolean;
  currentUserId?: string;
  currentGuruId?: string;
  currentUserName?: string;
  onOpenLeaderboard: () => void;
  className?: string;
}

export const TeacherLeaderboardWidget: React.FC<TeacherLeaderboardWidgetProps> = React.memo(({
  leaderboard = [],
  isLoading = false,
  currentUserId,
  currentGuruId,
  currentUserName,
  onOpenLeaderboard,
  className
}) => {
  // Temukan posisi ranking guru yang sedang login
  const myIndex = leaderboard.findIndex((item) => {
    if (currentGuruId && item.id === currentGuruId) return true;
    if (currentUserId && item.id === currentUserId) return true;
    if (currentUserName && item.nama?.trim().toLowerCase() === currentUserName.trim().toLowerCase()) return true;
    return false;
  });

  const myData = myIndex !== -1 ? leaderboard[myIndex] : null;
  const myRank = myIndex !== -1 ? myIndex + 1 : null;
  const totalGuru = leaderboard.length;

  // 3 Besar Guru Teladan
  const topThree = leaderboard.slice(0, 3);

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 shadow-sm p-4 sm:p-5",
        className
      )}
    >
      {/* Background Ambient Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/10 dark:bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header Widget */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Trophy size={16} className="text-amber-500" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-tight truncate flex items-center gap-1.5">
              Klasemen & Poin Kinerja
              <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                Bulan Ini
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Apresiasi kedisiplinan mengajar & pengisian jurnal
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors shrink-0 group py-1 px-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
        >
          <span>Buka Klasemen</span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Personal Rank Highlight Bento Card */}
      <div className="rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/60 dark:border-amber-800/40 p-3 sm:p-3.5 mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-white font-black text-lg flex items-center justify-center shadow-md shadow-amber-500/20">
              {myRank ? (
                myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : `#${myRank}`
              ) : (
                '🏆'
              )}
            </div>
            {myRank && myRank <= 3 && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow">
                ★
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Peringkat Saya:
              </span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                {myRank ? `#${myRank} dari ${totalGuru} Pendidik` : 'Menghitung Skor...'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono text-sm">
                {myData?.points ?? 0} Pts
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-slate-500 dark:text-slate-400 truncate">
                {myData?.status_keaktifan === 'AKTIF' 
                  ? 'Pendidik Aktif' 
                  : myData?.status_keaktifan === 'BELUM_ADA_SESI' 
                    ? 'Belum Ada Sesi KBM' 
                    : 'Belum Hadir'}
              </span>
            </div>
          </div>
        </div>

        {/* Micro Score Badges */}
        {myData && (
          <div className="flex items-center gap-2 text-xs divide-x divide-amber-200 dark:divide-amber-800/40 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/40">
            <div className="flex flex-col pr-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Sesi Hadir</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {myData.hadir_count} / {myData.kbm_total || 0}
              </span>
            </div>
            <div className="flex flex-col pl-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Jurnal KBM</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {myData.jurnal_rate}% Terisi
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Top 3 Inspiring Teachers Preview */}
      {topThree.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>3 Peringkat Teratas Bulan Ini</span>
            <span className="text-[10px] lowercase font-normal text-slate-400">skor realtime</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {topThree.map((item, idx) => {
              const isMe = item.id === currentGuruId || item.id === currentUserId || (currentUserName && item.nama?.trim().toLowerCase() === currentUserName.trim().toLowerCase());
              return (
                <div
                  key={item.id}
                  onClick={onOpenLeaderboard}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer",
                    isMe 
                      ? "bg-amber-100/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-sm"
                      : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-800/50"
                  )}
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                  <PersonPhoto
                    name={item.nama}
                    foto={(item as any).foto}
                    variant="circle"
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                      {item.nama} {isMe && <span className="text-amber-600 dark:text-amber-400 font-extrabold">(Saya)</span>}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {item.points} Pts
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

TeacherLeaderboardWidget.displayName = 'TeacherLeaderboardWidget';
