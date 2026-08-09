import React from 'react';
import { Card } from '../../../components/ui/Card';
import { ShieldAlert, Award, Star, ArrowRight } from 'lucide-react';
import { Skeleton } from '../../../components/ui/Skeleton';

export interface CareStudentItem {
  id: string;
  name: string;
  class: string;
  points: number;
}

export interface LeaderboardItem {
  nama_siswa: string;
  nama_kelas: string;
  total_poin: number;
}

interface CareSpotlightSectionProps {
  spotlightTab: 'violations' | 'achievements';
  setSpotlightTab: (tab: 'violations' | 'achievements') => void;
  careStudents: CareStudentItem[];
  leaderboardData: LeaderboardItem[];
  isLoading: boolean;
  isLoadingLeaderboard: boolean;
  onNavigateToPelanggaran: () => void;
}

export const CareSpotlightSection: React.FC<CareSpotlightSectionProps> = React.memo(({
  spotlightTab,
  setSpotlightTab,
  careStudents,
  leaderboardData,
  isLoading,
  isLoadingLeaderboard,
  onNavigateToPelanggaran,
}) => {
  return (
    <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none">Care Spotlight & Pembinaan Siswa</h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Siswa yang memerlukan perhatian intensif & apresiasi prestasi</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setSpotlightTab('violations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              spotlightTab === 'violations'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <ShieldAlert size={14} />
            <span>Butuh Pembinaan</span>
          </button>
          <button
            onClick={() => setSpotlightTab('achievements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              spotlightTab === 'achievements'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Award size={14} />
            <span>Apresiasi Prestasi</span>
          </button>
        </div>
      </div>

      {spotlightTab === 'violations' ? (
        isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5]?.map(i => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : careStudents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {careStudents?.map((s) => (
              <div key={s.id} className="p-4 rounded-xl border border-rose-100/60 dark:border-rose-950/40 bg-rose-50/20 dark:bg-rose-950/10 flex flex-col justify-between group hover:border-rose-300 dark:hover:border-rose-800 transition-all duration-300">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">{s.class}</span>
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">+{s.points} Poin</span>
                  </div>
                  <h4 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-tight line-clamp-2">{s.name}</h4>
                </div>
                <button
                  onClick={onNavigateToPelanggaran}
                  className="mt-3 text-[10px] font-black text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <span>Tindak Lanjut</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center bg-slate-50/30 dark:bg-slate-900/10 rounded-xl border-2 border-dashed border-gray-100 dark:border-slate-800">
            <Star size={32} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Tidak ada siswa yang memerlukan pembinaan intensif saat ini.</p>
          </div>
        )
      ) : (
        isLoadingLeaderboard ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5]?.map(i => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : leaderboardData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {leaderboardData?.map((lb, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-emerald-100/60 dark:border-emerald-950/40 bg-emerald-50/20 dark:bg-emerald-950/10 flex flex-col justify-between group hover:border-emerald-300 dark:hover:border-emerald-800 transition-all duration-300">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{lb.nama_kelas}</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">🏆 {lb.total_poin} Poin</span>
                  </div>
                  <h4 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-tight line-clamp-2">{lb.nama_siswa}</h4>
                </div>
                <div className="mt-3 text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 uppercase tracking-wider">
                  <span>Siswa Berprestasi</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center bg-slate-50/30 dark:bg-slate-900/10 rounded-xl border-2 border-dashed border-gray-100 dark:border-slate-800">
            <Star size={32} className="mx-auto text-amber-400 mb-2" />
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Belum ada data prestasi tercatat.</p>
          </div>
        )
      )}
    </Card>
  );
});
