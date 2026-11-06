import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Save,
  ArrowUp,
  ArrowDown,
  Layers,
  GripVertical,
  AlertCircle,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  History,
  CheckCircle,
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

export type PresetEra = 'modern' | 'legacy';

interface KelompokMeta {
  key: string;
  label: string;
  letter: string;
  subTitle: string;
  headerBg: string;
  headerBorder: string;
  badgeBg: string;
  badgeText: string;
  dropBorder: string;
  dropBg: string;
}

// Preset 4 Kelompok (2025/2026 ke atas - Kurikulum Merdeka Terbaru)
const PRESET_MODERN_SECTIONS: KelompokMeta[] = [
  {
    key: 'Mata Pelajaran Umum',
    label: 'KELOMPOK A : MATA PELAJARAN UMUM',
    letter: 'A',
    subTitle: 'Pendidikan Agama, Pendidikan Pancasila, Bahasa Indonesia, PJOK, Sejarah, Seni Budaya',
    headerBg: 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200',
    headerBorder: 'border-blue-200 dark:border-blue-900',
    badgeBg: 'bg-blue-600 text-white',
    badgeText: 'text-blue-700 dark:text-blue-300',
    dropBorder: 'border-blue-500 bg-blue-100/50 dark:bg-blue-900/30',
    dropBg: 'bg-blue-50/30 dark:bg-blue-950/10',
  },
  {
    key: 'Mata Pelajaran Kejuruan',
    label: 'KELOMPOK B : MATA PELAJARAN KEJURUAN',
    letter: 'B',
    subTitle: 'Matematika, Bahasa Inggris, Informatika, IPAS, Dasar Keahlian, Konsentrasi Keahlian, PKK, PKL',
    headerBg: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200',
    headerBorder: 'border-emerald-200 dark:border-emerald-900',
    badgeBg: 'bg-emerald-600 text-white',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    dropBorder: 'border-emerald-500 bg-emerald-100/50 dark:bg-emerald-900/30',
    dropBg: 'bg-emerald-50/30 dark:bg-emerald-950/10',
  },
  {
    key: 'Mata Pelajaran Pilihan',
    label: 'KELOMPOK C : MATA PELAJARAN PILIHAN',
    letter: 'C',
    subTitle: 'Mata Pelajaran Lintas Minat, Vokasi Pilihan, Koding, AI, atau Bahasa Asing Pilihan',
    headerBg: 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200',
    headerBorder: 'border-amber-200 dark:border-amber-900',
    badgeBg: 'bg-amber-600 text-white',
    badgeText: 'text-amber-700 dark:text-amber-300',
    dropBorder: 'border-amber-500 bg-amber-100/50 dark:bg-amber-900/30',
    dropBg: 'bg-amber-50/30 dark:bg-amber-950/10',
  },
  {
    key: 'Muatan Lokal',
    label: 'KELOMPOK D : MUATAN LOKAL',
    letter: 'D',
    subTitle: 'Bahasa Daerah (Sunda / Jawa) dan Kearifan Lokal Sekolah',
    headerBg: 'bg-purple-50/80 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200',
    headerBorder: 'border-purple-200 dark:border-purple-900',
    badgeBg: 'bg-purple-600 text-white',
    badgeText: 'text-purple-700 dark:text-purple-300',
    dropBorder: 'border-purple-500 bg-purple-100/50 dark:bg-purple-900/30',
    dropBg: 'bg-purple-50/30 dark:bg-purple-950/10',
  },
];

// Preset 2 Kelompok (2024/2025 ke belakang - Format Era Awal Kurikulum Merdeka)
const PRESET_LEGACY_SECTIONS: KelompokMeta[] = [
  {
    key: 'Kelompok Umum',
    label: 'KELOMPOK A : KELOMPOK UMUM',
    letter: 'A',
    subTitle: 'Pendidikan Agama, Pancasila, Bahasa Indonesia, PJOK, Sejarah, Seni Budaya, Muatan Lokal',
    headerBg: 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200',
    headerBorder: 'border-blue-200 dark:border-blue-900',
    badgeBg: 'bg-blue-600 text-white',
    badgeText: 'text-blue-700 dark:text-blue-300',
    dropBorder: 'border-blue-500 bg-blue-100/50 dark:bg-blue-900/30',
    dropBg: 'bg-blue-50/30 dark:bg-blue-950/10',
  },
  {
    key: 'Kelompok Kejuruan',
    label: 'KELOMPOK B : KELOMPOK KEJURUAN',
    letter: 'B',
    subTitle: 'Matematika, Bahasa Inggris, Informatika, IPAS, Dasar Keahlian, Konsentrasi, PKK, PKL, Mapel Pilihan',
    headerBg: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200',
    headerBorder: 'border-emerald-200 dark:border-emerald-900',
    badgeBg: 'bg-emerald-600 text-white',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    dropBorder: 'border-emerald-500 bg-emerald-100/50 dark:bg-emerald-900/30',
    dropBg: 'bg-emerald-50/30 dark:bg-emerald-950/10',
  },
];

export const RaporMapelOrderingPanel: React.FC<RaporMapelOrderingPanelProps> = React.memo(({
  tahunPelajaranId,
  tahunAjaran = '',
  onSaved,
  className,
}) => {
  const queryClient = useQueryClient();
  const [selectedTingkat, setSelectedTingkat] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [localRows, setLocalRows] = useState<StrukturKurikulum[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Deteksi Era Otomatis: 2024/2025 ke belakang = legacy (2 kelompok), 2025/2026 ke depan = modern (4 kelompok)
  const autoEra: PresetEra = useMemo(() => {
    const matchYear = String(tahunAjaran || '').match(/^(\d{4})/);
    const startYear = matchYear ? parseInt(matchYear[1], 10) : 2025;
    return startYear < 2025 ? 'legacy' : 'modern';
  }, [tahunAjaran]);

  const [currentPreset, setCurrentPreset] = useState<PresetEra>(autoEra);

  // Sinkronkan preset jika tahun ajaran berubah
  React.useEffect(() => {
    setCurrentPreset(autoEra);
  }, [autoEra]);

  // Kelompok sections yang aktif berdasarkan preset
  const activeSections = useMemo(() => {
    return currentPreset === 'legacy' ? PRESET_LEGACY_SECTIONS : PRESET_MODERN_SECTIONS;
  }, [currentPreset]);

  // Drag and drop states
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // 1. Fetch Data
  const {
    data: strukturRes,
    isLoading,
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

  // Helper untuk memetakan nama kelompok mapel ke key section yang aktif
  const matchToActiveSection = useCallback(
    (rawKelompok?: string, mapelName?: string): string => {
      const g = (rawKelompok || '').toLowerCase().trim();
      const n = (mapelName || '').toLowerCase().trim();

      if (currentPreset === 'legacy') {
        // Preset 2 Kelompok (Umum & Kejuruan)
        const isKejuruan =
          g.includes('kejuruan') ||
          g.includes('pilihan') ||
          n.includes('matematika') ||
          n.includes('inggris') ||
          n.includes('informatika') ||
          n.includes('ipas') ||
          (n.includes('alam') && n.includes('sosial')) ||
          n.includes('dasar') ||
          n.includes('konsentrasi') ||
          n.includes('kk ') ||
          n.includes('pkk') ||
          n.includes('pkl') ||
          n.includes('pilihan');

        return isKejuruan ? 'Kelompok Kejuruan' : 'Kelompok Umum';
      } else {
        // Preset 4 Kelompok (Umum, Kejuruan, Pilihan, Muatan Lokal)
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
      }
    },
    [currentPreset]
  );

  // Recalculate sequence numbers (#1, #2, #3...) continuously through the active sections
  const recalculateSequenceNumbers = useCallback(
    (rows: StrukturKurikulum[]): StrukturKurikulum[] => {
      const updated = [...rows];
      let counter = 1;
      activeSections.forEach((sec) => {
        const inSection = updated.filter(
          (r) => matchToActiveSection(r.kelompok, r.Mapel?.nama_mapel) === sec.key
        );
        inSection.forEach((item) => {
          item.urutan = counter;
          item.kelompok = sec.key;
          counter += 1;
        });
      });
      return updated;
    },
    [activeSections, matchToActiveSection]
  );

  // 2. Mutations
  const saveMutation = useMutation({
    mutationFn: (items: Array<{ id: string; urutan: number; kelompok?: string; is_active?: boolean }>) =>
      kurikulumApi.updateStrukturOrdering(items),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Urutan dan kelompok rapor berhasil disimpan!');
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
        preset: currentPreset,
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

  // Drag and Drop Event Handlers
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

  const handleDropOnZone = useCallback(
    (e: React.DragEvent, targetGroupKey: string) => {
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
    },
    [draggingId, recalculateSequenceNumbers]
  );

  const handleDropOnItem = useCallback(
    (e: React.DragEvent, targetItemId: string, targetGroupKey: string) => {
      e.preventDefault();
      e.stopPropagation();
      const sourceId = e.dataTransfer.getData('text/plain') || draggingId;
      if (!sourceId || sourceId === targetItemId) return;

      setLocalRows((prev) => {
        const sourceIndex = prev.findIndex((r) => r.id === sourceId);
        if (sourceIndex === -1) return prev;

        const sourceItem = { ...prev[sourceIndex], kelompok: targetGroupKey };
        const next = [...prev];
        next.splice(sourceIndex, 1);
        const newTargetIndex = next.findIndex((r) => r.id === targetItemId);
        next.splice(newTargetIndex, 0, sourceItem);

        setIsDirty(true);
        return recalculateSequenceNumbers(next);
      });

      setDraggingId(null);
      setDragOverGroup(null);
      setDragOverItemId(null);
    },
    [draggingId, recalculateSequenceNumbers]
  );

  // Button Reorder Within Group
  const handleMoveInGroup = useCallback(
    (id: string, groupKey: string, direction: 'up' | 'down') => {
      setLocalRows((prev) => {
        const groupItems = prev.filter(
          (r) => matchToActiveSection(r.kelompok, r.Mapel?.nama_mapel) === groupKey
        );
        const otherItems = prev.filter(
          (r) => matchToActiveSection(r.kelompok, r.Mapel?.nama_mapel) !== groupKey
        );

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
    },
    [matchToActiveSection, recalculateSequenceNumbers]
  );

  // Fast dropdown switch
  const handleChangeGroup = useCallback(
    (id: string, newGroup: string) => {
      setLocalRows((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, kelompok: newGroup } : item));
        setIsDirty(true);
        return recalculateSequenceNumbers(next);
      });
    },
    [recalculateSequenceNumbers]
  );

  const handleToggleActive = useCallback((id: string, current: boolean) => {
    setLocalRows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_active: !current } : item))
    );
    setIsDirty(true);
  }, []);

  const handleSaveAll = useCallback(() => {
    const defaultGroup = currentPreset === 'legacy' ? 'Kelompok Umum' : 'Mata Pelajaran Umum';
    const payload = localRows.map((r, idx) => ({
      id: r.id,
      urutan: r.urutan ?? (idx + 1),
      kelompok: r.kelompok || defaultGroup,
      is_active: r.is_active !== false,
    }));
    saveMutation.mutate(payload);
  }, [localRows, currentPreset, saveMutation]);

  // Search filter
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
      {/* 1. Header & Tingkat Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>Pengaturan Urutan Kelompok Rapor</span>
              {tahunAjaran && (
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {tahunAjaran}
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Format penyajian vertikal persis dokumen rapor fisik. Tarik (drag) mapel untuk berpindah kelompok.
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
                  'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
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

      {/* 2. Preset Selector Toolbar & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        {/* Preset Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-indigo-500" />
            <span>Preset Rapor:</span>
          </span>

          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setCurrentPreset('modern');
                setIsDirty(true);
              }}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                currentPreset === 'modern'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              <CheckCircle className={cn('w-3 h-3', currentPreset === 'modern' ? 'text-indigo-600' : 'opacity-0')} />
              <span>4 Kelompok (2025/2026 ke atas)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentPreset('legacy');
                setIsDirty(true);
              }}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                currentPreset === 'legacy'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              <CheckCircle className={cn('w-3 h-3', currentPreset === 'legacy' ? 'text-indigo-600' : 'opacity-0')} />
              <span>2 Kelompok (2024/2025 ke belakang)</span>
            </button>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 flex-1 justify-end max-w-lg">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mapel atau kode..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => standardMutation.mutate()}
            isLoading={standardMutation.isPending}
            className="text-xs text-indigo-700 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50"
            title="Otomatis susun sesuai standar regulasi Kemendikbud"
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
              'text-xs font-bold transition-all shadow-xs shrink-0',
              isDirty
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 ring-2 ring-indigo-300'
                : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {isDirty ? 'Simpan' : 'Tersimpan'}
          </Button>
        </div>
      </div>

      {/* 3. VERTICAL STACKED RAPOR SECTIONS (PERSIS RAPOR ASLINYA) */}
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
              Klik tombol di bawah untuk otomatis men-generate struktur dengan {currentPreset === 'legacy' ? 'Preset 2 Kelompok' : 'Preset 4 Kelompok'}.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => standardMutation.mutate()}
            isLoading={standardMutation.isPending}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Generate Struktur {currentPreset === 'legacy' ? '2 Kelompok' : '4 Kelompok'} Kelas {selectedTingkat}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeSections.map((sec) => {
            const sectionRows = searchedRows.filter(
              (r) => matchToActiveSection(r.kelompok, r.Mapel?.nama_mapel) === sec.key
            );
            const isTargetDropZone = dragOverGroup === sec.key;

            return (
              <div
                key={sec.key}
                onDragOver={(e) => handleDragOverZone(e, sec.key)}
                onDragLeave={() => setDragOverGroup(null)}
                onDrop={(e) => handleDropOnZone(e, sec.key)}
                className={cn(
                  'rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs',
                  sec.headerBorder,
                  isTargetDropZone &&
                    'ring-2 ring-indigo-500 ring-offset-2 border-indigo-400 shadow-md scale-[1.005]'
                )}
              >
                {/* Section Header */}
                <div
                  className={cn(
                    'px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2',
                    sec.headerBg,
                    sec.headerBorder
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shadow-2xs',
                        sec.badgeBg
                      )}
                    >
                      {sec.letter}
                    </span>
                    <div>
                      <h5 className="font-extrabold text-xs tracking-wide uppercase">
                        {sec.label}
                      </h5>
                      <p className="text-[10px] opacity-80 font-normal">
                        {sec.subTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      {sectionRows.length} Mata Pelajaran
                    </span>
                  </div>
                </div>

                {/* Subject Rows Container */}
                <div className={cn('p-2 space-y-1.5 transition-colors', isTargetDropZone ? sec.dropBorder : sec.dropBg)}>
                  {sectionRows.length === 0 ? (
                    <div
                      className={cn(
                        'py-6 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-xs transition-all',
                        isTargetDropZone
                          ? 'border-indigo-400 bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-700 font-bold'
                          : 'border-slate-300/70 dark:border-slate-700 text-slate-400'
                      )}
                    >
                      <Layers className="w-4 h-4 opacity-50" />
                      <span>Belum ada mapel di {sec.label}. Tarik (drag) mapel ke area ini.</span>
                    </div>
                  ) : (
                    sectionRows.map((item, idx) => {
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
                          onDrop={(e) => handleDropOnItem(e, item.id, sec.key)}
                          className={cn(
                            'p-2.5 sm:px-4 sm:py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 group hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing select-none',
                            !isActive && 'opacity-40 bg-slate-50 dark:bg-slate-800/40',
                            isItemDragging && 'opacity-20 border-dashed border-indigo-400',
                            isItemOver && 'border-t-2 border-t-indigo-600 scale-[1.01]'
                          )}
                        >
                          {/* Left: Drag Handle, Number, & Mapel Title */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-indigo-600 transition-colors" />
                            
                            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/70 dark:border-slate-700">
                              {item.urutan ?? (idx + 1)}
                            </span>

                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                {item.Mapel?.nama_mapel}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded text-slate-600 dark:text-slate-400">
                                  {item.Mapel?.kode_mapel || '-'}
                                </span>
                                <span>•</span>
                                <span>{item.jp_per_minggu || 2} JP/minggu</span>
                                {item.Jurusan && (
                                  <>
                                    <span>•</span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[150px]">
                                      {item.Jurusan.nama || item.Jurusan.nama_jurusan}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Quick Group Selector, Visibility, and Move Arrows */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Pindah Kelompok Dropdown */}
                            <select
                              value={sec.key}
                              onChange={(e) => handleChangeGroup(item.id, e.target.value)}
                              className="text-xs py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[140px] sm:max-w-none"
                            >
                              {activeSections.map((s) => (
                                <option key={s.key} value={s.key}>
                                  Pindah ke Kelompok {s.letter}
                                </option>
                              ))}
                            </select>

                            {/* Visibility Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item.id, isActive)}
                              className={cn(
                                'p-1.5 rounded-lg border transition',
                                isActive
                                  ? 'text-slate-400 hover:text-slate-700 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                  : 'text-rose-500 hover:text-rose-700 border-rose-200 bg-rose-50 dark:bg-rose-950/40'
                              )}
                              title={isActive ? 'Tampil di Rapor (Klik untuk sembunyikan)' : 'Disembunyikan dari Rapor (Klik untuk aktifkan)'}
                            >
                              {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Reorder Up/Down */}
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleMoveInGroup(item.id, sec.key, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-20"
                                title="Geser ke atas"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveInGroup(item.id, sec.key, 'down')}
                                disabled={idx === sectionRows.length - 1}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-20"
                                title="Geser ke bawah"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
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
      )}
    </div>
  );
});

RaporMapelOrderingPanel.displayName = 'RaporMapelOrderingPanel';
