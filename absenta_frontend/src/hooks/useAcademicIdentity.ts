import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { siswaApi, guruApi } from '@/api/academic.api';
import {
  normalizeStudentIdentity,
  normalizeTeacherIdentity,
  type StudentIdentity,
  type TeacherIdentity,
} from '@/utils/academic/academicIdentityNormalizer';

export interface UseStudentIdentityParams {
  id?: string | null;
  initialData?: any;
  enabled?: boolean;
}

export interface UseStudentIdentityReturn {
  identity: StudentIdentity;
  raw: any;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Hook Universal Identitas Siswa
 * Menggabungkan data lokal/props dengan data server (SSoT) dan
 * menghasilkan identitas normalisasi yang konsisten di semua modal & dokumen.
 */
export function useStudentIdentity(params?: UseStudentIdentityParams | string | null): UseStudentIdentityReturn {
  const resolvedParams: UseStudentIdentityParams = useMemo(() => {
    if (!params) return {};
    if (typeof params === 'string') return { id: params };
    return params;
  }, [params]);

  const { id, initialData, enabled = true } = resolvedParams;

  // Cek apakah data awal sudah lengkap (memiliki kelas & orang tua)
  const isInitialComplete = Boolean(
    initialData &&
    (initialData.nama_ayah !== undefined || initialData.Siswa?.nama_ayah !== undefined) &&
    (initialData.Kelas !== undefined || initialData.Siswa?.Kelas !== undefined)
  );

  const shouldFetch = Boolean(enabled && id && !isInitialComplete);

  const { data: resData, isLoading, isError, refetch } = useQuery({
    queryKey: ['academic-identity-siswa', id],
    queryFn: () => siswaApi.getById(id!),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000, // 5 menit cache
  });

  const mergedRaw = useMemo(() => {
    const fetched = (resData as any)?.data || resData || null;
    if (!fetched && !initialData) return null;
    return {
      ...(initialData || {}),
      ...(fetched || {}),
    };
  }, [initialData, resData]);

  const identity = useMemo(() => {
    return normalizeStudentIdentity(mergedRaw);
  }, [mergedRaw]);

  return {
    identity,
    raw: mergedRaw,
    isLoading: shouldFetch && isLoading,
    isError,
    refetch,
  };
}

export interface UseTeacherIdentityParams {
  id?: string | null;
  initialData?: any;
  enabled?: boolean;
}

export interface UseTeacherIdentityReturn {
  identity: TeacherIdentity;
  raw: any;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Hook Universal Identitas Pendidik (Guru / Pegawai)
 */
export function useTeacherIdentity(params?: UseTeacherIdentityParams | string | null): UseTeacherIdentityReturn {
  const resolvedParams: UseTeacherIdentityParams = useMemo(() => {
    if (!params) return {};
    if (typeof params === 'string') return { id: params };
    return params;
  }, [params]);

  const { id, initialData, enabled = true } = resolvedParams;

  const isInitialComplete = Boolean(
    initialData &&
    (initialData.nip !== undefined || initialData.nip_guru !== undefined) &&
    initialData.pangkat_golongan !== undefined
  );

  const shouldFetch = Boolean(enabled && id && !isInitialComplete);

  const { data: resData, isLoading, isError, refetch } = useQuery({
    queryKey: ['academic-identity-guru', id],
    queryFn: () => guruApi.getById(id!),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
  });

  const mergedRaw = useMemo(() => {
    const fetched = (resData as any)?.data || resData || null;
    if (!fetched && !initialData) return null;
    return {
      ...(initialData || {}),
      ...(fetched || {}),
    };
  }, [initialData, resData]);

  const identity = useMemo(() => {
    return normalizeTeacherIdentity(mergedRaw);
  }, [mergedRaw]);

  return {
    identity,
    raw: mergedRaw,
    isLoading: shouldFetch && isLoading,
    isError,
    refetch,
  };
}
