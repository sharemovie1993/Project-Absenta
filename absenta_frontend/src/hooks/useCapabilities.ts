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
      userPositions.includes('TU_PERSURATAN') ||
      can('correspondence.outbox.manage') ||
      can('correspondence.template.manage');

    const isTUKeuangan =
      userPositions.includes('TU_KEUANGAN') ||
      can('tu.finance.invoices.view.list') ||
      can('tu.finance.payments.create');

    const isTUKepegawaian =
      userPositions.includes('TU_KEPEGAWAIAN') ||
      can('academic.teachers.manage') ||
      can('academic.students.send.access.token');

    const isTUSarpras =
      userPositions.includes('TU_SARPRAS');

    const isKoperasiStore =
      can('cooperative.store.orders.manage') ||
      can('cooperative.store.inventory.manage');

    const isKoperasiFinance =
      can('cooperative.loans.approve') ||
      can('cooperative.reports.view.financial');

    const isKoperasiHead =
      can('cooperative.loans.approve');

    const isKoperasiSecretary =
      can('cooperative.members.manage');

    const isKoperasiAuditor =
      can('cooperative.settings.view');

    const isTU =
      userPositions.includes('TU_KEPALA') ||
      isTUPersuratan ||
      isTUKeuangan ||
      isTUKepegawaian ||
      isTUSarpras ||
      can('tu.staff.manage');

    const isKoperasi =
      userPositions.includes('KOPERASI') ||
      isKoperasiStore ||
      isKoperasiFinance ||
      isKoperasiHead ||
      isKoperasiSecretary ||
      isKoperasiAuditor;

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 3: KOORDINATOR UNIT & PEMBINA
    // ═══════════════════════════════════════════════════════════════════
    const isWaliKelas =
      userPositions.includes('WALIKELAS') ||
      !!user?.guru_profile?.wali_kelas_di ||
      can('dashboard.view.walikelas');

    const isBpbk =
      userPositions.includes('BPBK') ||
      can('bk.counseling.view.sensitive') ||
      can('bk.cases.manage');

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
      can('dashboard.view.kurikulum') ||
      can('academic.manage.academic');

    const isKesiswaan =
      userPositions.includes('KESISWAAN') ||
      can('dashboard.view.kesiswaan') ||
      can('affairs.violations.manage');

    const isHubin =
      userPositions.includes('HUBIN') ||
      can('dashboard.view.hubin') ||
      can('hubin.partners.manage') ||
      can('hubin.mou.manage');

    const isBkk =
      userPositions.includes('BKK') ||
      can('hubin.bkk.manage');

    const isSarpras =
      userPositions.includes('SARPRAS') ||
      can('dashboard.view.sarpras') ||
      can('sarpras.inventory.manage');

    const isTUKepala =
      userPositions.includes('TU_KEPALA') ||
      (can('tu.staff.manage') && can('correspondence.outbox.sign'));

    const isKepsek =
      userPositions.includes('KEPALA_SEKOLAH') ||
      can('dashboard.view.kepsek') ||
      can('curriculum.supervision.manage');

    const isBillingAdmin =
      can('billing.subscriptions.view.active');

    const isSiswa = user?.role === 'SISWA';

    return {
      // Level 1
      isPetugasKelas,
      isGerbang,
      isToolman,
      isSiswa,

      // Level 2
      isTUPersuratan,
      isTUKeuangan,
      isTUKepegawaian,
      isTUSarpras,
      isKoperasiStore,
      isKoperasiFinance,
      isKoperasiHead,
      isKoperasiSecretary,
      isKoperasiAuditor,
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
  }, [can]);

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
