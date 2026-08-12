import React from 'react';
import { Student, AchievementRecord } from '../types';
import { 
  Trophy, Award, Star, Crown, Zap, Send, Medal, Sparkles, CheckCircle, HeartHandshake, ShieldCheck
} from 'lucide-react';

interface WaliKelasAchievementPanelProps {
  students: Student[];
  achievements: AchievementRecord[];
  onOpenBadgeModal: (student: Student) => void;
  onSelectStudent: (studentId: string) => void;
}

export const WaliKelasAchievementPanel: React.FC<WaliKelasAchievementPanelProps> = ({
  students,
  achievements,
  onOpenBadgeModal,
  onSelectStudent
}) => {
  // Sort students for Top 3 podium
  const starStudents = [...students]
    .sort((a, b) => (b.academicAverage + b.goodDeedsPoints) - (a.academicAverage + a.goodDeedsPoints))
    .slice(0, 3);

  const getRankColor = (rank: number) => {
    if (rank === 0) return 'from-amber-400 via-amber-300 to-amber-500 border-amber-300 text-amber-950'; // Gold
    if (rank === 1) return 'from-slate-300 via-slate-200 to-slate-400 border-slate-300 text-slate-900'; // Silver
    return 'from-amber-700 via-amber-600 to-amber-800 border-amber-600 text-amber-50'; // Bronze
  };

  const getCrownIcon = (rank: number) => {
    if (rank === 0) return '🥇 Top 1 Rombel';
    if (rank === 1) return '🥈 Top 2 Rombel';
    return '🥉 Top 3 Rombel';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-purple-900/50 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Hall of Fame XI RPL 1
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Siswa Teladan & Apresiasi Prestasi</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Penghargaan otomatis untuk 3 siswa terbaik berdasarkan kalkulasi 100% presensi, poin kebaikan, prestasi lomba, dan sikap teladan.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-purple-900/40 p-3 rounded-2xl border border-purple-500/30">
            <Sparkles className="w-8 h-8 text-amber-300 animate-spin-slow" />
            <div className="text-xs">
              <span className="text-purple-200 block">Total Poin Kebaikan Rombel:</span>
              <strong className="text-amber-300 font-extrabold text-base">1,240 Poin Pozitif</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Podium Top 3 Star Students */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          Star Students Rombel (Top 3 Teladan)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {starStudents.map((st, rank) => (
            <div
              key={st.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md hover:shadow-lg transition-all relative overflow-hidden flex flex-col justify-between group"
            >
              {/* Rank Header Accent */}
              <div className={`p-2.5 rounded-xl bg-gradient-to-r ${getRankColor(rank)} font-bold text-xs flex items-center justify-between mb-4 shadow-xs`}>
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  {getCrownIcon(rank)}
                </span>
                <span className="bg-white/90 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                  {st.academicAverage}% Rata Rapor
                </span>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={st.avatar}
                    alt={st.name}
                    onClick={() => onSelectStudent(st.id)}
                    className="w-14 h-14 rounded-full object-cover ring-4 ring-amber-100 cursor-pointer hover:opacity-80 transition-opacity"
                  />
                  <div>
                    <h4 
                      onClick={() => onSelectStudent(st.id)}
                      className="font-bold text-slate-900 text-base hover:text-indigo-600 cursor-pointer"
                    >
                      {st.name}
                    </h4>
                    <p className="text-xs text-slate-500">NIS: {st.nis}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Presensi: {st.attendanceRate}%
                    </span>
                  </div>
                </div>

                {/* Good Deeds & Badges list */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Poin Kebaikan:</span>
                    <strong className="text-purple-700 font-extrabold">+{st.goodDeedsPoints} Poin</strong>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Badge Penghargaan Terpasang:
                    </span>
                    {st.badges.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px]">Belum ada badge khusus</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {st.badges.map(b => (
                          <span key={b.id} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                            {b.badgeName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button to Award Badge */}
              <button
                onClick={() => onOpenBadgeModal(st)}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                Kirim Badge / Sertifikat Digital
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Prestasi & Poin Kebaikan Stream */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Medal className="w-5 h-5 text-indigo-600" />
          Rekapitulasi Prestasi & Catatan Positif Siswa
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all bg-gradient-to-r from-purple-50/20 via-white to-white flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <img
                  src={ach.avatar}
                  alt={ach.studentName}
                  onClick={() => onSelectStudent(ach.studentId)}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-200 shrink-0 cursor-pointer"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 
                      onClick={() => onSelectStudent(ach.studentId)}
                      className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer"
                    >
                      {ach.studentName}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900">
                      Tingkat {ach.level}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-purple-950 mt-1">{ach.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{ach.description}</p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                    <span>Tanggal: <strong className="text-slate-600">{ach.date}</strong></span>
                    <span>Kategori: <strong className="text-slate-600">{ach.category}</strong></span>
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 shrink-0">
                +{ach.points} Poin
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
