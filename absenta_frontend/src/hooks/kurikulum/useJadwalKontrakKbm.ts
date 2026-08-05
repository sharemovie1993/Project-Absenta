import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  listJadwalKontrakKbm,
  deleteJadwalKontrakKbm,
  getJadwalKontrakKbmSummary,
  type ListJadwalKontrakKbmFilters,
  type JadwalKontrakKbmItem,
} from '../../api/kurikulum/jadwal-kontrak-kbm.api';

export interface UseJadwalKontrakKbmParams extends ListJadwalKontrakKbmFilters {
  enabled?: boolean;
}

export function useJadwalKontrakKbm(params: UseJadwalKontrakKbmParams = {}) {
  const { enabled = true, search, kelas_id, guru_id, tahun_pelajaran_id, semester_id } = params;
  const queryClient = useQueryClient();

  // === Main list query (fetch all contracts for current year/semester) ===
  const listQuery = useQuery({
    queryKey: ['jadwal-kontrak-kbm', tahun_pelajaran_id, semester_id],
    queryFn: () => listJadwalKontrakKbm({ tahun_pelajaran_id, semester_id }),
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  // === Summary query ===
  const summaryQuery = useQuery({
    queryKey: ['jadwal-kontrak-kbm-summary', tahun_pelajaran_id, semester_id],
    queryFn: () =>
      getJadwalKontrakKbmSummary({
        tahun_pelajaran_id,
        semester_id,
      }),
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  const rawData: JadwalKontrakKbmItem[] = useMemo(
    () => listQuery.data?.data || [],
    [listQuery.data]
  );

  // === Unique kelas list derived from data (only classes with contracts) ===
  const kelasOptionsFromData = useMemo(() => {
    const seen = new Map<string, string>();
    rawData.forEach((d) => {
      if (d.Kelas) seen.set(d.Kelas.id, d.Kelas.nama_kelas);
    });
    return Array.from(seen.entries())
      .map(([id, nama]) => ({ value: id, label: nama }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rawData]);

  // === Unique guru list derived from data (only teachers with contracts) ===
  const guruOptionsFromData = useMemo(() => {
    const seen = new Map<string, string>();
    rawData.forEach((d) => {
      if (d.Guru) seen.set(d.Guru.id, d.Guru.nama_guru);
    });
    return Array.from(seen.entries())
      .map(([id, nama]) => ({ value: id, label: nama }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rawData]);

  // === Client-side filtering (Kelas, Guru, Search) ===
  const filteredData = useMemo(() => {
    let result = rawData;

    if (kelas_id) {
      result = result.filter((d) => d.kelas_id === kelas_id);
    }

    if (guru_id) {
      result = result.filter((d) => d.guru_id === guru_id);
    }

    if (search?.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.Guru?.nama_guru?.toLowerCase().includes(q) ||
          d.Mapel?.nama_mapel?.toLowerCase().includes(q) ||
          d.Kelas?.nama_kelas?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rawData, kelas_id, guru_id, search]);

  // === Group by Kelas ===
  const groupedByKelas = useMemo(() => {
    const map = new Map<string, { nama: string; items: JadwalKontrakKbmItem[] }>();
    filteredData.forEach((d) => {
      const key = d.kelas_id;
      const nama = d.Kelas?.nama_kelas || 'Kelas Tidak Diketahui';
      if (!map.has(key)) map.set(key, { nama, items: [] });
      map.get(key)!.items.push(d);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].nama.localeCompare(b[1].nama));
  }, [filteredData]);

  // === Delete mutation ===
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJadwalKontrakKbm(id),
    onSuccess: () => {
      toast.success('Kontrak KBM berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['jadwal-kontrak-kbm'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-kontrak-kbm-summary'] });
    },
    onError: (err: any) => toast.error(err.message || 'Gagal menghapus kontrak KBM.'),
  });

  return {
    // Data
    rawData,
    filteredData,
    groupedByKelas,
    total: filteredData.length,

    // Summary
    summary: summaryQuery.data?.data,
    isSummaryLoading: summaryQuery.isLoading,

    // Dynamic Filter Options
    kelasOptionsFromData,
    guruOptionsFromData,

    // Loading states
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,

    // Actions
    refetch: listQuery.refetch,
    deleteKontrak: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
