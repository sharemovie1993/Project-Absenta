import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { getStrukturTree, getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { usePrintHeaderData } from '@/components/ui/PrintHeader';

export function cleanNip(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s || s === '-' || s === 'null' || s === 'undefined') return '-';
  const m = s.match(/NIP\.?\s*[:.]?\s*([0-9\s.-]+)/i);
  if (m && m[1]) return m[1].trim();
  return s;
}

export interface ResolvedKurikulumSigners {
  kepsekNama: string;
  kepsekNip: string;
  wakaNama: string;
  wakaNip: string;
  kota: string;
  sekolahNama: string;
}

export function extractSignersFromData(
  sekolahRes: any,
  treeRes: any,
  listRes: any
): ResolvedKurikulumSigners {
  const tree = treeRes?.data || treeRes || {};
  const list = Array.isArray(listRes?.data)
    ? listRes.data
    : Array.isArray(listRes)
    ? listRes
    : [];
  const sekolah = sekolahRes?.data || sekolahRes || {};

  // 1. Kepala Sekolah
  let kepsekNama = sekolah?.kepala_sekolah || '';
  let kepsekNip = cleanNip(sekolah?.nip_kepala || sekolah?.nip_kepala_sekolah);

  const kepsekNodes = Array.isArray(tree['KEPALA_SEKOLAH']) ? tree['KEPALA_SEKOLAH'] : [];
  const activeKepsek = kepsekNodes.find((n: any) => Array.isArray(n?.members) && n.members.length > 0);
  if (activeKepsek?.members?.[0]?.name) {
    kepsekNama = activeKepsek.members[0].name;
    const parsedNip = cleanNip(activeKepsek.members[0].details);
    if (parsedNip !== '-') kepsekNip = parsedNip;
  }

  if (!kepsekNama) {
    const kepsekPos = list.find((p: any) => {
      const code = String(p?.kode || p?.code || '').toUpperCase();
      return code === 'KEPALA_SEKOLAH' || code === 'KEPSEK';
    });
    const assign =
      kepsekPos?.organizationalAssigns?.find((a: any) => a.is_active !== false) ||
      kepsekPos?.organizationalAssigns?.[0];
    if (assign?.User?.Guru) {
      kepsekNama = assign.User.Guru.nama_guru;
      kepsekNip = assign.User.Guru.nip || kepsekNip;
    }
  }

  // 2. Wakasek Bidang Kurikulum
  let wakaNama = '';
  let wakaNip = '-';

  const kurikulumNodes = [
    ...(Array.isArray(tree['KURIKULUM']) ? tree['KURIKULUM'] : []),
    ...(Array.isArray(tree['WAKA_KURIKULUM']) ? tree['WAKA_KURIKULUM'] : []),
  ];
  const activeKurikulum = kurikulumNodes.find((n: any) => Array.isArray(n?.members) && n.members.length > 0);
  if (activeKurikulum?.members?.[0]?.name) {
    wakaNama = activeKurikulum.members[0].name;
    const parsedNip = cleanNip(activeKurikulum.members[0].details);
    if (parsedNip !== '-') wakaNip = parsedNip;
  }

  if (!wakaNama) {
    const kurikulumPos = list.find((p: any) => {
      const code = String(p?.kode || p?.code || '').toUpperCase();
      const name = String(p?.nama || p?.name || '').toUpperCase();
      return code === 'KURIKULUM' || code === 'WAKA_KURIKULUM' || name.includes('KURIKULUM');
    });
    const assign =
      kurikulumPos?.organizationalAssigns?.find((a: any) => a.is_active !== false) ||
      kurikulumPos?.organizationalAssigns?.[0];
    if (assign?.User?.Guru) {
      wakaNama = assign.User.Guru.nama_guru;
      wakaNip = assign.User.Guru.nip || '-';
    }
  }

  const kota = sekolah?.kabupaten_kota || sekolah?.kota || 'Purwakarta';
  const sekolahNama = sekolah?.nama_sekolah || 'Satuan Pendidikan';

  return {
    kepsekNama: kepsekNama || 'Kepala Sekolah',
    kepsekNip: kepsekNip || '-',
    wakaNama: wakaNama || 'Wakasek Bidang Kurikulum',
    wakaNip: wakaNip || '-',
    kota,
    sekolahNama,
  };
}

export function useKurikulumSigners(enabled: boolean) {
  const { data: sekolahRes } = useQuery({
    queryKey: ['sekolah-profile-signers'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  const { data: treeRes } = useQuery({
    queryKey: ['struktur-organisasi-tree-print'],
    queryFn: () => getStrukturTree().catch(() => ({})),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  const { data: listRes } = useQuery({
    queryKey: ['struktur-organisasi-list-print'],
    queryFn: () => getStrukturList().catch(() => []),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  const headerData = usePrintHeaderData(sekolahRes as any);

  const resolvedSigners = useMemo(
    () => extractSignersFromData(sekolahRes, treeRes, listRes),
    [sekolahRes, treeRes, listRes]
  );

  return { headerData, resolvedSigners };
}
