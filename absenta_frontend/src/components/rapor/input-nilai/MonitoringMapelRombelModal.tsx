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
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { SearchableSelect, SearchableSelectOption } from '../../ui/SearchableSelect';
import { ClassSubjectProgressData, ClassSubjectItem } from '../cetak-rapor/ClassSubjectProgressCard';
import { getShortSubjectName } from '../../../utils/mapelAbbreviator';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { cn } from '../../../lib/utils';

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
  isWaliKelas?: boolean;
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
  isWaliKelas = false,
}) => {
  const isMobile = useIsMobile(640);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'partial' | 'empty'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

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

  const handleCopySummary = () => {
    const lines = [
      `📊 *STATUS PENGISIAN NILAI RAPOR*`,
      `Kelas: *${currentClassName}*`,
      `T.A: ${activeYearNama || 'TP Aktif'} (${activeSemesterNama || 'Semester Aktif'})`,
      `Ketuntasan: *${percentage}%* (${mapelCompleted}/${totalMapel} Mapel Tuntas)`,
      ``,
      `*Daftar Status Pengisian Mapel:*`,
      ...subjects.map((s, idx) => {
        const icon = s.status === 'completed' ? '✅' : s.status === 'partial' ? '⏳' : '❌';
        const label = s.status === 'completed' ? 'TUNTAS' : s.status === 'partial' ? 'PROSES' : 'BELUM';
        return `${idx + 1}. ${icon} [${label}] *${s.nama_mapel}*\n   Guru: ${s.nama_guru || 'Belum diplot'} (${s.siswa_terisi}/${s.total_siswa} siswa)`;
      }),
      ``,
      `_Diperbarui otomatis via Absenta.id_`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="monitoring-modal-title"
      >
        {/* Header Modal */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 id="monitoring-modal-title" className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Monitoring
                </h3>
                <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 py-0 px-1.5 shrink-0">
                  {currentClassName}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {activeYearNama || 'TP Aktif'} • {activeSemesterNama || 'Semester'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isWaliKelas && kelasOptions.length > 1 && onSelectKelas && (
              <div className="w-36 sm:w-48">
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
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {/* Analytic Card as Control Filter */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-200">Ketuntasan Nilai</span>
                <span className="text-[10px] text-slate-400">({mapelCompleted}/{totalMapel} mapel)</span>
              </div>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono text-xs">{percentage}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>

            {/* 4 Clickable Filter Boxes */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-0.5 text-center">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={cn(
                  'py-2 px-1 rounded-xl border text-center transition-all cursor-pointer active:scale-95',
                  filterStatus === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs ring-2 ring-slate-900/20'
                    : 'bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
                )}
                title="Tampilkan Semua Mapel"
              >
                <div className={cn('text-[9px] font-bold uppercase', filterStatus === 'all' ? 'text-slate-200 dark:text-slate-700' : 'text-slate-400')}>
                  Total
                </div>
                <div className={cn('text-xs sm:text-sm font-black mt-0.5', filterStatus === 'all' ? 'text-white dark:text-slate-900' : 'text-slate-800 dark:text-slate-100')}>
                  {totalMapel}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={cn(
                  'py-2 px-1 rounded-xl border text-center transition-all cursor-pointer active:scale-95',
                  filterStatus === 'completed'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/30'
                    : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60 hover:border-emerald-400'
                )}
                title="Filter Mapel Tuntas"
              >
                <div className={cn('text-[9px] font-bold uppercase', filterStatus === 'completed' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400')}>
                  Tuntas
                </div>
                <div className={cn('text-xs sm:text-sm font-black mt-0.5', filterStatus === 'completed' ? 'text-white' : 'text-emerald-700 dark:text-emerald-300')}>
                  {mapelCompleted}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('partial')}
                className={cn(
                  'py-2 px-1 rounded-xl border text-center transition-all cursor-pointer active:scale-95',
                  filterStatus === 'partial'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/30'
                    : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60 hover:border-amber-400'
                )}
                title="Filter Mapel Proses / Sebagian"
              >
                <div className={cn('text-[9px] font-bold uppercase', filterStatus === 'partial' ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400')}>
                  Proses
                </div>
                <div className={cn('text-xs sm:text-sm font-black mt-0.5', filterStatus === 'partial' ? 'text-white' : 'text-amber-700 dark:text-amber-300')}>
                  {mapelPartial}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('empty')}
                className={cn(
                  'py-2 px-1 rounded-xl border text-center transition-all cursor-pointer active:scale-95',
                  filterStatus === 'empty'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/30'
                    : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60 hover:border-rose-400'
                )}
                title="Filter Mapel Belum Ada Nilai"
              >
                <div className={cn('text-[9px] font-bold uppercase', filterStatus === 'empty' ? 'text-rose-100' : 'text-rose-600 dark:text-rose-400')}>
                  Kosong
                </div>
                <div className={cn('text-xs sm:text-sm font-black mt-0.5', filterStatus === 'empty' ? 'text-white' : 'text-rose-700 dark:text-rose-300')}>
                  {mapelEmpty}
                </div>
              </button>
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
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredSubjects.map((s, idx) => {
                const isComplete = s.status === 'completed';
                const isPartial = s.status === 'partial';
                const percent = s.total_siswa > 0 ? Math.round((s.siswa_terisi / s.total_siswa) * 100) : 0;

                return (
                  <div
                    key={s.mapel_id}
                    onClick={() => {
                      if (onSelectMapel) {
                        onSelectMapel(s.mapel_id, selectedKelas);
                        onClose();
                      }
                    }}
                    className={cn(
                      'flex items-center justify-between gap-2.5 p-2.5 sm:px-4 sm:py-3 transition-colors cursor-pointer group',
                      isComplete
                        ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                        : isPartial
                        ? 'hover:bg-amber-50/40 dark:hover:bg-amber-950/20'
                        : 'hover:bg-rose-50/40 dark:hover:bg-rose-950/20'
                    )}
                  >
                    {/* Left: Number + Mapel & Guru */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-5 text-center text-xs font-black text-slate-400 dark:text-slate-500 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate">
                            {s.nama_mapel}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          <User size={11} className="shrink-0 text-slate-400" />
                          <span className="truncate">{s.nama_guru || 'Belum diplot guru'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Progress Indicator + Status Badge */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={cn(
                            'text-[11px] sm:text-xs font-bold font-mono',
                            isComplete
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isPartial
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400 dark:text-slate-500'
                          )}
                        >
                          {s.siswa_terisi}/{s.total_siswa}
                        </span>
                        <span className="text-[9px] text-slate-400 hidden xs:inline font-medium">
                          {percent}%
                        </span>
                      </div>

                      <span
                        className={cn(
                          'text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 flex items-center gap-1',
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        )}
                      >
                        {isComplete ? '✓ Tuntas' : isPartial ? 'Proses' : 'Belum'}
                      </span>

                      {onSelectMapel && (
                        <ExternalLink
                          size={13}
                          className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0 hidden sm:block"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
            title="Salin ringkasan ke format WhatsApp"
          >
            {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{isCopied ? 'Tersalin' : 'Salin Format WA'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
});

MonitoringMapelRombelModal.displayName = 'MonitoringMapelRombelModal';
