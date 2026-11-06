import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Save,
  ArrowUp,
  ArrowDown,
  Layers,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { kurikulumApi, type StrukturKurikulum } from '@/api/kurikulum.api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface RaporMapelOrderingPanelProps {
  tahunPelajaranId: string;
  tahunAjaran?: string;
  onSaved?: () => void;
  className?: string;
}

interface KelompokMeta {
  key: string;
  label: string;
  shortName: string;
  code: string;
  colorBorder: string;
  colorBg: string;
  colorHeader: string;
  colorText: string;
  colorBadge: string;
  description: string;
}

const KELOMPOK_GROUPS: KelompokMeta[] = [
  {
    key: 'Mata Pelajaran Umum',
    label: 'A. Mata Pelajaran Umum',
    shortName: 'Umum',
    code: 'A',
    colorBorder: 'border-blue-200 dark:border-blue-900',
    colorBg: 'bg-blue-50/40 dark:bg-blue-950/20',
    colorHeader: 'bg-blue-100/70 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    colorText: 'text-blue-700 dark:text-blue-400',
    colorBadge: 'bg-blue-600 text-white',
    description: 'Pendidikan Agama, Pancasila, Bahasa Indonesia, PJOK, Sejarah, Seni Budaya',
  },
  {
    key: 'Mata Pelajaran Kejuruan',
    label: 'B. Mata Pelajaran Kejuruan',
    shortName: 'Kejuruan',
    code: 'B',
    colorBorder: 'border-emerald-200 dark:border-emerald-900',
    colorBg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
    colorHeader: 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    colorText: 'text-emerald-700 dark:text-emerald-400',
    colorBadge: 'bg-emerald-600 text-white',
    description: 'Matematika, Bahasa Inggris, Informatika, IPAS, Dasar Keahlian, Konsentrasi, PKK, PKL',
  },
  {
    key: 'Mata Pelajaran Pilihan',
    label: 'C. Mata Pelajaran Pilihan',
    shortName: 'Pilihan',
    code: 'C',
    colorBorder: 'border-amber-200 dark:border-amber-900',
    colorBg: 'bg-amber-50/40 dark:bg-amber-950/20',
    colorHeader: 'bg-amber-100/70 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    colorText: 'text-amber-700 dark:text-amber-400',
    colorBadge: 'bg-amber-600 text-white',
    description: 'Mapel lintas minat, vokasi pilihan, koding, kecerdasan buatan, atau bahasa asing pilihan',
  },
  {
    key: 'Muatan Lokal',
    label: 'D. Muatan Lokal',
    shortName: 'Muatan Lokal',
    code: 'D',
    colorBorder: 'border-purple-200 dark:border-purple-900',
    colorBg: 'bg-purple-50/40 dark:bg-purple-950/20',
    colorHeader: 'bg-purple-100/70 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    colorText: 'text-purple-700 dark:text-purple-400',
    colorBadge: 'bg-purple-600 text-white',
    description: 'Bahasa Daerah (Sunda / Jawa) dan kearifan lokal sekolah',
  },
];

// Helper to normalize any raw kelompok string to one of the 4 canonical groups
const normalizeToCanonicalGroup = (rawKelompok?: string, mapelName?: string): string => {
  const g = (rawKelompok || '').toLowerCase().trim();
  const n = (mapelName || '').toLowerCase().trim();

  if (g.includes('muatan lokal') || g.includes('mulok') || n.includes('sunda') || n.includes('jawa') || n.includes('daerah')) {
    return 'Muatan Lokal';
  }
  if (g.includes('pilihan') || g.includes('peminatan')) {
    return 'Mata Pelajaran Pilihan';
  }
  if (g.includes('kejuruan')) {
    return 'Mata Pelajaran Kejuruan';
  }
  return 'Mata Pelajaran Umum';
};

export const RaporMapelOrderingPanel: React.FC<RaporMapelOrderingPanelProps> = React.memo(({
  tahunPelajaranId,
  tahunAjaran = '',
  onSaved,
  className,
}) => {
  const queryClient = useQueryClient();
  const [selectedTingkat, setSelectedTingkat] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [localRows, setLocalRows] = useState<StrukturKurikulum[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Drag and drop states
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // 1. Fetch Struktur Kurikulum untuk T.A. & Tingkat ini
  const {
    data: strukturRes,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['struktur-kurikulum-ordering', tahunPelajaranId, selectedTingkat],
    queryFn: () =>
      kurikulumApi.getStruktur({
        tahun_pelajaran_id: tahunPelajaranId,
        tingkat: selectedTingkat,
      }),
    enabled: Boolean(tahunPelajaranId),
  });

  const rawData: StrukturKurikulum[] = useMemo(() => {
    const list = Array.isArray(strukturRes) ? strukturRes : strukturRes?.data || [];
    return list;
  }, [strukturRes]);

  // Sync server data to local state
  React.useEffect(() => {
    if (rawData) {
      const sorted = [...rawData].sort((a, b) => {
        const uA = a.urutan ?? 100;
        const uB = b.urutan ?? 100;
        if (uA !== uB) return uA - uB;
        return (a.Mapel?.nama_mapel || '').localeCompare(b.Mapel?.nama_mapel || '');
      });
      setLocalRows(sorted);
      setIsDirty(false);
    }
  }, [rawData]);

  // 2. Mutations
  const saveMutation = useMutation({
    mutationFn: (items: Array<{ id: string; urutan: number; kelompok?: string; is_active?: boolean }>) =>
      kurikulumApi.updateStrukturOrdering(items),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Urutan dan kelompok mapel berhasil disimpan!');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['struktur-kurikulum-ordering'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-detail'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-monitoring'] });
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan susunan mapel');
    },
  });

  const standardMutation = useMutation({
    mutationFn: () =>
      kurikulumApi.applyKemendikbudStandard({
        tahun_pelajaran_id: tahunPelajaranId,
        tingkat: selectedTingkat,
      }),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Berhasil menerapkan urutan standar Kemendikbud!');
      queryClient.invalidateQueries({ queryKey: ['struktur-kurikulum-ordering'] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menerapkan urutan standar');
    },
  });

  // Re-number urutan sequentially based on current group order
  const recalculateSequenceNumbers = useCallback((rows: StrukturKurikulum[]): StrukturKurikulum[] => {
    const updated = [...rows];
    let counter = 10;
    KELOMPOK_GROUPS.forEach((grp) => {
      const inGroup = updated.filter((r) => normalizeToCanonicalGroup(r.kelompok, r.Mapel?.nama_mapel) === grp.key);
      inGroup.forEach((item) => {
        item.urutan = counter;
        item.kelompok = grp.key;
        counter += 10;
      });
    });
    return updated;
  }, []);

  // Drag Handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverGroup(null);
    setDragOverItemId(null);
  }, []);

  const handleDragOverZone = useCallback((e: React.DragEvent, groupKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverGroup !== groupKey) {
      setDragOverGroup(groupKey);
    }
  }, [dragOverGroup]);

  const handleDragLeaveZone = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDropOnZone = useCallback((e: React.DragEvent, targetGroupKey: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain') || draggingId;
    if (!itemId) return;

    setLocalRows((prev) => {
      const itemIndex = prev.findIndex((r) => r.id === itemId);
      if (itemIndex === -1) return prev;

      const item = { ...prev[itemIndex], kelompok: targetGroupKey };
      const remaining = prev.filter((r) => r.id !== itemId);
      const next = [...remaining, item];
      setIsDirty(true);
      return recalculateSequenceNumbers(next);
    });

    setDraggingId(null);
    setDragOverGroup(null);
    setDragOverItemId(null);
  }, [draggingId, recalculateSequenceNumbers]);

  const handleDropOnItem = useCallback((e: React.DragEvent, targetItemId: string, targetGroupKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain') || draggingId;
    if (!sourceId || sourceId === targetItemId) return;

    setLocalRows((prev) => {
      const sourceIndex = prev.findIndex((r) => r.id === sourceId);
      const targetIndex = prev.findIndex((r) => r.id === targetItemId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const sourceItem = { ...prev[sourceIndex], kelompok: targetGroupKey };
      const next = [...prev];
      // Remove source
      next.splice(sourceIndex, 1);
      // Re-insert at new position
      const newTargetIndex = next.findIndex((r) => r.id === targetItemId);
      next.splice(newTargetIndex, 0, sourceItem);

      setIsDirty(true);
      return recalculateSequenceNumbers(next);
    });

    setDraggingId(null);
    setDragOverGroup(null);
    setDragOverItemId(null);
  }, [draggingId, recalculateSequenceNumbers]);

  // Button Reorder Within Group
  const handleMoveInGroup = useCallback((id: string, groupKey: string, direction: 'up' | 'down') => {
    setLocalRows((prev) => {
      const groupItems = prev.filter((r) => normalizeToCanonicalGroup(r.kelompok, r.Mapel?.nama_mapel) === groupKey);
      const otherItems = prev.filter((r) => normalizeToCanonicalGroup(r.kelompok, r.Mapel?.nama_mapel) !== groupKey);

      const itemIdx = groupItems.findIndex((r) => r.id === id);
      if (itemIdx === -1) return prev;

      const targetIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1;
      if (targetIdx < 0 || targetIdx >= groupItems.length) return prev;

      const temp = groupItems[itemIdx];
      groupItems[itemIdx] = groupItems[targetIdx];
      groupItems[targetIdx] = temp;

      const merged = [...otherItems, ...groupItems];
      setIsDirty(true);
      return recalculateSequenceNumbers(merged);
    });
  }, [recalculateSequenceNumbers]);

  // Quick Change Group via dropdown / menu
  const handleChangeGroup = useCallback((id: string, newGroup: string) => {
    setLocalRows((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, kelompok: newGroup } : item));
      setIsDirty(true);
      return recalculateSequenceNumbers(next);
    });
  }, [recalculateSequenceNumbers]);

  const handleToggleActive = useCallback((id: string, current: boolean) => {
    setLocalRows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_active: !current } : item))
    );
    setIsDirty(true);
  }, []);

  const handleSaveAll = useCallback(() => {
    const payload = localRows.map((r, idx) => ({
      id: r.id,
      urutan: r.urutan ?? (idx + 1) * 10,
      kelompok: r.kelompok || 'Mata Pelajaran Umum',
      is_active: r.is_active ?? true,
    }));
    saveMutation.mutate(payload);
  }, [localRows, saveMutation]);

  // Filtered rows for search query
  const searchedRows = useMemo(() => {
    if (!searchQuery.trim()) return localRows;
    const q = searchQuery.toLowerCase().trim();
    return localRows.filter(
      (r) =>
        (r.Mapel?.nama_mapel || '').toLowerCase().includes(q) ||
        (r.Mapel?.kode_mapel || '').toLowerCase().includes(q)
    );
  }, [localRows, searchQuery]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 1. Top Header & Tingkat Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>Pengaturan Kelompok & Urutan Rapor</span>
              {tahunAjaran && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {tahunAjaran}
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tarik & lepaskan (Drag & Drop) mata pelajaran ke kolom kelompok rapor yang dituju.
            </p>
          </div>
        </div>

        {/* Tingkat Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {[10, 11, 12].map((t) => {
            const count = localRows.filter((r) => r.tingkat === t).length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTingkat(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                  selectedTingkat === t
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                <span>Kelas {t}</span>
                <span className="text-[10px] opacity-70 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded-full">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mata pelajaran atau kode..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={cn(
                'p-1.5 rounded-md text-xs font-semibold transition',
                viewMode === 'board'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
              title="Tampilan Papan Kelompok (Drag & Drop)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-md text-xs font-semibold transition',
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
              title="Tampilan Tabel Berurutan"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => standardMutation.mutate()}
            isLoading={standardMutation.isPending}
            className="text-xs text-indigo-700 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Standar Kemendikbud
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveAll}
            isLoading={saveMutation.isPending}
            disabled={!isDirty && !saveMutation.isPending}
            className={cn(
              'text-xs font-bold transition-all shadow-xs',
              isDirty
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 ring-2 ring-indigo-300'
                : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {isDirty ? 'Simpan Perubahan' : 'Tersimpan'}
          </Button>
        </div>
      </div>

      {/* 3. Drag and Drop Kelompok Zones (THE ORIGINAL E-RAPOR EXPERIENCE) */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-xs font-medium">Memuat alokasi mata pelajaran kelas {selectedTingkat}...</p>
        </div>
      ) : localRows.length === 0 ? (
        <div className="p-12 text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <AlertCircle className="w-9 h-9 text-amber-500 mx-auto" />
          <div>
            <h5 className="text-sm font-bold text-slate-800 dark:text-white">
              Belum Ada Struktur Kurikulum Kelas {selectedTingkat} di Periode Ini
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Klik tombol di bawah untuk otomatis men-generate struktur dari tahun ajaran sekolah atau menggunakan standar resmi Kemendikbudristek.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => standardMutation.mutate()}
            isLoading={standardMutation.isPending}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Generate Struktur Kemendikbud Kelas {selectedTingkat}
          </Button>
        </div>
      ) : viewMode === 'board' ? (
        /* KANBAN / MULTI-ZONE BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
          {KELOMPOK_GROUPS.map((grp) => {
            const groupRows = searchedRows.filter(
              (r) => normalizeToCanonicalGroup(r.kelompok, r.Mapel?.nama_mapel) === grp.key
            );
            const isTargetDropZone = dragOverGroup === grp.key;

            return (
              <div
                key={grp.key}
                onDragOver={(e) => handleDragOverZone(e, grp.key)}
                onDragLeave={handleDragLeaveZone}
                onDrop={(e) => handleDropOnZone(e, grp.key)}
                className={cn(
                  'rounded-2xl border transition-all duration-200 flex flex-col min-h-[380px]',
                  grp.colorBorder,
                  grp.colorBg,
                  isTargetDropZone &&
                    'ring-2 ring-indigo-500 ring-offset-2 border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-lg scale-[1.01]'
                )}
              >
                {/* Zone Header */}
                <div className={cn('p-3 rounded-t-2xl border-b flex items-center justify-between', grp.colorHeader, grp.colorBorder)}>
                  <div className="flex items-center gap-2">
                    <span className={cn('w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black', grp.colorBadge)}>
                      {grp.code}
                    </span>
                    <span className="font-bold text-xs">{grp.shortName}</span>
                  </div>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200">
                    {groupRows.length} Mapel
                  </span>
                </div>

                {/* Drop Target List */}
                <div className="p-2.5 space-y-2 flex-1 overflow-y-auto max-h-[560px]">
                  {groupRows.length === 0 ? (
                    <div
                      className={cn(
                        'h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-3 text-center transition-all',
                        isTargetDropZone
                          ? 'border-indigo-400 bg-indigo-100/60 dark:bg-indigo-900/30 text-indigo-700 font-bold'
                          : 'border-slate-300/80 dark:border-slate-700 text-slate-400'
                      )}
                    >
                      <Layers className="w-5 h-5 mb-1 opacity-50" />
                      <span className="text-[11px] font-medium">Tarik mapel ke sini</span>
                    </div>
                  ) : (
                    groupRows.map((item, idx) => {
                      const isActive = item.is_active !== false;
                      const isItemDragging = draggingId === item.id;
                      const isItemOver = dragOverItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragOverItemId !== item.id) setDragOverItemId(item.id);
                          }}
                          onDrop={(e) => handleDropOnItem(e, item.id, grp.key)}
                          className={cn(
                            'p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs group hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none',
                            !isActive && 'opacity-50 bg-slate-50 dark:bg-slate-800/40',
                            isItemDragging && 'opacity-25 border-dashed border-indigo-400',
                            isItemOver && 'border-t-2 border-t-indigo-600 scale-[1.02]'
                          )}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-start gap-2 min-w-0">
                              <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0 mt-0.5 group-hover:text-indigo-600 transition-colors" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                                    #{item.urutan ?? (idx + 1) * 10}
                                  </span>
                                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                    {item.Mapel?.nama_mapel}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                                  <span className="font-mono">{item.Mapel?.kode_mapel || '-'}</span>
                                  <span>•</span>
                                  <span>{item.jp_per_minggu || 2} JP</span>
                                  {item.Jurusan && (
                                    <>
                                      <span>•</span>
                                      <span className="text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[90px]">
                                        {item.Jurusan.nama || item.Jurusan.nama_jurusan}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Visibility Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item.id, isActive)}
                              className={cn(
                                'p-1 rounded-md transition text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                                !isActive && 'text-rose-500 hover:text-rose-700'
                              )}
                              title={isActive ? 'Tampil di Rapor (Klik untuk sembunyikan)' : 'Disembunyikan dari Rapor (Klik untuk aktifkan)'}
                            >
                              {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Quick Bottom Control: Reorder and Target Group Selector */}
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[10px]">
                            {/* Fast Switch Kelompok */}
                            <select
                              value={grp.key}
                              onChange={(e) => handleChangeGroup(item.id, e.target.value)}
                              className="text-[10px] py-0.5 px-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold focus:outline-none"
                            >
                              {KELOMPOK_GROUPS.map((k) => (
                                <option key={k.key} value={k.key}>
                                  Pindah ke {k.shortName}
                                </option>
                              ))}
                            </select>

                            {/* Arrow Shift */}
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleMoveInGroup(item.id, grp.key, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 disabled:opacity-20"
                                title="Geser ke atas"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveInGroup(item.id, grp.key, 'down')}
                                disabled={idx === groupRows.length - 1}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 disabled:opacity-20"
                                title="Geser ke bawah"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ACCORDION TABLE VIEW */
        <div className="space-y-3">
          {KELOMPOK_GROUPS.map((grp) => {
            const groupRows = searchedRows.filter(
              (r) => normalizeToCanonicalGroup(r.kelompok, r.Mapel?.nama_mapel) === grp.key
            );

            return (
              <div
                key={grp.key}
                onDragOver={(e) => handleDragOverZone(e, grp.key)}
                onDrop={(e) => handleDropOnZone(e, grp.key)}
                className={cn('rounded-xl border overflow-hidden bg-white dark:bg-slate-900', grp.colorBorder)}
              >
                <div className={cn('px-4 py-2.5 border-b flex items-center justify-between', grp.colorHeader)}>
                  <div className="flex items-center gap-2">
                    <span className={cn('w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black', grp.colorBadge)}>
                      {grp.code}
                    </span>
                    <span className="font-bold text-xs">{grp.label}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {groupRows.length} Mapel
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {groupRows.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Tarik mapel ke kelompok ini untuk menambahkan
                    </div>
                  ) : (
                    groupRows.map((item, idx) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        className="px-4 py-2 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-grab"
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-slate-400" />
                          <span className="font-mono font-bold text-slate-500 w-10">#{item.urutan}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{item.Mapel?.nama_mapel}</span>
                          <span className="text-[10px] text-slate-400">({item.Mapel?.kode_mapel})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={grp.key}
                            onChange={(e) => handleChangeGroup(item.id, e.target.value)}
                            className="text-xs py-1 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          >
                            {KELOMPOK_GROUPS.map((k) => (
                              <option key={k.key} value={k.key}>
                                Pindah ke {k.shortName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

RaporMapelOrderingPanel.displayName = 'RaporMapelOrderingPanel';
