import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Save,
  ArrowUp,
  ArrowDown,
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  Search,
  BookOpen,
  Filter,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { kurikulumApi, type StrukturKurikulum } from '@/api/kurikulum.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export interface RaporMapelOrderingPanelProps {
  tahunPelajaranId: string;
  tahunAjaran?: string;
  onSaved?: () => void;
  className?: string;
}

const KELOMPOK_OPTIONS = [
  { value: 'Mata Pelajaran Umum', label: 'A. Mata Pelajaran Umum', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'Mata Pelajaran Kejuruan', label: 'B. Mata Pelajaran Kejuruan', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'Mata Pelajaran Pilihan', label: 'C. Mata Pelajaran Pilihan', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'Muatan Lokal', label: 'D. Muatan Lokal', color: 'bg-purple-50 text-purple-700 border-purple-200' },
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

  // 1. Fetch Struktur Kurikulum untuk T.A. ini
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

  // Sync server data to local state for live reordering
  React.useEffect(() => {
    if (rawData) {
      // Sort initially by urutan ASC
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
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan urutan mapel');
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

  // Handle reorder
  const handleMove = useCallback((index: number, direction: 'up' | 'down') => {
    setLocalRows((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;

      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;

      // Re-assign urutan sequence
      next.forEach((item, idx) => {
        item.urutan = (idx + 1) * 10;
      });

      setIsDirty(true);
      return next;
    });
  }, []);

  const handleUrutanChange = useCallback((id: string, newUrutan: number) => {
    setLocalRows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, urutan: newUrutan } : item))
    );
    setIsDirty(true);
  }, []);

  const handleKelompokChange = useCallback((id: string, newKelompok: string) => {
    setLocalRows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, kelompok: newKelompok } : item))
    );
    setIsDirty(true);
  }, []);

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

  // Filtered rows for search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return localRows;
    const q = searchQuery.toLowerCase().trim();
    return localRows.filter(
      (r) =>
        (r.Mapel?.nama_mapel || '').toLowerCase().includes(q) ||
        (r.Mapel?.kode_mapel || '').toLowerCase().includes(q) ||
        (r.kelompok || '').toLowerCase().includes(q)
    );
  }, [localRows, searchQuery]);

  // Grouped counts for badges
  const stats = useMemo(() => {
    const countUmum = localRows.filter((r) => (r.kelompok || '').includes('Umum')).length;
    const countKejuruan = localRows.filter((r) => (r.kelompok || '').includes('Kejuruan')).length;
    const countPilihan = localRows.filter((r) => (r.kelompok || '').includes('Pilihan')).length;
    const countMulok = localRows.filter((r) => (r.kelompok || '').includes('Lokal')).length;
    return { countUmum, countKejuruan, countPilihan, countMulok, total: localRows.length };
  }, [localRows]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 1. Header & Tingkat Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              Urutan & Kelompok Mapel Rapor {tahunAjaran ? `(${tahunAjaran})` : ''}
            </h4>
            <p className="text-xs text-slate-500">
              Menentukan urutan tampilan dan sekat kelompok mata pelajaran saat dicetak di lembar rapor.
            </p>
          </div>
        </div>

        {/* Tingkat Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          {[10, 11, 12].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTingkat(t)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                selectedTingkat === t
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Kelas {t}
            </button>
          ))}
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
            placeholder="Cari mata pelajaran / kode..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => standardMutation.mutate()}
            isLoading={standardMutation.isPending}
            className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
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
              'text-xs transition-all',
              isDirty
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-300'
                : 'bg-slate-200 text-slate-500'
            )}
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {isDirty ? 'Simpan Urutan & Kelompok' : 'Tersimpan'}
          </Button>
        </div>
      </div>

      {/* 3. Distribution Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-between">
          <span className="text-xs text-blue-700 font-medium">Umum</span>
          <span className="text-xs font-bold text-blue-800">{stats.countUmum} mapel</span>
        </div>
        <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
          <span className="text-xs text-emerald-700 font-medium">Kejuruan</span>
          <span className="text-xs font-bold text-emerald-800">{stats.countKejuruan} mapel</span>
        </div>
        <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100 flex items-center justify-between">
          <span className="text-xs text-amber-700 font-medium">Pilihan</span>
          <span className="text-xs font-bold text-amber-800">{stats.countPilihan} mapel</span>
        </div>
        <div className="p-2 rounded-lg bg-purple-50/70 border border-purple-100 flex items-center justify-between">
          <span className="text-xs text-purple-700 font-medium">Muatan Lokal</span>
          <span className="text-xs font-bold text-purple-800">{stats.countMulok} mapel</span>
        </div>
      </div>

      {/* 4. Interactive Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-xs">Memuat struktur mata pelajaran kelas {selectedTingkat}...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Belum ada struktur mata pelajaran untuk Kelas {selectedTingkat}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Gunakan tombol &quot;Standar Kemendikbud&quot; atau buka menu Struktur Kurikulum untuk menyusun alokasi mapel.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => standardMutation.mutate()}
              isLoading={standardMutation.isPending}
              className="text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Generate Struktur Kemendikbud Kelas {selectedTingkat}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-16 text-center">Urutan</th>
                  <th className="py-2.5 px-3">Mata Pelajaran</th>
                  <th className="py-2.5 px-3 w-52">Kelompok di Rapor</th>
                  <th className="py-2.5 px-3 w-28 text-center">Tampil Rapor</th>
                  <th className="py-2.5 px-3 w-20 text-center">Geser</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => {
                  const isActive = row.is_active ?? true;
                  const currentKelompok = row.kelompok || 'Mata Pelajaran Umum';

                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'hover:bg-slate-50/80 transition-colors',
                        !isActive && 'opacity-50 bg-slate-50/40'
                      )}
                    >
                      {/* Urutan input */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={row.urutan ?? (idx + 1) * 10}
                          onChange={(e) => handleUrutanChange(row.id, parseInt(e.target.value, 10) || 0)}
                          className="w-14 px-1.5 py-1 text-center font-bold text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>

                      {/* Mapel Info */}
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-800">
                          {row.Mapel?.nama_mapel || 'Nama Mapel N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            {row.Mapel?.kode_mapel || '-'}
                          </span>
                          <span>•</span>
                          <span>{row.jp_per_minggu || 2} JP/minggu</span>
                          {row.Jurusan && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 font-medium">
                                {row.Jurusan.nama || row.Jurusan.nama_jurusan}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Kelompok Selector */}
                      <td className="py-2 px-3">
                        <select
                          value={currentKelompok}
                          onChange={(e) => handleKelompokChange(row.id, e.target.value)}
                          className="w-full text-xs py-1 px-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {KELOMPOK_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Toggle Active Switch */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(row.id, isActive)}
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border',
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          )}
                        >
                          {isActive ? 'Aktif' : 'Disembunyikan'}
                        </button>
                      </td>

                      {/* Reorder Arrows */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-20 disabled:hover:bg-transparent"
                            title="Pindah ke Atas"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'down')}
                            disabled={idx === filteredRows.length - 1}
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-20 disabled:hover:bg-transparent"
                            title="Pindah ke Bawah"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});

RaporMapelOrderingPanel.displayName = 'RaporMapelOrderingPanel';
