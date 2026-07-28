import React, { useState } from 'react';
import { z } from 'zod';
import { Search, Trophy } from 'lucide-react';
import { Modal, Badge, Loader } from '../../ui';
import type { StudentAttendanceRecord } from './StudentAttendanceTypes';

const leaderboardSearchSchema = z.object({
  search: z.string().optional()
});

interface StudentAttendanceLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaderboardScope: 'KELAS' | 'JURUSAN' | 'SEKOLAH';
  onScopeChange: (scope: 'KELAS' | 'JURUSAN' | 'SEKOLAH') => void;
  activeLeaderboardList: StudentAttendanceRecord[];
  isScopedLoading: boolean;
  mySiswaProfileId?: string;
  userSiswaId?: string;
  userId?: string;
  userName?: string;
  rekapNamaSiswa?: string;
}

export const StudentAttendanceLeaderboardModal: React.FC<StudentAttendanceLeaderboardModalProps> = ({
  isOpen,
  onClose,
  leaderboardScope,
  onScopeChange,
  activeLeaderboardList,
  isScopedLoading,
  mySiswaProfileId,
  userSiswaId,
  userId,
  userName,
  rekapNamaSiswa
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const parseResult = leaderboardSearchSchema.safeParse({ search: val });
    if (parseResult.success) {
      setSearchQuery(val);
    }
  };

  const filteredList = activeLeaderboardList?.filter((s) => {
    const studentName = s.nama || s.nama_siswa || '';
    return studentName.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏆 Klasemen Poin Kedisiplinan"
      size="lg"
    >
      <div className="p-4 space-y-4 text-xs">
        {/* Tab Switch Scope Klasemen */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onScopeChange('KELAS')}
            className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all ${
              leaderboardScope === 'KELAS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🏫 1 Kelas
          </button>
          <button
            type="button"
            onClick={() => onScopeChange('JURUSAN')}
            className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all ${
              leaderboardScope === 'JURUSAN'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🎓 1 Jurusan
          </button>
          <button
            type="button"
            onClick={() => onScopeChange('SEKOLAH')}
            className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all ${
              leaderboardScope === 'SEKOLAH'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🌟 Se-Sekolah
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            aria-label="Cari nama siswa pada klasemen"
            placeholder={
              leaderboardScope === 'KELAS'
                ? 'Cari nama teman sekelas...'
                : leaderboardScope === 'JURUSAN'
                ? 'Cari siswa sejurusan...'
                : 'Cari siswa se-sekolah...'
            }
            value={searchQuery}
            onChange={handleSearchChange}
            className="bg-transparent border-none outline-none w-full text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
        </div>

        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {isScopedLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col justify-center items-center gap-2">
              <Loader size="md" />
              <span>
                Memuat klasemen{' '}
                {leaderboardScope === 'SEKOLAH'
                  ? 'se-sekolah'
                  : leaderboardScope === 'JURUSAN'
                  ? 'se-jurusan'
                  : 'se-kelas'}
                ...
              </span>
            </div>
          ) : (
            filteredList?.map((student, idx) => {
              const isMe =
                student.is_me ||
                student.id === mySiswaProfileId ||
                student.id === userSiswaId ||
                student.id === userId ||
                student.nama === userName ||
                student.nama === rekapNamaSiswa;
              const hadirCount = student.hadir ?? 0;
              const telatCount = student.terlambat ?? 0;
              const alpaCount = student.alpa ?? 0;
              const izinSakitCount = (student.izin ?? 0) + (student.sakit ?? 0);
              const totalPoin = student.total_poin ?? (hadirCount ? hadirCount * 10 : 0);

              return (
                <div
                  key={student.id || idx}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    isMe
                      ? 'bg-indigo-50/90 border-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-700 shadow-sm ring-1 ring-indigo-400/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950 shadow-amber-500/20'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      #{idx + 1}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs truncate">
                          {student.nama || student.nama_siswa}{' '}
                          {student.nama_kelas ? `(${student.nama_kelas})` : ''}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-black text-[9px] uppercase shrink-0">
                            Saya
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {hadirCount} Hari Hadir{' '}
                        {telatCount > 0 ? `• ${telatCount} Telat` : ''}{' '}
                        {izinSakitCount > 0 ? `• ${izinSakitCount} Izin` : ''}{' '}
                        {alpaCount > 0 ? `• ${alpaCount} Alpa` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-none font-black text-xs px-2.5 py-1">
                      {totalPoin} Pts
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StudentAttendanceLeaderboardModal;
