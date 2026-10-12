import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pembinaUpacaraApi,
  JadwalPembinaUpacaraItem,
  CreatePembinaUpacaraPayload,
  AutoGenerateUpacaraPayload,
} from '@/api/attendance/pembinaUpacara.api';
import { toast } from 'react-hot-toast';

export function usePembinaUpacara(filters?: {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  startDate?: string;
  endDate?: string;
}) {
  const queryClient = useQueryClient();

  const queryKey = ['pembina-upacara-list', filters?.tahun_pelajaran_id, filters?.semester_id, filters?.startDate, filters?.endDate];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await pembinaUpacaraApi.getAll(filters);
      return res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const list: JadwalPembinaUpacaraItem[] = Array.isArray(data) ? data : [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pembina-upacara-list'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreatePembinaUpacaraPayload) => pembinaUpacaraApi.create(payload),
    onSuccess: () => {
      invalidate();
      toast.success('Jadwal pembina upacara berhasil ditambahkan.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menambahkan jadwal pembina upacara.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreatePembinaUpacaraPayload> }) =>
      pembinaUpacaraApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Jadwal pembina upacara berhasil diperbarui.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui jadwal pembina upacara.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pembinaUpacaraApi.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success('Jadwal pembina upacara berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menghapus jadwal pembina upacara.');
    },
  });

  const autoGenerateMutation = useMutation({
    mutationFn: (payload: AutoGenerateUpacaraPayload) => pembinaUpacaraApi.autoGenerate(payload),
    onSuccess: (res) => {
      invalidate();
      toast.success(res?.message || 'Jadwal rotasi upacara 1 semester berhasil digenerate.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal mengenerate jadwal pembina upacara.');
    },
  });

  return {
    list,
    isLoading,
    isError,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
    autoGenerateMutation,
  };
}
