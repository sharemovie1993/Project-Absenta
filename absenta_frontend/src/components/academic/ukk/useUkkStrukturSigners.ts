import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStrukturTree, getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { sekolahApi } from '@/api/academic/sekolah.api';

export interface UkkSignerPerson {
  nama: string;
  nip: string;
  jabatan: string;
  isAssigned: boolean;
}

export interface UkkStrukturSignersResult {
  kaprog: UkkSignerPerson;
  wakasekSarpras: UkkSignerPerson;
  kepsek: UkkSignerPerson;
  isLoading: boolean;
}

/**
 * Hook to automatically resolve official signers (Kaprog, Wakasek Sarpras, Kepala Sekolah)
 * directly from the institution's active Organizational Structure (Struktur Organisasi / Posisi Jabatan).
 */
export const useUkkStrukturSigners = (
  jurusanId?: string,
  jurusanNama?: string
): UkkStrukturSignersResult => {
  // 1. Fetch Topology Tree
  const { data: treeRes, isLoading: isLoadingTree } = useQuery({
    queryKey: ['academic-struktur-tree'],
    queryFn: () => getStrukturTree().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Flat Positions List as Fallback
  const { data: listRes, isLoading: isLoadingList } = useQuery({
    queryKey: ['academic-struktur-list-active'],
    queryFn: () => getStrukturList({ is_active: true }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  // 3. Fetch Sekolah Profile for Kepala Sekolah Fallback
  const { data: sekolahRes, isLoading: isLoadingSekolah } = useQuery({
    queryKey: ['sekolah-profile-signers'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  const signers = useMemo<UkkStrukturSignersResult>(() => {
    const tree = (treeRes as any)?.data || treeRes || {};
    const list = Array.isArray((listRes as any)?.data)
      ? (listRes as any).data
      : Array.isArray(listRes)
      ? listRes
      : [];
    const sekolah = (sekolahRes as any)?.data || sekolahRes || {};

    const cleanNip = (rawDetails?: string): string => {
      if (!rawDetails) return '-';
      const match = rawDetails.match(/NIP[:\s]+([0-9\s]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
      const digitsOnly = rawDetails.replace(/[^0-9]/g, '');
      if (digitsOnly.length >= 8) {
        return digitsOnly;
      }
      return rawDetails === 'GURU' || rawDetails === 'SISWA' ? '-' : rawDetails;
    };

    // --- 1. RESOLVE KETUA PROGRAM KEAHLIAN (KAPROG) ---
    let kaprogPerson: UkkSignerPerson = {
      nama: jurusanNama ? `Ketua Program Keahlian ${jurusanNama}` : 'Ketua Program Keahlian',
      nip: '-',
      jabatan: 'Ketua Program Keahlian',
      isAssigned: false,
    };

    // Check Tree first
    const kaprogNodes = Array.isArray(tree['KAPROG']) ? tree['KAPROG'] : [];
    const matchingKaprogNode = kaprogNodes.find((node: any) => {
      if (jurusanId && node.unit_id === jurusanId) return true;
      if (
        jurusanNama &&
        (node.unit_name?.toLowerCase() === jurusanNama.toLowerCase() ||
          node.unit_kode?.toLowerCase() === jurusanNama.toLowerCase())
      ) {
        return true;
      }
      return false;
    });

    if (matchingKaprogNode && matchingKaprogNode.members && matchingKaprogNode.members.length > 0) {
      const m = matchingKaprogNode.members[0];
      if (m && m.name && m.name !== 'Unknown') {
        kaprogPerson = {
          nama: m.name,
          nip: cleanNip(m.details),
          jabatan: `Ketua Program Keahlian ${matchingKaprogNode.unit_name || jurusanNama || ''}`.trim(),
          isAssigned: true,
        };
      }
    }

    // Fallback: Check flat positions list if not found in tree
    if (!kaprogPerson.isAssigned) {
      const kaprogPos = list.find((p: any) => p.kode === 'KAPROG' || p.code === 'KAPROG');
      if (kaprogPos && kaprogPos.organizationalAssigns) {
        const matchingAssign = kaprogPos.organizationalAssigns.find(
          (a: any) => a.unit_id === jurusanId && a.is_active !== false
        );
        if (matchingAssign && matchingAssign.User?.Guru) {
          kaprogPerson = {
            nama: matchingAssign.User.Guru.nama_guru,
            nip: matchingAssign.User.Guru.nip || '-',
            jabatan: `Ketua Program Keahlian ${jurusanNama || ''}`.trim(),
            isAssigned: true,
          };
        }
      }
    }

    // --- 2. RESOLVE WAKASEK BIDANG SARANA & PRASARANA (SARPRAS) ---
    let sarprasPerson: UkkSignerPerson = {
      nama: 'Wakasek Bidang Sarana & Prasarana',
      nip: '-',
      jabatan: 'Wakasek Bidang Sarpras',
      isAssigned: false,
    };

    // Check Tree for SARPRAS or WAKA_SARPRAS
    const sarprasNodes = [
      ...(Array.isArray(tree['SARPRAS']) ? tree['SARPRAS'] : []),
      ...(Array.isArray(tree['WAKA_SARPRAS']) ? tree['WAKA_SARPRAS'] : []),
    ];

    const activeSarprasNode = sarprasNodes.find((node: any) => node.members && node.members.length > 0);
    if (activeSarprasNode && activeSarprasNode.members && activeSarprasNode.members.length > 0) {
      const m = activeSarprasNode.members[0];
      if (m && m.name && m.name !== 'Unknown') {
        sarprasPerson = {
          nama: m.name,
          nip: cleanNip(m.details),
          jabatan: activeSarprasNode.nama || 'Wakasek Bidang Sarpras',
          isAssigned: true,
        };
      }
    }

    // Fallback: Check flat positions list
    if (!sarprasPerson.isAssigned) {
      const sarprasPos = list.find((p: any) => {
        const code = (p.kode || p.code || '').toUpperCase();
        const name = (p.nama || p.name || '').toUpperCase();
        return code === 'SARPRAS' || code === 'WAKA_SARPRAS' || name.includes('SARPRAS');
      });

      if (sarprasPos && sarprasPos.organizationalAssigns && sarprasPos.organizationalAssigns.length > 0) {
        const activeAssign = sarprasPos.organizationalAssigns.find((a: any) => a.is_active !== false) || sarprasPos.organizationalAssigns[0];
        if (activeAssign && activeAssign.User?.Guru) {
          sarprasPerson = {
            nama: activeAssign.User.Guru.nama_guru,
            nip: activeAssign.User.Guru.nip || '-',
            jabatan: sarprasPos.nama || 'Wakasek Bidang Sarpras',
            isAssigned: true,
          };
        }
      }
    }

    // --- 3. RESOLVE KEPALA SEKOLAH ---
    let kepsekPerson: UkkSignerPerson = {
      nama: sekolah?.kepala_sekolah || 'Kepala Sekolah',
      nip: sekolah?.nip_kepala || '-',
      jabatan: 'Kepala Sekolah',
      isAssigned: !!sekolah?.kepala_sekolah,
    };

    const kepsekNodes = Array.isArray(tree['KEPALA_SEKOLAH']) ? tree['KEPALA_SEKOLAH'] : [];
    const activeKepsekNode = kepsekNodes.find((n: any) => n.members && n.members.length > 0);
    if (activeKepsekNode && activeKepsekNode.members && activeKepsekNode.members.length > 0) {
      const m = activeKepsekNode.members[0];
      if (m && m.name && m.name !== 'Unknown') {
        kepsekPerson = {
          nama: m.name,
          nip: cleanNip(m.details),
          jabatan: 'Kepala Sekolah',
          isAssigned: true,
        };
      }
    }

    return {
      kaprog: kaprogPerson,
      wakasekSarpras: sarprasPerson,
      kepsek: kepsekPerson,
      isLoading: isLoadingTree || isLoadingList || isLoadingSekolah,
    };
  }, [treeRes, listRes, sekolahRes, jurusanId, jurusanNama, isLoadingTree, isLoadingList, isLoadingSekolah]);

  return signers;
};
