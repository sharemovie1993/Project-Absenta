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
            <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Master Data</span>
            <h3 className="font-extrabold text-sm tracking-wide uppercase mt-0.5">ROMBONGAN BELAJAR</h3>
          </div>
          {/* Vertical line down from Root */}
          {tingkatList.length > 0 && (
            <div className="w-[2px] h-8 bg-indigo-300 dark:bg-indigo-900/60"></div>
          )}
        </div>

        {/* TINGKAT COLUMNS */}
        <div className="relative w-full flex justify-center gap-10">
          
          {/* Horizontal Line Connecting Tingkat Columns */}
          {tingkatList.length > 1 && (
            <div className="absolute top-0 left-[16.6%] right-[16.6%] h-[2px] bg-indigo-200 dark:bg-indigo-900/40"></div>
          )}

          {tingkatList.map((tingkat) => {
            const list = classesByTingkat[tingkat] || [];
            
            return (
              <div key={tingkat} className="relative flex flex-col items-center flex-1 max-w-[280px]">
                
                {/* Vertical Line down from horizontal connector to each Tingkat Box */}
                {tingkatList.length > 1 && (
                  <div className="w-[2px] h-6 bg-indigo-200 dark:bg-indigo-900/40 mb-0"></div>
                )}

                {/* TINGKAT BOX */}
                <div className="bg-indigo-600 dark:bg-indigo-600/80 text-white py-3 px-6 rounded-xl shadow-md border border-indigo-500/30 min-w-[180px] text-center mb-6">
                  <h4 className="font-bold text-xs uppercase tracking-widest">TINGKAT {tingkat}</h4>
                </div>

                {/* Vertical Connector Line from Tingkat Box to Class Cards */}
                {list.length > 0 && (
                  <div className="w-[2px] h-6 bg-indigo-200 dark:bg-indigo-900/40 mb-0"></div>
                )}

                {/* CLASS CARDS STACK */}
                <div className="flex flex-col gap-4 w-full items-center relative">
                  
                  {/* Subtle Background vertical connector line behind cards */}
                  {list.length > 1 && (
                    <div className="absolute top-0 bottom-6 w-[2px] bg-slate-200 dark:bg-slate-800/60 z-0"></div>
                  )}

                  {list.map((kelas) => {
                    const waliKelas = kelas.WaliKelas?.[0]?.Guru?.nama_guru;
                    const isToggling = togglingId === kelas.id;
                    const siswaCount = kelas._count?.Siswa || 0;

                    return (
                      <motion.div
                        key={kelas.id}
                        layout
                        className={cn(
                          "w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all hover:shadow-md hover:border-indigo-205 dark:hover:border-indigo-900/50 flex flex-col overflow-hidden group z-10 relative",
                          kelas.is_active 
                            ? "border-slate-100 dark:border-slate-800" 
                            : "border-slate-100 dark:border-slate-850 opacity-60 hover:opacity-100"
                        )}
                      >
                        {/* Class Header Banner */}
                        <div className={cn(
                          "px-4 py-2 flex items-center justify-between transition-colors",
                          kelas.is_active 
                            ? "bg-indigo-600 text-white" 
                            : "bg-slate-400 dark:bg-slate-750 text-slate-100"
                        )}>
                          <span className="font-black text-xs uppercase tracking-wide">{kelas.nama_kelas}</span>
                          
                          {/* Class Jurusan Tag */}
                          <span className={cn(
                            "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                            kelas.is_active 
                              ? "bg-indigo-700/50 text-indigo-100" 
                              : "bg-slate-500/40 text-slate-200"
                          )}>
                            {kelas.Jurusan?.nama || 'Umum'}
                          </span>
                        </div>

                        {/* Class Content (Wali Kelas) */}
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Wali Kelas</p>
                            <p className={cn(
                              "text-xs font-bold leading-snug",
                              waliKelas 
                                ? "text-slate-700 dark:text-slate-200" 
                                : "text-rose-500 italic font-medium"
                            )}>
                              {waliKelas || 'BELUM DIISI'}
                            </p>
                          </div>

                          {/* Footer stats and controls */}
                          <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/60 pt-3">
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                              <Users className="w-3.5 h-3.5" />
                              <span>{siswaCount} siswa</span>
                            </div>

                            {/* Toggle & Buttons */}
                            <div className="flex items-center gap-2">
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => onToggleActive?.(kelas)}
                                  disabled={isToggling}
                                  className={cn(
                                    "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                    kelas.is_active ? "bg-emerald-500" : "bg-slate-250 dark:bg-slate-750",
                                    isToggling && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                                      kelas.is_active ? "translate-x-3" : "translate-x-0"
                                    )}
                                  />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top-Right Hover Action Buttons (Edit & Delete) */}
                        {canManage && (
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            {onEdit && (
                              <button
                                onClick={() => onEdit(kelas)}
                                className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-55 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 transition-all"
                                title="Edit Kelas"
                              >
                                <Edit size={12} />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => onDelete(kelas)}
                                className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 transition-all"
                                title="Hapus Kelas"
                              >
                                <Trash2 size={12} />
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
                      className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-900/60 bg-white/20 dark:bg-slate-900/10 flex items-center justify-center gap-1.5 transition-all text-xs font-bold hover:shadow-sm"
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
