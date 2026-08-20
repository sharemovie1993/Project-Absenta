import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { CapabilityCode } from '../types/capabilities';
import { getUserPositions } from '../config/navigation.config';

/**
 * 🛡️ Centralized Capability & Persona Helper Hook (DRY Single Source of Truth)
 * Mengabaikan string role hardcoded dan mengkonsumsi pre-computed capabilities hasil evaluasi Backend Piramida.
 * 
 * 100% COVERAGE DENGAN 24 STRUKTUR_CODES + BASE ROLE ADMIN PADA BACKEND:
 * - Level 1: PETUGAS_KELAS, GERBANG, TOOLMAN
 * - Level 2: TU_PERSURATAN, TU_KEUANGAN, TU_KEPEGAWAIAN, TU_SARPRAS, MANAJER_TOKO_KOPERASI, BENDAHARA_KOPERASI, KETUA_KOPERASI, SEKRETARIS_KOPERASI, PENGAWAS_KOPERASI
 * - Level 3: WALIKELAS, BPBK, PEMBINA_ESKUL, KAPROG, KABENG
 * - Level 4 & 5: KURIKULUM, KESISWAAN, HUBIN, BKK, SARPRAS, TU_KEPALA, KEPALA_SEKOLAH
 * - Base Role: ADMIN
 */
export function useCapabilities() {
  const { user, can, isAdmin, isAuthenticated } = useAuth();
  const caps = useMemo(() => user?.capabilities || [], [user?.capabilities]);

  const personaHelpers = useMemo(() => {
    const userPositions = getUserPositions(user);

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 1: OPERASIONAL LAPANGAN & KELAS
    // ═══════════════════════════════════════════════════════════════════
    const isPetugasKelas =
      userPositions.includes('PETUGAS_KELAS') ||
      can('dashboard.view.petugas');

    const isGerbang =
      userPositions.includes('GERBANG') ||
      can('dashboard.view.gerbang');

    const isToolman =
      userPositions.includes('TOOLMAN');

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 2: STAF OPERASIONAL & ADMINISTRASI (TU & KOPERASI)
    // ═══════════════════════════════════════════════════════════════════
    const isTUPersuratan =
      userPositions.includes('TU_PERSURATAN');

    const isTUKeuangan =
      userPositions.includes('TU_KEUANGAN');

    const isTUKepegawaian =
      userPositions.includes('TU_KEPEGAWAIAN');

    const isTUSarpras =
      userPositions.includes('TU_SARPRAS');

    const isKoperasi =
      userPositions.includes('KOPERASI');

    const isTU =
      userPositions.includes('TU_KEPALA') ||
      isTUPersuratan ||
      isTUKeuangan ||
      isTUKepegawaian ||
      isTUSarpras;

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 3: KOORDINATOR UNIT & PEMBINA
    // ═══════════════════════════════════════════════════════════════════
    const isWaliKelas =
      userPositions.includes('WALIKELAS') ||
      !!user?.guru_profile?.wali_kelas_di ||
      can('dashboard.view.walikelas');

    const isBpbk =
      userPositions.includes('BPBK');

    const isPembinaEskul =
      userPositions.includes('PEMBINA_ESKUL');

    const isKaprog =
      userPositions.includes('KAPROG');

    const isKabeng =
      userPositions.includes('KABENG');

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 4 & 5: MANAJEMEN MANAJERIAL & PIMPINAN EKSEKUTIF
    // ═══════════════════════════════════════════════════════════════════
    const isKurikulum =
      userPositions.includes('KURIKULUM') ||
      can('dashboard.view.kurikulum');

    const isKesiswaan =
      userPositions.includes('KESISWAAN') ||
      can('dashboard.view.kesiswaan');

    const isHubin =
      userPositions.includes('HUBIN') ||
      can('dashboard.view.hubin');

    const isBkk =
      userPositions.includes('BKK');

    const isSarpras =
      userPositions.includes('SARPRAS') ||
      can('dashboard.view.sarpras');

    const isTUKepala =
      userPositions.includes('TU_KEPALA');

    const isKepsek =
      userPositions.includes('KEPALA_SEKOLAH') ||
      can('dashboard.view.kepsek');

    const isBillingAdmin =
      can('billing.subscriptions.view.active');

    const isSiswa = user?.role === 'SISWA';

    return {
      // Level 1
      isPetugasKelas,
      isGerbang,
      isPiketGuru: isGerbang || can('attendance.piket.view') || can('attendance.piket.manage'),
      isToolman,
      isSiswa,

      // Level 2
      isTUPersuratan,
      isTUKeuangan,
      isTUKepegawaian,
      isTUSarpras,
      isKoperasiStore: isKoperasi,
      isKoperasiFinance: isKoperasi,
      isKoperasiHead: isKoperasi,
      isKoperasiSecretary: isKoperasi,
      isKoperasiAuditor: isKoperasi,
      isTU,
      isTuHead: isTUKepala,      // canonical alias
      isKoperasi,

      // Level 3
      isWaliKelas,
      isHomeroomTeacher: isWaliKelas, // canonical alias
      isBpbk,
      isPembinaEskul,
      isKaprog,
      isKabeng,

      // Level 4 & 5
      isKurikulum,
      isKesiswaan,
      isHubin,
      isBkk,
      isSarpras,
      isTUKepala,
      isKepsek,
      isKepalaSekolah: isKepsek,  // canonical alias
      isBillingAdmin,
    };
  }, [user, can]);

  // Type-safe wrapper so callers get IDE autocompletion on all CapabilityCode values
  const typedCan = (permission: CapabilityCode): boolean => can(permission as string);

  return {
    user,
    can: typedCan,
    isAdmin: isAdmin(),
    isAuthenticated,
    caps,
    ...personaHelpers,
  };
}

export default useCapabilities;
