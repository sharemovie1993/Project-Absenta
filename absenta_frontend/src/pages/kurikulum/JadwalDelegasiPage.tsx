import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, ArrowRightLeft, UserCheck, Clock, BookOpen, Layers, X, Filter, RefreshCw, RotateCcw } from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Button, Badge, Input, SearchableSelect, SectionCard, Table, type Column } from '../../components/ui';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { getJadwalKBM, updateJadwalKBM, type JadwalKBM } from '../../api/attendance/jadwalKBM.api';
import { getGuruList } from '../../api/academic/guru.api';
import { useKelasOptions } from '../../components/common';
import { useIsMobile } from '../../hooks/useIsMobile';
import { toast } from 'sonner';
import { z } from 'zod';

// Lazy loading Subcomponents for Performance Optimization & God File Prevention
const JadwalDelegasiModal = lazy(() => import('@/components/kurikulum/JadwalDelegasiModal'));

const delegasiFormSchema = z.object({
  targetPelaksanaId: z.string().optional(),
});

interface RawGuruOption {
  id: string;
  nama_guru?: string;
  jenis_ptk?: string;
  User?: {
    full_name: string;
  };
}

export interface JadwalDelegasiBlock {
  id: string; // Master / representative ID (first slot ID)
  schedule_ids: string[]; // All merged slot IDs
  tenant_id: string;
  kelas_id: string;
  hari: 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' | 'MINGGU';
  slot_start: number;
  slot_end: number;
  jp_count: number;
  jam_mulai: string;
  jam_selesai: string;
  mapel_id?: string;
  guru_id?: string;
  guru_pelaksana_id?: string | null;
  Mapel?: {
    nama_mapel: string;
    kode_mapel: string;
  };
  Guru?: {
    id: string;
    nama_guru?: string;
    User?: {
      full_name: string;
    };
  };
  GuruPelaksana?: {
    id: string;
    nama_guru?: string;
    User?: {
      full_name: string;
    };
  };
  Kelas?: {
    id: string;
    nama_kelas: string;
  };
}

export default function JadwalDelegasiPage() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Filters State
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyDelegated, setOnlyDelegated] = useState<boolean>(false);
  const [selectedHari, setSelectedHari] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

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

  const guruOptions = useMemo(() => {
    const list = (guruListRes?.data || []) as RawGuruOption[];
    return list?.map((g) => ({
      value: g.id,
      label: `${g.nama_guru || g.User?.full_name || 'Guru'}${g.jenis_ptk === 'TENAGA_KEPENDIDIKAN' ? ' (Staf TU)' : ''}`,
      jenis_ptk: g.jenis_ptk,
    }));
  }, [guruListRes]);

  // 2. Fetch Jadwal KBM (Server State via TanStack Query)
  const { data: jadwalRes, isLoading: loadingJadwal, refetch: refetchJadwal } = useQuery({
    queryKey: ['jadwal-kbm-delegasi', selectedKelasId],
    queryFn: () => getJadwalKBM(selectedKelasId ? { kelas_id: selectedKelasId } : undefined),
    staleTime: 2 * 60 * 1000,
  });

  const rawJadwalList: JadwalKBM[] = useMemo(() => {
    return Array.isArray(jadwalRes?.data) ? jadwalRes.data : [];
  }, [jadwalRes]);

  // 🧩 Aggregasi Blok KBM Berurutan (Identik dengan Visual Grid & Sesi KBM)
  // Menyatukan slot atomik yang berurutan (misal: Jam 1-3) menjadi 1 blok sesi KBM
  const mergedBlocksList: JadwalDelegasiBlock[] = useMemo(() => {
    if (!rawJadwalList || rawJadwalList.length === 0) return [];

    // Kelompokkan per Hari dan per Kelas agar sorting presisi
    const groupMap = new Map<string, JadwalKBM[]>();
    rawJadwalList.forEach((item) => {
      const key = `${item.hari}_${item.kelas_id}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    });

    const result: JadwalDelegasiBlock[] = [];

    groupMap.forEach((itemsInGroup) => {
      // Urutkan berdasarkan slot_index lalu jam_mulai
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

        const isSameGroup = prev &&
          prev.hari === item.hari &&
          prev.kelas_id === item.kelas_id &&
          String(prev.guru_id || '') === String(item.guru_id || '') &&
          String(prev.guru_pelaksana_id || '') === String(item.guru_pelaksana_id || '') &&
          String(prev.mapel_id || '') === String(item.mapel_id || '') &&
          isConsecutive;

        if (isSameGroup) {
          prev.jam_selesai = item.jam_selesai;
          prev.slot_end = item.slot_index ?? prev.slot_end;
          prev.jp_count += 1;
          prev.schedule_ids.push(item.id);
        } else {
          result.push({
            id: item.id,
            schedule_ids: [item.id],
            tenant_id: item.tenant_id,
            kelas_id: item.kelas_id,
            hari: item.hari,
            slot_start: item.slot_index ?? 0,
            slot_end: item.slot_index ?? 0,
            jp_count: 1,
            jam_mulai: item.jam_mulai,
            jam_selesai: item.jam_selesai,
            mapel_id: item.mapel_id,
            guru_id: item.guru_id,
            guru_pelaksana_id: item.guru_pelaksana_id || null,
            Mapel: item.Mapel,
            Guru: item.Guru,
            GuruPelaksana: item.GuruPelaksana,
            Kelas: item.Kelas,
          });
        }
      });
    });

    // Urutkan hasil akhir berdasarkan hari sekolah & jam_mulai
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
    return mergedBlocksList.filter((item) => {
      if (onlyDelegated && !item.guru_pelaksana_id) return false;
      if (selectedHari && item.hari !== selectedHari) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const mapel = item.Mapel?.nama_mapel?.toLowerCase() || '';
        const guru = (item.Guru?.nama_guru || item.Guru?.User?.full_name || '').toLowerCase();
        const pelaksana = (item.GuruPelaksana?.nama_guru || item.GuruPelaksana?.User?.full_name || '').toLowerCase();
        const kelas = item.Kelas?.nama_kelas?.toLowerCase() || '';
        return mapel.includes(query) || guru.includes(query) || pelaksana.includes(query) || kelas.includes(query);
      }

      return true;
    });
  }, [mergedBlocksList, onlyDelegated, selectedHari, searchQuery]);

  // Pagination Calculations
  const totalItems = filteredJadwalList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  // Safe paginated chunk
  const paginatedJadwalList = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredJadwalList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredJadwalList, currentPage, itemsPerPage]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  }, []);

  // Reset page when filter changes
  const handleFilterChange = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setCurrentPage(1);
  }, []);

  // Metrics for AcademicPageLayout statCards (Interactive clickable filters)
  const statCards = useMemo(() => {
    const totalBlocks = mergedBlocksList.length;
    const delegatedBlocks = mergedBlocksList.filter((j) => Boolean(j.guru_pelaksana_id)).length;
    const officialTeachers = new Set(mergedBlocksList.filter((j) => Boolean(j.guru_pelaksana_id))?.map((j) => j.guru_id)).size;
    const proxyTeachers = new Set(mergedBlocksList.filter((j) => Boolean(j.guru_pelaksana_id))?.map((j) => j.guru_pelaksana_id)).size;

    return [
      {
        title: "Semua Jadwal",
        value: totalBlocks,
        icon: <Layers size={14} />,
        gradient: !onlyDelegated 
          ? "from-blue-600 to-indigo-600 ring-2 ring-blue-400 ring-offset-2" 
          : "from-blue-600 to-indigo-600 opacity-80 hover:opacity-100",
        subtitle: `${rawJadwalList.length} total JP semester aktif`,
        onClick: () => handleFilterChange(setOnlyDelegated, false),
      },
      {
        title: "Delegasi Aktif",
        value: delegatedBlocks,
        icon: <ArrowRightLeft size={14} />,
        gradient: onlyDelegated 
          ? "from-amber-500 to-orange-600 ring-2 ring-amber-400 ring-offset-2" 
          : "from-amber-500 to-orange-600 opacity-80 hover:opacity-100",
        subtitle: delegatedBlocks > 0 ? `${delegatedBlocks} sesi dialihkan` : "Belum ada delegasi",
        onClick: () => handleFilterChange(setOnlyDelegated, true),
      },
      {
        title: "Guru Utama (SK)",
        value: officialTeachers,
        icon: <UserCheck size={14} />,
        gradient: "from-slate-600 to-slate-800 opacity-80 hover:opacity-100",
        subtitle: "Pengampu resmi SK",
        onClick: () => handleFilterChange(setOnlyDelegated, false),
      },
      {
        title: "Guru Pengganti",
        value: proxyTeachers,
        icon: <Users size={14} />,
        gradient: "from-purple-600 to-indigo-700 opacity-80 hover:opacity-100",
        subtitle: proxyTeachers > 0 ? `${proxyTeachers} guru bantuan riil` : "Belum ada pengganti",
        onClick: () => handleFilterChange(setOnlyDelegated, true),
      }
    ];
  }, [mergedBlocksList, rawJadwalList, onlyDelegated, handleFilterChange]);

  // 3. Mutation: Update Guru Pelaksana (Teaching Proxy) untuk seluruh slot dalam blok KBM
  const updateDelegasiMutation = useMutation({
    mutationFn: async ({ schedule_ids, guru_pelaksana_id }: { schedule_ids: string[]; guru_pelaksana_id: string | null }) => {
      return Promise.all(schedule_ids?.map((id) => updateJadwalKBM(id, { guru_pelaksana_id })) || []);
    },
    onSuccess: () => {
      toast.success('Pengajar pelaksana KBM berhasil diperbarui!');
      queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-delegasi'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-grid'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-guru-timeline'] });
      setModalOpen(false);
      setSelectedJadwal(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal memperbarui delegasi pengajar.';
      toast.error(msg);
    },
  });

  const handleOpenAssignModal = useCallback((item: JadwalDelegasiBlock) => {
    setSelectedJadwal(item);
    setTargetPelaksanaId(item.guru_pelaksana_id || '');
    setModalOpen(true);
  }, []);

  const handleSaveDelegasi = () => {
    if (!selectedJadwal) return;
    const validation = delegasiFormSchema.safeParse({ targetPelaksanaId });
    if (!validation.success) {
      toast.error('Data penugasan pengajar tidak valid.');
      return;
    }
    updateDelegasiMutation.mutate({
      schedule_ids: selectedJadwal.schedule_ids,
      guru_pelaksana_id: targetPelaksanaId || null,
    });
  };

  const handleRemoveDelegasi = (item: JadwalDelegasiBlock) => {
    updateDelegasiMutation.mutate({
      schedule_ids: item.schedule_ids,
      guru_pelaksana_id: null,
    });
  };

  const HARI_FILTER_OPTIONS = [
    { value: '', label: 'Semua Hari' },
    { value: 'SENIN', label: 'Senin' },
    { value: 'SELASA', label: 'Selasa' },
    { value: 'RABU', label: 'Rabu' },
    { value: 'KAMIS', label: 'Kamis' },
    { value: 'JUMAT', label: 'Jumat' },
    { value: 'SABTU', label: 'Sabtu' },
  ];

  // 4. Desktop Table Columns
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
        <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
          <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <span className="truncate max-w-[210px] text-sm font-semibold">{item.Mapel?.nama_mapel || '-'}</span>
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
  ], [handleOpenAssignModal, handleRemoveDelegasi]);

  // 5. Mobile Card Renderer (Mengikuti Pola MobileAcademicList)
  const renderDelegasiMobileCard = useCallback((item: JadwalDelegasiBlock) => {
    const hasProxy = Boolean(item.guru_pelaksana_id);
    const slotText = item.slot_start === item.slot_end 
      ? `Jam ${item.slot_start}`
      : `Jam ${item.slot_start}-${item.slot_end}`;

    return (
      <div
        key={item.id}
        className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3.5 shadow-xs"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight py-0.5">
              {item.hari} • {slotText} ({item.jam_mulai} - {item.jam_selesai})
            </Badge>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              {item.jp_count} JP
            </span>
          </div>
          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none text-[10px] font-black shrink-0">
            {item.Kelas?.nama_kelas || 'Kelas'}
          </Badge>
        </div>

        <div className="space-y-1">
          <h5 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{item.Mapel?.nama_mapel || '-'}</span>
          </h5>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 text-[11px]">Guru SK (Resmi):</span>
            <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[170px] text-right">
              {item.Guru?.nama_guru || item.Guru?.User?.full_name || 'Guru'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 text-[11px]">Pengajar Lapangan:</span>
            {hasProxy ? (
              <span className="font-bold text-amber-700 dark:text-amber-400 truncate max-w-[170px] text-right flex items-center gap-1 justify-end">
                <ArrowRightLeft className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{item.GuruPelaksana?.nama_guru || item.GuruPelaksana?.User?.full_name}</span>
              </span>
            ) : (
              <span className="text-slate-400 italic text-[11px]">Sama dengan Guru SK</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-slate-400 text-[11px]">Status Penugasan:</span>
            {hasProxy ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/80 dark:border-amber-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                Delegasi Aktif
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300/70 dark:border-emerald-800/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                Normal (Guru SK)
              </span>
            )}
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800/80">
          <Button
            size="sm"
            variant={hasProxy ? 'outline' : 'default'}
            onClick={() => handleOpenAssignModal(item)}
            className="w-full text-xs font-bold rounded-xl h-9"
          >
            {hasProxy ? 'Ubah Pengganti' : 'Tugaskan Pengganti'}
          </Button>
          {hasProxy && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRemoveDelegasi(item)}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-9 px-3 rounded-xl shrink-0"
              title="Kembalikan ke Guru SK"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }, [handleOpenAssignModal, handleRemoveDelegasi]);

  // Unified Filter & Action Toolbar (Identik dengan SiswaList Table toolbarLeft)
  const renderTableToolbar = useMemo(() => (
    <div className="flex flex-col w-full gap-4 p-4">
      {/* Row 1: Search & Dropdown Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full">
          <Input
            type="text"
            placeholder="Cari guru, mapel, atau kelas..."
            aria-label="Cari jadwal"
            value={searchQuery}
            onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-gray-400" />}
            className="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="w-full md:w-48">
            <SearchableSelect
              value={selectedKelasId}
              onValueChange={(val) => handleFilterChange(setSelectedKelasId, val)}
              options={[{ value: '', label: 'Semua Kelas' }, ...kelasOptions]}
              placeholder="Semua Kelas"
              searchPlaceholder="Cari Kelas..."
              aria-label="Pilih Kelas"
              className="w-full"
              triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="w-full md:w-44">
            <SearchableSelect
              value={selectedHari}
              onValueChange={(val) => handleFilterChange(setSelectedHari, val)}
              options={HARI_FILTER_OPTIONS}
              placeholder="Semua Hari"
              searchPlaceholder="Cari Hari..."
              aria-label="Pilih Hari"
              className="w-full"
              triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="w-full md:w-auto">
            <Button
              type="button"
              variant={onlyDelegated ? 'toolbarPrimary' : 'toolbarOutline'}
              size="toolbar"
              onClick={() => handleFilterChange(setOnlyDelegated, !onlyDelegated)}
              className="h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap px-4"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{onlyDelegated ? 'Semua Jadwal' : 'Hanya Didelegasikan'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Quick Actions & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => refetchJadwal()}
            aria-label="Refresh Data"
            className="rounded-xl h-9 text-xs font-bold flex items-center gap-1.5"
            disabled={loadingJadwal}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingJadwal ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Menampilkan {paginatedJadwalList.length} dari {totalItems} jadwal tersaring
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onlyDelegated && (
            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 text-[11px] font-bold py-1 px-2.5">
              Filter: Hanya Delegasi Aktif
            </Badge>
          )}
        </div>
      </div>
    </div>
  ), [searchQuery, selectedKelasId, kelasOptions, selectedHari, onlyDelegated, loadingJadwal, paginatedJadwalList.length, totalItems, handleFilterChange, refetchJadwal]);

  return (
    <AcademicPageLayout
      hardeningModuleKey="kurikulum_jadwal_delegasi"
      title="Delegasi Pengajar KBM (Teaching Proxy)"
      description="Kelola dan petakan pengajar pelaksana lapangan saat guru SK berhalangan atau digantikan staf bantuan/TU."
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Kurikulum', path: '/kurikulum' },
        { label: 'Delegasi Pengajar', path: '/kurikulum/jadwal-delegasi' }
      ]}
      instruction={{
        title: "Panduan Delegasi Pengajar KBM (Teaching Proxy)",
        description: "Manajemen penugasan pengajar pelaksana lapangan untuk jadwal KBM ketika guru resmi (SK Dapodik) berhalangan atau digantikan staf bantuan/TU.",
        items: [
          { text: "Pilih kelas atau hari untuk menyaring jadwal KBM yang ingin diatur penugasannya." },
          { text: "Klik tombol 'Tugaskan Pengganti' pada sesi terkait untuk menunjuk staf / guru pengganti riil." },
          { text: "Guru pengganti yang ditugaskan otomatis berwenang membuka sesi KBM dan mengisi presensi kelas." },
          { text: "Untuk mengembalikan kewenangan ke Guru SK asli, klik tombol batal (ikon reset silang)." }
        ]
      }}
      stats={statCards}
      isLoadingStats={loadingJadwal}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0">
        <div className="w-full max-w-full min-w-0">
          {isMobile ? (
            /* Mobile View: Menggunakan Standar MobileAcademicList seperti Data Siswa */
            <div className="space-y-4">
              {/* Mobile Search & Filter Toolbar */}
              <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Cari guru, mapel, kelas..."
                    aria-label="Cari jadwal mobile"
                    value={searchQuery}
                    onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                    className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <SearchableSelect
                    value={selectedKelasId}
                    onValueChange={(val) => handleFilterChange(setSelectedKelasId, val)}
                    options={[{ value: '', label: 'Semua Kelas' }, ...kelasOptions]}
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

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Button
                    type="button"
                    variant={onlyDelegated ? 'toolbarPrimary' : 'toolbarOutline'}
                    size="toolbar"
                    onClick={() => handleFilterChange(setOnlyDelegated, !onlyDelegated)}
                    className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{onlyDelegated ? 'Tampilkan Semua Jadwal' : 'Hanya Yang Didelegasikan'}</span>
                  </Button>
                </div>
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
            /* Desktop View: Standar Terpadu Table + Integrated Toolbar (Exact SiswaList Standard) */
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
    </AcademicPageLayout>
  );
}
