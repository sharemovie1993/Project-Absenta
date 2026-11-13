import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  Building2,
  Check,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Trash2,
  Edit3,
  UserX,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { HubCard, HubBentoGrid, type HubBentoCell } from '@/components/ui/hub';
import { hubinApi } from '@/api/hubin.api';
import { getKaprogStats } from '@/api/dashboard.api';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { GuruProduktifItem } from '../types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { notifySidangPlotingUpdated } from '@/hooks/useMyPengujiSidang';

export interface KaprogPlotingPengujiTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  guruProduktifList?: GuruProduktifItem[];
}

export const KaprogPlotingPengujiTab: React.FC<KaprogPlotingPengujiTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId,
  semesterId,
  guruProduktifList: propGuruProduktif,
}) => {
  const queryClient = useQueryClient();

  // State
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('ALL');
  const [plotFilter, setPlotFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<Set<string>>(new Set());
  const [editingSiswa, setEditingSiswa] = useState<any | null>(null);
  const [editGuruId, setEditGuruId] = useState<string>('');

  // 1. Ambil Data Guru Produktif Jurusan (Prioritas SSOT Khusus Guru Kejuruan)
  const { data: statsData } = useQuery({
    queryKey: ['kaprog-stats-guru-produktif-tab', jurusanId],
    queryFn: () => getKaprogStats({ jurusan_id: jurusanId }).catch(() => null),
    enabled: Boolean(jurusanId) && (!propGuruProduktif || propGuruProduktif.length === 0),
    staleTime: 5 * 60 * 1000,
  });

  const { rawList: allGuruList } = useGuruOptions({
    jenisPtk: 'ALL',
    onlyActive: false,
  });

  // Resolusi Daftar Guru Penguji Khusus Produktif Jurusan
  const examinerOptions = useMemo(() => {
    const listProduktif: GuruProduktifItem[] =
      propGuruProduktif && propGuruProduktif.length > 0
        ? propGuruProduktif
        : statsData?.data?.guruProduktif || statsData?.guruProduktif || [];

    if (listProduktif.length > 0) {
      return listProduktif.map((g) => ({
        id: g.id,
        nama_guru: g.nama,
        nip: g.nip || null,
        mapel: g.mapel || 'Guru Produktif Kejuruan',
        isProduktif: true,
      }));
    }

    // Fallback jika belum ada jadwal KBM produktif terdata di database
    return (allGuruList || []).map((g) => ({
      id: g.id,
      nama_guru: g.nama_guru,
      nip: g.nip || null,
      mapel: 'Guru Pengajar',
      isProduktif: false,
    }));
  }, [propGuruProduktif, statsData, allGuruList]);

  // 2. Query Siswa PKL Jurusan
  const { data: pklData, isLoading: loadingSiswa, refetch } = useQuery({
    queryKey: ['kaprog-ploting-siswa-list', jurusanId, tahunPelajaranId, semesterId],
    queryFn: async () => {
      const res = await hubinApi.getRekapPklSiswa({
        tahun_pelajaran_id: tahunPelajaranId || undefined,
        semester_id: semesterId || undefined,
        status: 'ELIGIBLE',
      });
      const list: any[] = Array.isArray(res) ? res : res?.data?.list || res?.data || [];
      return list;
    },
    staleTime: 30 * 1000,
  });

  // Filter Siswa Scoped Jurusan
  const rawSiswaList = useMemo(() => {
    if (!Array.isArray(pklData)) return [];
    if (!jurusanId) return pklData;
    return pklData.filter((item: any) => {
      const sJurusanId =
        item.Siswa?.jurusan_id ||
        item.Siswa?.Kelas?.jurusan_id ||
        item.SiswaAkademik?.kelas?.jurusan_id;
      return !sJurusanId || sJurusanId === jurusanId;
    });
  }, [pklData, jurusanId]);

  // Statistik Ringkasan Ploting
  const summaryStats = useMemo(() => {
    const total = rawSiswaList.length;
    let sudah = 0;
    rawSiswaList.forEach((s: any) => {
      const pengujiId = s.nilai_json?.penguji_id;
      if (pengujiId) {
        sudah += 1;
      }
    });
    const belum = Math.max(0, total - sudah);
    return { total, sudah, belum };
  }, [rawSiswaList]);

  // Daftar Kelas Unik untuk Filter
  const availableKelasList = useMemo(() => {
    const set = new Set<string>();
    rawSiswaList.forEach((item: any) => {
      const k = item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas;
      if (k) set.add(k);
    });
    return Array.from(set).sort();
  }, [rawSiswaList]);

  // Filtered Siswa List
  const filteredSiswaList = useMemo(() => {
    return rawSiswaList.filter((item: any) => {
      const nama = item.Siswa?.nama_siswa || '';
      const nis = item.Siswa?.nis || '';
      const kelas = item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas || '';
      const pengujiId = item.nilai_json?.penguji_id;
      const isAssigned = Boolean(pengujiId);

      // Filter Status Ploting
      if (plotFilter === 'UNASSIGNED' && isAssigned) return false;
      if (plotFilter === 'ASSIGNED' && !isAssigned) return false;

      // Filter Kelas
      if (selectedKelasFilter !== 'ALL' && kelas !== selectedKelasFilter) return false;

      // Filter Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return nama.toLowerCase().includes(q) || nis.toLowerCase().includes(q);
      }

      return true;
    });
  }, [rawSiswaList, plotFilter, selectedKelasFilter, searchQuery]);

  // Handle Toggle Select
  const handleToggleSelectSiswa = useCallback((id: string) => {
    setSelectedSiswaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isAllFilteredSelected =
    filteredSiswaList.length > 0 &&
    filteredSiswaList.every((s: any) => selectedSiswaIds.has(s.id));

  const handleToggleSelectAll = useCallback(() => {
    if (isAllFilteredSelected) {
      setSelectedSiswaIds((prev) => {
        const next = new Set(prev);
        filteredSiswaList.forEach((s: any) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedSiswaIds((prev) => {
        const next = new Set(prev);
        filteredSiswaList.forEach((s: any) => next.add(s.id));
        return next;
      });
    }
  }, [isAllFilteredSelected, filteredSiswaList]);

  // Selected Guru Meta
  const selectedGuru = useMemo(() => {
    return examinerOptions.find((g) => g.id === selectedGuruId) || null;
  }, [examinerOptions, selectedGuruId]);

  // Helper Invalidate All Sidang Caches
  const invalidateAllSidangQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
    queryClient.invalidateQueries({ queryKey: ['kaprog-ploting-siswa-list'] });
    queryClient.invalidateQueries({ queryKey: ['kaprog-pkl-summary'] });
    queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
    queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-list'] });
    queryClient.invalidateQueries({ queryKey: ['kaprog-sidang-nilai-list'] });
    queryClient.invalidateQueries({ queryKey: ['my-penguji-sidang-students'] });
    queryClient.invalidateQueries({ queryKey: ['hubin-settings'] });
    queryClient.invalidateQueries({ queryKey: ['rapor'] });
    queryClient.invalidateQueries({ queryKey: ['kaprog-stats'] });
    notifySidangPlotingUpdated();
  }, [queryClient]);

  // Selected Siswa yang sudah berstatus Diploting
  const selectedAssignedIds = useMemo(() => {
    return Array.from(selectedSiswaIds).filter((id) => {
      const s = rawSiswaList.find((item: any) => item.id === id);
      return Boolean(s?.nilai_json?.penguji_id);
    });
  }, [selectedSiswaIds, rawSiswaList]);

  // Mutation Assign / Reassign (Edit) Penguji Batch
  const plotingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGuruId || !selectedGuru) throw new Error('Silakan pilih guru penguji sidang.');
      if (selectedSiswaIds.size === 0) throw new Error('Pilih minimal 1 siswa untuk diploting.');

      const payloadScores = Array.from(selectedSiswaIds).map((siswaPklId) => ({
        siswa_pkl_id: siswaPklId,
        penguji_id: selectedGuru.id,
        penguji_nama: selectedGuru.nama_guru,
      }));

      return hubinApi.upsertNilaiPklBatch({
        scores: payloadScores,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });
    },
    onSuccess: () => {
      toast.success(
        `Berhasil menugaskan/mengubah penguji ${selectedSiswaIds.size} siswa ke ${selectedGuru?.nama_guru}!`
      );
      invalidateAllSidangQueries();
      setSelectedSiswaIds(new Set());
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan ploting penguji.');
    },
  });

  // Mutation Hapus Ploting (Batal Ploting / Unassign) Batch atau Single
  const unassignMutation = useMutation({
    mutationFn: async (targetIds?: string[]) => {
      const ids = targetIds || Array.from(selectedSiswaIds);
      if (ids.length === 0) throw new Error('Pilih minimal 1 siswa untuk dibatalkan plotingnya.');

      const payloadScores = ids.map((siswaPklId) => ({
        siswa_pkl_id: siswaPklId,
        penguji_id: null,
        penguji_nama: null,
      }));

      return hubinApi.upsertNilaiPklBatch({
        scores: payloadScores,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });
    },
    onSuccess: (_, variables) => {
      const count = variables ? variables.length : selectedSiswaIds.size;
      toast.success(`Berhasil membatalkan ploting penguji untuk ${count} siswa!`);
      invalidateAllSidangQueries();
      setSelectedSiswaIds(new Set());
      setEditingSiswa(null);
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal membatalkan ploting.');
    },
  });

  // Mutation Ganti Penguji Per 1 Siswa (Single Reassign / Edit)
  const singleReassignMutation = useMutation({
    mutationFn: async ({ siswaPklId, newGuruId, newGuruNama }: { siswaPklId: string; newGuruId: string; newGuruNama: string }) => {
      return hubinApi.upsertNilaiPklBatch({
        scores: [
          {
            siswa_pkl_id: siswaPklId,
            penguji_id: newGuruId,
            penguji_nama: newGuruNama,
          },
        ],
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });
    },
    onSuccess: () => {
      toast.success('Penguji sidang siswa berhasil diperbarui!');
      invalidateAllSidangQueries();
      setEditingSiswa(null);
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengubah penguji sidang.');
    },
  });

  return (
    <div className="space-y-4">
      {/* ── 1. Action Header ala Kaprog ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <GraduationCap size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Ploting Guru Penguji Sidang PKL Jurusan {jurusanNama}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tugaskan guru produktif kejuruan sebagai penguji sidang laporan PKL bagi siswa jurusan {jurusanNama}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loadingSiswa}
            className="rounded-xl text-xs h-9"
          >
            <RotateCcw size={13} className={cn('mr-1.5', loadingSiswa && 'animate-spin')} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* ── 2. Strip Statistik Ringkasan (Shopee-Grade HubBentoGrid) ── */}
      <HubCard noPadding>
        <HubBentoGrid
          columns={4}
          cells={[
            {
              id: 'total_siswa',
              title: 'Total Siswa',
              value: `${summaryStats.total} Siswa`,
              subtext: 'Peserta Sidang',
              icon: Users,
              iconColorClass: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
              onClick: () => setPlotFilter('ALL'),
            },
            {
              id: 'sudah_plot',
              title: 'Sudah Diplot',
              value: `${summaryStats.sudah} Siswa`,
              subtext: 'Siap Sidang',
              icon: CheckCircle2,
              iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
              badge: summaryStats.sudah > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500 text-white">
                  {summaryStats.sudah}
                </span>
              ) : undefined,
              onClick: () => setPlotFilter('ASSIGNED'),
            },
            {
              id: 'belum_plot',
              title: 'Belum Diplot',
              value: `${summaryStats.belum} Siswa`,
              subtext: 'Perlu Penguji',
              icon: AlertCircle,
              iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
              badge: summaryStats.belum > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                  {summaryStats.belum}
                </span>
              ) : undefined,
              onClick: () => setPlotFilter('UNASSIGNED'),
            },
            {
              id: 'guru_penguji',
              title: 'Penguji Siap',
              value: `${examinerOptions.length} Guru`,
              subtext: 'Pendidik Produktif',
              icon: GraduationCap,
              iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
            },
          ]}
        />
      </HubCard>

      {/* ── 3. Main Workspace Container ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* Control Toolbar */}
        <div className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
          {/* Step 1: Pemilihan Penguji Target */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>Pilih Guru Penguji Target:</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-900/40">
                {examinerOptions.length} Guru Produktif Terdata
              </span>
            </div>

            <div className="relative">
              <select
                aria-label="Pilih Guru Penguji Sidang"
                value={selectedGuruId}
                onChange={(e) => setSelectedGuruId(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all cursor-pointer truncate shadow-2xs"
              >
                <option value="">-- Pilih Guru Produktif Penguji Sidang --</option>
                {examinerOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama_guru} {g.nip ? `(NIP. ${g.nip})` : ''} - [{g.mapel}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Filter & Search Siswa */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Box */}
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
              />
            </div>

            {/* Filter Kelas */}
            <div className="w-full sm:w-44 shrink-0">
              <select
                aria-label="Filter Kelas"
                value={selectedKelasFilter}
                onChange={(e) => setSelectedKelasFilter(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer shadow-2xs truncate"
              >
                <option value="ALL">Semua Kelas</option>
                {availableKelasList.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 py-0.5">
              {(['ALL', 'UNASSIGNED', 'ASSIGNED'] as const).map((pf) => (
                <button
                  key={pf}
                  type="button"
                  onClick={() => setPlotFilter(pf)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition-colors cursor-pointer',
                    plotFilter === pf
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  )}
                >
                  {pf === 'ALL' && 'Semua'}
                  {pf === 'UNASSIGNED' && 'Belum Diploting'}
                  {pf === 'ASSIGNED' && 'Sudah Diploting'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Header List & Bulk Actions Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-5 py-2.5 bg-slate-100/90 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllFilteredSelected}
              onChange={handleToggleSelectAll}
              disabled={filteredSiswaList.length === 0}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
            />
            <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">
              Pilih Semua ({filteredSiswaList.length} siswa)
            </span>
          </label>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mr-1">
              Terpilih: {selectedSiswaIds.size} siswa
            </span>

            {/* Tombol Hapus Ploting Terpilih (Khusus Siswa yang Sudah Memiliki Penguji) */}
            {selectedAssignedIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={unassignMutation.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Batalkan ploting penguji untuk ${selectedAssignedIds.length} siswa yang sudah diplot?`)) {
                    unassignMutation.mutate(selectedAssignedIds);
                  }
                }}
                className="border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold h-8 px-2.5 cursor-pointer shadow-2xs"
                title="Batalkan penugasan penguji untuk siswa terpilih"
              >
                {unassignMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin mr-1.5" />
                ) : (
                  <UserX size={13} className="mr-1.5 text-rose-500" />
                )}
                <span>Hapus Ploting ({selectedAssignedIds.length})</span>
              </Button>
            )}

            {/* Tombol Tugaskan / Ganti Penguji Terpilih */}
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!selectedGuruId || selectedSiswaIds.size === 0 || plotingMutation.isPending}
              onClick={() => plotingMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer h-8 px-3"
            >
              {plotingMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin mr-1.5" />
                  Menyimpan...
                </>
              ) : selectedAssignedIds.length === selectedSiswaIds.size && selectedSiswaIds.size > 0 ? (
                <>
                  <Edit3 size={13} className="mr-1.5" />
                  Ganti Penguji ({selectedSiswaIds.size})
                </>
              ) : (
                <>
                  <UserCheck size={13} className="mr-1.5" />
                  Tugaskan Penguji ({selectedSiswaIds.size})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Student List Rows ── */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 min-h-[300px] max-h-[620px] overflow-y-auto bg-white dark:bg-slate-900">
          {loadingSiswa ? (
            <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin text-indigo-600" />
              <span>Memuat daftar siswa PKL...</span>
            </div>
          ) : filteredSiswaList.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">
              Tidak ada siswa yang sesuai dengan filter pencarian.
            </div>
          ) : (
            filteredSiswaList.map((item: any) => {
              const isSelected = selectedSiswaIds.has(item.id);
              const sNama = item.Siswa?.nama_siswa || '-';
              const sNis = item.Siswa?.nis || '-';
              const sKelas = item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas || '-';
              const mitraNama = item.Mitra?.nama || item.mitra_nama || '-';
              const pembimbingNama = item.Pembimbing?.nama_guru;
              const currentPengujiNama = item.nilai_json?.penguji_nama;

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleSelectSiswa(item.id)}
                  className={cn(
                    'flex items-center justify-between px-3.5 sm:px-5 py-3 text-xs transition-colors cursor-pointer select-none',
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850/60'
                  )}
                >
                  {/* Kolom Kiri: Checkbox & Informasi Siswa */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        aria-label={`Pilih ${sNama}`}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer pointer-events-none"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] truncate">
                          {sNama}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {sKelas}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        <span>NIS: {sNis}</span>
                        <span>•</span>
                        <span className="truncate flex items-center gap-1">
                          <Building2 size={11} className="text-slate-400 shrink-0" />
                          {mitraNama}
                        </span>
                        {pembimbingNama && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-slate-400 dark:text-slate-500 hidden sm:inline truncate">
                              Pembimbing: {pembimbingNama}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Kolom Kanan: Status Penguji Sidang & Aksi Cepat Edit/Hapus */}
                  <div className="shrink-0 flex items-center gap-1.5 ml-2" onClick={(e) => e.stopPropagation()}>
                    {item.nilai_json?.penguji_id && currentPengujiNama ? (
                      <div className="flex items-center gap-1.5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 shadow-2xs">
                          <UserCheck size={12} className="text-indigo-600 dark:text-indigo-400" />
                          <span className="max-w-[110px] sm:max-w-[160px] truncate" title={currentPengujiNama}>
                            {currentPengujiNama}
                          </span>
                        </div>

                        {/* Tombol Edit / Ganti Penguji */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSiswa(item);
                            setEditGuruId(item.nilai_json?.penguji_id || '');
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors shadow-2xs cursor-pointer"
                          title="Ganti Penguji Sidang (Edit Ploting)"
                          aria-label={`Ganti Penguji untuk ${sNama}`}
                        >
                          <Edit3 size={13} />
                        </button>

                        {/* Tombol Hapus Ploting (Batal Ploting) */}
                        <button
                          type="button"
                          disabled={unassignMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Batalkan ploting penguji untuk siswa ${sNama}? Siswa akan berstatus belum diploting.`)) {
                              unassignMutation.mutate([item.id]);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Batalkan / Hapus Ploting Penguji"
                          aria-label={`Hapus Ploting untuk ${sNama}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                        Belum Diploting
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer Info & Status Bar ── */}
        <div className="px-3.5 sm:px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left min-w-0">
            {selectedGuru ? (
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓ Target Penugasan:</span>
                <span className="truncate">
                  <strong>{selectedSiswaIds.size} siswa terpilih</strong> ➔{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">{selectedGuru.nama_guru}</strong>
                </span>
              </div>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center sm:justify-start gap-1">
                <AlertCircle size={14} className="shrink-0" />
                <span>Pilih guru penguji sidang target pada opsi di atas sebelum menugaskan.</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {selectedSiswaIds.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSiswaIds(new Set())}
                className="rounded-xl text-xs h-9 px-3"
              >
                Batal Pilih
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              disabled={!selectedGuruId || selectedSiswaIds.size === 0 || plotingMutation.isPending}
              onClick={() => plotingMutation.mutate()}
              className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer h-9 px-4"
            >
              {plotingMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                  Menyimpan...
                </>
              ) : selectedAssignedIds.length === selectedSiswaIds.size && selectedSiswaIds.size > 0 ? (
                <>
                  <Edit3 size={14} className="mr-1.5" />
                  Ganti Penguji ({selectedSiswaIds.size})
                </>
              ) : (
                <>
                  <UserCheck size={14} className="mr-1.5" />
                  Tugaskan Penguji ({selectedSiswaIds.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Modal Edit / Ganti Penguji Per Siswa ── */}
      {editingSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Edit3 size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Edit Penguji Sidang PKL
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Ubah penugasan guru penguji atau batalkan ploting siswa.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSiswa(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body Info Siswa */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {editingSiswa.Siswa?.nama_siswa || editingSiswa.siswa_nama}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    {editingSiswa.Siswa?.Kelas?.nama_kelas || editingSiswa.SiswaAkademik?.kelas?.nama_kelas || '-'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                  <span>NIS: {editingSiswa.Siswa?.nis || '-'}</span>
                  <span>•</span>
                  <span>DUDI: {editingSiswa.Mitra?.nama || editingSiswa.mitra_nama || '-'}</span>
                </div>
                {editingSiswa.nilai_json?.penguji_nama && (
                  <div className="pt-1.5 mt-1 border-t border-slate-200/50 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-400">Penguji saat ini: </span>
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {editingSiswa.nilai_json.penguji_nama}
                    </strong>
                  </div>
                )}
              </div>

              {/* Pilihan Guru Penguji Baru */}
              <div className="space-y-1.5">
                <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300">
                  Pilih Guru Penguji Baru:
                </label>
                <select
                  aria-label="Pilih Guru Penguji Baru"
                  value={editGuruId}
                  onChange={(e) => setEditGuruId(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all cursor-pointer shadow-2xs"
                >
                  <option value="">-- Pilih Guru Penguji Sidang --</option>
                  {examinerOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama_guru} {g.nip ? `(NIP. ${g.nip})` : ''} - [{g.mapel}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={unassignMutation.isPending || singleReassignMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Batalkan ploting penguji untuk ${editingSiswa.Siswa?.nama_siswa || 'siswa ini'}?`)) {
                    unassignMutation.mutate([editingSiswa.id]);
                  }
                }}
                className="border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold h-9"
              >
                {unassignMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin mr-1.5" />
                ) : (
                  <Trash2 size={13} className="mr-1.5" />
                )}
                Batalkan Ploting
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingSiswa(null)}
                  className="rounded-xl text-xs h-9"
                >
                  Tutup
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!editGuruId || editGuruId === editingSiswa.nilai_json?.penguji_id || singleReassignMutation.isPending}
                  onClick={() => {
                    const guruTarget = examinerOptions.find((g) => g.id === editGuruId);
                    if (!guruTarget) return;
                    singleReassignMutation.mutate({
                      siswaPklId: editingSiswa.id,
                      newGuruId: guruTarget.id,
                      newGuruNama: guruTarget.nama_guru,
                    });
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-3.5 cursor-pointer"
                >
                  {singleReassignMutation.isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin mr-1.5" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check size={13} className="mr-1.5" />
                      Simpan Perubahan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

KaprogPlotingPengujiTab.displayName = 'KaprogPlotingPengujiTab';
export default KaprogPlotingPengujiTab;
