import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Table } from '../../ui/Table';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Input } from '../../ui/Input';
import { SectionCard } from '../../ui/SectionCard';
import { Trash2, Plus, Search, RefreshCw, Users, BookOpen, FileSpreadsheet, Download, Layers, Calendar, ChevronDown, Clock } from 'lucide-react';
import { listGuruMapel, removeGuruMapel, assignGuruMapel } from '../../../api/kurikulum/guru-mapel.api';
import { kurikulumApi } from '../../../api/kurikulum.api';
import type { GuruMapel } from '../../../types/academic';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { getGuruList } from '../../../api/academic/guru.api';
import { getMapelList } from '../../../api/academic/mapel.api';
import { getKelasList } from '../../../api/academic/kelas.api';
import { getJurusanForDropdown, getKelasForDropdown, type DropdownOption } from '../../../api/dropdown.api';
import type { Guru, Mapel } from '../../../types/academic';
import useConfirm from '../../../hooks/useConfirm';
import { useDebounce } from '../../../hooks/useDebounce';
import { exportDataToExcel } from '../../../utils/export.utils';

interface Props {
  refreshTrigger?: number;
  onAdd?: () => void;
  onAddWizard?: () => void;
  onOpenTimeOff?: (guruId: string, guruName?: string) => void;
}

const GuruMapelList = React.memo<Props>(({ refreshTrigger = 0, onAdd, onAddWizard, onOpenTimeOff }) => {

  const { user } = useAuthStore();
  const confirm = useConfirm();
  const [items, setItems] = useState<GuruMapel[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');
  const [guruOptions, setGuruOptions] = useState<Guru[]>([]);
  const [mapelOptions, setMapelOptions] = useState<Mapel[]>([]);
  const [jurusanDropdown, setJurusanDropdown] = useState<DropdownOption[]>([]);
  const [kelasDropdown, setKelasDropdown] = useState<DropdownOption[]>([]);
  const [rawKelasList, setRawKelasList] = useState<any[]>([]);
  const [strukturMap, setStrukturMap] = useState<Map<string, number>>(new Map());
  const [updatingScopeId, setUpdatingScopeId] = useState<string | null>(null);
  const [isLoadingGuru, setIsLoadingGuru] = useState(false);
  const [isLoadingMapel, setIsLoadingMapel] = useState(false);

  // Helper maps to count teachers sharing the same subject in global or jurusan scope
  const { globalTeachersPerMapel, jurusanTeachersPerMapel } = useMemo(() => {
    const gMap = new Map<string, number>();
    const jMap = new Map<string, number>();

    items.forEach(gm => {
      if (gm.jurusan_id && !gm.kelas_id) {
        const key = `${gm.mapel_id}_${gm.jurusan_id}`;
        jMap.set(key, (jMap.get(key) || 0) + 1);
      } else if (!gm.kelas_id && !gm.jurusan_id) {
        gMap.set(gm.mapel_id, (gMap.get(gm.mapel_id) || 0) + 1);
      }
    });

    return { globalTeachersPerMapel: gMap, jurusanTeachersPerMapel: jMap };
  }, [items]);

  const teacherTotalJpMap = useMemo(() => {
    const map = new Map<string, number>();
    const totalClassesCount = rawKelasList.length || 1;

    items.forEach(gm => {
      const jpPerMinggu = strukturMap.get(gm.mapel_id) || 2;
      let targetClassesCount = 1;

      if (gm.kelas_id) {
        targetClassesCount = 1;
      } else if (gm.jurusan_id) {
        const inJurusan = rawKelasList.filter(k => k.jurusan_id === gm.jurusan_id);
        const jurusanClassCount = inJurusan.length > 0 ? inJurusan.length : 1;
        const teacherCount = jurusanTeachersPerMapel.get(`${gm.mapel_id}_${gm.jurusan_id}`) || 1;
        targetClassesCount = Math.max(1, Math.round(jurusanClassCount / teacherCount));
      } else {
        const teacherCount = globalTeachersPerMapel.get(gm.mapel_id) || 1;
        targetClassesCount = Math.max(1, Math.round(totalClassesCount / teacherCount));
      }

      const totalAssignmentJp = targetClassesCount * jpPerMinggu;
      map.set(gm.guru_id, (map.get(gm.guru_id) || 0) + totalAssignmentJp);
    });
    return map;
  }, [items, strukturMap, rawKelasList, globalTeachersPerMapel, jurusanTeachersPerMapel]);

  const canManage = useMemo(() => {
    return user?.role?.name === 'SUPERADMIN' || user?.role?.name === 'ADMIN' || user?.capabilities?.includes('academic.teaching.manage');
  }, [user]);

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
      const res = await listGuruMapel({
        guru_id: selectedGuruId || undefined,
        mapel_id: selectedMapelId || undefined
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
  }, [debouncedSearch, selectedGuruId, selectedMapelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshTrigger > 0) fetchData();
  }, [refreshTrigger, fetchData]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [gurus, mapels, jurusans, kelases, rawKelasRes, strukturRes] = await Promise.all([
          getGuruList(1, 100, ''),
          getMapelList(1, 100, ''),
          getJurusanForDropdown().catch(() => []),
          getKelasForDropdown().catch(() => []),
          getKelasList(1, 100).catch(() => ({ data: [] })),
          kurikulumApi.getStruktur().catch(() => ({ data: [] }))
        ]);
        setGuruOptions(gurus.data);
        setMapelOptions(mapels.data);
        setJurusanDropdown(jurusans);
        setKelasDropdown(kelases);
        setRawKelasList(rawKelasRes?.data || []);

        const sMap = new Map<string, number>();
        const list = strukturRes?.data || (Array.isArray(strukturRes) ? strukturRes : []);
        if (Array.isArray(list)) {
          list.forEach((s: any) => {
            if (s.mapel_id && s.jp_per_minggu) {
              sMap.set(s.mapel_id, s.jp_per_minggu);
            }
          });
        }
        setStrukturMap(sMap);
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
      label: 'Guru Pengampu & Progress JP',
      sortable: true,
      render: (_: any, gm: GuruMapel) => {
        const totalGuruJp = teacherTotalJpMap.get(gm.guru_id) || 0;
        const maxJp = (gm.Guru as any)?.max_jp || 24;
        const rawPercentage = Math.round((totalGuruJp / maxJp) * 100);
        const percentage = Math.min(rawPercentage, 100);

        let barColor = 'bg-amber-500';
        let statusBadge = `Progress: ${totalGuruJp}/${maxJp} JP (Kurang ${maxJp - totalGuruJp} JP)`;
        let textColor = 'text-amber-700 dark:text-amber-400';

        if (totalGuruJp === maxJp) {
          barColor = 'bg-emerald-500';
          statusBadge = `Progress: ${totalGuruJp}/${maxJp} JP (Sesuai 100%)`;
          textColor = 'text-emerald-700 dark:text-emerald-400';
        } else if (totalGuruJp > maxJp) {
          barColor = 'bg-rose-500';
          statusBadge = `Progress: ${totalGuruJp}/${maxJp} JP (Lebih ${totalGuruJp - maxJp} JP)`;
          textColor = 'text-rose-600 dark:text-rose-400';
        }

        return (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-bold text-slate-800 dark:text-slate-100">{gm.Guru?.nama_guru || '-'}</span>
            </div>

            {/* Workload Progress Bar & Numbers below Guru Name */}
            <div className="flex items-center gap-2 pl-6">
              <div className="w-28 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shrink-0 shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className={`text-[10px] font-black tracking-tight ${textColor}`}>
                {statusBadge}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'Mapel',
      label: 'Mata Pelajaran',
      sortable: true,
      render: (_: any, gm: GuruMapel) => {
        const jpPerMinggu = strukturMap.get(gm.mapel_id) || 2;
        let classCount = 1;
        let shareNote = '';

        if (gm.kelas_id) {
          classCount = 1;
        } else if (gm.jurusan_id) {
          const inJurusan = rawKelasList.filter(k => k.jurusan_id === gm.jurusan_id);
          const jurusanClassCount = inJurusan.length > 0 ? inJurusan.length : 1;
          const teacherCount = jurusanTeachersPerMapel.get(`${gm.mapel_id}_${gm.jurusan_id}`) || 1;
          classCount = Math.max(1, Math.round(jurusanClassCount / teacherCount));
          if (teacherCount > 1) {
            shareNote = ` (${jurusanClassCount} rombel ÷ ${teacherCount} guru)`;
          }
        } else {
          const totalClassesCount = rawKelasList.length || 1;
          const teacherCount = globalTeachersPerMapel.get(gm.mapel_id) || 1;
          classCount = Math.max(1, Math.round(totalClassesCount / teacherCount));
          if (teacherCount > 1) {
            shareNote = ` (${totalClassesCount} rombel ÷ ${teacherCount} guru)`;
          }
        }
        const totalMapelJp = classCount * jpPerMinggu;

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-100">{gm.Mapel?.nama_mapel || '-'}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {totalMapelJp} JP
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 pl-6 font-medium">
              {jpPerMinggu} JP/kelas × {classCount} rombel{shareNote}
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
  ], [canManage, handleDelete, onOpenTimeOff, jurusanDropdown, kelasDropdown, updatingScopeId, handleScopeChange, strukturMap, teacherTotalJpMap]);

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
          <SearchableSelect
            value={selectedGuruId}
            onValueChange={setSelectedGuruId}
            options={[{ label: 'Semua Guru', value: '' }, ...(guruOptions || [])?.map(g => ({ label: g.nama_guru, value: g.id }))]}
            placeholder="Filter Guru"
            searchPlaceholder="Cari Guru..."
            onSearch={handleSearchGuru}
            isLoading={isLoadingGuru}
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
        <div className="w-full md:w-52">
          <SearchableSelect
            value={selectedMapelId}
            onValueChange={setSelectedMapelId}
            options={[{ label: 'Semua Mapel', value: '' }, ...(mapelOptions || [])?.map(m => ({ label: m.nama_mapel, value: m.id }))]}
            placeholder="Filter Mapel"
            searchPlaceholder="Cari Mapel..."
            onSearch={handleSearchMapel}
            isLoading={isLoadingMapel}
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
      </div>
      
      <div className="bg-transparent overflow-hidden">
        <Table 
          columns={columns} 
          data={items} 
          loading={loading}
          emptyMessage="Belum ada pengampu" 
          compact={true}
          selectedRowKeys={selectedIds}
          onSelectedRowKeysChange={setSelectedIds}
          rowKey="id"
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
    </div>
  );
});

GuruMapelList.displayName = 'GuruMapelList';

export default GuruMapelList;

