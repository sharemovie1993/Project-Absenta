import React, { memo, useState, useMemo, useEffect } from 'react';
import {
  X,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ExternalLink,
  User,
  Phone,
  Sparkles,
  Layers
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { SearchableSelect, SearchableSelectOption } from '../../ui/SearchableSelect';
import { ClassSubjectProgressData, ClassSubjectItem } from '../cetak-rapor/ClassSubjectProgressCard';
import { getShortSubjectName } from '../../../utils/mapelAbbreviator';

export interface MonitoringMapelRombelModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: ClassSubjectProgressData | null;
  isLoading?: boolean;
  selectedKelas: string;
  kelasOptions?: SearchableSelectOption[];
  onSelectKelas?: (kelasId: string) => void;
  onSelectMapel?: (mapelId: string, kelasId?: string) => void;
  activeYearNama?: string;
  activeSemesterNama?: string;
  kelasNama?: string;
}

export const MonitoringMapelRombelModal: React.FC<MonitoringMapelRombelModalProps> = memo(({
  isOpen,
  onClose,
  data,
  isLoading,
  selectedKelas,
  kelasOptions = [],
  onSelectKelas,
  onSelectMapel,
  activeYearNama,
  activeSemesterNama,
  kelasNama,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'partial' | 'empty'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset filter when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setFilterStatus('all');
    }
  }, [isOpen]);

  const subjects = useMemo(() => data?.subjects || [], [data?.subjects]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMapel = s.nama_mapel?.toLowerCase().includes(q);
        const matchGuru = s.nama_guru?.toLowerCase().includes(q);
        if (!matchMapel && !matchGuru) return false;
      }
      return true;
    });
  }, [subjects, filterStatus, searchQuery]);

  if (!isOpen) return null;

  const currentClassName = data?.kelas?.nama_kelas || kelasNama || 'Rombel Terpilih';
  const percentage = data?.percentage ?? 0;
  const totalMapel = data?.total_mapel ?? subjects.length;
  const mapelCompleted = data?.mapel_completed ?? subjects.filter(s => s.status === 'completed').length;
  const mapelPartial = data?.mapel_partial ?? subjects.filter(s => s.status === 'partial').length;
  const mapelEmpty = data?.mapel_empty ?? subjects.filter(s => s.status === 'empty').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="monitoring-modal-title"
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="monitoring-modal-title" className="font-bold text-slate-900 dark:text-white text-base">
                  Monitoring Status Pengisian Nilai Mapel
                </h3>
                <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                  {currentClassName}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeYearNama || 'TP Aktif'} • {activeSemesterNama || 'Semester Aktif'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {kelasOptions.length > 0 && onSelectKelas && (
              <div className="w-44 sm:w-52">
                <SearchableSelect
                  options={kelasOptions}
                  value={selectedKelas}
                  onValueChange={onSelectKelas}
                  placeholder="Ganti Rombel..."
                />
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Tutup Modal"
              aria-label="Tutup Modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Mapel</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-slate-800 dark:text-slate-100">{totalMapel}</span>
                <span className="text-[10px] text-slate-400">mata pelajaran</span>
              </div>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Tuntas Terisi</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{mapelCompleted}</span>
                <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">mapel ({totalMapel > 0 ? Math.round((mapelCompleted / totalMapel) * 100) : 0}%)</span>
              </div>
            </div>

            <div className="bg-amber-50/60 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/40">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Sebagian / Proses</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-amber-700 dark:text-amber-300">{mapelPartial}</span>
                <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">mapel</span>
              </div>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/30 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/40">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Belum Ada Nilai</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-rose-700 dark:text-rose-300">{mapelEmpty}</span>
                <span className="text-[10px] text-rose-600/70 dark:text-rose-400/70">mapel</span>
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-300">Ketuntasan Pengisian Rombel</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{percentage}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Semua ({totalMapel})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Tuntas ({mapelCompleted})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('partial')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === 'partial'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Sebagian ({mapelPartial})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('empty')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === 'empty'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Kosong ({mapelEmpty})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari mapel atau guru..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Subjects Grid */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
              Memuat status pengisian mapel rombel...
            </div>
          ) : !selectedKelas ? (
            <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-2">
              <Layers className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Pilih Kelas Terlebih Dahulu</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Silakan pilih kelas rombel di bagian atas untuk melihat rincian progres pengisian nilai mata pelajaran.
              </p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-2">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {searchQuery ? 'Mata Pelajaran Tidak Ditemukan' : 'Belum Ada Jadwal KBM'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? `Tidak ada mata pelajaran yang cocok dengan kata kunci "${searchQuery}".`
                  : 'Rombel ini belum memiliki jadwal KBM yang terdaftar pada semester ini.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSubjects.map((s) => {
                const isComplete = s.status === 'completed';
                const isPartial = s.status === 'partial';
                const percent = s.total_siswa > 0 ? Math.round((s.siswa_terisi / s.total_siswa) * 100) : 0;

                return (
                  <div
                    key={s.mapel_id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isComplete
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                        : isPartial
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-1" title={s.nama_mapel}>
                          {s.nama_mapel}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                            isComplete
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                          }`}
                        >
                          {isComplete ? 'Tuntas' : isPartial ? 'Sebagian' : 'Kosong'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 mb-2.5">
                        <User size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate" title={s.nama_guru || 'Belum diplot guru'}>
                          {s.nama_guru || <span className="italic text-slate-400">Belum diplot guru</span>}
                        </span>
                      </div>

                      {/* Mini Bar Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>Keterisian Siswa:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {s.siswa_terisi} / {s.total_siswa} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200/80 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isComplete ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-rose-400'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {onSelectMapel && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectMapel(s.mapel_id, selectedKelas);
                          onClose();
                        }}
                        className="w-full py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700 hover:border-transparent transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer group"
                      >
                        <span>Buka Lembar Nilai</span>
                        <ExternalLink size={12} className="text-slate-400 group-hover:text-white transition-colors" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-400 text-[11px] hidden sm:block">
            Klik <strong className="text-slate-600 dark:text-slate-300">Buka Lembar Nilai</strong> untuk langsung mengarahkan ke mapel terpilih.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all ml-auto cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
});

MonitoringMapelRombelModal.displayName = 'MonitoringMapelRombelModal';
