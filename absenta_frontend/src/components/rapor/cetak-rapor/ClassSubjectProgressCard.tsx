import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Phone, 
  BookOpen, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { getShortSubjectName } from '../../../utils/mapelAbbreviator';

export interface ClassSubjectItem {
  mapel_id: string;
  nama_mapel: string;
  kode_mapel: string | null;
  guru_id: string | null;
  nama_guru: string | null;
  nip_guru: string | null;
  no_telepon_guru: string | null;
  total_siswa: number;
  siswa_terisi: number;
  status: 'completed' | 'partial' | 'empty';
}

export interface ClassSubjectProgressData {
  kelas?: {
    id: string;
    nama_kelas: string;
    tingkat: number;
    jurusan: string | null;
    wali_kelas: { nama_guru: string; nip: string } | null;
  } | null;
  total_siswa: number;
  total_mapel: number;
  mapel_completed: number;
  mapel_partial: number;
  mapel_empty: number;
  percentage: number;
  subjects: ClassSubjectItem[];
}

interface ClassSubjectProgressCardProps {
  data?: ClassSubjectProgressData | null;
  isLoading?: boolean;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const ClassSubjectProgressCard: React.FC<ClassSubjectProgressCardProps> = ({
  data,
  isLoading,
  tahunPelajaranId,
  semesterId,
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'completed' | 'partial' | 'empty'>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const buildNilaiUrl = (kelasId: string, mapelId: string) => {
    const params = new URLSearchParams({
      kelas_id: kelasId,
      mapel_id: mapelId,
      tab: 'wali_kelas',
    });
    if (tahunPelajaranId) params.set('tahun_pelajaran_id', tahunPelajaranId);
    if (semesterId) params.set('semester_id', semesterId);
    return `/rapor/nilai?${params.toString()}`;
  };

  const filteredSubjects = useMemo(() => {
    if (!data?.subjects) return [];
    if (filter === 'all') return data.subjects;
    return data.subjects.filter((s) => s.status === filter);
  }, [data?.subjects, filter]);

  if (isLoading) {
    return (
      <Card className="p-4 bg-white dark:bg-slate-900 border-none shadow-xs animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-2" />
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-full mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data || data.total_mapel === 0) {
    return null;
  }

  return (
    <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-none shadow-xs space-y-3">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
            {data.percentage}%
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Kelengkapan Nilai Mata Pelajaran Rombel
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400">
                {data.mapel_completed} / {data.total_mapel} Mapel Tuntas
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400">
              Monitoring pengisian nilai rapor dari guru pengampu untuk kelas binaan ini
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/40 flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <span>{isExpanded ? 'Sembunyikan Rincian' : 'Lihat Status Mapel'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, data.percentage))}%` }}
        />
      </div>

      {/* Expanded Subject Breakdown */}
      {isExpanded && (
        <div className="pt-2 space-y-3 animate-in fade-in duration-300">
          {/* Status Metric Filters */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua ({data.total_mapel})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Tuntas ({data.mapel_completed})
            </button>
            <button
              type="button"
              onClick={() => setFilter('partial')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === 'partial'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Sebagian ({data.mapel_partial})
            </button>
            <button
              type="button"
              onClick={() => setFilter('empty')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === 'empty'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Belum Diisi ({data.mapel_empty})
            </button>
          </div>

          {/* Grid Cards Mapel */}
          {filteredSubjects.length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              Tidak ada mata pelajaran dengan status ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filteredSubjects.map((s) => {
                const isComplete = s.status === 'completed';
                const isPartial = s.status === 'partial';

                return (
                  <div
                    key={s.mapel_id}
                    onClick={() => {
                      const kelasId = data.kelas?.id;
                      if (kelasId && s.mapel_id) {
                        navigate(buildNilaiUrl(kelasId, s.mapel_id));
                      }
                    }}
                    title={`Buka lembar input nilai: ${s.nama_mapel} (${data.kelas?.nama_kelas || 'Kelas Binaan'})`}
                    className={`p-3 rounded-xl border transition-all text-xs cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] group ${
                      isComplete
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-400'
                        : isPartial
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 hover:border-amber-400'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 hover:border-rose-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <span
                        className="font-bold text-slate-800 dark:text-slate-100 truncate block text-[11px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                        title={s.nama_mapel}
                      >
                        {getShortSubjectName(s.nama_mapel)}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isComplete
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                          }`}
                        >
                          {isComplete ? 'Tuntas' : isPartial ? 'Sebagian' : 'Kosong'}
                        </span>
                        <ExternalLink size={10} className="text-slate-400 group-hover:text-indigo-600 opacity-60 group-hover:opacity-100 transition-all" />
                      </div>
                    </div>

                    <div className="space-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Siswa Terisi:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {s.siswa_terisi} / {s.total_siswa}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 truncate text-slate-600 dark:text-slate-300 font-medium pt-1 border-t border-slate-200/50 dark:border-slate-800">
                        <User size={10} className="shrink-0 text-slate-400" />
                        <span className="truncate" title={s.nama_guru || 'Belum diplot guru'}>
                          {s.nama_guru || <span className="italic text-slate-400">Belum diplot guru</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
