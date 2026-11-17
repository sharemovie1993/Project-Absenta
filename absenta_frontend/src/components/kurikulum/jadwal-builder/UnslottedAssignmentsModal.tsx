import React, { useState, useMemo } from 'react';
import {
  Modal,
  Button,
  Badge,
} from '../../ui';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  BookOpen,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Filter,
  X,
  Layers,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type {
  UnslottedAuditSummary,
  UnslottedDutyItem,
  SlotAllocationStatus,
} from './unslottedScheduleEngine';

interface UnslottedAssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditSummary?: UnslottedAuditSummary;
  summary?: UnslottedAuditSummary;
  onSelectAssignment: (item: UnslottedDutyItem) => void;
}

type FilterTab = 'INCOMPLETE' | 'UNSCHEDULED' | 'PARTIAL' | 'COMPLETE' | 'ALL';

const EMPTY_AUDIT_SUMMARY: UnslottedAuditSummary = {
  totalAssignments: 0,
  unscheduledCount: 0,
  partialCount: 0,
  completeCount: 0,
  overallocatedCount: 0,
  overallPlacedJp: 0,
  overallTargetJp: 0,
  overallRemainingJp: 0,
  completionPercentage: 100,
  items: [],
};

export const UnslottedAssignmentsModal: React.FC<UnslottedAssignmentsModalProps> = React.memo(({
  isOpen,
  onClose,
  auditSummary,
  summary,
  onSelectAssignment,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('INCOMPLETE');
  const [filterTingkat, setFilterTingkat] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const effectiveSummary = auditSummary || summary || EMPTY_AUDIT_SUMMARY;

  const {
    totalAssignments = 0,
    unscheduledCount = 0,
    partialCount = 0,
    completeCount = 0,
    overallPlacedJp = 0,
    overallTargetJp = 0,
    overallRemainingJp = 0,
    completionPercentage = 100,
    items = [],
  } = effectiveSummary;

  // Daftar tingkat kelas yang ada di data
  const availableTingkats = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.tingkat) set.add(String(it.tingkat));
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [items]);

  // Filter items berdasarkan tab, tingkat, dan pencarian teks
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Filter Tab Status
      if (activeTab === 'INCOMPLETE' && item.status !== 'UNSCHEDULED' && item.status !== 'PARTIAL') {
        return false;
      }
      if (activeTab === 'UNSCHEDULED' && item.status !== 'UNSCHEDULED') {
        return false;
      }
      if (activeTab === 'PARTIAL' && item.status !== 'PARTIAL') {
        return false;
      }
      if (activeTab === 'COMPLETE' && item.status !== 'COMPLETE' && item.status !== 'OVERALLOCATED') {
        return false;
      }

      // 2. Filter Tingkat
      if (filterTingkat !== 'ALL' && String(item.tingkat) !== filterTingkat) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchGuru = item.guruNama.toLowerCase().includes(q);
        const matchMapel = item.mapelNama.toLowerCase().includes(q) || (item.mapelKode && item.mapelKode.toLowerCase().includes(q));
        const matchKelas = item.kelasNama.toLowerCase().includes(q);
        const matchJurusan = item.jurusanKode && item.jurusanKode.toLowerCase().includes(q);
        if (!matchGuru && !matchMapel && !matchKelas && !matchJurusan) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeTab, filterTingkat, searchQuery]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Ploting Guru & Mapel Belum Terjadwal"
      size="4xl"
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* ── 1. RINGKASAN BENTO KESIAPAN PLOTING ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Total Ploting */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400">Total Ploting SK</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">{totalAssignments}</span>
              <span className="text-[11px] text-slate-500">Penugasan</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">{overallTargetJp} Target JP</span>
          </div>

          {/* Belum Ada Slot (0 JP) */}
          <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">Belum Ada Slot (0 JP)</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-rose-600 dark:text-rose-400">{unscheduledCount}</span>
              <span className="text-[11px] text-rose-600/80">Ploting</span>
            </div>
            <span className="text-[10px] font-bold text-rose-600/70 mt-1">Belum Terpasang di Grid</span>
          </div>

          {/* Slot Parsial / Belum Lengkap */}
          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Slot Belum Lengkap</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">{partialCount}</span>
              <span className="text-[11px] text-amber-600/80">Ploting</span>
            </div>
            <span className="text-[10px] font-bold text-amber-600/70 mt-1">Masih Ada Sisa JP</span>
          </div>

          {/* Selesai / Lengkap */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">100% Terpasang</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{completeCount}</span>
              <span className="text-[11px] text-emerald-600/80">Ploting</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600/70 mt-1">{completionPercentage}% JP Terjadwal</span>
          </div>
        </div>

        {/* ── 2. FILTER & PENCARIAN TOOLBAR ── */}
        <div className="space-y-2.5">
          {/* Baris Tab Filter Status */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('INCOMPLETE')}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'INCOMPLETE'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                )}
              >
                Semua Belum Lengkap ({unscheduledCount + partialCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('UNSCHEDULED')}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'UNSCHEDULED'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                )}
              >
                0 JP Terpasang ({unscheduledCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PARTIAL')}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'PARTIAL'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                Slot Kurang ({partialCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('COMPLETE')}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'COMPLETE'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                )}
              >
                Lengkap ({completeCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'ALL'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                Semua ({totalAssignments})
              </button>
            </div>

            {/* Filter Tingkat Kelas */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Tingkat:</span>
              <button
                type="button"
                onClick={() => setFilterTingkat('ALL')}
                className={cn(
                  'px-2 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                  filterTingkat === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                )}
              >
                Semua
              </button>
              {availableTingkats.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterTingkat(t)}
                  className={cn(
                    'px-2 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                    filterTingkat === t
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  )}
                >
                  Kelas {t}
                </button>
              ))}
            </div>
          </div>

          {/* Baris Pencarian Teks */}
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru, mata pelajaran, atau rombel kelas..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── 3. DAFTAR / TABEL PENUGASAN ── */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
          <div className="max-h-[460px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  Tidak ada penugasan pada filter ini
                </p>
                <p className="text-[11px] text-slate-400">
                  Seluruh penugasan guru-mapel pada kriteria ini telah memiliki slot jadwal.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3 min-w-[200px]">Guru Pengampu</th>
                    <th className="p-3 min-w-[180px]">Mata Pelajaran</th>
                    <th className="p-3 min-w-[120px]">Kelas / Rombel</th>
                    <th className="p-3 text-center min-w-[110px]">Alokasi JP</th>
                    <th className="p-3 text-center min-w-[120px]">Status Slot</th>
                    <th className="p-3 text-right min-w-[130px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.map((item) => {
                    const isUnscheduled = item.status === 'UNSCHEDULED';
                    const isPartial = item.status === 'PARTIAL';
                    const isComplete = item.status === 'COMPLETE';

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Guru */}
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {item.guruNama}
                          </div>
                          {item.guruNip && (
                            <div className="text-[10px] font-mono text-slate-400">
                              NIP. {item.guruNip}
                            </div>
                          )}
                        </td>

                        {/* Mapel */}
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {item.mapelNama}
                          </div>
                          {item.mapelKode && (
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.mapelKode}
                            </span>
                          )}
                        </td>

                        {/* Kelas & Jurusan */}
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                            <span>{item.kelasNama}</span>
                            {item.jurusanKode && (
                              <span className="text-[9px] font-bold px-1 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {item.jurusanKode}
                              </span>
                            )}
                          </div>
                          {item.tingkat && (
                            <span className="text-[10px] text-slate-400">
                              Tingkat {item.tingkat}
                            </span>
                          )}
                        </td>

                        {/* Alokasi JP vs Placed */}
                        <td className="p-3 text-center">
                          <div className="font-mono font-bold text-xs">
                            <span className={cn(isUnscheduled ? 'text-rose-600' : isPartial ? 'text-amber-600' : 'text-emerald-600')}>
                              {item.placedJp}
                            </span>
                            <span className="text-slate-400"> / {item.targetJp} JP</span>
                          </div>
                          {item.remainingJp > 0 && (
                            <span className="text-[9.5px] font-bold text-rose-600 dark:text-rose-400">
                              Kurang {item.remainingJp} JP
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="p-3 text-center">
                          {isUnscheduled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <AlertTriangle size={10} />
                              <span>0 JP (Kosong)</span>
                            </span>
                          )}
                          {isPartial && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock size={10} />
                              <span>Kurang {item.remainingJp} JP</span>
                            </span>
                          )}
                          {isComplete && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 size={10} />
                              <span>Lengkap</span>
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="p-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onSelectAssignment(item);
                              onClose();
                            }}
                            className={cn(
                              'text-xs h-7 px-2.5 font-bold rounded-lg cursor-pointer flex items-center gap-1 ml-auto shadow-2xs',
                              isUnscheduled
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                            )}
                            title={`Buka grid jadwal untuk mem-plot ${item.mapelNama} (${item.kelasNama})`}
                          >
                            <span>Plot ke Grid</span>
                            <ArrowRight size={11} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <span>Menampilkan {filteredItems.length} dari {totalAssignments} ploting penugasan</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
});
