import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Search, X, Award, LogIn, BookOpen, User, Briefcase, GraduationCap } from 'lucide-react';
import { Button, Badge, Loader } from '../../ui';
import { getLeaderboardGuru } from '../../../api/attendanceGerbang.api';

export interface TeacherLeaderboardItem {
  id: string;
  nama: string;
  nip?: string;
  jenis_ptk?: string;
  gerbang_count?: number;
  kbm_count?: number;
  hadir_count: number;
  points: number;
}

interface TeacherAttendanceLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherLeaderboard?: TeacherLeaderboardItem[];
  isLoading?: boolean;
  currentUserId?: string;
  currentUserName?: string;
}

export const TeacherAttendanceLeaderboardModal: React.FC<TeacherAttendanceLeaderboardModalProps> = ({
  isOpen,
  onClose,
  teacherLeaderboard: initialData = [],
  currentUserId,
  currentUserName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPtk, setSelectedPtk] = useState<'PENDIDIK' | 'TENAGA_KEPENDIDIKAN'>('PENDIDIK');

  const { data: leaderboardRes, isLoading } = useQuery({
    queryKey: ['teacher-discipline-leaderboard-modal', selectedPtk],
    queryFn: () => getLeaderboardGuru(50, selectedPtk),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000
  });

  const activeLeaderboard = leaderboardRes?.data || (selectedPtk === 'PENDIDIK' ? initialData : []);

  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return activeLeaderboard;
    const q = searchQuery.toLowerCase();
    return activeLeaderboard.filter(
      t => t.nama.toLowerCase().includes(q) || (t.nip && t.nip.toLowerCase().includes(q))
    );
  }, [activeLeaderboard, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0">
              <Trophy size={22} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-base tracking-tight">
                Klasemen Kedisiplinan PTK
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Peringkat kepatuhan gerbang & presensi berdasarkan jenis PTK.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Tutup Modal"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </Button>
        </div>

        {/* PTK CATEGORY TABS */}
        <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/30 dark:bg-slate-900/20">
          <button
            onClick={() => setSelectedPtk('PENDIDIK')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-2xl transition-all border-b-2 ${
              selectedPtk === 'PENDIDIK'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap size={15} />
            <span>Guru Pendidik</span>
          </button>

          <button
            onClick={() => setSelectedPtk('TENAGA_KEPENDIDIKAN')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-2xl transition-all border-b-2 ${
              selectedPtk === 'TENAGA_KEPENDIDIKAN'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Briefcase size={15} />
            <span>Tenaga Kependidikan / TU</span>
          </button>
        </div>


        {/* SEARCH & FILTERS */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={selectedPtk === 'PENDIDIK' ? 'Cari nama guru atau NIP...' : 'Cari nama staf TU atau NIP...'}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-black text-xs px-3 py-1.5 border-none shrink-0">
            {filteredLeaderboard.length} {selectedPtk === 'PENDIDIK' ? 'Pendidik' : 'Staf TU'}
          </Badge>
        </div>

        {/* LEADERBOARD LIST */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader />
            </div>
          ) : filteredLeaderboard.length > 0 ? (
            filteredLeaderboard.map((t, index) => {
              const rank = index + 1;
              const isMe = t.id === currentUserId || t.nama === currentUserName;

              return (
                <div
                  key={t.id || index}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    isMe
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 shadow-md ring-1 ring-indigo-500/40'
                      : rank === 1
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40'
                      : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    {rank === 1 ? (
                      <div className="w-8 h-8 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                        🥇
                      </div>
                    ) : rank === 2 ? (
                      <div className="w-8 h-8 rounded-2xl bg-slate-300 text-slate-900 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                        🥈
                      </div>
                    ) : rank === 3 ? (
                      <div className="w-8 h-8 rounded-2xl bg-amber-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                        🥉
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                        #{rank}
                      </div>
                    )}

                    {/* Teacher Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-xs font-black truncate ${isMe ? 'text-indigo-950 dark:text-indigo-100' : 'text-slate-800 dark:text-slate-100'}`}>
                          {t.nama}
                        </p>
                        {isMe && (
                          <Badge className="bg-indigo-600 text-white font-black text-[9px] px-2 py-0.2 border-none">
                            Saya
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                        {t.nip && t.nip !== '-' && <span>NIP: {t.nip}</span>}
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <LogIn size={11} className="text-indigo-500" /> {t.gerbang_count || 0}x Gerbang
                        </span>
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <BookOpen size={11} className="text-emerald-500" /> {t.kbm_count || 0}x KBM
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Points Badge */}
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 block">
                      {t.points} Pts
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      {t.hadir_count} Hari Hadir
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Tidak ada data pengajar yang sesuai dengan pencarian.
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Klasemen diperbarui secara berkala berdasarkan log presensi harian.</span>
          <Button size="sm" variant="ghost" onClick={onClose} className="rounded-xl">
            Tutup
          </Button>
        </div>

      </div>
    </div>
  );
};
