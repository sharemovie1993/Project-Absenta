import React from "react";
import { Button } from "../../../components/ui";
import type { Siswa } from "../../../types/academic";

interface KelasExpandedPanelProps {
  classId: string;
  isLoading: boolean;
  siswaList: Siswa[];
  onRevertOne: (siswaId: string, classId: string) => void;
  onRevertAll: (classId: string) => void;
}

export const KelasExpandedPanel: React.FC<KelasExpandedPanelProps> = React.memo(({
  classId,
  isLoading,
  siswaList,
  onRevertOne,
  onRevertAll,
}) => (
  <div
    className="mt-2 border-t border-slate-100 pt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200"
    onClick={e => e.stopPropagation()}
  >
    <div className="flex items-center justify-between">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Siswa Terpetakan</div>
      {!isLoading && siswaList.length > 0 && (
        <Button
          variant="outline"
          size="xs"
          onClick={() => onRevertAll(classId)}
          className="text-[9px] py-0.5 px-2 border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-50 font-semibold shrink-0 flex items-center gap-1"
        >
          {String.fromCharCode(0x21A9)} Kembalikan Semua
        </Button>
      )}
    </div>

    {isLoading ? (
      <div className="py-2 text-center text-xs text-slate-500 animate-pulse">Memuat...</div>
    ) : siswaList.length === 0 ? (
      <div className="py-2 text-center text-xs text-slate-400 border border-dashed border-slate-100 rounded-lg">Kosong</div>
    ) : (
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
        {siswaList?.map(s => (
          <div
            key={s.id}
            className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[11px] font-semibold text-slate-800 truncate">{s.nama_siswa}</span>
              <span className="text-[9px] text-slate-400 font-mono">{s.nisn || s.nis || "-"}</span>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onRevertOne(s.id, classId)}
              className="text-[9px] py-0.5 px-1.5 border-rose-100 hover:border-rose-200 text-rose-600 hover:bg-rose-50/50 font-medium shrink-0"
            >
              Kembalikan
            </Button>
          </div>
        ))}
      </div>
    )}
  </div>
));
