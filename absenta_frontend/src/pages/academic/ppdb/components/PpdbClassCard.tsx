import React from 'react';
import { GraduationCap, ArrowDown } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { KelasExpandedPanel } from '../KelasExpandedPanel';
import type { Siswa } from '../../../../types/academic';

interface Props {
  kelas: {
    value: string;
    label: string;
    jurusan_id?: string | null;
    tingkat?: number | null;
    is_active?: boolean;
    siswa_count?: number;
  };
  isDragging: boolean;
  activeDropTarget: string | null;
  expandedKelasId: string | null;
  setExpandedKelasId: React.Dispatch<React.SetStateAction<string | null>>;
  kelasSiswaLoading: boolean;
  kelasSiswaList: Siswa[];
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onQuickMap: (kelasId: string) => void;
  onToggleExpand: (kelasId: string) => void;
  onRevertStudent: (siswaId: string, namaSiswa: string) => void;
  onRevertAllStudents: (kelasId: string) => void;
  hasSelectedSiswa: boolean;
}

export const PpdbClassCard: React.FC<Props> = React.memo(({
  kelas,
  isDragging,
  activeDropTarget,
  expandedKelasId,
  kelasSiswaLoading,
  kelasSiswaList,
  onDragOver,
  onDragLeave,
  onDrop,
  onQuickMap,
  onToggleExpand,
  onRevertStudent,
  onRevertAllStudents,
  hasSelectedSiswa
}) => {
  const isOver = activeDropTarget === kelas.value;

  return (
    <div
      onDragOver={(e) => onDragOver(e, kelas.value)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, kelas.value)}
      className={`p-4 rounded-xl border transition-all duration-200 ${
        isOver
          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-400'
          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpand(kelas.value)}
            className="p-1 h-auto font-bold text-xs text-slate-800 dark:text-slate-200 hover:text-indigo-600 flex items-center gap-1.5"
          >
            <span>{kelas.label}</span>
            <ArrowDown
              size={12}
              className={`transition-transform ${expandedKelasId === kelas.value ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`}
            />
          </Button>
          {kelas.is_active && (
            <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 border-emerald-200">
              Aktif
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasSelectedSiswa && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onQuickMap(kelas.value)}
              className="h-6 px-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-md"
            >
              Petakan Ke Sini
            </Button>
          )}
          <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
            {kelas.siswa_count || 0} siswa
          </span>
        </div>
      </div>

      {/* Permanent Drop Target Indicator */}
      <div
        className={`mt-2 py-2 border border-dashed rounded-lg flex items-center justify-center gap-1.5 text-xs transition-all duration-200 ${
          isOver
            ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold scale-[1.01]'
            : isDragging
            ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 animate-pulse font-medium'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-slate-400'
        }`}
      >
        <GraduationCap size={13} className={isOver ? 'animate-bounce' : ''} />
        <span>
          {isOver
            ? 'Lepas untuk memetakan!'
            : isDragging
            ? 'Siap menerima drop...'
            : 'Seret calon siswa ke sini'}
        </span>
      </div>

      {/* Expanded Students List */}
      {expandedKelasId === kelas.value && (
        <KelasExpandedPanel
          classId={kelas.value}
          isLoading={kelasSiswaLoading}
          siswaList={kelasSiswaList}
          onRevertOne={onRevertStudent}
          onRevertAll={onRevertAllStudents}
        />
      )}
    </div>
  );
});

export default PpdbClassCard;
