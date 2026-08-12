import { useQuery } from '@tanstack/react-query';
import { getProvinsiOptions, getKabupatenOptions, getKecamatanOptions, getKelurahanOptions } from '../api/dropdown.api';
import type { DropdownOption } from '../api/reference.api';

/**
 * Hook TanStack Query untuk mengambil daftar Provinsi
 */
export function useProvinsiOptions() {
  const query = useQuery<DropdownOption[]>({
    queryKey: ['wilayah-provinsi-options'],
    queryFn: () => getProvinsiOptions(),
    staleTime: 60 * 60 * 1000, // Cache 1 jam
  });

  return {
    options: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Hook TanStack Query untuk mengambil daftar Kabupaten/Kota berdasarkan Provinsi
 */
export function useKabupatenOptions(provinsiNama?: string) {
  const cleanProv = provinsiNama ? provinsiNama.trim() : '';

  const query = useQuery<DropdownOption[]>({
    queryKey: ['wilayah-kabupaten-options', cleanProv],
    queryFn: () => getKabupatenOptions(cleanProv),
    enabled: Boolean(cleanProv.length > 0),
    staleTime: 60 * 60 * 1000,
  });

  return {
    options: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Hook TanStack Query untuk mengambil daftar Kecamatan berdasarkan Kabupaten/Kota
 */
export function useKecamatanOptions(kabupatenNama?: string) {
  const cleanKab = kabupatenNama ? kabupatenNama.trim() : '';

  const query = useQuery<DropdownOption[]>({
    queryKey: ['wilayah-kecamatan-options', cleanKab],
    queryFn: () => getKecamatanOptions(cleanKab),
    enabled: Boolean(cleanKab.length > 0),
    staleTime: 60 * 60 * 1000,
  });

  return {
    options: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Hook TanStack Query untuk mengambil daftar Kelurahan/Desa berdasarkan Kecamatan & Kabupaten
 */
export function useKelurahanOptions(kecamatanNama?: string, kabupatenNama?: string) {
  const cleanKec = kecamatanNama ? kecamatanNama.trim() : '';
  const cleanKab = kabupatenNama ? kabupatenNama.trim() : '';

  const query = useQuery<DropdownOption[]>({
    queryKey: ['wilayah-kelurahan-options', cleanKec, cleanKab],
    queryFn: () => getKelurahanOptions(cleanKec, cleanKab),
    enabled: Boolean(cleanKec.length > 0),
    staleTime: 60 * 60 * 1000,
  });

  return {
    options: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
