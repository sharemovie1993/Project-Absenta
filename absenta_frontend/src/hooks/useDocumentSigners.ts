import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { raporApi } from '@/api/rapor.api';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { formatIndoDate } from '@/utils/print/rapor/raporShared';

export interface SignerPerson {
  roleTitle: string;
  personName: string;
  nip?: string;
  statusBadge?: string;
  isAssigned: boolean;
}

export interface UseDocumentSignersParams {
  tahunPelajaranId?: string;
  semesterId?: string;
  kelasId?: string;
  jurusanId?: string;
  titimangsaCity?: string;
  titimangsaDate?: string;
  customSigners?: {
    kepsek?: Partial<SignerPerson>;
    walas?: Partial<SignerPerson>;
    kaprog?: Partial<SignerPerson>;
    unit?: Partial<SignerPerson>;
    parent?: Partial<SignerPerson>;
    dudi?: Partial<SignerPerson>;
  };
}

export interface DocumentSignersResult {
  city: string;
  dateStr: string;
  titimangsa: string;
  kepsek: SignerPerson;
  walas: SignerPerson;
  kaprog: SignerPerson;
  wakaKurikulum: SignerPerson;
  wakaSarpras: SignerPerson;
  wakaHubin: SignerPerson;
  parent: SignerPerson;
  dudi: SignerPerson;
  isLoading: boolean;
}

/**
 * Normalizes NIP by removing leading prefixes and trimming.
 * Returns clean digits or empty string if absent/invalid.
 */
export const cleanNipValue = (rawNip?: string | null): string => {
  if (!rawNip) return '';
  const cleaned = String(rawNip).replace(/^NIP\.?\s*/i, '').trim();
  if (cleaned === '-' || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'undefined') {
    return '';
  }
  return cleaned;
};

/**
 * 🏛️ SSOT Document Signers Hook
 * Resolves official signatories (Kepala Sekolah, Wali Kelas, Kaprog, Waka)
 * directly from OrganizationalAssignment, RaporSettings, and School Profile.
 */
export const useDocumentSigners = (params: UseDocumentSignersParams = {}): DocumentSignersResult => {
  const {
    tahunPelajaranId,
    semesterId,
    kelasId,
    jurusanId,
    titimangsaCity,
    titimangsaDate,
    customSigners,
  } = params;

  // 1. Fetch Active Organizational Structure (Positions & Assignments)
  const { data: strukturListRes, isLoading: isLoadingStruktur } = useQuery({
    queryKey: ['academic-struktur-list-active'],
    queryFn: () => getStrukturList({ is_active: true }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Rapor Settings for academic slot overrides
  const { data: raporSettingsRes, isLoading: isLoadingRaporSettings } = useQuery({
    queryKey: ['rapor-settings-signers', tahunPelajaranId, semesterId],
    queryFn: () =>
      raporApi.getRaporSettings({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  // 3. Fetch Sekolah Profile for fallback
  const { data: sekolahRes, isLoading: isLoadingSekolah } = useQuery({
    queryKey: ['sekolah-profile-signers'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  const strukturList = useMemo(() => {
    return (strukturListRes as any)?.data || (Array.isArray(strukturListRes) ? strukturListRes : []);
  }, [strukturListRes]);

  const raporSettings = useMemo(() => {
    return (raporSettingsRes as any)?.data || raporSettingsRes || null;
  }, [raporSettingsRes]);

  const sekolah = useMemo(() => {
    return (sekolahRes as any)?.data || sekolahRes || null;
  }, [sekolahRes]);

  return useMemo<DocumentSignersResult>(() => {
    // ── A. Resolve Titimangsa (City & Date) ──
    const city =
      titimangsaCity ||
      raporSettings?.tempat_terbit ||
      sekolah?.kota ||
      'Purwakarta';

    const rawDate =
      titimangsaDate ||
      raporSettings?.tanggal_rapor_ganjil ||
      raporSettings?.tanggal_rapor ||
      raporSettings?.tanggal_rapor_genap;

    const dateStr = rawDate ? formatIndoDate(rawDate) : formatIndoDate(new Date());
    const titimangsa = `${city}, ${dateStr}`;

    // Helper: Find assignments for a position code
    const getAssignmentsForCode = (codes: string[]) => {
      const pos = strukturList.find((p: any) =>
        codes.some((c) => (p.kode || p.code || '').toUpperCase() === c.toUpperCase())
      );
      return (pos?.organizationalAssigns || []) as any[];
    };

    // ── B. Resolve Kepala Sekolah ──
    const kepsekAssigns = getAssignmentsForCode(['KEPALA_SEKOLAH', 'KEPSEK', 'PRINCIPAL']);
    const activeKepsekAssign =
      kepsekAssigns.find((a: any) => a.is_active !== false) || kepsekAssigns[0];

    const kepsekGuru = activeKepsekAssign?.User?.Guru || activeKepsekAssign?.User;
    const kepsekName =
      customSigners?.kepsek?.personName ||
      raporSettings?.kepsek_nama ||
      kepsekGuru?.nama_guru ||
      kepsekGuru?.nama ||
      activeKepsekAssign?.User?.full_name ||
      sekolah?.kepala_sekolah ||
      'Kepala Sekolah';

    const kepsekNipRaw =
      customSigners?.kepsek?.nip ??
      (raporSettings?.kepsek_nip ||
        kepsekGuru?.nip ||
        sekolah?.nip_kepala_sekolah);
    const kepsekNip = cleanNipValue(kepsekNipRaw);

    const kepsekRole =
      customSigners?.kepsek?.roleTitle ||
      (raporSettings?.kepsek_status === 'PLT' ? 'Plt. Kepala Sekolah' : 'Kepala Sekolah');

    const kepsek: SignerPerson = {
      roleTitle: kepsekRole,
      personName: kepsekName,
      nip: kepsekNip,
      statusBadge: raporSettings?.kepsek_status || (activeKepsekAssign ? 'DEFINITIF' : undefined),
      isAssigned: Boolean(activeKepsekAssign || raporSettings?.kepsek_nama || sekolah?.kepala_sekolah),
    };

    // ── C. Resolve Wali Kelas ──
    const walasAssigns = getAssignmentsForCode(['WALI_KELAS', 'WALAS', 'HOMEROOM']);
    let matchedWalasAssign: any = null;

    if (kelasId) {
      matchedWalasAssign = walasAssigns.find(
        (a: any) =>
          a.kelas_id === kelasId &&
          (!tahunPelajaranId || !a.tahun_pelajaran_id || a.tahun_pelajaran_id === tahunPelajaranId)
      );
    }
    if (!matchedWalasAssign && walasAssigns.length > 0) {
      matchedWalasAssign = walasAssigns.find((a: any) => a.is_active !== false) || walasAssigns[0];
    }

    const walasGuru = matchedWalasAssign?.User?.Guru || matchedWalasAssign?.User;
    const walasName =
      customSigners?.walas?.personName ||
      walasGuru?.nama_guru ||
      walasGuru?.nama ||
      matchedWalasAssign?.User?.full_name ||
      'Wali Kelas';

    const walasNipRaw = customSigners?.walas?.nip ?? walasGuru?.nip;
    const walasNip = cleanNipValue(walasNipRaw);

    const walas: SignerPerson = {
      roleTitle: customSigners?.walas?.roleTitle || 'Wali Kelas',
      personName: walasName,
      nip: walasNip,
      isAssigned: Boolean(matchedWalasAssign || customSigners?.walas?.personName),
    };

    // ── D. Resolve Ketua Program Keahlian (Kaprog) ──
    const kaprogAssigns = getAssignmentsForCode(['KAPROG', 'KETUA_JURUSAN', 'HEAD_OF_DEPARTMENT']);
    let matchedKaprogAssign: any = null;

    if (jurusanId) {
      matchedKaprogAssign = kaprogAssigns.find((a: any) => a.unit_id === jurusanId);
    }
    if (!matchedKaprogAssign && kaprogAssigns.length > 0) {
      matchedKaprogAssign = kaprogAssigns.find((a: any) => a.is_active !== false) || kaprogAssigns[0];
    }

    const kaprogGuru = matchedKaprogAssign?.User?.Guru || matchedKaprogAssign?.User;
    const kaprogName =
      customSigners?.kaprog?.personName ||
      kaprogGuru?.nama_guru ||
      kaprogGuru?.nama ||
      matchedKaprogAssign?.User?.full_name ||
      'Ketua Program Keahlian';

    const kaprogNipRaw = customSigners?.kaprog?.nip ?? kaprogGuru?.nip;
    const kaprogNip = cleanNipValue(kaprogNipRaw);

    const kaprog: SignerPerson = {
      roleTitle: customSigners?.kaprog?.roleTitle || 'Ketua Program Keahlian',
      personName: kaprogName,
      nip: kaprogNip,
      isAssigned: Boolean(matchedKaprogAssign || customSigners?.kaprog?.personName),
    };

    // ── E. Resolve Waka Kurikulum ──
    const kurikulumAssigns = getAssignmentsForCode(['WAKA_KURIKULUM', 'KURIKULUM']);
    const kurikulumAssign = kurikulumAssigns.find((a: any) => a.is_active !== false) || kurikulumAssigns[0];
    const kurikulumGuru = kurikulumAssign?.User?.Guru || kurikulumAssign?.User;
    const wakaKurikulum: SignerPerson = {
      roleTitle: 'Waka. Bidang Kurikulum',
      personName: kurikulumGuru?.nama_guru || kurikulumGuru?.nama || kurikulumAssign?.User?.full_name || 'Waka Kurikulum',
      nip: cleanNipValue(kurikulumGuru?.nip),
      isAssigned: Boolean(kurikulumAssign),
    };

    // ── F. Resolve Waka Sarpras ──
    const sarprasAssigns = getAssignmentsForCode(['WAKA_SARPRAS', 'SARPRAS']);
    const sarprasAssign = sarprasAssigns.find((a: any) => a.is_active !== false) || sarprasAssigns[0];
    const sarprasGuru = sarprasAssign?.User?.Guru || sarprasAssign?.User;
    const wakaSarpras: SignerPerson = {
      roleTitle: 'Waka. Bidang Sarana & Prasarana',
      personName: sarprasGuru?.nama_guru || sarprasGuru?.nama || sarprasAssign?.User?.full_name || 'Waka Sarpras',
      nip: cleanNipValue(sarprasGuru?.nip),
      isAssigned: Boolean(sarprasAssign),
    };

    // ── G. Resolve Waka Hubin ──
    const hubinAssigns = getAssignmentsForCode(['WAKA_HUBIN', 'HUBIN', 'KOORDINATOR_PKL']);
    const hubinAssign = hubinAssigns.find((a: any) => a.is_active !== false) || hubinAssigns[0];
    const hubinGuru = hubinAssign?.User?.Guru || hubinAssign?.User;
    const wakaHubin: SignerPerson = {
      roleTitle: 'Waka. Bidang Hubungan Industri',
      personName: hubinGuru?.nama_guru || hubinGuru?.nama || hubinAssign?.User?.full_name || 'Waka Hubin',
      nip: cleanNipValue(hubinGuru?.nip),
      isAssigned: Boolean(hubinAssign),
    };

    // ── H. Orang Tua / Wali Siswa ──
    const parent: SignerPerson = {
      roleTitle: customSigners?.parent?.roleTitle || 'Orang Tua / Wali,',
      personName: customSigners?.parent?.personName || '................................',
      nip: '',
      isAssigned: Boolean(customSigners?.parent?.personName),
    };

    // ── I. Mitra DUDI / Industri ──
    const dudi: SignerPerson = {
      roleTitle: customSigners?.dudi?.roleTitle || 'Pembimbing DUDI / Industri,',
      personName: customSigners?.dudi?.personName || '................................',
      nip: cleanNipValue(customSigners?.dudi?.nip),
      isAssigned: Boolean(customSigners?.dudi?.personName),
    };

    return {
      city,
      dateStr,
      titimangsa,
      kepsek,
      walas,
      kaprog,
      wakaKurikulum,
      wakaSarpras,
      wakaHubin,
      parent,
      dudi,
      isLoading: isLoadingStruktur || isLoadingRaporSettings || isLoadingSekolah,
    };
  }, [
    titimangsaCity,
    titimangsaDate,
    raporSettings,
    sekolah,
    strukturList,
    customSigners,
    kelasId,
    jurusanId,
    tahunPelajaranId,
    isLoadingStruktur,
    isLoadingRaporSettings,
    isLoadingSekolah,
  ]);
};
