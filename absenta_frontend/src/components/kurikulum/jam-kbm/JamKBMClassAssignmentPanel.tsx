import React, { useMemo, useCallback, useState } from 'react';
import { Users, LayoutGrid, List, School, Sun, Moon, Check, Sparkles } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Tabular, type TabularColumn } from '@/components/ui/Tabular';
import { cn } from '@/lib/utils';
import type { ShiftConfig, KelasOption } from './JamKBMTypes';

interface JamKBMClassAssignmentPanelProps {
  shiftConfig: ShiftConfig;
  kelasList: KelasOption[];
  onShiftConfigChange: (cfg: ShiftConfig) => void;
  readOnly?: boolean;
}

// ── Roman numeral converter (Standar Absenta) ──────────────────────────────────
const toRoman = (num: number): string => {
  const lookup: Array<[string, number]> = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['VIII', 8], ['VII', 7],
    ['VI', 6], ['V', 5], ['IV', 4], ['III', 3],
    ['II', 2], ['I', 1]
  ];
  let res = '';
  let val = num;
  for (const [roman, limit] of lookup) {
    while (val >= limit) {
      res += roman;
      val -= limit;
    }
  }
  return res || String(num);
};

// ── Tingkat Color Palette (Konsisten dengan NodeDesigns / Wali Kelas Tree) ─────
const getTingkatTheme = (tingkat: number) => {
  const remainder = (tingkat - 1) % 3;
  if (remainder === 0) {
    return {
      headerBg: 'bg-sky-600 dark:bg-sky-500',
      borderLight: 'border-sky-200 dark:border-sky-850',
      connector: 'bg-sky-400 dark:bg-sky-600',
      badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    };
  }
  if (remainder === 1) {
    return {
      headerBg: 'bg-violet-600 dark:bg-violet-500',
      borderLight: 'border-violet-200 dark:border-violet-850',
      connector: 'bg-violet-400 dark:bg-violet-600',
      badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    };
  }
  return {
    headerBg: 'bg-rose-600 dark:bg-rose-500',
    borderLight: 'border-rose-200 dark:border-rose-850',
    connector: 'bg-rose-400 dark:bg-rose-600',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  };
};

// ── Shift Badges & Colors ──────────────────────────────────────────────────────
const SHIFT_PALETTES = [
  {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/40',
    activeBtn: 'bg-amber-500 text-white shadow-xs',
    icon: Sun,
  },
  {
    dot: 'bg-indigo-600',
    badge: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/40',
    activeBtn: 'bg-indigo-600 text-white shadow-xs',
    icon: Moon,
  },
  {
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-200/70 dark:border-cyan-800/40',
    activeBtn: 'bg-cyan-600 text-white shadow-xs',
    icon: Sparkles,
  },
];

export default React.memo(function JamKBMClassAssignmentPanel({
  shiftConfig,
  kelasList,
  onShiftConfigChange,
  readOnly = false,
}: JamKBMClassAssignmentPanelProps) {
  // ── View Mode: 'TREE' (Diagram Struktur Pohon) | 'TABLE' (Tabular) ──
  const [viewMode, setViewMode] = useState<'TREE' | 'TABLE'>('TREE');

  // ── Shift options ──
  const shiftOptions = useMemo(
    () => (shiftConfig?.shifts ?? []).map(s => ({ value: s.id, label: s.name })),
    [shiftConfig]
  );

  const defaultShiftId = shiftConfig?.shifts?.[0]?.id ?? '';

  // ── Group kelas by tingkat (Smart Parser + Roman Numeral Detection) ──────────
  const groupedByTingkat = useMemo(() => {
    const groups: Record<number, KelasOption[]> = {};
    (kelasList ?? []).forEach(k => {
      let t = k.tingkat;
      if (!t && k.label) {
        const matchRoman = k.label.match(/^(XII|XI|IX|X|VIII|VII|VI|IV|V|III|II|I)\b/i);
        if (matchRoman) {
          const r = matchRoman[1].toUpperCase();
          const romanMap: Record<string, number> = {
            'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
            'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12, 'XIII': 13
          };
          t = romanMap[r] || 0;
        } else {
          const matchNum = k.label.match(/^(\d+)\b/);
          if (matchNum) t = Number(matchNum[1]);
        }
      }
      const safeTingkat = t || 0;
      if (!groups[safeTingkat]) groups[safeTingkat] = [];
      groups[safeTingkat].push(k);
    });

    // Urutkan kelas di dalam masing-masing tingkat secara alfabetis
    Object.keys(groups).forEach(t => {
      groups[Number(t)].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
      );
    });

    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === '0') return 1;
        if (b === '0') return -1;
        return Number(a) - Number(b);
      })
      .map(([t, items]) => ({ tingkat: Number(t), kelas: items }));
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

  // ── Handlers ──
  const handleAssignmentChange = useCallback((kelasValue: string, shiftId: string) => {
    onShiftConfigChange({
      ...shiftConfig,
      class_assignments: { ...(shiftConfig?.class_assignments || {}), [kelasValue]: shiftId },
    });
  }, [shiftConfig, onShiftConfigChange]);

  const handleBulkAssignTingkat = useCallback((tingkatClasses: KelasOption[], shiftId: string) => {
    const updated = { ...(shiftConfig?.class_assignments || {}) };
    tingkatClasses.forEach(k => {
      updated[k.value] = shiftId;
    });
    onShiftConfigChange({
      ...shiftConfig,
      class_assignments: updated,
    });
  }, [shiftConfig, onShiftConfigChange]);

  // ── Tabular Column Definitions ──
  const columns = useMemo<TabularColumn<KelasOption>[]>(() => [
    {
      key: 'no',
      label: 'No',
      className: 'w-14 text-slate-500',
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
        const t = k.tingkat;
        return t ? `Tingkat ${toRoman(t)}` : 'Lainnya';
      },
    },
    {
      key: 'shift',
      label: 'Alokasi Shift KBM',
      className: 'w-72',
      render: (k) => {
        const assignedShiftId = shiftConfig?.class_assignments?.[k.value] ?? defaultShiftId;
        const shifts = shiftConfig?.shifts ?? [];

        if (readOnly) {
          const assignedShift = shifts.find(s => s.id === assignedShiftId);
          return (
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {assignedShift?.name || '-'}
            </span>
          );
        }

        // Segmented button jika 2 shift
        if (shifts.length === 2) {
          return (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700 w-fit">
              {shifts.map((s, sIdx) => {
                const isActive = assignedShiftId === s.id;
                const palette = SHIFT_PALETTES[sIdx % SHIFT_PALETTES.length];
                const IconComponent = palette.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleAssignmentChange(k.value, s.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1",
                      isActive
                        ? palette.activeBtn
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>
          );
        }

        return (
          <SearchableSelect
            id={`select-shift-kelas-tabular-${k.value}`}
            value={assignedShiftId}
            onValueChange={val => handleAssignmentChange(k.value, val)}
            options={shiftOptions}
            placeholder="Pilih shift..."
            triggerClassName="h-8 text-xs font-bold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl w-52"
          />
        );
      },
    },
  ], [shiftConfig, defaultShiftId, shiftOptions, handleAssignmentChange, readOnly]);

  if (kelasList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
        <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Belum ada data rombel kelas</p>
        <p className="text-xs text-slate-400 mt-1">Tambahkan kelas terlebih dahulu di modul Manajemen Akademik</p>
      </div>
    );
  }

  const shifts = shiftConfig?.shifts ?? [];

  return (
    <div className="space-y-4">
      {/* ── Control & Legend Bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-100 dark:border-slate-800">
        {/* Left: Shift Legend Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Distribusi:</span>
          {shifts.map((s, i) => {
            const palette = SHIFT_PALETTES[i % SHIFT_PALETTES.length];
            const IconComponent = palette.icon;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold",
                  palette.badge
                )}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{s.name}</span>
                <span className="opacity-50">·</span>
                <span className="font-extrabold">{shiftStats[s.id] ?? 0} Kelas</span>
              </div>
            );
          })}
        </div>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setViewMode('TREE')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              viewMode === 'TREE'
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Pohon Tingkat</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              viewMode === 'TABLE'
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <List className="w-3.5 h-3.5" />
            <span>Tabel Ringkas</span>
          </button>
        </div>
      </div>

      {/* ── Render View Mode ── */}
      {viewMode === 'TREE' ? (
        <div className="w-full overflow-x-auto bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-inner custom-scrollbar p-6">
          <div className="flex flex-col items-center min-w-[760px] py-2">
            
            {/* ── 1. ROOT NODE (PENUGASAN SHIFT KELAS) ────────────────────────── */}
            <div className="relative flex flex-col items-center mb-0">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-8 py-3.5 rounded-2xl shadow-lg border border-slate-800 flex flex-col items-center justify-center min-w-[260px]">
                <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase font-mono mb-0.5">
                  Distribusi Operasional
                </span>
                <h3 className="font-extrabold text-xs tracking-wider uppercase flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>PENUGASAN SHIFT KELAS</span>
                </h3>
              </div>
              
              {/* Vertical connector down from Root */}
              {groupedByTingkat.length > 0 && (
                <div className="w-[2px] h-8 bg-slate-300 dark:bg-slate-700" />
              )}
            </div>

            {/* ── 2. TINGKAT COLUMNS WITH SEGMENTED HORIZONTAL BAR ─────────────── */}
            <div className="relative w-full flex justify-center gap-8 flex-wrap lg:flex-nowrap">
              
              {/* Horizontal line connecting all Tingkat columns */}
              {groupedByTingkat.length > 1 && (
                <div className="absolute top-0 left-[12.5%] right-[12.5%] h-[2px] bg-slate-300 dark:bg-slate-700 hidden md:block" />
              )}

              {groupedByTingkat.map(({ tingkat, kelas }, colIdx) => {
                const theme = getTingkatTheme(tingkat);
                const tingkatTitle = tingkat === 0 ? 'LAINNYA' : `TINGKAT ${toRoman(tingkat)}`;

                return (
                  <div key={tingkat} className="relative flex flex-col items-center flex-1 min-w-[210px] max-w-[250px]">
                    
                    {/* Vertical connector down to Tingkat box */}
                    {groupedByTingkat.length > 1 && (
                      <div className="w-[2px] h-6 bg-slate-300 dark:bg-slate-700 hidden md:block" />
                    )}

                    {/* ── Tingkat Header Card (Mirip CategoryNode Wali Kelas) ── */}
                    <div className={cn(
                      "w-full text-white py-2.5 px-4 rounded-xl shadow-md border border-transparent font-black tracking-wider text-center mb-3",
                      theme.headerBg
                    )}>
                      <div className="flex items-center justify-center gap-1.5 leading-tight">
                        <School className="w-4 h-4 text-white/90" />
                        <span className="text-xs font-black uppercase">{tingkatTitle}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-1 text-[10px] font-bold text-white/80">
                        <span>({kelas.length} Rombel)</span>
                      </div>

                      {/* Quick Bulk Action per Tingkat */}
                      {!readOnly && shifts.length === 2 && (
                        <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-white/20">
                          <button
                            type="button"
                            onClick={() => handleBulkAssignTingkat(kelas, shifts[0].id)}
                            className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                            title={`Alokasikan semua kelas ${tingkatTitle} ke ${shifts[0].name}`}
                          >
                            Semua {shifts[0].name.replace(/shift\s*/i, '')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkAssignTingkat(kelas, shifts[1].id)}
                            className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                            title={`Alokasikan semua kelas ${tingkatTitle} ke ${shifts[1].name}`}
                          >
                            Semua {shifts[1].name.replace(/shift\s*/i, '')}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Vertical connector from header to card stack */}
                    {kelas.length > 0 && (
                      <div className="w-[2px] h-4 bg-slate-300 dark:bg-slate-700 mb-1" />
                    )}

                    {/* ── Vertical Stack of Class Cards (Two-Tone LeadershipNode Style) ── */}
                    <div className="flex flex-col gap-2.5 w-full items-center relative">
                      {kelas.map((k, kIdx) => {
                        const assignedShiftId = shiftConfig?.class_assignments?.[k.value] ?? defaultShiftId;
                        const cleanLabel = k.label.replace(/\s*-\s*Tingkat\s+\d+/i, '').trim();

                        return (
                          <div key={k.value} className="relative flex flex-col items-center w-full">
                            {/* Connector line between cards */}
                            {kIdx > 0 && (
                              <div className="w-[2px] h-2.5 bg-slate-300 dark:bg-slate-700 -mt-2.5 mb-1" />
                            )}

                            {/* Two-Tone Class Card */}
                            <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                              
                              {/* Top Half: Class Header with Tingkat Color */}
                              <div className={cn(
                                "px-3 py-1.5 flex items-center justify-between text-white",
                                theme.headerBg
                              )}>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Users className="w-3.5 h-3.5 text-white/90 shrink-0" />
                                  <span className="text-[11px] font-black uppercase tracking-wide truncate">
                                    {cleanLabel}
                                  </span>
                                </div>
                              </div>

                              {/* Bottom Half: Shift Assignment Switcher */}
                              <div className="p-2 bg-slate-50/50 dark:bg-slate-900/60">
                                {readOnly ? (
                                  <p className="text-[10px] font-bold text-center text-slate-700 dark:text-slate-300">
                                    {shifts.find(s => s.id === assignedShiftId)?.name ?? '-'}
                                  </p>
                                ) : shifts.length === 2 ? (
                                  /* 2-Shift Instant Toggle Pill */
                                  <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                                    {shifts.map((s, sIdx) => {
                                      const isAssigned = assignedShiftId === s.id;
                                      const palette = SHIFT_PALETTES[sIdx % SHIFT_PALETTES.length];
                                      return (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={() => handleAssignmentChange(k.value, s.id)}
                                          className={cn(
                                            "py-1 px-1.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer text-center truncate flex items-center justify-center gap-1",
                                            isAssigned
                                              ? palette.activeBtn
                                              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                                          )}
                                        >
                                          {isAssigned && <Check className="w-2.5 h-2.5 shrink-0" />}
                                          <span className="truncate">{s.name.replace(/shift\s*/i, '')}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  /* Multi-shift SearchableSelect (> 2 shifts) */
                                  <SearchableSelect
                                    id={`select-shift-kelas-${k.value}`}
                                    value={assignedShiftId}
                                    onValueChange={val => handleAssignmentChange(k.value, val)}
                                    options={shiftOptions}
                                    placeholder="Pilih shift..."
                                    triggerClassName="h-7 text-[10px] font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg w-full"
                                  />
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
      ) : (
        /* Tabular View */
        <div className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xs">
          <Tabular
            columns={columns}
            data={kelasList}
            compact={true}
            emptyMessage="Tidak ada data kelas yang terdaftar"
          />
        </div>
      )}
    </div>
  );
});
