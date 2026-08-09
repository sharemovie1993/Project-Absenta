import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button } from '../../ui';
import { Badge } from '../../ui/Badge';
import { Search, RefreshCw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { TeacherBebanItem } from './types';
import { kurikulumApi } from '../../../api/kurikulum.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loadingBeban?: boolean;
  bebanGuruList?: TeacherBebanItem[];
  onSelectTeacherForSchedule?: (guruId: string) => void;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const BebanGuruSummaryModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  loadingBeban: externalLoading,
  bebanGuruList: externalList,
  onSelectTeacherForSchedule,
  tahunPelajaranId,
  semesterId,
}) => {
  const [searchBebanGuru, setSearchBebanGuru] = useState('');

  // Internal query if external list is not provided
  const { data: internalRes, isLoading: internalLoading } = useQuery({
    queryKey: ['beban-guru-modal-list', tahunPelajaranId, semesterId],
    queryFn: () => (tahunPelajaranId && semesterId) ? kurikulumApi.getBebanMengajar({
      tahun_pelajaran_id: tahunPelajaranId,
      semester_id: semesterId
    }).catch(() => null) : null,
    enabled: isOpen && !externalList && !!tahunPelajaranId && !!semesterId,
    staleTime: 5 * 60 * 1000,
  });

  const listToUse = useMemo(() => {
    if (Array.isArray(externalList)) return externalList;
    if (Array.isArray(internalRes?.data)) return internalRes.data;
    return [];
  }, [externalList, internalRes]);

  const isLoading = externalLoading ?? internalLoading;

  const filteredList = useMemo(() => {
    return listToUse.filter((b) =>
      (b.nama_guru || '').toLowerCase().includes(searchBebanGuru.toLowerCase())
    );
  }, [listToUse, searchBebanGuru]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rangkuman Beban Mengajar Guru (JP)"
      size="2xl"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama guru..."
            value={searchBebanGuru}
            onChange={(e) => setSearchBebanGuru(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="max-h-[400px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-xs text-slate-500">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin text-indigo-500" />
              Memuat data beban mengajar...
            </div>
          ) : filteredList.length > 0 ? (
            filteredList.map((b) => {
              const totalCalculatedJp = b.total_calculated_jp ?? b.current_jp ?? 0;
              const currentKbmJp = b.current_jp ?? 0;
              const positionJp = b.ekuivalen_position_jp ?? 0;
              const maxJp = b.max_jp ?? 24;

              const percent = Math.min(100, Math.round((totalCalculatedJp / maxJp) * 100));
              const isExceeded = totalCalculatedJp > maxJp;
              const activePositions = b.positions || [];

              return (
                <div key={b.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">{b.nama_guru}</span>
                      {isExceeded && (
                        <Badge className="bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-[9px] font-black border-rose-200">
                          OVERLOAD (+{totalCalculatedJp - maxJp} JP)
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">NIP: {b.nip || '-'}</p>

                    {/* Position Badges */}
                    {activePositions.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {activePositions.map((pos, pIdx) => (
                          <span
                            key={pIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40"
                          >
                            🔰 {pos.name} (+{pos.ekuivalen_jp} JP)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-1 md:justify-end max-w-md w-full">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>
                          Progress JP {positionJp > 0 ? `(KBM: ${currentKbmJp} + Jabatan: ${positionJp})` : ''}
                        </span>
                        <span className={isExceeded ? 'text-red-500 font-extrabold' : ''}>
                          {totalCalculatedJp} / {maxJp} JP
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            isExceeded ? 'bg-rose-500' : percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {onSelectTeacherForSchedule && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                        onClick={() => onSelectTeacherForSchedule(b.id)}
                      >
                        Lihat Jadwal
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">Guru tidak ditemukan.</div>
          )}
        </div>
      </div>
    </Modal>
  );
});
