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
  assignmentFlag?: string;
  customTitle?: string;
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
    wakaKurikulum?: Partial<SignerPerson>;
    wakaKesiswaan?: Partial<SignerPerson>;
    wakaSarpras?: Partial<SignerPerson>;
    wakaHubin?: Partial<SignerPerson>;
    kepalaTu?: Partial<SignerPerson>;
    kabeng?: Partial<SignerPerson>;
    toolman?: Partial<SignerPerson>;
    koordinatorBk?: Partial<SignerPerson>;
    ketuaKoperasi?: Partial<SignerPerson>;
    bendaharaKoperasi?: Partial<SignerPerson>;
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
  wakaKesiswaan: SignerPerson;
  wakaSarpras: SignerPerson;
  wakaHubin: SignerPerson;
  kepalaTu: SignerPerson;
  kabeng: SignerPerson;
  toolman: SignerPerson;
  koordinatorBk: SignerPerson;
  ketuaKoperasi: SignerPerson;
  bendaharaKoperasi: SignerPerson;
  parent: SignerPerson;
  dudi: SignerPerson;
  isLoading: boolean;
  getByPositionCode: (
    codes: string | string[],
    options?: {
      unitId?: string;
      kelasId?: string;
      flag?: string;
      fallbackRoleTitle?: string;
    }
  ) => SignerPerson;
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
 * Deterministically resolves the primary leader / coordinator from a list of assignments.
 * Priority:
 * 1. is_leader === true && is_active !== false
 * 2. assignment_flag matches preferredFlag && is_active !== false
 * 3. is_active !== false
 * 4. First available assignment
 */
export const resolveLeaderAssignment = (assigns: any[] = [], preferredFlag?: string): any | null => {
  if (!assigns || assigns.length === 0) return null;

  // 1. Explicit leader flag
  const leader = assigns.find((a: any) => a.is_leader === true && a.is_active !== false);
  if (leader) return leader;

  // 2. Preferred flag match
  if (preferredFlag) {
    const byFlag = assigns.find((a: any) => a.assignment_flag === preferredFlag && a.is_active !== false);
    if (byFlag) return byFlag;
  }

  // 3. Active member
  const active = assigns.find((a: any) => a.is_active !== false);
  if (active) return active;

  return assigns[0];
};

/**
 * 🏛️ SSOT Document Signers Hook
 * Resolves official signatories (Kepala Sekolah, Wali Kelas, Kaprog, Waka, Staf)
 * directly from OrganizationalAssignment (prioritizing is_leader: true), RaporSettings, and School Profile.
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

    // Helper: Find assignments for position codes
    const getAssignmentsForCode = (codes: string[]): any[] => {
      const pos = strukturList.find((p: any) =>
        codes.some((c) => (p.kode || p.code || '').toUpperCase() === c.toUpperCase())
      );
      return (pos?.organizationalAssigns || []) as any[];
    };

    // Helper: Map assignment record to SignerPerson
    const mapAssignToSigner = (
      assign: any | null,
      fallbackRole: string,
      custom?: Partial<SignerPerson>
    ): SignerPerson => {
      const guru = assign?.User?.Guru || assign?.User;
      const personName =
        custom?.personName ||
        guru?.nama_guru ||
        guru?.nama ||
        assign?.User?.full_name ||
        fallbackRole;

      const nipRaw = custom?.nip ?? guru?.nip;
      const nip = cleanNipValue(nipRaw);
      const roleTitle = custom?.roleTitle || assign?.custom_title || fallbackRole;

      return {
        roleTitle,
        personName,
        nip,
        isAssigned: Boolean(assign || custom?.personName),
        assignmentFlag: assign?.assignment_flag,
        customTitle: assign?.custom_title,
      };
    };

    // ── B. Resolve Kepala Sekolah ──
    const kepsekAssigns = getAssignmentsForCode(['KEPALA_SEKOLAH', 'KEPSEK', 'PRINCIPAL']);
    const activeKepsekAssign = resolveLeaderAssignment(kepsekAssigns);

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
      matchedWalasAssign = resolveLeaderAssignment(walasAssigns);
    }

    const walas = mapAssignToSigner(matchedWalasAssign, 'Wali Kelas', customSigners?.walas);

    // ── D. Resolve Ketua Program Keahlian (Kaprog) ──
    const kaprogAssigns = getAssignmentsForCode(['KAPROG', 'KETUA_JURUSAN', 'HEAD_OF_DEPARTMENT']);
    let matchedKaprogAssign: any = null;

    if (jurusanId) {
      matchedKaprogAssign = kaprogAssigns.find((a: any) => a.unit_id === jurusanId);
    }
    if (!matchedKaprogAssign && kaprogAssigns.length > 0) {
      matchedKaprogAssign = resolveLeaderAssignment(kaprogAssigns);
    }

    const kaprog = mapAssignToSigner(matchedKaprogAssign, 'Ketua Program Keahlian', customSigners?.kaprog);

    // ── E. Resolve Waka Kurikulum (Leader Priority) ──
    const kurikulumAssigns = getAssignmentsForCode(['WAKA_KURIKULUM', 'KURIKULUM']);
    const kurikulumAssign = resolveLeaderAssignment(kurikulumAssigns, 'WAKA_KURIKULUM');
    const wakaKurikulum = mapAssignToSigner(kurikulumAssign, 'Waka. Bidang Kurikulum', customSigners?.wakaKurikulum);

    // ── F. Resolve Waka Kesiswaan (Leader Priority) ──
    const kesiswaanAssigns = getAssignmentsForCode(['WAKA_KESISWAAN', 'KESISWAAN']);
    const kesiswaanAssign = resolveLeaderAssignment(kesiswaanAssigns, 'WAKA_KESISWAAN');
    const wakaKesiswaan = mapAssignToSigner(kesiswaanAssign, 'Waka. Bidang Kesiswaan', customSigners?.wakaKesiswaan);

    // ── G. Resolve Waka Sarpras (Leader Priority) ──
    const sarprasAssigns = getAssignmentsForCode(['WAKA_SARPRAS', 'SARPRAS']);
    const sarprasAssign = resolveLeaderAssignment(sarprasAssigns, 'WAKA_SARPRAS');
    const wakaSarpras = mapAssignToSigner(sarprasAssign, 'Waka. Bidang Sarana & Prasarana', customSigners?.wakaSarpras);

    // ── H. Resolve Waka Hubin (Leader Priority) ──
    const hubinAssigns = getAssignmentsForCode(['WAKA_HUBIN', 'HUBIN', 'KOORDINATOR_PKL']);
    const hubinAssign = resolveLeaderAssignment(hubinAssigns, 'WAKA_HUBIN');
    const wakaHubin = mapAssignToSigner(hubinAssign, 'Waka. Bidang Hubungan Industri', customSigners?.wakaHubin);

    // ── I. Resolve Kepala TU ──
    const tuAssigns = getAssignmentsForCode(['TU_KEPALA', 'KEPALA_TU', 'TU']);
    const tuAssign = resolveLeaderAssignment(tuAssigns, 'KOORDINATOR_TU');
    const kepalaTu = mapAssignToSigner(tuAssign, 'Kepala Tata Usaha', customSigners?.kepalaTu);

    // ── J. Resolve Kepala Bengkel (Kabeng) ──
    const kabengAssigns = getAssignmentsForCode(['KABENG', 'KEPALA_BENGKEL']);
    let matchedKabengAssign: any = null;
    if (jurusanId) {
      matchedKabengAssign = kabengAssigns.find((a: any) => a.unit_id === jurusanId);
    }
    if (!matchedKabengAssign && kabengAssigns.length > 0) {
      matchedKabengAssign = resolveLeaderAssignment(kabengAssigns);
    }
    const kabeng = mapAssignToSigner(matchedKabengAssign, 'Kepala Bengkel', customSigners?.kabeng);

    // ── K. Resolve Toolman (Teknisi / Laboran) ──
    const toolmanAssigns = getAssignmentsForCode(['TOOLMAN', 'TEKNISI', 'LABORAN']);
    let matchedToolmanAssign: any = null;
    if (jurusanId) {
      matchedToolmanAssign = toolmanAssigns.find((a: any) => a.unit_id === jurusanId);
    }
    if (!matchedToolmanAssign && toolmanAssigns.length > 0) {
      matchedToolmanAssign = resolveLeaderAssignment(toolmanAssigns);
    }
    const toolman = mapAssignToSigner(matchedToolmanAssign, 'Toolman / Teknisi', customSigners?.toolman);

    // ── L. Resolve Koordinator BP/BK ──
    const bkAssigns = getAssignmentsForCode(['BPBK', 'BK', 'BIMBINGAN_KONSELING']);
    const bkAssign = resolveLeaderAssignment(bkAssigns, 'KOORDINATOR_BK');
    const koordinatorBk = mapAssignToSigner(bkAssign, 'Koordinator BP/BK', customSigners?.koordinatorBk);

    // ── M. Resolve Koperasi (Ketua & Bendahara) ──
    const ketuaKoperasiAssigns = getAssignmentsForCode(['KETUA_KOPERASI', 'KOPERASI_KETUA']);
    const ketuaKopAssign = resolveLeaderAssignment(ketuaKoperasiAssigns);
    const ketuaKoperasi = mapAssignToSigner(ketuaKopAssign, 'Ketua Koperasi', customSigners?.ketuaKoperasi);

    const bendaharaKopAssigns = getAssignmentsForCode(['BENDAHARA_KOPERASI', 'KOPERASI_BENDAHARA']);
    const bendaharaKopAssign = resolveLeaderAssignment(bendaharaKopAssigns);
    const bendaharaKoperasi = mapAssignToSigner(bendaharaKopAssign, 'Bendahara Koperasi', customSigners?.bendaharaKoperasi);

    // ── N. Orang Tua / Wali Siswa ──
    const parent: SignerPerson = {
      roleTitle: customSigners?.parent?.roleTitle || 'Orang Tua / Wali,',
      personName: customSigners?.parent?.personName || '................................',
      nip: '',
      isAssigned: Boolean(customSigners?.parent?.personName),
    };

    // ── O. Mitra DUDI / Industri ──
    const dudi: SignerPerson = {
      roleTitle: customSigners?.dudi?.roleTitle || 'Pembimbing DUDI / Industri,',
      personName: customSigners?.dudi?.personName || '................................',
      nip: cleanNipValue(customSigners?.dudi?.nip),
      isAssigned: Boolean(customSigners?.dudi?.personName),
    };

    // ── Dynamic SSOT Resolver by Position Code ──
    const getByPositionCode = (
      codes: string | string[],
      options?: {
        unitId?: string;
        kelasId?: string;
        flag?: string;
        fallbackRoleTitle?: string;
      }
    ): SignerPerson => {
      const codeArray = Array.isArray(codes) ? codes : [codes];
      const assigns = getAssignmentsForCode(codeArray);

      let matchedAssign: any = null;
      if (options?.kelasId) {
        matchedAssign = assigns.find((a: any) => a.kelas_id === options.kelasId);
      }
      if (!matchedAssign && options?.unitId) {
        matchedAssign = assigns.find((a: any) => a.unit_id === options.unitId);
      }
      if (!matchedAssign) {
        matchedAssign = resolveLeaderAssignment(assigns, options?.flag);
      }

      const defaultTitle = options?.fallbackRoleTitle || codeArray[0].replace(/_/g, ' ');
      return mapAssignToSigner(matchedAssign, defaultTitle);
    };

    return {
      city,
      dateStr,
      titimangsa,
      kepsek,
      walas,
      kaprog,
      wakaKurikulum,
      wakaKesiswaan,
      wakaSarpras,
      wakaHubin,
      kepalaTu,
      kabeng,
      toolman,
      koordinatorBk,
      ketuaKoperasi,
      bendaharaKoperasi,
      parent,
      dudi,
      isLoading: isLoadingStruktur || isLoadingRaporSettings || isLoadingSekolah,
      getByPositionCode,
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
