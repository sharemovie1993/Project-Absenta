import React, { useMemo, useCallback, useState } from 'react';
import { Users, LayoutGrid, List } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Tabular, type TabularColumn } from '@/components/ui/Tabular';
import type { ShiftConfig, KelasOption } from './JamKBMTypes';

interface JamKBMClassAssignmentPanelProps {
  shiftConfig: ShiftConfig;
  kelasList: KelasOption[];
  onShiftConfigChange: (cfg: ShiftConfig) => void;
  readOnly?: boolean;
}

// ── Tingkat color palette (mirrors LeadershipNode / CategoryNode logic) ───────
const getTingkatColor = (tingkat: number): string => {
  const remainder = (tingkat - 1) % 3;
  if (remainder === 0) return 'bg-sky-600 dark:bg-sky-500';
  if (remainder === 1) return 'bg-violet-600 dark:bg-violet-500';
  return 'bg-rose-600 dark:bg-rose-500';
};

const getTingkatBorder = (tingkat: number): string => {
  const remainder = (tingkat - 1) % 3;
  if (remainder === 0) return 'border-sky-200 dark:border-sky-900/40';
  if (remainder === 1) return 'border-violet-200 dark:border-violet-900/40';
  return 'border-rose-200 dark:border-rose-900/40';
};

// Shift color accents per index for badges/dots
const SHIFT_COLORS = [
  { dot: 'bg-indigo-500', badge: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40' },
  { dot: 'bg-violet-500', badge: 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200/60 dark:border-violet-800/40' },
  { dot: 'bg-cyan-500',   badge: 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-800/40' },
  { dot: 'bg-amber-500',  badge: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40' },
];

export default function JamKBMClassAssignmentPanel({
  shiftConfig,
  kelasList,
  onShiftConfigChange,
  readOnly = false,
}: JamKBMClassAssignmentPanelProps) {
  // ── View Mode: 'TREE' (Diagram) | 'TABLE' (Tabular) ──
  const [viewMode, setViewMode] = useState<'TREE' | 'TABLE'>('TREE');

  // ── Shift options ──
  const shiftOptions = useMemo(
    () => (shiftConfig?.shifts ?? []).map(s => ({ value: s.id, label: s.name })),
    [shiftConfig]
  );

  const defaultShiftId = shiftConfig?.shifts?.[0]?.id ?? '';

  const shiftColorMap = useMemo(() => {
    const map: Record<string, typeof SHIFT_COLORS[0]> = {};
    (shiftConfig?.shifts ?? []).forEach((s, i) => {
      map[s.id] = SHIFT_COLORS[i % SHIFT_COLORS.length];
    });
    return map;
  }, [shiftConfig]);

  // ── Group kelas by tingkat ──
  const groupedByTingkat = useMemo(() => {
    const groups: Record<number, KelasOption[]> = {};
    (kelasList ?? []).forEach(k => {
      let tingkat = k.tingkat;
      if (!tingkat) {
        const match = k.label.match(/Tingkat\s+(\d+)/i);
        tingkat = match ? Number(match[1]) : 0;
      }
      if (!groups[tingkat]) groups[tingkat] = [];
      groups[tingkat].push(k);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === '0') return 1;
        if (b === '0') return -1;
        return Number(a) - Number(b);
      })
      .map(([t, kelas]) => ({ tingkat: Number(t), kelas }));
  }, [kelasList]);

  // ── Stats per shift ──
  const shiftStats = useMemo(() => {
    const counts: Record<string, number> = {};
    (shiftConfig?.shifts ?? []).forEach(s => { counts[s.id] = 0; });
    Object.values(shiftConfig?.class_assignments ?? {}).forEach(shiftId => {
      if (counts[shiftId] !== undefined) counts[shiftId]++;
    });
    return counts;
  }, [shiftConfig]);

  const handleAssignmentChange = useCallback((kelasValue: string, shiftId: string) => {
    onShiftConfigChange({
      ...shiftConfig,
      class_assignments: { ...shiftConfig.class_assignments, [kelasValue]: shiftId },
    });
  }, [shiftConfig, onShiftConfigChange]);

  // ── Tabular Column Definitions ──
  const columns = useMemo<TabularColumn<KelasOption>[]>(() => [
    {
      key: 'no',
      label: 'No',
      className: 'w-16 text-slate-500',
      render: (_, idx) => idx + 1,
    },
    {
      key: 'nama_kelas',
      label: 'Nama Kelas',
      className: 'font-bold text-slate-800 dark:text-slate-100',
      render: (k) => k.label.replace(/\s*-\s*Tingkat\s+\d+/i, '').trim(),
    },
    {
      key: 'tingkat',
      label: 'Tingkat',
      className: 'font-semibold text-slate-600 dark:text-slate-400',
      render: (k) => {
        const match = k.label.match(/Tingkat\s+(\d+)/i);
        const t = k.tingkat || (match ? Number(match[1]) : null);
        return t ? `Tingkat ${t}` : 'Lainnya';
      },
    },
    {
      key: 'shift',
      label: 'Shift Jam Pelajaran KBM',
      className: 'w-64',
      render: (k) => {
        const assignedShiftId = shiftConfig?.class_assignments?.[k.value] ?? defaultShiftId;
        const assignedShift = shiftConfig?.shifts?.find(s => s.id === assignedShiftId);
        const color = shiftColorMap[assignedShiftId] ?? SHIFT_COLORS[0];

        return readOnly ? (
          assignedShift ? (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${color.badge} text-[10px] font-bold w-fit`}>
              <div className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
              {assignedShift.name}
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-semibold px-2.5">-</span>
          )
        ) : (
          <div className="flex items-center gap-3">
            <SearchableSelect
              id={`select-shift-kelas-tabular-${k.value}`}
              value={assignedShiftId}
              onValueChange={val => handleAssignmentChange(k.value, val)}
              options={shiftOptions}
              placeholder="Pilih shift..."
              triggerClassName="h-8 text-[11px] font-bold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-750 rounded-xl w-44"
            />
            {assignedShift && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${color.badge} text-[10px] font-bold`}>
                <div className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                {assignedShift.name}
              </div>
            )}
          </div>
        );
      },
    },
  ], [shiftConfig, defaultShiftId, shiftOptions, shiftColorMap, handleAssignmentChange, readOnly]);

  if (kelasList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
        <Users className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-3" />
        <p className="text-sm font-bold text-slate-500">Belum ada data kelas</p>
        <p className="text-xs text-slate-400 mt-1">Buat kelas terlebih dahulu di modul Akademik</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Control Bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-100 dark:border-slate-800/60">
        {/* Left: Shift Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {(shiftConfig?.shifts ?? []).map((s, i) => {
            const color = SHIFT_COLORS[i % SHIFT_COLORS.length];
            return (
              <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${color.badge}`}>
                <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                {s.name}
                <span className="opacity-60">·</span>
                <span>{shiftStats[s.id] ?? 0} kelas</span>
              </div>
            );
          })}
        </div>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('TREE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
              viewMode === 'TREE'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Diagram Tingkat
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
              viewMode === 'TABLE'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Tabel Daftar
          </button>
        </div>
      </div>

      {/* ── Info note ── */}
      <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
        Kelas yang tidak dipetakan menggunakan{' '}
        <span className="font-bold text-slate-600 dark:text-slate-300">
          {shiftConfig?.shifts?.[0]?.name ?? 'Shift Pertama'}
        </span>{' '}
        sebagai default.
      </p>

      {/* ── Render selected view mode ── */}
      {viewMode === 'TREE' ? (
        <div className="w-full overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-50/50 dark:bg-slate-950 custom-scrollbar">
          <div className="inline-block min-w-full p-10">
            {/* ── Root Node: PENUGASAN SHIFT ──────────────────────────── */}
            <div className="flex flex-col items-center mb-0">
              <div
                className="flex items-center justify-center gap-2 px-8 py-0 bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-700 shadow-lg"
                style={{ minWidth: 220, height: 70 }}
              >
                <Users size={14} className="text-white/80 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  Penugasan Shift Kelas
                </span>
              </div>

              {/* Vertical connector from root to horizontal bar */}
              <div className="w-[2px] h-8 bg-slate-300 dark:bg-slate-700" />

              {/* ── Horizontal connector bar ──────────────────────────── */}
              <div className="relative flex items-start justify-center gap-0">
                {/* Horizontal line spanning all columns */}
                {groupedByTingkat.length > 1 && (
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] bg-slate-300 dark:bg-slate-700"
                    style={{
                      left: `calc(50% / ${groupedByTingkat.length})`,
                      right: `calc(50% / ${groupedByTingkat.length})`,
                    }}
                  />
                )}

                {/* ── Column per Tingkat ──────────────────────────────── */}
                <div className="flex gap-8 justify-center">
                  {groupedByTingkat.map(({ tingkat, kelas }, colIdx) => {
                    const headerBg = tingkat === 0 ? 'bg-slate-600 dark:bg-slate-700' : getTingkatColor(tingkat);
                    const cardBorder = tingkat === 0 ? 'border-slate-200 dark:border-slate-700' : getTingkatBorder(tingkat);

                    return (
                      <div key={tingkat} className="relative flex flex-col items-center">
                        {/* Top connector dot + vertical line to tingkat header */}
                        <div className="flex flex-col items-center">
                          {groupedByTingkat.length > 1 && (
                            <>
                              {/* Horizontal segment */}
                              <div className="relative w-full h-[2px]">
                                <div className={`absolute top-0 h-[2px] bg-slate-300 dark:bg-slate-700 ${
                                  colIdx === 0 ? 'left-1/2 right-0' :
                                  colIdx === groupedByTingkat.length - 1 ? 'left-0 right-1/2' :
                                  'left-0 right-0'
                                }`} />
                              </div>
                              {/* Vertical drop to tingkat node */}
                              <div className="w-[2px] h-8 bg-slate-300 dark:bg-slate-700" />
                            </>
                          )}
                        </div>

                        {/* ── Tingkat Header Node ──────────────────────── */}
                        <div
                          className={`flex items-center justify-center gap-2 px-4 ${headerBg} shadow-md`}
                          style={{ minWidth: 200, maxWidth: 220, height: 70 }}
                        >
                          <Users size={13} className="text-white/80 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white text-center">
                            {tingkat === 0 ? 'Lainnya' : `Tingkat ${tingkat}`}
                          </span>
                        </div>

                        {/* Vertical connector to kelas cards */}
                        <div className="w-[2px] h-6 bg-slate-300 dark:bg-slate-700" />

                        {/* ── Kelas Card Stack ─────────────────────────── */}
                        <div className="flex flex-col gap-3 items-center" style={{ minWidth: 200, maxWidth: 220 }}>
                          {kelas.map((k, kIdx) => {
                            const assignedShiftId = shiftConfig?.class_assignments?.[k.value] ?? defaultShiftId;
                            const assignedShift = shiftConfig?.shifts?.find(s => s.id === assignedShiftId);
                            // Clean label: remove "- Tingkat N" suffix
                            const cleanLabel = k.label.replace(/\s*-\s*Tingkat\s+\d+/i, '').trim();

                            return (
                              <div key={k.value} className="relative flex flex-col items-center w-full">
                                {/* Connector line (except first) */}
                                {kIdx > 0 && (
                                  <div className="w-[2px] h-3 bg-slate-200 dark:bg-slate-800 -mt-3" />
                                )}

                                {/* ── Kelas Node Card ───────────────────── */}
                                <div
                                  className={`w-full border ${cardBorder} shadow-sm bg-white dark:bg-slate-900 overflow-hidden`}
                                  style={{ minWidth: 200, maxWidth: 220 }}
                                >
                                  {/* Kelas name header (colored) */}
                                  <div className={`flex items-center justify-center gap-1.5 px-3 py-2 ${headerBg}`}>
                                    <Users size={11} className="text-white/80 shrink-0" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-wider truncate">
                                      {cleanLabel}
                                    </span>
                                  </div>

                                  {/* Shift selector body */}
                                  <div className="px-2 py-2 space-y-1.5 bg-white dark:bg-slate-900">
                                    {readOnly ? (
                                      <p className="text-[10px] font-bold text-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/30 py-1.5 rounded-lg select-none">
                                        {assignedShift ? assignedShift.name : 'Default'}
                                      </p>
                                    ) : (
                                      <>
                                        <SearchableSelect
                                          id={`select-shift-kelas-${k.value}`}
                                          value={assignedShiftId}
                                          onValueChange={val => handleAssignmentChange(k.value, val)}
                                          options={shiftOptions}
                                          placeholder="Pilih shift..."
                                          triggerClassName="h-7 text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg w-full"
                                        />
                                        {assignedShift && (
                                          <p className="text-[9px] font-black text-center text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            {assignedShift.name}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tabular View using the new shared Tabular component */
        <div className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm">
          <Tabular
            columns={columns}
            data={kelasList}
            emptyMessage="Tidak ada data kelas yang terdaftar"
          />
        </div>
      )}
    </div>
  );
}
