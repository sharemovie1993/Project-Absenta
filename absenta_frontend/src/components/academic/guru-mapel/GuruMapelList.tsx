import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Table } from '../../ui/Table';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Input } from '../../ui/Input';
import { SectionCard } from '../../ui/SectionCard';
import { Trash2, Plus, Search, RefreshCw, Users, BookOpen, FileSpreadsheet, Download, Layers, Calendar, ChevronDown, Clock, LayoutGrid, List as ListIcon } from 'lucide-react';
import { listGuruMapel, removeGuruMapel, assignGuruMapel } from '../../../api/kurikulum/guru-mapel.api';
import { kurikulumApi } from '../../../api/kurikulum.api';
import type { GuruMapel } from '../../../types/academic';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { getGuruList, updateGuruMaxJp } from '../../../api/academic/guru.api';
import { getMapelList } from '../../../api/academic/mapel.api';
import { getKelasList } from '../../../api/academic/kelas.api';
import { getJurusanForDropdown, getKelasForDropdown, type DropdownOption } from '../../../api/dropdown.api';
import type { Guru, Mapel } from '../../../types/academic';
import useConfirm from '../../../hooks/useConfirm';
import { useDebounce } from '../../../hooks/useDebounce';
import { exportDataToExcel } from '../../../utils/export.utils';
import { getMapelColor } from '../../../utils/mapelColorHelper';
import { useGuruOptions } from '../../../hooks/useGuruOptions';
import { useMapelOptions } from '../../../hooks/useMapelOptions';
import { TahunPelajaranSelect } from '../../common/TahunPelajaranSelect';
import { SemesterSelect } from '../../common/SemesterSelect';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../shared/MobileAcademicList';
import { cn } from '@/lib/utils';

interface Props {
  refreshTrigger?: number;
  onAdd?: () => void;
  onAddWizard?: () => void;
  onOpenTimeOff?: (guruId: string, guruName?: string) => void;
}

const GuruMapelList = React.memo<Props>(({ refreshTrigger = 0, onAdd, onAddWizard, onOpenTimeOff }) => {
  const queryClient = useQueryClient();
  const invalidateJadwalCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['beban-guru-list'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-grid'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-guru-timeline'] });
  }, [queryClient]);

  const { user } = useAuthStore();
  const confirm = useConfirm();

  // Canonical Option Hooks for Filters
  const { options: guruSelectOptions, isLoading: isLoadingGuru } = useGuruOptions({ jenisPtk: 'ALL' });
  const { options: mapelSelectOptions, isLoading: isLoadingMapel } = useMapelOptions();

  const [items, setItems] = useState<GuruMapel[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');
  const [selectedTahunPelajaranId, setSelectedTahunPelajaranId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [jurusanDropdown, setJurusanDropdown] = useState<DropdownOption[]>([]);
  const [kelasDropdown, setKelasDropdown] = useState<DropdownOption[]>([]);
  const [updatingScopeId, setUpdatingScopeId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewMode, setViewMode] = useState<'by_mapel' | 'table'>('by_mapel');
  const [mapelPage, setMapelPage] = useState(1);
  const mapelLimit = 8;

  const { isKurikulum, isAdmin, can } = useCapabilities();
  const canManage = useMemo(() => {
    return isAdmin || isKurikulum || can('academic.teaching.manage');
  }, [isAdmin, isKurikulum, can]);

  const [bebanGuruMap, setBebanGuruMap] = useState<Map<string, {
    current_jp: number;
    max_jp: number;
    ekuivalen_position_jp: number;
    total_calculated_jp: number;
    positions: Array<{ name: string; ekuivalen_jp: number }>;
  }>>(new Map());

  const fetchBebanData = useCallback(async () => {
    try {
      const res = await kurikulumApi.getBebanMengajar({
        tahun_pelajaran_id: selectedTahunPelajaranId || undefined,
        semester_id: selectedSemesterId || undefined,
      });
      if (res?.success && Array.isArray(res?.data)) {
        const bMap = new Map<string, any>();
        res.data.forEach((b: any) => {
          bMap.set(b.id, {
            current_jp: b.current_jp || 0,
            max_jp: b.max_jp || 24,
            ekuivalen_position_jp: b.ekuivalen_position_jp || 0,
            total_calculated_jp: b.total_calculated_jp || b.current_jp || 0,
            positions: b.positions || []
          });
        });
        setBebanGuruMap(bMap);
      }
    } catch (e) {
      console.error('Failed to load beban guru data:', e);
    }
  }, [selectedTahunPelajaranId, selectedSemesterId]);

  const handleProxyUpdateMaxJp = useCallback(async (guruId: string, guruName: string, newMaxJp: number) => {
    try {
      const res = await updateGuruMaxJp(guruId, newMaxJp);
      if (res?.success !== false) {
        toast.success(`Batas Max JP ${guruName} diperbarui menjadi ${newMaxJp} JP!`);
        invalidateJadwalCache();
        queryClient.invalidateQueries({ queryKey: ['beban-guru-list'] });
        queryClient.invalidateQueries({ queryKey: ['guru-list'] });
        queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
        fetchBebanData();
      } else {
        toast.error(res?.message || 'Gagal memperbarui Max JP');
      }
    } catch (err: any) {
      console.error('Error proxy updating max JP:', err);
      toast.error(err?.message || 'Gagal memperbarui Max JP');
    }
  }, [invalidateJadwalCache, queryClient, fetchBebanData]);

  const handleSearchGuru = useCallback(async (query: string) => {
    try {
      setIsLoadingGuru(true);
      const res = await getGuruList(1, 100, query);
      setGuruOptions(res.data);
    } catch {
      // ignore
    } finally {
      setIsLoadingGuru(false);
    }
  }, []);

  const handleSearchMapel = useCallback(async (query: string) => {
    try {
      setIsLoadingMapel(true);
      const res = await getMapelList(1, 100, query);
      setMapelOptions(res.data);
    } catch {
      // ignore
    } finally {
      setIsLoadingMapel(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      fetchBebanData();
      const res = await listGuruMapel({
        guru_id: selectedGuruId || undefined,
        mapel_id: selectedMapelId || undefined,
        tahun_pelajaran_id: selectedTahunPelajaranId || undefined,
        semester_id: selectedSemesterId || undefined,
      });
      if (res.success) {
        const term = debouncedSearch.toLowerCase();
        const filtered = res.data.filter((gm) => {
          const guruName = gm.Guru?.nama_guru?.toLowerCase() || '';
          const mapelName = gm.Mapel?.nama_mapel?.toLowerCase() || '';
          const kelasName = gm.Kelas?.nama_kelas?.toLowerCase() || '';
          const jurusanName = gm.Jurusan?.nama?.toLowerCase() || '';
          return guruName.includes(term) || mapelName.includes(term) || kelasName.includes(term) || jurusanName.includes(term);
        });
        setItems(filtered);
        setSelectedIds(new Set());
      } else {
        toast.error(res.message || 'Gagal memuat data');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedGuruId, selectedMapelId, selectedTahunPelajaranId, selectedSemesterId, fetchBebanData]);

  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items;
    const q = debouncedSearch.toLowerCase();
    return items.filter(gm => 
      (gm.Guru?.nama_guru && gm.Guru.nama_guru.toLowerCase().includes(q)) ||
      (gm.Guru?.nip && gm.Guru.nip.toLowerCase().includes(q)) ||
      (gm.Mapel?.nama_mapel && gm.Mapel.nama_mapel.toLowerCase().includes(q)) ||
      (gm.Mapel?.kode_mapel && gm.Mapel.kode_mapel.toLowerCase().includes(q)) ||
      (gm.Kelas?.nama_kelas && gm.Kelas.nama_kelas.toLowerCase().includes(q)) ||
      (gm.Jurusan?.nama && gm.Jurusan.nama.toLowerCase().includes(q))
    );
  }, [items, debouncedSearch]);

  const totalPages = Math.ceil(filteredItems.length / limit) || 1;

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [filteredItems, page, limit]);

  const mapelGroups = useMemo(() => {
    const groupMap = new Map<string, {
      mapel_id: string;
      nama_mapel: string;
      kode_mapel: string;
      assignments: GuruMapel[];
    }>();

    filteredItems.forEach((gm) => {
      const mapelId = gm.mapel_id || 'UNKNOWN';
      const namaMapel = gm.Mapel?.nama_mapel || 'Tanpa Mapel';
      const kodeMapel = gm.Mapel?.kode_mapel || '-';

      if (!groupMap.has(mapelId)) {
        groupMap.set(mapelId, {
          mapel_id: mapelId,
          nama_mapel: namaMapel,
          kode_mapel: kodeMapel,
          assignments: [],
        });
      }
      groupMap.get(mapelId)!.assignments.push(gm);
    });

    return Array.from(groupMap.values()).sort((a, b) => 
      a.nama_mapel.localeCompare(b.nama_mapel)
    );
  }, [filteredItems]);

  const totalMapelPages = Math.ceil(mapelGroups.length / mapelLimit) || 1;
  const paginatedMapelGroups = useMemo(() => {
    const start = (mapelPage - 1) * mapelLimit;
    return mapelGroups.slice(start, start + mapelLimit);
  }, [mapelGroups, mapelPage, mapelLimit]);

  useEffect(() => {
    setPage(1);
    setMapelPage(1);
  }, [debouncedSearch, selectedGuruId, selectedMapelId, selectedTahunPelajaranId, selectedSemesterId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshTrigger > 0) fetchData();
  }, [refreshTrigger, fetchData]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [jurusans, kelases] = await Promise.all([
          getJurusanForDropdown().catch(() => []),
          getKelasForDropdown().catch(() => [])
        ]);
        setJurusanDropdown(jurusans);
        setKelasDropdown(kelases);
      } catch {
        // ignore
      }
    };
    loadOptions();
  }, []);

  const handleScopeChange = useCallback(async (gm: GuruMapel, newScopeValue: string) => {
    try {
      setUpdatingScopeId(gm.id);
      let jurusan_id: string | null = null;
      let kelas_id: string | null = null;

      if (newScopeValue.startsWith('JURUSAN:')) {
        jurusan_id = newScopeValue.replace('JURUSAN:', '');
      } else if (newScopeValue.startsWith('KELAS:')) {
        kelas_id = newScopeValue.replace('KELAS:', '');
      }

      await removeGuruMapel(gm.id);

      const res = await assignGuruMapel({
        guru_id: gm.guru_id,
        mapel_id: gm.mapel_id,
        jurusan_id,
        kelas_id
      });

      if (res.success) {
        toast.success('Cakupan plotting berhasil diperbarui!');
      } else {
        toast.error(res.message || 'Gagal mengubah cakupan');
      }
      fetchData();
    } catch (e: any) {
      console.error('Error changing scope:', e);
      toast.error('Gagal memperbarui cakupan plotting');
      fetchData();
    } finally {
      setUpdatingScopeId(null);
    }
  }, [fetchData]);

  const handleDelete = useCallback(async (gm: GuruMapel) => {
    try {
      const ok = await confirm({
        title: 'Konfirmasi Hapus Pengampu',
        description: (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-3">
              <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-xl text-rose-600 dark:text-rose-400">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-rose-900 dark:text-rose-300 uppercase tracking-tight">Hapus Penugasan Mengajar</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong>{gm.Guru?.nama_guru}</strong> sebagai pengampu mata pelajaran <strong>{gm.Mapel?.nama_mapel}</strong>?
                </p>
              </div>
            </div>
          </div>
        ),
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        style: 'danger',
        withProgress: true,
        progressLabel: 'Menghapus pengampu...',
      });
      if (!ok) return;

      const res = await removeGuruMapel(gm.id);
      if (!res.success) {
        toast.error(res.message || 'Gagal menghapus pengampu');
        return;
      }
      toast.success(res.message || 'Pengampu berhasil dihapus');
      invalidateJadwalCache();
      fetchData();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Gagal menghapus pengampu';
      toast.error(msg);
    } finally {
      confirm.setLoading(false);
    }
  }, [fetchData, confirm]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      const ids = Array.from(selectedIds);
      const total = ids.length;
      const succeeded: string[] = [];
      const failed: { id: string; name: string; message: string }[] = [];

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const gmItem = items.find(item => item.id === id);
        const name = gmItem ? `${gmItem.Guru?.nama_guru || 'Guru'} - ${gmItem.Mapel?.nama_mapel || 'Mapel'}` : id;
        try {
          const res = await removeGuruMapel(id);
          if (!res.success) throw new Error(res.message || 'Gagal menghapus');
          succeeded.push(id);
        } catch (e: any) {
          failed.push({ id, name, message: e?.message || 'Gagal menghapus' });
        }
        confirm.setLoading(true, Math.round(((i + 1) / total) * 100));
      }

      if (failed.length > 0) {
        if (succeeded.length > 0) {
          toast(`Berhasil menghapus ${succeeded.length} pengampu, ${failed.length} gagal.`, { icon: '⚠️' });
        } else {
          toast.error(`Gagal menghapus ${failed.length} pengampu.`);
        }
      } else {
        toast.success(`Berhasil menghapus ${succeeded.length} pengampu`);
      }

      const next = new Set<string>(selectedIds);
      succeeded.forEach(id => next.delete(id));
      setSelectedIds(next);
      
      fetchData();
    } catch (err: any) {
      console.error('Error bulk deleting guru-mapel:', err);
      toast.error('Terjadi kesalahan saat menghapus data terpilih');
    } finally {
      confirm.setLoading(false);
    }
  }, [selectedIds, items, fetchData, confirm]);

  const columns = useMemo(() => [
    {
      key: 'Guru',
      label: 'Guru Pengampu & Jabatan',
      sortable: true,
      render: (_: any, gm: GuruMapel) => {
        const bebanInfo = bebanGuruMap.get(gm.guru_id);
        const activePositions = bebanInfo?.positions || [];

        return (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-bold text-slate-800 dark:text-slate-100">{gm.Guru?.nama_guru || '-'}</span>
              
              {/* Position Badges from Organizational Structure */}
              {activePositions.length > 0 && activePositions.map((pos, idx) => (
                <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800" title={`Ekuivalensi Jabatan: ${pos.name} (+${pos.ekuivalen_jp} JP)`}>
                  🔰 {pos.name} (+{pos.ekuivalen_jp} JP)
                </span>
              ))}
            </div>
          </div>
        );
      }
    },
    {
      key: 'ProgressBeban',
      label: 'Beban JP & Progress',
      render: (_: any, gm: GuruMapel) => {
        const bebanInfo = bebanGuruMap.get(gm.guru_id);
        const currentKbmJp = bebanInfo ? bebanInfo.current_jp : 0;
        const positionJp = bebanInfo ? bebanInfo.ekuivalen_position_jp : 0;
        const totalCalculatedJp = bebanInfo ? bebanInfo.total_calculated_jp : currentKbmJp;
        const maxJp = bebanInfo?.max_jp || (gm.Guru as any)?.max_jp || 24;

        const rawPercentage = Math.round((totalCalculatedJp / maxJp) * 100);
        const percentage = Math.min(rawPercentage, 100);

        let barColor = 'bg-amber-500';
        let statusBadge = `${totalCalculatedJp}/${maxJp} JP`;
        let textColor = 'text-amber-700 dark:text-amber-400';

        if (totalCalculatedJp === maxJp) {
          barColor = 'bg-emerald-500';
          statusBadge = `${totalCalculatedJp}/${maxJp} JP (Sesuai)`;
          textColor = 'text-emerald-700 dark:text-emerald-400';
        } else if (totalCalculatedJp > maxJp) {
          barColor = 'bg-rose-500';
          statusBadge = `${totalCalculatedJp}/${maxJp} JP (+${totalCalculatedJp - maxJp} JP)`;
          textColor = 'text-rose-600 dark:text-rose-400';
        } else {
          statusBadge = `${totalCalculatedJp}/${maxJp} JP (-${maxJp - totalCalculatedJp} JP)`;
        }

        return (
          <div className="flex flex-col gap-1 py-1 min-w-[180px]">
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shrink-0 shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className={`text-[10px] font-black tracking-tight ${textColor}`}>
                {statusBadge}
              </span>
            </div>
            {positionJp > 0 && (
              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                KBM: {currentKbmJp} JP + Jabatan: {positionJp} JP
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'KuotaMaxJp',
      label: 'Kuota Max JP',
      render: (_: any, gm: GuruMapel, rowIndex: number) => {
        const bebanInfo = bebanGuruMap.get(gm.guru_id);
        const maxJp = bebanInfo?.max_jp || (gm.Guru as any)?.max_jp || 24;

        if (!canManage) {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {maxJp} JP
            </span>
          );
        }

        return (
          <div className="flex items-center gap-1.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl px-2.5 py-1 w-fit shadow-2xs group hover:border-amber-400 transition-all" title="Gunakan tombol Panah Atas / Bawah di keyboard untuk navigasi antar baris">
            <input
              type="number"
              data-maxjp-index={rowIndex}
              key={`${gm.guru_id}-${maxJp}`}
              min={1}
              max={100}
              defaultValue={maxJp}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                  setTimeout(() => {
                    const nextInput = document.querySelector<HTMLInputElement>(`[data-maxjp-index="${rowIndex + 1}"]`);
                    if (nextInput) {
                      nextInput.focus();
                      nextInput.select();
                    }
                  }, 50);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                  setTimeout(() => {
                    const prevInput = document.querySelector<HTMLInputElement>(`[data-maxjp-index="${rowIndex - 1}"]`);
                    if (prevInput) {
                      prevInput.focus();
                      prevInput.select();
                    }
                  }, 50);
                }
              }}
              onBlur={async (e) => {
                const newVal = Number(e.target.value);
                if (newVal && newVal !== maxJp) {
                  await handleProxyUpdateMaxJp(gm.guru_id, gm.Guru?.nama_guru || 'Guru', newVal);
                }
              }}
              className="w-12 text-xs font-black text-center bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg py-0.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400">JP</span>
          </div>
        );
      }
    },
    {
      key: 'Mapel',
      label: 'Mata Pelajaran',
      sortable: true,
      render: (_: any, gm: GuruMapel) => {
        const mapelName = gm.Mapel?.nama_mapel || '-';
        const colorStyle = getMapelColor(mapelName);

        return (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-white/20"
              style={{ backgroundColor: colorStyle.dotHex }}
              title={`Warna aSC TimeTables: ${mapelName}`}
            />
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${colorStyle.badge}`}>
              {mapelName}
            </span>
          </div>
        );
      }
    },
    {
      key: 'Scope',
      label: 'Cakupan Plotting',
      render: (_: any, gm: GuruMapel) => {
        const currentValue = gm.kelas_id
          ? `KELAS:${gm.kelas_id}`
          : gm.jurusan_id
          ? `JURUSAN:${gm.jurusan_id}`
          : 'GLOBAL';

        const isUpdating = updatingScopeId === gm.id;

        if (!canManage) {
          if (gm.Kelas?.nama_kelas) {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                Kelas {gm.Kelas.nama_kelas}
              </span>
            );
          }
          if (gm.Jurusan?.nama) {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Jurusan {gm.Jurusan.nama}
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Global (Semua Kelas)
            </span>
          );
        }

        return (
          <div className="relative inline-flex items-center">
            <select
              value={currentValue}
              disabled={isUpdating}
              onChange={(e) => handleScopeChange(gm, e.target.value)}
              className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border appearance-none pr-6 cursor-pointer transition-all focus:outline-none focus:ring-2 disabled:opacity-50 ${
                gm.kelas_id
                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 focus:ring-purple-500/50'
                  : gm.jurusan_id
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 focus:ring-indigo-500/50'
                  : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 focus:ring-slate-400/50'
              }`}
              title="Klik untuk ubah cakupan (Global / Jurusan / Kelas)"
            >
              <option value="GLOBAL">🌐 Global (Semua Kelas)</option>
              
              {jurusanDropdown.length > 0 && (
                <optgroup label="── Khusus Jurusan ──">
                  {jurusanDropdown.map((j) => (
                    <option key={j.value} value={`JURUSAN:${j.value}`}>
                      🎓 Jurusan {j.label}
                    </option>
                  ))}
                </optgroup>
              )}

              {kelasDropdown.length > 0 && (
                <optgroup label="── Khusus Kelas/Rombel ──">
                  {kelasDropdown.map((k) => (
                    <option key={k.value} value={`KELAS:${k.value}`}>
                      🏫 Kelas {k.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 pointer-events-none opacity-60 text-current" />
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: any, gm: GuruMapel) => (
        <div className="flex items-center gap-1.5">
          {canManage && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenTimeOff?.(gm.guru_id, gm.Guru?.nama_guru)}
                className="h-8 px-2 text-[11px] font-extrabold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200/80 dark:border-amber-900/60 rounded-lg flex items-center gap-1.5 transition-all"
                title="Atur Time-Off Guru (Preferensi Ketersediaan Hari & Jam)"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Time-Off
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(gm)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                title="Hapus Pengampu"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ], [canManage, handleDelete, onOpenTimeOff, jurusanDropdown, kelasDropdown, updatingScopeId, handleScopeChange, bebanGuruMap]);

  const isMobile = useIsMobile();

  const renderGuruMapelMobileCard = useCallback((gm: GuruMapel) => {
    const guru = gm.Guru;
    const mapel = gm.Mapel;

    return (
      <div
        key={gm.id}
        role="button"
        tabIndex={0}
        onClick={() => onOpenTimeOff?.(gm.guru_id, guru?.nama_guru)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenTimeOff?.(gm.guru_id, guru?.nama_guru);
          }
        }}
        aria-label={`Pengampu ${guru?.nama_guru}`}
        className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug">
              {guru?.nama_guru || '-'}
            </h4>
            {mapel?.kode_mapel && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md">
                {mapel.kode_mapel}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
            {mapel?.nama_mapel || '-'} {gm.Kelas?.nama_kelas ? `• Kelas ${gm.Kelas.nama_kelas}` : ''}
          </p>
        </div>

        <Button
          size="xs"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTimeOff?.(gm.guru_id, guru?.nama_guru);
          }}
          aria-label={`Detail ${guru?.nama_guru}`}
          className="rounded-xl px-3.5 py-1.5 font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        >
          Detail
        </Button>
      </div>
    );
  }, [onOpenTimeOff]);

  // Handle export to Excel
  const handleExport = useCallback(() => {
    try {
      exportDataToExcel(items, [
        { header: 'Guru Pengampu', accessor: (row) => row.Guru?.nama_guru || '', width: 30 },
        { header: 'Mata Pelajaran', accessor: (row) => row.Mapel?.nama_mapel || '', width: 25 },
        { header: 'Cakupan Plotting', accessor: (row) => row.Kelas?.nama_kelas ? `Kelas ${row.Kelas.nama_kelas}` : row.Jurusan?.nama ? `Jurusan ${row.Jurusan.nama}` : 'Global', width: 20 }
      ], 'Laporan_Guru_Mapel', 'DATA PENGAMPU MATA PELAJARAN');
    } catch (error: any) {
      toast(error.message || 'Gagal mengekspor data', { icon: '⚠️' });
    }
  }, [items]);

  return (
    <div className="flex flex-col">
      {/* Toolbar Baris Kedua - Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Cari guru atau mapel..."
            aria-label="Cari Guru atau Mata Pelajaran"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
          />
        </div>
        <div className="w-full md:w-52">
          <TahunPelajaranSelect
            value={selectedTahunPelajaranId}
            onValueChange={setSelectedTahunPelajaranId}
            autoSelectActive={true}
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
        <div className="w-full md:w-48">
          <SemesterSelect
            tahunPelajaranId={selectedTahunPelajaranId}
            value={selectedSemesterId}
            onValueChange={setSelectedSemesterId}
            autoSelectActive={true}
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
        <div className="w-full md:w-48">
          <SearchableSelect
            value={selectedGuruId}
            onValueChange={setSelectedGuruId}
            options={[{ label: 'Semua Guru', value: '' }, ...guruSelectOptions]}
            placeholder="Filter Guru"
            searchPlaceholder="Cari Guru..."
            isLoading={isLoadingGuru}
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
        <div className="w-full md:w-48">
          <SearchableSelect
            value={selectedMapelId}
            onValueChange={setSelectedMapelId}
            options={[{ label: 'Semua Mapel', value: '' }, ...mapelSelectOptions]}
            placeholder="Filter Mapel"
            searchPlaceholder="Cari Mapel..."
            isLoading={isLoadingMapel}
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>

        {/* View Mode Toggle: Per Mapel vs Tabel */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl shrink-0 w-full md:w-auto justify-center">
          <button
            type="button"
            onClick={() => setViewMode('by_mapel')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
              viewMode === 'by_mapel'
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Per Mapel</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
              viewMode === 'table'
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span>Tabel</span>
          </button>
        </div>
      </div>
      
      {/* ── MODE 1: Pengelompokan Berdasarkan Mapel ────────────────────────── */}
      {viewMode === 'by_mapel' ? (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                Pengelompokan Berdasarkan Mata Pelajaran
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ditemukan {mapelGroups.length} mata pelajaran dengan total {filteredItems.length} penugasan guru
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canManage && onAdd && (
                <Button
                  onClick={onAdd}
                  size="sm"
                  className="rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Pengampu
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="rounded-xl font-bold text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchData()}
                disabled={loading}
                className="h-8 w-8 rounded-xl"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader />
            </div>
          ) : paginatedMapelGroups.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm font-medium">
              Belum ada data pengampu mata pelajaran yang sesuai dengan filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {paginatedMapelGroups.map((group) => {
                const colorStyle = getMapelColor(group.nama_mapel);

                return (
                  <div
                    key={group.mapel_id}
                    className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md"
                  >
                    {/* Mapel Header Strip */}
                    <div
                      className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3"
                      style={{
                        backgroundColor: colorStyle.bg ? `${colorStyle.bg}15` : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border shadow-xs"
                          style={{
                            backgroundColor: colorStyle.bg || undefined,
                            color: colorStyle.text || undefined,
                            borderColor: colorStyle.border || undefined,
                          }}
                        >
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                              {group.nama_mapel}
                            </h4>
                            <span
                              className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md border"
                              style={{
                                backgroundColor: colorStyle.bg || undefined,
                                color: colorStyle.text || undefined,
                                borderColor: colorStyle.border || undefined,
                              }}
                            >
                              {group.kode_mapel}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            {group.assignments.length} Guru Pengampu Terdaftar
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {group.assignments.length} Penugasan
                      </span>
                    </div>

                    {/* Teachers Sub-List Grid */}
                    <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {group.assignments.map((gm) => {
                        const guru = gm.Guru;
                        const beban = bebanGuruMap.get(gm.guru_id);
                        const currentValue = gm.kelas_id
                          ? `KELAS:${gm.kelas_id}`
                          : gm.jurusan_id
                          ? `JURUSAN:${gm.jurusan_id}`
                          : 'GLOBAL';
                        const isUpdating = updatingScopeId === gm.id;

                        return (
                          <div
                            key={gm.id}
                            className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all space-y-3 flex flex-col justify-between"
                          >
                            <div>
                              {/* Teacher Name & NIP */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 font-bold text-xs">
                                    <Users className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate">
                                      {guru?.nama_guru || '-'}
                                    </h5>
                                    <p className="text-[10px] text-slate-400 font-mono truncate">
                                      NIP: {guru?.nip || '-'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Beban JP & Scope */}
                              <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400 font-semibold">Beban Mengajar</span>
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                    {beban?.current_jp || 0} / {beban?.max_jp || 24} JP
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-slate-400 font-semibold">Cakupan</span>
                                  <div>
                                    {!canManage ? (
                                      gm.Kelas?.nama_kelas ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                                          Kelas {gm.Kelas.nama_kelas}
                                        </span>
                                      ) : gm.Jurusan?.nama ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                          Jurusan {gm.Jurusan.nama}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                          Global
                                        </span>
                                      )
                                    ) : (
                                      <div className="relative inline-flex items-center">
                                        <select
                                          value={currentValue}
                                          disabled={isUpdating}
                                          onChange={(e) => handleScopeChange(gm, e.target.value)}
                                          className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 appearance-none pr-4 cursor-pointer"
                                        >
                                          <option value="GLOBAL">🌐 Global</option>
                                          {jurusanDropdown.map((j) => (
                                            <option key={j.value} value={`JURUSAN:${j.value}`}>
                                              🎓 {j.label}
                                            </option>
                                          ))}
                                          {kelasDropdown.map((k) => (
                                            <option key={k.value} value={`KELAS:${k.value}`}>
                                              🏫 {k.label}
                                            </option>
                                          ))}
                                        </select>
                                        <ChevronDown className="w-2.5 h-2.5 absolute right-1 pointer-events-none opacity-50" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            {canManage && (
                              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onOpenTimeOff?.(gm.guru_id, guru?.nama_guru)}
                                  className="h-7 px-2 text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg gap-1"
                                >
                                  <Calendar className="w-3 h-3 text-amber-500" />
                                  Time-Off
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(gm)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination for Grouped View */}
          {totalMapelPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400 font-medium">
                Halaman {mapelPage} dari {totalMapelPages} ({mapelGroups.length} Mata Pelajaran)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mapelPage <= 1}
                  onClick={() => setMapelPage(prev => Math.max(prev - 1, 1))}
                  className="rounded-xl text-xs"
                >
                  Sebelumnya
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mapelPage >= totalMapelPages}
                  onClick={() => setMapelPage(prev => Math.min(prev + 1, totalMapelPages))}
                  className="rounded-xl text-xs"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── MODE 2: Tabel / Mobile List View ──────────────────────────────── */
        isMobile ? (
          <div className="p-4 space-y-4">
            <MobileAcademicList
              title="Daftar Guru Pengampu"
              data={paginatedItems}
              loading={loading}
              totalItems={filteredItems.length}
              onRefresh={() => fetchData()}
              onAdd={canManage && onAdd ? onAdd : undefined}
              canManage={canManage}
              emptyMessage="Belum ada pengampu"
              pagination={{
                currentPage: page,
                totalPages: totalPages,
                totalItems: filteredItems.length,
                itemsPerPage: limit,
                onPageChange: setPage,
                onLimitChange: (newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }
              }}
              renderCard={renderGuruMapelMobileCard}
            />
          </div>
        ) : (
          <div className="bg-transparent overflow-hidden">
            <Table 
              columns={columns} 
              data={paginatedItems} 
              loading={loading}
              emptyMessage="Belum ada pengampu" 
              compact={true}
              selectedRowKeys={selectedIds}
              onSelectedRowKeysChange={setSelectedIds}
              rowKey="id"
              pagination={{
                currentPage: page,
                totalPages: totalPages,
                totalItems: filteredItems.length,
                itemsPerPage: limit,
                onPageChange: setPage,
                onLimitChange: (newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }
              }}
              toolbarLeft={
                <div className="flex flex-wrap items-center gap-2">
                   {canManage && onAdd && (
                      <Button 
                        onClick={onAdd}
                        variant="toolbarPrimary"
                        size="toolbar"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Tambah Pengampu
                      </Button>
                   )}
                   
                   <Button
                     variant="toolbarOutline"
                     size="toolbar"
                     onClick={handleExport}
                     className="rounded-xl"
                   >
                     <Download className="w-3.5 h-3.5 mr-1.5" />
                     Export
                   </Button>
      
                   <Button
                     variant="toolbarOutline"
                     size="toolbarIcon"
                     onClick={() => fetchData()}
                     title="Refresh Data"
                     className="rounded-xl"
                     disabled={loading}
                   >
                     <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                   </Button>
                </div>
              }
              toolbarRight={
                selectedIds.size > 0 && canManage && (
                  <Button
                    variant="toolbarDanger"
                    size="toolbar"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Hapus Pengampu Terpilih',
                        description: `Anda yakin ingin menghapus ${selectedIds.size} penugasan guru pengampu terpilih?`,
                        confirmText: 'Hapus',
                        cancelText: 'Batal',
                        style: 'danger',
                        withProgress: true,
                        progressLabel: `Menghapus ${selectedIds.size} pengampu...`,
                      });
                      if (ok) await handleBulkDelete();
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Hapus Terpilih ({selectedIds.size})
                  </Button>
                )
              }
            />
          </div>
        )
      )}
    </div>
  );
});

GuruMapelList.displayName = 'GuruMapelList';

export default GuruMapelList;

