import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStrukturTree, getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { sekolahApi } from '@/api/academic/sekolah.api';

export interface PklSignerPerson {
  nama: string;
  nip: string;
  jabatan: string;
  isAssigned: boolean;
}

export interface PklMatriksSignersResult {
  kaprog: PklSignerPerson;
  wakasekHubin: PklSignerPerson;
  kepsek: PklSignerPerson;
  isLoading: boolean;
}

/**
 * Hook untuk meresolusi penandatangan resmi (Kaprog, Waka Hubin, Kepala Sekolah)
 * secara otomatis langsung dari Struktur Organisasi (OrganizationalAssignment)
 */
export const usePklMatriksSigners = (
  jurusanId?: string,
  jurusanNama?: string
): PklMatriksSignersResult => {
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

  const signers = useMemo<PklMatriksSignersResult>(() => {
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
    let kaprogPerson: PklSignerPerson = {
      nama: jurusanNama ? `Ketua Program Keahlian ${jurusanNama}` : 'Ketua Program Keahlian',
      nip: '-',
      jabatan: 'Ketua Program Keahlian',
      isAssigned: false,
    };

    // A. Check Tree first
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

    // B. Fallback: Check flat positions list
    if (!kaprogPerson.isAssigned) {
      const kaprogPos = list.find((p: any) => (p.kode || p.code || '').toUpperCase() === 'KAPROG');
      if (kaprogPos && kaprogPos.organizationalAssigns) {
        const matchingAssign = kaprogPos.organizationalAssigns.find((a: any) => {
          if (a.is_active === false) return false;
          if (jurusanId && a.unit_id === jurusanId) return true;
          if (jurusanNama && a.unit_name && a.unit_name.toLowerCase() === jurusanNama.toLowerCase()) return true;
          return false;
        });
        if (matchingAssign) {
          const guru = matchingAssign.User?.Guru || matchingAssign.guru;
          const user = matchingAssign.User || matchingAssign.user;
          const nama = guru?.nama_guru || user?.nama || matchingAssign.name;
          if (nama) {
            kaprogPerson = {
              nama,
              nip: guru?.nip || cleanNip(matchingAssign.details) || '-',
              jabatan: `Ketua Program Keahlian ${jurusanNama || ''}`.trim(),
              isAssigned: true,
            };
          }
        }
      }
    }

    // --- 2. RESOLVE WAKIL KEPALA SEKOLAH BIDANG HUBINMAS (WAKA HUBIN) ---
    let hubinPerson: PklSignerPerson = {
      nama: 'Wakil Kepala Sekolah Bidang Hubinmas',
      nip: '-',
      jabatan: 'Wakil Kepala Sekolah Bidang Hubinmas',
      isAssigned: false,
    };

    // A. Check Tree
    const hubinNodes = [
      ...(Array.isArray(tree['HUBIN']) ? tree['HUBIN'] : []),
      ...(Array.isArray(tree['WAKA_HUBIN']) ? tree['WAKA_HUBIN'] : []),
      ...(Array.isArray(tree['HUMAS']) ? tree['HUMAS'] : []),
      ...(Array.isArray(tree['WAKA_HUMAS']) ? tree['WAKA_HUMAS'] : []),
    ];

    const activeHubinNode = hubinNodes.find((node: any) => node.members && node.members.length > 0);
    if (activeHubinNode && activeHubinNode.members && activeHubinNode.members.length > 0) {
      const m = activeHubinNode.members[0];
      if (m && m.name && m.name !== 'Unknown') {
        hubinPerson = {
          nama: m.name,
          nip: cleanNip(m.details),
          jabatan: activeHubinNode.nama
            ? activeHubinNode.nama.replace(/\s*&\s*Staf/i, '').trim()
            : 'Wakil Kepala Sekolah Bidang Hubinmas',
          isAssigned: true,
        };
      }
    }

    // B. Fallback: Check flat positions list
    if (!hubinPerson.isAssigned) {
      const hubinPos = list.find((p: any) => {
        const code = (p.kode || p.code || '').toUpperCase();
        const name = (p.nama || p.name || '').toUpperCase();
        return (
          code === 'HUBIN' ||
          code === 'WAKA_HUBIN' ||
          code === 'HUMAS' ||
          code === 'WAKA_HUMAS' ||
          name.includes('HUBIN') ||
          name.includes('HUBUNGAN INDUSTRI') ||
          name.includes('HUMAS')
        );
      });

      if (hubinPos && hubinPos.organizationalAssigns && hubinPos.organizationalAssigns.length > 0) {
        const activeAssign =
          hubinPos.organizationalAssigns.find((a: any) => a.is_active !== false) ||
          hubinPos.organizationalAssigns[0];
        if (activeAssign) {
          const guru = activeAssign.User?.Guru || activeAssign.guru;
          const user = activeAssign.User || activeAssign.user;
          const nama = guru?.nama_guru || user?.nama || activeAssign.name;
          if (nama) {
            hubinPerson = {
              nama,
              nip: guru?.nip || cleanNip(activeAssign.details) || '-',
              jabatan: hubinPos.nama || 'Wakil Kepala Sekolah Bidang Hubinmas',
              isAssigned: true,
            };
          }
        }
      }
    }

    // --- 3. RESOLVE KEPALA SEKOLAH ---
    let kepsekPerson: PklSignerPerson = {
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
      wakasekHubin: hubinPerson,
      kepsek: kepsekPerson,
      isLoading: isLoadingTree || isLoadingList || isLoadingSekolah,
    };
  }, [treeRes, listRes, sekolahRes, jurusanId, jurusanNama, isLoadingTree, isLoadingList, isLoadingSekolah]);

  return signers;
};
