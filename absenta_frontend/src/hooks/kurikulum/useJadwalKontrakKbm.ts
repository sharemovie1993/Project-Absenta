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
  const { enabled = true, search, ...filters } = params;
  const queryClient = useQueryClient();

  // === Main list query ===
  const listQuery = useQuery({
    queryKey: ['jadwal-kontrak-kbm', filters],
    queryFn: () => listJadwalKontrakKbm(filters),
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  // === Summary query ===
  const summaryQuery = useQuery({
    queryKey: ['jadwal-kontrak-kbm-summary', filters.tahun_pelajaran_id, filters.semester_id],
    queryFn: () =>
      getJadwalKontrakKbmSummary({
        tahun_pelajaran_id: filters.tahun_pelajaran_id,
        semester_id: filters.semester_id,
      }),
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  const rawData: JadwalKontrakKbmItem[] = useMemo(
    () => listQuery.data?.data || [],
    [listQuery.data]
  );

  // === Client-side search filter ===
  const filteredData = useMemo(() => {
    if (!search?.trim()) return rawData;
    const q = search.toLowerCase();
    return rawData.filter(
      (d) =>
        d.Guru?.nama_guru?.toLowerCase().includes(q) ||
        d.Mapel?.nama_mapel?.toLowerCase().includes(q) ||
        d.Kelas?.nama_kelas?.toLowerCase().includes(q)
    );
  }, [rawData, search]);

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

  // === Unique kelas list (for filter dropdown) ===
  const kelasOptionsFromData = useMemo(() => {
    const seen = new Map<string, string>();
    rawData.forEach((d) => {
      if (d.Kelas) seen.set(d.Kelas.id, d.Kelas.nama_kelas);
    });
    return Array.from(seen.entries())
      .map(([id, nama]) => ({ value: id, label: nama }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rawData]);

  // === Unique guru list (for filter dropdown) ===
  const guruOptionsFromData = useMemo(() => {
    const seen = new Map<string, string>();
    rawData.forEach((d) => {
      if (d.Guru) seen.set(d.Guru.id, d.Guru.nama_guru);
    });
    return Array.from(seen.entries())
      .map(([id, nama]) => ({ value: id, label: nama }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rawData]);

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

    // Options for filter dropdowns (derived from data)
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
