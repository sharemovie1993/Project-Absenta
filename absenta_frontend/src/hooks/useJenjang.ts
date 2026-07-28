import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getTenantById } from '../api/tenants.api';

export interface JenjangConfig {
  tingkatMin: number;
  tingkatMax: number;
  label: string;
}

export const JENJANG_CONFIGS: Record<string, JenjangConfig> = {
  SD:  { tingkatMin: 1,  tingkatMax: 6,  label: 'Sekolah Dasar' },
  MI:  { tingkatMin: 1,  tingkatMax: 6,  label: 'Madrasah Ibtidaiyah' },
  SMP: { tingkatMin: 7,  tingkatMax: 9,  label: 'Sekolah Menengah Pertama' },
  MTs: { tingkatMin: 7,  tingkatMax: 9,  label: 'Madrasah Tsanawiyah' },
  SMA: { tingkatMin: 10, tingkatMax: 12, label: 'Sekolah Menengah Atas' },
  MA:  { tingkatMin: 10, tingkatMax: 12, label: 'Madrasah Aliyah' },
  SMK: { tingkatMin: 10, tingkatMax: 13, label: 'Sekolah Menengah Kejuruan' },
  MAK: { tingkatMin: 10, tingkatMax: 13, label: 'Madrasah Aliyah Kejuruan' },
};

// Default fallback jika jenjang tidak diset atau tidak dikenali
const DEFAULT_CONFIG: JenjangConfig = {
  tingkatMin: 10,
  tingkatMax: 12,
  label: 'Sekolah Menengah Atas'
};

export function useJenjang() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const { data: tenantResponse, isLoading } = useQuery({
    queryKey: ['tenant-profile-jenjang', tenantId],
    queryFn: () => getTenantById(tenantId || ''),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 1, // 1 Menit cache
  });

  const tenant = tenantResponse?.data;
  const rawJenjang = tenant?.jenjang || '';
  const durasiSmk = tenant?.durasi_smk || '3_TAHUN';
  const has4TahunJurusan = Boolean((tenant as any)?.has_4_tahun_jurusan);

  const config = useMemo(() => {
    const key = rawJenjang.toUpperCase();
    const base = JENJANG_CONFIGS[key] || DEFAULT_CONFIG;
    if (key === 'SMK' || key === 'MAK') {
      const max = (durasiSmk === '4_TAHUN' || has4TahunJurusan) ? 13 : 12;
      return { ...base, tingkatMax: max };
    }
    return base;
  }, [rawJenjang, durasiSmk, has4TahunJurusan]);

  const tingkatList = useMemo(() => {
    const list: number[] = [];
    for (let i = config.tingkatMin; i <= config.tingkatMax; i++) {
      list.push(i);
    }
    return list;
  }, [config]);

  const kelompokOptions = useMemo(() => {
    const key = rawJenjang.toUpperCase();
    return KELOMPOK_MAPEL_BY_JENJANG[key] || DEFAULT_KELOMPOK_OPTIONS;
  }, [rawJenjang]);

  const kurikulum = tenant?.kurikulum || 'MERDEKA';

  return {
    jenjang: rawJenjang,
    durasiSmk,
    kurikulum,
    config,
    tingkatList,
    kelompokOptions,
    isLoading,
    sekolah: tenant
  };
}

export interface KelompokOption {
  value: string;
  label: string;
}

export const KELOMPOK_MAPEL_BY_JENJANG: Record<string, KelompokOption[]> = {
  SMK: [
    { value: 'MATA PELAJARAN UMUM', label: 'MAPEL UMUM' },
    { value: 'MATA PELAJARAN KEJURUAN', label: 'MAPEL KEJURUAN' },
    { value: 'MATA PELAJARAN PILIHAN', label: 'MAPEL PILIHAN' },
    { value: 'MUATAN LOKAL', label: 'MUATAN LOKAL' }
  ],
  MAK: [
    { value: 'MATA PELAJARAN UMUM', label: 'MAPEL UMUM' },
    { value: 'MATA PELAJARAN KEJURUAN', label: 'MAPEL KEJURUAN' },
    { value: 'MATA PELAJARAN PILIHAN', label: 'MAPEL PILIHAN' },
    { value: 'MUATAN LOKAL', label: 'MUATAN LOKAL' }
  ],
  SMA: [
    { value: 'MATA PELAJARAN UMUM', label: 'MAPEL UMUM' },
    { value: 'MATA PELAJARAN PILIHAN', label: 'MAPEL PILIHAN' },
    { value: 'MUATAN LOKAL', label: 'MUATAN LOKAL' }
  ],
  MA: [
    { value: 'MATA PELAJARAN UMUM', label: 'MAPEL UMUM' },
    { value: 'MATA PELAJARAN PILIHAN', label: 'MAPEL PILIHAN' },
    { value: 'MUATAN LOKAL', label: 'MUATAN LOKAL' }
  ],
  SMP: [
    { value: 'MATA PELAJARAN UMUM', label: 'MAPEL UMUM' },
    { value: 'MUATAN LOKAL', label: 'MUATAN LOKAL' }
  ],
  MTs: [
    { value: 'MATA PELAJARAN UMUM', label: 'MAPEL UMUM' },
    { value: 'MUATAN LOKAL', label: 'MUATAN LOKAL' }
  ],
  SD: [
    { value: 'MATA PELAJARAN UMUM', label: 'MAPEL UMUM' },
    { value: 'MUATAN LOKAL', label: 'MUATAN LOKAL' }
  ],
  MI: [
    { value: 'MATA PELAJARAN UMUM', label: 'MAPEL UMUM' },
    { value: 'MUATAN LOKAL', label: 'MUATAN LOKAL' }
  ]
};

export const DEFAULT_KELOMPOK_OPTIONS: KelompokOption[] = [
  { value: 'MATA PELAJARAN UMUM', label: 'MAPEL UMUM' },
  { value: 'MATA PELAJARAN PILIHAN', label: 'MAPEL PILIHAN' },
  { value: 'MUATAN LOKAL', label: 'MUATAN LOKAL' }
];

