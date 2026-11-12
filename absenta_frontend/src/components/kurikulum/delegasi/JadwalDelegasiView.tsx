import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ArrowRightLeft, UserCheck, Clock, BookOpen, Layers, X, Filter, RefreshCw, RotateCcw, Search } from 'lucide-react';
import { AcademicPageLayout } from '../../academic/AcademicPageLayout';
import { Button, Badge, SearchableSelect, SectionCard, Table, type Column } from '../../ui';
import { AcademicFilterToolbar, useAcademicFilter } from '../../common/academic-filter';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { getJadwalKBM, updateJadwalKBM, type JadwalKBM } from '../../../api/attendance/jadwalKBM.api';
import { getGuruList } from '../../../api/academic/guru.api';
import { getMapelList, type Mapel } from '../../../api/academic/mapel.api';
import { useKelasOptions } from '../../common';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useDebounce } from '../../../hooks/useDebounce';
import { toast } from 'sonner';
import { z } from 'zod';
import type { JadwalDelegasiBlock } from '@/components/kurikulum/JadwalDelegasiModal';

const JadwalDelegasiModal = lazy(() => import('@/components/kurikulum/JadwalDelegasiModal'));

interface RawGuruOption {
  id: string;
  nama_guru?: string;
  jenis_ptk?: string;
  User?: {
    full_name: string;
  };
}

export interface UniversalJadwalDelegasiViewProps {
  hideLayout?: boolean;
  isModal?: boolean;
  readOnly?: boolean;
  tahunPelajaranId?: string;
  semesterId?: string;
  propKelasId?: string;
  propHari?: string;
}

export const JadwalDelegasiView: React.FC<UniversalJadwalDelegasiViewProps> = ({
  hideLayout = false,
  isModal = false,
  readOnly = false,
  tahunPelajaranId: propTpId,
  semesterId: propSemId,
  propKelasId,
  propHari,
}) => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Academic Context
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableKelas: !propKelasId,
    allowAllKelas: true,
    initialTpId: propTpId,
    initialSemesterId: propSemId,
    initialKelasId: propKelasId || '',
    onTpChange: () => setCurrentPage(1),
    onKelasChange: () => setCurrentPage(1),
  });

  const effectiveTpId = propTpId || academicFilter.values.tahunPelajaranId;
  const effectiveSemId = propSemId || academicFilter.values.semesterId;

  const academic = useMemo(() => ({
    selectedTahunPelajaran: effectiveTpId,
    selectedSemester: effectiveSemId,
    activeYear: academicFilter.activeTpYear,
    activeSemester: academicFilter.activeSemester,
    isAcademicActive: Boolean(academicFilter.activeTpYear?.is_active && academicFilter.activeSemester?.is_active),
    tpOptions: academicFilter.tpOptions,
    semesterOptions: academicFilter.semesterOptions,
    handleTpChange: academicFilter.handleTpChange,
    handleSemesterChange: academicFilter.setSemesterId,
    isLoadingTp: academicFilter.isLoadingTp,
    isLoadingSem: academicFilter.isLoadingSem,
  }), [academicFilter, effectiveTpId, effectiveSemId]);

  // Filters State
  const selectedKelasId = propKelasId || academicFilter.values.kelasId;
  const [searchInput, setSearchInput] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchInput, 300);
  const [onlyDelegated, setOnlyDelegated] = useState<boolean>(false);
  const [selectedHari, setSelectedHari] = useState<string>(propHari || '');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Reset pagination saat pencarian atau filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // Re-assign Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJadwal, setSelectedJadwal] = useState<JadwalDelegasiBlock | null>(null);
  const [targetPelaksanaId, setTargetPelaksanaId] = useState<string>('');

  // 1. Fetch Master Data
  const { options: kelasOptions = [] } = useKelasOptions();

  const { data: guruListRes, isLoading: loadingGuru } = useQuery({
    queryKey: ['guru-all-delegasi'],
    queryFn: () => getGuruList(1, 300),
    staleTime: 5 * 60 * 1000,
  });

  const { data: mapelListRes } = useQuery({
    queryKey: ['mapel-all-delegasi'],
    queryFn: () => getMapelList(1, 300),
    staleTime: 5 * 60 * 1000,
  });

  const guruOptions = useMemo(() => {
    const list = (guruListRes?.data || []) as RawGuruOption[];
    return list?.map((g) => ({
      value: g.id,
      label: `${g.nama_guru || g.User?.full_name || 'Guru'}${g.jenis_ptk === 'TENAGA_KEPENDIDIKAN' ? ' (Staf TU)' : ''}`,
      jenis_ptk: g.jenis_ptk,
    }));
  }, [guruListRes]);

  // 2. Fetch Jadwal KBM
  const { data: jadwalRes, isLoading: loadingJadwal, refetch: refetchJadwal } = useQuery({
    queryKey: ['jadwal-kbm-delegasi', selectedKelasId, academic.selectedTahunPelajaran, academic.selectedSemester],
    queryFn: () => getJadwalKBM({
      ...(selectedKelasId ? { kelas_id: selectedKelasId } : {}),
      ...(academic.selectedTahunPelajaran ? { tahun_pelajaran_id: academic.selectedTahunPelajaran } : {}),
      ...(academic.selectedSemester ? { semester_id: academic.selectedSemester } : {}),
    }),
    staleTime: 2 * 60 * 1000,
  });

  const rawJadwalList: JadwalKBM[] = useMemo(() => {
    return Array.isArray(jadwalRes?.data) ? jadwalRes.data : [];
  }, [jadwalRes]);

  const mapelOptions = useMemo(() => {
    const mapelMap = new Map<string, string>();
    const masterList = (mapelListRes?.data || []) as Mapel[];
    masterList.forEach((m) => {
      if (m.id && m.nama_mapel) {
        mapelMap.set(m.id, m.nama_mapel);
      }
    });
    rawJadwalList.forEach((item) => {
      if (item.mapel_id && item.Mapel?.nama_mapel) {
        mapelMap.set(item.mapel_id, item.Mapel.nama_mapel);
      }
    });
    return Array.from(mapelMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [mapelListRes, rawJadwalList]);

  // Aggregasi Blok KBM Berurutan
  const mergedBlocksList: JadwalDelegasiBlock[] = useMemo(() => {
    if (!rawJadwalList || rawJadwalList.length === 0) return [];

    const groupMap = new Map<string, JadwalKBM[]>();
    rawJadwalList.forEach((item) => {
      const key = `${item.hari}_${item.kelas_id}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    });

    const result: JadwalDelegasiBlock[] = [];

    groupMap.forEach((itemsInGroup) => {
      const sorted = [...itemsInGroup].sort((a, b) => {
        const slotA = a.slot_index ?? 0;
        const slotB = b.slot_index ?? 0;
        if (slotA !== slotB) return slotA - slotB;
        return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
      });

      sorted.forEach((item) => {
        const prev = result[result.length - 1];
        const isConsecutive = prev && (
          (item.slot_index !== undefined && item.slot_index === prev.slot_end + 1) ||
          (prev.jam_selesai && item.jam_mulai && prev.jam_selesai === item.jam_mulai)
        );
        const isSameGroup = prev && prev.hari === item.hari && prev.kelas_id === item.kelas_id &&
          String(prev.guru_id || '') === String(item.guru_id || '') &&
          String(prev.guru_pelaksana_id || '') === String(item.guru_pelaksana_id || '') &&
          String(prev.unit_pengajaran_id || '') === String(item.unit_pengajaran_id || '') &&
          String(prev.mapel_id || '') === String(item.mapel_id || '') && isConsecutive;

        if (isSameGroup) {
          prev.jam_selesai = item.jam_selesai;
          prev.slot_end = item.slot_index ?? prev.slot_end;
          prev.jp_count += 1;
          prev.schedule_ids.push(item.id);
        } else {
          result.push({
            id: item.id, schedule_ids: [item.id], tenant_id: item.tenant_id, kelas_id: item.kelas_id,
            hari: item.hari, slot_start: item.slot_index ?? 0, slot_end: item.slot_index ?? 0, jp_count: 1,
            jam_mulai: item.jam_mulai, jam_selesai: item.jam_selesai, mapel_id: item.mapel_id, guru_id: item.guru_id,
            guru_pelaksana_id: item.guru_pelaksana_id || null, unit_pengajaran_id: item.unit_pengajaran_id || null,
            Mapel: item.Mapel, UnitPengajaran: item.UnitPengajaran || null, Guru: item.Guru,
            GuruPelaksana: item.GuruPelaksana, Kelas: item.Kelas,
          });
        }
      });
    });

    const DAY_ORDER = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
    return result.sort((a, b) => {
      const dayDiff = DAY_ORDER.indexOf(a.hari) - DAY_ORDER.indexOf(b.hari);
      if (dayDiff !== 0) return dayDiff;
      const kelasDiff = (a.Kelas?.nama_kelas || '').localeCompare(b.Kelas?.nama_kelas || '');
      if (kelasDiff !== 0) return kelasDiff;
      return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
    });
  }, [rawJadwalList]);

  // Filtered List
  const filteredJadwalList = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();

    return mergedBlocksList.filter((item) => {
      if (onlyDelegated && !item.guru_pelaksana_id) return false;
      if (selectedHari && item.hari !== selectedHari) return false;
      if (selectedMapelId && item.mapel_id !== selectedMapelId) return false;

      if (query) {
        const mapel = item.Mapel?.nama_mapel?.toLowerCase() || '';
        const unit = item.UnitPengajaran?.nama_unit?.toLowerCase() || '';
        const guru = (item.Guru?.nama_guru || item.Guru?.User?.full_name || '').toLowerCase();
        const unitGuru = (item.UnitPengajaran?.Guru?.nama_guru || '').toLowerCase();
        const pelaksana = (item.GuruPelaksana?.nama_guru || item.GuruPelaksana?.User?.full_name || '').toLowerCase();
        const kelas = item.Kelas?.nama_kelas?.toLowerCase() || '';
        return mapel.includes(query) || unit.includes(query) || guru.includes(query) || unitGuru.includes(query) || pelaksana.includes(query) || kelas.includes(query);
      }

      return true;
    });
  }, [mergedBlocksList, onlyDelegated, selectedHari, selectedMapelId, debouncedSearchQuery]);

  const totalItems = filteredJadwalList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedJadwalList = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredJadwalList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredJadwalList, currentPage, itemsPerPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleLimitChange = useCallback((limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((setter: (val: any) => void, val: any) => {
    setter(val);
    setCurrentPage(1);
  }, []);

  // Delegation Mutation
  const updateDelegasiMutation = useMutation({
    mutationFn: async ({ schedule_ids, guru_pelaksana_id }: { schedule_ids: string[]; guru_pelaksana_id: string | null }) => {
      const promises = schedule_ids.map((id) =>
        updateJadwalKBM(id, {
          guru_pelaksana_id: guru_pelaksana_id === null ? null : (guru_pelaksana_id || undefined),
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Delegasi jadwal KBM berhasil diperbarui');
      setModalOpen(false);
      setSelectedJadwal(null);
      setTargetPelaksanaId('');
      queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-delegasi'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-grid'] });
      queryClient.invalidateQueries({ queryKey: ['sesi-kbm-hari-ini'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memperbarui delegasi pengajar');
    },
  });

  const handleOpenAssignModal = useCallback((item: JadwalDelegasiBlock) => {
    setSelectedJadwal(item);
    setTargetPelaksanaId(item.guru_pelaksana_id || '');
    setModalOpen(true);
  }, []);

  const handleSaveDelegasi = () => {
    if (!selectedJadwal) return;
    updateDelegasiMutation.mutate({
      schedule_ids: selectedJadwal.schedule_ids,
      guru_pelaksana_id: targetPelaksanaId || null,
    });
  };

  const handleRemoveDelegasi = useCallback((item: JadwalDelegasiBlock) => {
    updateDelegasiMutation.mutate({
      schedule_ids: item.schedule_ids,
      guru_pelaksana_id: null,
    });
  }, [updateDelegasiMutation]);

  const HARI_FILTER_OPTIONS = [
    { value: '', label: 'Semua Hari' }, { value: 'SENIN', label: 'Senin' }, { value: 'SELASA', label: 'Selasa' },
    { value: 'RABU', label: 'Rabu' }, { value: 'KAMIS', label: 'Kamis' }, { value: 'JUMAT', label: 'Jumat' }, { value: 'SABTU', label: 'Sabtu' },
  ];

  // Desktop Table Columns
  const columns: Column[] = useMemo(() => [
    {
      key: 'waktu_kelas',
      label: 'Jadwal & Kelas',
      render: (_val: unknown, item: JadwalDelegasiBlock) => {
        const slotText = item.slot_start === item.slot_end 
          ? `Jam ke-${item.slot_start}`
          : `Jam ke-${item.slot_start} s/d ${item.slot_end}`;

        return (
          <div className="space-y-0.5">
            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              {item.Kelas?.nama_kelas || '-'}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>{item.hari}, {slotText}</span>
              </span>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">({item.jam_mulai} - {item.jam_selesai})</span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 whitespace-nowrap">
                {item.jp_count} JP
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'mapel',
      label: 'Mata Pelajaran',
      render: (_val: unknown, item: JadwalDelegasiBlock) => (
        <div className="flex items-start gap-2 font-medium text-slate-700 dark:text-slate-200">
          <div className="p-1 mt-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate max-w-[210px] text-sm font-semibold">{item.Mapel?.nama_mapel || '-'}</div>
            {item.UnitPengajaran?.nama_unit ? (
              <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[210px]">
                Unit: {item.UnitPengajaran.nama_unit}
                {item.UnitPengajaran.Guru?.nama_guru ? ` (${item.UnitPengajaran.Guru.nama_guru})` : ''}
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: 'guru_sk',
      label: 'Guru Utama',
      render: (_val: unknown, item: JadwalDelegasiBlock) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[170px]">
            {item.Guru?.nama_guru || item.Guru?.User?.full_name || 'Guru'}
          </div>
          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">Pengampu Resmi (SK)</span>
        </div>
      ),
    },
    {
      key: 'guru_pelaksana',
      label: 'Pengajar Riil',
      render: (_val: unknown, item: JadwalDelegasiBlock) => {
        const hasProxy = Boolean(item.guru_pelaksana_id);
        return hasProxy ? (
          <div className="space-y-0.5">
            <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 text-sm whitespace-nowrap">
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate max-w-[160px]">{item.GuruPelaksana?.nama_guru || item.GuruPelaksana?.User?.full_name}</span>
            </div>
            <span className="inline-block text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-300/60 dark:border-amber-800/60 whitespace-nowrap">
              Pengganti Lapangan
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs whitespace-nowrap">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="italic text-slate-500 dark:text-slate-400 text-[11px]">Sesuai Guru Utama</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      className: 'text-center whitespace-nowrap',
      render: (_val: unknown, item: JadwalDelegasiBlock) => {
        const hasProxy = Boolean(item.guru_pelaksana_id);
        return hasProxy ? (
          <div className="flex items-center justify-center whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/80 dark:border-amber-800/80 shadow-2xs whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
              Delegasi Aktif
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300/70 dark:border-emerald-800/70 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              Normal
            </span>
          </div>
        );
      },
    },
    {
      key: 'aksi',
      label: 'Aksi',
      className: 'text-right whitespace-nowrap',
      render: (_val: unknown, item: JadwalDelegasiBlock) => {
        if (readOnly) return null;
        const hasProxy = Boolean(item.guru_pelaksana_id);
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <Button
              size="sm"
              variant={hasProxy ? 'outline' : 'default'}
              onClick={() => handleOpenAssignModal(item)}
              className="text-xs font-bold rounded-xl h-8 px-3 whitespace-nowrap"
            >
              {hasProxy ? 'Ubah Pengganti' : 'Tugaskan Pengganti'}
            </Button>
            {hasProxy && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveDelegasi(item)}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-8 px-2 rounded-xl"
                title="Kembalikan ke Guru SK"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [readOnly, handleOpenAssignModal, handleRemoveDelegasi]);

  // Mobile Card Renderer
  const renderDelegasiMobileCard = useCallback((item: JadwalDelegasiBlock) => {
    const hasProxy = Boolean(item.guru_pelaksana_id);
    const slotText = item.slot_start === item.slot_end 
      ? `Jam ${item.slot_start}`
      : `Jam ${item.slot_start}-${item.slot_end}`;

    return (
      <div className="p-3.5 space-y-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {item.Kelas?.nama_kelas || '-'}
            </div>
            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {item.Mapel?.nama_mapel || '-'}
              {item.UnitPengajaran?.nama_unit ? (
                <span className="ml-1.5 text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                  — {item.UnitPengajaran.nama_unit}
                </span>
              ) : null}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            hasProxy 
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hasProxy ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            {hasProxy ? 'Inval' : 'Normal'}
          </span>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-indigo-500" />
            <span>{item.hari}, {slotText} ({item.jam_mulai} - {item.jam_selesai}) • {item.jp_count} JP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-slate-400" />
            <span>Guru SK: <strong className="text-slate-800 dark:text-slate-200">{item.Guru?.nama_guru || '-'}</strong></span>
          </div>
          {hasProxy && (
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
              <ArrowRightLeft size={12} />
              <span>Inval: <strong>{item.GuruPelaksana?.nama_guru || '-'}</strong></span>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant={hasProxy ? 'outline' : 'default'}
              onClick={() => handleOpenAssignModal(item)}
              className="text-xs font-bold rounded-lg h-7 px-2.5"
            >
              {hasProxy ? 'Ganti Inval' : 'Tugaskan Inval'}
            </Button>
            {hasProxy && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveDelegasi(item)}
                className="text-rose-500 h-7 px-2 rounded-lg text-xs"
              >
                Reset
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }, [readOnly, handleOpenAssignModal, handleRemoveDelegasi]);

  const renderTableToolbar = useMemo(() => (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search Input (Local responsive input + Debounced query) */}
      <div className="relative w-44 sm:w-56">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari guru, kelas, mapel..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSearchInput('');
          }}
          className="w-full pl-8 pr-7 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 h-8 transition-colors"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput('')}
            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Hapus pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Kelas Dropdown */}
      <div className="w-36">
        <SearchableSelect
          value={selectedKelasId || ''}
          onValueChange={(val) => academicFilter.setKelasId(val)}
          options={[
            { value: '', label: 'Semua Kelas' },
            ...kelasOptions,
          ]}
          placeholder="Semua Kelas"
          aria-label="Pilih Kelas"
          triggerClassName="h-8 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        />
      </div>

      {/* Mapel Dropdown */}
      <div className="w-48">
        <SearchableSelect
          value={selectedMapelId}
          onValueChange={(val) => handleFilterChange(setSelectedMapelId, val)}
          options={[
            { value: '', label: 'Semua Mapel' },
            ...mapelOptions,
          ]}
          placeholder="Semua Mapel"
          aria-label="Pilih Mapel"
          triggerClassName="h-8 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        />
      </div>

      {/* Hari Dropdown */}
      <div className="w-32">
        <SearchableSelect
          value={selectedHari}
          onValueChange={(val) => handleFilterChange(setSelectedHari, val)}
          options={HARI_FILTER_OPTIONS}
          placeholder="Semua Hari"
          aria-label="Pilih Hari"
          triggerClassName="h-8 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        />
      </div>

      <Button
        type="button"
        variant={onlyDelegated ? 'toolbarPrimary' : 'toolbarOutline'}
        size="toolbar"
        onClick={() => handleFilterChange(setOnlyDelegated, !onlyDelegated)}
        className="h-8 rounded-xl text-xs font-bold flex items-center gap-1.5"
      >
        <Filter className="w-3 h-3" />
        <span>{onlyDelegated ? 'Tampilkan Semua' : 'Hanya Didelegasikan'}</span>
      </Button>

      <Button
        type="button"
        variant="toolbarOutline"
        size="toolbar"
        onClick={() => refetchJadwal()}
        className="h-8 rounded-xl text-xs font-medium flex items-center gap-1 text-slate-500 hover:text-slate-800"
        title="Muat Ulang Data"
      >
        <RefreshCw className="w-3 h-3" />
      </Button>
    </div>
  ), [searchInput, selectedKelasId, kelasOptions, selectedMapelId, mapelOptions, selectedHari, onlyDelegated, HARI_FILTER_OPTIONS, academicFilter, handleFilterChange, refetchJadwal]);

  const content = (
    <div className="space-y-4">
      {/* Filter Toolbar (Hanya tampil jika bukan mode tab tersemat) */}
      {!hideLayout && (
        <AcademicFilterToolbar
          {...academicFilter.toolbarProps}
          searchPlaceholder="Cari mapel, kelas, atau guru..."
          variant="card"
        />
      )}

      <SectionCard fullWidth noPadding>
        <div className="p-4">
          {isMobile ? (
            <div className="space-y-3">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari guru, kelas, mapel..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setSearchInput('');
                    }}
                    className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 h-9 transition-colors"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Hapus pencarian"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <SearchableSelect
                    value={selectedMapelId}
                    onValueChange={(val) => handleFilterChange(setSelectedMapelId, val)}
                    options={[
                      { value: '', label: 'Semua Mapel' },
                      ...mapelOptions,
                    ]}
                    placeholder="Semua Mapel"
                    aria-label="Pilih Mapel Mobile"
                    triggerClassName="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <SearchableSelect
                      value={selectedKelasId || ''}
                      onValueChange={(val) => academicFilter.setKelasId(val)}
                      options={[
                        { value: '', label: 'Semua Kelas' },
                        ...kelasOptions,
                      ]}
                      placeholder="Semua Kelas"
                      aria-label="Pilih Kelas Mobile"
                      triggerClassName="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    />

                    <SearchableSelect
                      value={selectedHari}
                      onValueChange={(val) => handleFilterChange(setSelectedHari, val)}
                      options={HARI_FILTER_OPTIONS}
                      placeholder="Semua Hari"
                      aria-label="Pilih Hari Mobile"
                      triggerClassName="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant={onlyDelegated ? 'toolbarPrimary' : 'toolbarOutline'}
                  size="toolbar"
                  onClick={() => handleFilterChange(setOnlyDelegated, !onlyDelegated)}
                  className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{onlyDelegated ? 'Semua Jadwal' : 'Hanya Inval'}</span>
                </Button>
              </div>

              <MobileAcademicList
                title="Daftar Jadwal Delegasi"
                data={paginatedJadwalList}
                loading={loadingJadwal}
                totalItems={totalItems}
                onRefresh={() => refetchJadwal()}
                pagination={{
                  currentPage,
                  totalPages,
                  totalItems,
                  itemsPerPage,
                  onPageChange: handlePageChange,
                  onLimitChange: handleLimitChange,
                  pageSizeOptions: [10, 25, 50, 100],
                }}
                emptyMessage="Tidak ada jadwal KBM yang sesuai filter."
                renderCard={renderDelegasiMobileCard}
              />
            </div>
          ) : (
            <div className="hidden md:block">
              <Table
                columns={columns}
                data={paginatedJadwalList}
                loading={loadingJadwal}
                emptyMessage="Tidak ada jadwal KBM yang sesuai filter."
                compact={true}
                toolbarLeft={renderTableToolbar}
                pagination={{
                  currentPage,
                  totalPages,
                  totalItems,
                  itemsPerPage,
                  onPageChange: handlePageChange,
                  onLimitChange: handleLimitChange,
                }}
              />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Quick Modal: Pasang / Ganti Pengajar Pelaksana */}
      <Suspense fallback={null}>
        <JadwalDelegasiModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          selectedJadwal={selectedJadwal}
          targetPelaksanaId={targetPelaksanaId}
          onTargetPelaksanaChange={setTargetPelaksanaId}
          onSave={handleSaveDelegasi}
          isSaving={updateDelegasiMutation.isPending}
          guruOptions={guruOptions}
        />
      </Suspense>
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <AcademicPageLayout
      title="Delegasi Guru Inval KBM"
      description="Kelola pengajar pengganti (inval) pada sesi jadwal KBM harian jika guru utama berhalangan hadir."
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum' },
        { label: 'Delegasi Guru Inval' }
      ]}
      instruction={{
        title: 'Panduan Delegasi Guru Pengganti (Inval)',
        description: 'Fitur ini memungkinkan penugasan guru pengganti pada slot sesi KBM tanpa mengubah SK pembagian beban mengajar resmi.',
        items: [
          { text: 'Pilih kelas atau hari untuk menemukan slot jadwal yang perlu guru pengganti.' },
          { text: 'Klik "Tugaskan Pengganti" untuk menugaskan guru inval yang siap hadir.' },
          { text: 'Guru pengganti otomatis mendapatkan hak absensi dan jurnal kelas pada sesi tersebut.' }
        ]
      }}
      hardeningModuleKey="jadwal_delegasi_page"
    >
      {content}
    </AcademicPageLayout>
  );
};
