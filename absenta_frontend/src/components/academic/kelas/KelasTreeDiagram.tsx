import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Users, Edit } from 'lucide-react';
import type { Kelas } from '../../../types/academic';
import { cn } from '../../../lib/utils';

interface KelasTreeDiagramProps {
  data: Kelas[];
  onAdd?: (tingkat?: number) => void;
  onEdit?: (kelas: Kelas) => void;
  onDelete?: (kelas: Kelas) => void;
  onToggleActive?: (kelas: Kelas) => void;
  togglingId?: string | null;
  canManage?: boolean;
}

const getTingkatTheme = (tingkatNum: number) => {
  switch (tingkatNum) {
    case 10:
      return {
        lineColor: "bg-sky-300 dark:bg-sky-900/60",
        borderLightColor: "border-sky-200/60 dark:border-sky-900/30",
        bgLightColor: "bg-sky-50/20 dark:bg-sky-950/10",
        pillBg: "bg-sky-500 text-white shadow-sm shadow-sky-500/20",
        boxBg: "bg-sky-600 dark:bg-sky-600/80 shadow-sky-600/20",
        cardHoverBorder: "hover:border-sky-300 dark:hover:border-sky-800",
        verticalLine: "bg-sky-200 dark:bg-sky-900/40"
      };
    case 11:
      return {
        lineColor: "bg-violet-300 dark:bg-violet-900/60",
        borderLightColor: "border-violet-200/60 dark:border-violet-900/30",
        bgLightColor: "bg-violet-50/20 dark:bg-violet-950/10",
        pillBg: "bg-violet-500 text-white shadow-sm shadow-violet-500/20",
        boxBg: "bg-violet-600 dark:bg-violet-600/80 shadow-violet-600/20",
        cardHoverBorder: "hover:border-violet-300 dark:hover:border-violet-800",
        verticalLine: "bg-violet-200 dark:bg-violet-900/40"
      };
    case 12:
      return {
        lineColor: "bg-rose-300 dark:bg-rose-900/60",
        borderLightColor: "border-rose-200/60 dark:border-rose-900/30",
        bgLightColor: "bg-rose-50/20 dark:bg-rose-950/10",
        pillBg: "bg-rose-500 text-white shadow-sm shadow-rose-500/20",
        boxBg: "bg-rose-600 dark:bg-rose-600/80 shadow-rose-600/20",
        cardHoverBorder: "hover:border-rose-300 dark:hover:border-rose-800",
        verticalLine: "bg-rose-200 dark:bg-rose-900/40"
      };
    default:
      // Emerald as fallback for Tingkat 13 or others
      return {
        lineColor: "bg-emerald-300 dark:bg-emerald-900/60",
        borderLightColor: "border-emerald-200/60 dark:border-emerald-900/30",
        bgLightColor: "bg-emerald-50/20 dark:bg-emerald-950/10",
        pillBg: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20",
        boxBg: "bg-emerald-600 dark:bg-emerald-600/80 shadow-emerald-600/20",
        cardHoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-800",
        verticalLine: "bg-emerald-200 dark:bg-emerald-900/40"
      };
  }
};

export const KelasTreeDiagram: React.FC<KelasTreeDiagramProps> = React.memo(({
  data,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
  togglingId,
  canManage = false
}) => {
  // Group classes by tingkat
  const classesByTingkat = useMemo(() => {
    const map: Record<number, Kelas[]> = {};
    data.forEach(k => {
      const t = Number(k.tingkat) || 10;
      if (!map[t]) map[t] = [];
      map[t].push(k);
    });
    // Sort classes inside each tingkat by name
    Object.keys(map).forEach(t => {
      map[Number(t)].sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas));
    });
    return map;
  }, [data]);

  // Extract unique tingkat values sorted ascending
  const tingkatList = useMemo(() => {
    return Object.keys(classesByTingkat)
      .map(Number)
      .sort((a, b) => a - b);
  }, [classesByTingkat]);

  return (
    <div className="w-full overflow-x-auto p-8 bg-slate-50/50 dark:bg-slate-950/20 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner custom-scrollbar">
      <div className="flex flex-col items-center min-w-[800px] py-6">
        
        {/* ROOT NODE: ROMBONGAN BELAJAR */}
        <div className="relative flex flex-col items-center mb-8">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-indigo-900/60 dark:to-slate-950 text-white px-10 py-4 rounded-2xl shadow-lg border border-slate-800 dark:border-indigo-800/30 flex flex-col items-center justify-center min-w-[260px]">
            <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase font-mono">Master Data</span>
            <h3 className="font-extrabold text-sm tracking-wide uppercase mt-0.5">ROMBONGAN BELAJAR</h3>
          </div>
          {/* Vertical line down from Root */}
          {tingkatList.length > 0 && (
            <div className="w-[2px] h-8 bg-slate-350 dark:bg-slate-700"></div>
          )}
        </div>

        {/* TINGKAT COLUMNS */}
        <div className="relative w-full flex justify-center gap-10">
          
          {/* Horizontal Line Connecting Tingkat Columns */}
          {tingkatList.length > 1 && (
            <div className="absolute top-0 left-[16.6%] right-[16.6%] h-[2px] bg-slate-300 dark:bg-slate-750"></div>
          )}

          {tingkatList.map((tingkat) => {
            const list = classesByTingkat[tingkat] || [];
            const theme = getTingkatTheme(tingkat);
            
            return (
              <div key={tingkat} className="relative flex flex-col items-center flex-1 max-w-[280px]">
                
                {/* Vertical Line down from horizontal connector to each Tingkat Box */}
                {tingkatList.length > 1 && (
                  <div className={cn("w-[2px] h-6 mb-0", theme.verticalLine)}></div>
                )}

                {/* TINGKAT BOX */}
                <div className={cn("text-white py-3 px-8 rounded-2xl shadow-lg border border-transparent font-black tracking-wider text-center mb-6 min-w-[180px]", theme.boxBg)}>
                  <h4 className="text-xs uppercase font-extrabold font-sans">TINGKAT {tingkat === 10 ? 'X' : tingkat === 11 ? 'XI' : tingkat === 12 ? 'XII' : tingkat}</h4>
                </div>

                {/* Vertical Connector Line from Tingkat Box to Class Cards */}
                {list.length > 0 && (
                  <div className={cn("w-[2px] h-6 mb-0", theme.verticalLine)}></div>
                )}

                {/* CLASS CARDS STACK */}
                <div className="flex flex-col gap-3 w-full items-center relative">
                  
                  {/* Subtle Background vertical connector line behind cards */}
                  {list.length > 1 && (
                    <div className={cn("absolute top-0 bottom-6 w-[2px] z-0", theme.verticalLine)}></div>
                  )}

                  {list.map((kelas) => {
                    const isToggling = togglingId === kelas.id;
                    const siswaCount = kelas._count?.Siswa || 0;

                    return (
                      <motion.div
                        key={kelas.id}
                        layout
                        className={cn(
                          "w-full rounded-xl shadow-sm border p-3 flex items-center justify-between gap-3 group z-10 relative transition-all duration-200",
                          kelas.is_active 
                            ? cn("bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800", theme.cardHoverBorder) 
                            : "bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-850 opacity-60 hover:opacity-100"
                        )}
                      >
                        {/* Left: Class Name Pill */}
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide flex-shrink-0 text-center min-w-[70px]",
                            kelas.is_active 
                              ? theme.pillBg 
                              : "bg-slate-400 dark:bg-slate-650 text-slate-100"
                          )}>
                            {kelas.nama_kelas}
                          </div>
                          
                          {/* Student Count */}
                          <div className={cn(
                            "flex items-center gap-1 text-[11px] font-bold rounded px-1.5 py-0.5 transition-all",
                            siswaCount === 0 
                              ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 font-black animate-pulse"
                              : "text-slate-400 dark:text-slate-550"
                          )}>
                            <Users className={cn("w-3.5 h-3.5 flex-shrink-0", siswaCount === 0 ? "text-rose-500" : "text-slate-400")} />
                            <span>{siswaCount}</span>
                          </div>
                        </div>

                        {/* Right: Toggle Switch & Status */}
                        <div className="flex items-center gap-2">
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => onToggleActive?.(kelas)}
                              disabled={isToggling}
                              className={cn(
                                "relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                kelas.is_active ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-750",
                                isToggling && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5",
                                  kelas.is_active ? "translate-x-3.5" : "translate-x-0"
                                )}
                              />
                            </button>
                          )}
                        </div>

                        {/* Top-Right Hover Action Buttons (Edit & Delete) */}
                        {canManage && (
                          <div className="absolute -top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            {onEdit && (
                              <button
                                onClick={() => onEdit(kelas)}
                                className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-650 flex items-center justify-center shadow border border-slate-200 dark:border-slate-700 transition-all"
                                title="Edit Kelas"
                              >
                                <Edit size={11} />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => onDelete(kelas)}
                                className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 flex items-center justify-center shadow border border-slate-200 dark:border-slate-700 transition-all"
                                title="Hapus Kelas"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Add Class Button under each tingkat column */}
                  {canManage && onAdd && (
                    <button
                      onClick={() => onAdd(tingkat)}
                      className={cn(
                        "w-full py-2 px-4 rounded-xl border border-dashed text-slate-400 flex items-center justify-center gap-1.5 transition-all text-xs font-bold hover:shadow-sm bg-white/20 dark:bg-slate-900/10",
                        tingkat === 10 ? "border-sky-300/40 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-400" :
                        tingkat === 11 ? "border-violet-300/40 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-400" :
                        "border-rose-300/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-400"
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Kelas</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
});

KelasTreeDiagram.displayName = 'KelasTreeDiagram';
