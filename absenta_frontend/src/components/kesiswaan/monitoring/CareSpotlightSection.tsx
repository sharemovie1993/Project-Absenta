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
    <Card className="p-6 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between w-full h-full">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${spotlightTab === 'violations' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}>
              {spotlightTab === 'violations' ? <ShieldAlert size={18} /> : <Award size={18} />}
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none">Care Spotlight Siswa</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Perhatian intensif & apresiasi</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
            <button
              onClick={() => setSpotlightTab('violations')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                spotlightTab === 'violations'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <ShieldAlert size={13} />
              <span>Butuh Pembinaan</span>
            </button>
            <button
              onClick={() => setSpotlightTab('achievements')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                spotlightTab === 'achievements'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Award size={13} />
              <span>Prestasi</span>
            </button>
          </div>
        </div>

        {spotlightTab === 'violations' ? (
          isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4]?.map(i => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : careStudents.length > 0 ? (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {careStudents?.map((s, idx) => (
                <div key={s.id || idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-rose-200 dark:hover:border-rose-900/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-black text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase truncate">{s.name}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">{s.class}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 px-2 py-0.5 rounded-md">
                      +{s.points} Poin
                    </span>
                    <button
                      onClick={onNavigateToPelanggaran}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Tindak Lanjut"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-1.5">
              <Star size={28} className="text-emerald-500" />
              <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs">Kondisi Disiplin Terjaga Baik</h4>
              <p className="text-[11px] text-slate-400 max-w-xs">Tidak ada siswa dengan status butuh pembinaan intensif.</p>
            </div>
          )
        ) : (
          isLoadingLeaderboard ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4]?.map(i => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : leaderboardData.length > 0 ? (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {leaderboardData?.map((lb, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                      🏆 #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase truncate">{lb.nama_siswa}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">{lb.nama_kelas}</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 px-2 py-0.5 rounded-md shrink-0">
                    +{lb.total_poin} Poin
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-1.5">
              <Award size={28} className="text-amber-500" />
              <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs">Belum Ada Catatan Prestasi</h4>
              <p className="text-[11px] text-slate-400 max-w-xs">Data pencatatan prestasi dan apresiasi siswa belum diinput.</p>
            </div>
          )
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px]">Monitoring Evaluasi Karakter</span>
        <button
          onClick={onNavigateToPelanggaran}
          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Detail Siswa</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </Card>
  );
});
