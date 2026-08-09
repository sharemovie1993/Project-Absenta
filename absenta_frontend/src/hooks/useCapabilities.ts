import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { CapabilityCode } from '../types/capabilities';

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
    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 1: OPERASIONAL LAPANGAN & KELAS
    // ═══════════════════════════════════════════════════════════════════
    const isPetugasKelas =
      can('dashboard.view.petugas') ||
      can('attendance.sessions.create') ||
      can('attendance.sessions.update.journal');

    const isGerbang =
      can('dashboard.view.gerbang') ||
      can('attendance.gate.tap.entry') ||
      can('attendance.gate.tap.exit');

    const isToolman =
      can('sarpras.loans.request') &&
      !can('sarpras.inventory.manage');

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 2: STAF OPERASIONAL & ADMINISTRASI (TU & KOPERASI)
    // ═══════════════════════════════════════════════════════════════════
    const isTUPersuratan =
      can('correspondence.inbox.view') ||
      can('correspondence.outbox.manage') ||
      can('correspondence.template.manage');

    const isTUKeuangan =
      can('tu.finance.invoices.view.list') ||
      can('tu.finance.payments.create') ||
      can('tu.finance.reports.view');

    const isTUKepegawaian =
      can('academic.students.send.access.token') ||
      can('academic.students.manage') ||
      can('academic.teachers.manage');

    const isTUSarpras =
      can('sarpras.inventory.view.list') &&
      !can('sarpras.inventory.delete');

    const isKoperasiStore =
      can('cooperative.store.orders.manage') ||
      can('cooperative.store.inventory.manage');

    const isKoperasiFinance =
      can('cooperative.savings.view.list') ||
      can('cooperative.reports.view.financial');

    const isKoperasiHead =
      can('cooperative.loans.approve') ||
      can('cooperative.reports.view.financial');

    const isKoperasiSecretary =
      can('cooperative.members.manage') ||
      can('cooperative.announcements.create');

    const isKoperasiAuditor =
      can('cooperative.settings.view') ||
      can('cooperative.reports.view.financial');

    const isTU =
      isTUPersuratan ||
      isTUKeuangan ||
      isTUKepegawaian ||
      isTUSarpras ||
      can('tu.staff.manage');

    const isKoperasi =
      isKoperasiStore ||
      isKoperasiFinance ||
      isKoperasiHead ||
      isKoperasiSecretary ||
      isKoperasiAuditor;

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 3: KOORDINATOR UNIT & PEMBINA
    // ═══════════════════════════════════════════════════════════════════
    const isWaliKelas =
      can('dashboard.view.walikelas') ||
      can('academic.homeroom.manage') ||
      can('attendance.gate.tap.exit');

    const isBpbk =
      can('bk.counseling.view.sensitive') ||
      can('bk.cases.manage') ||
      can('bk.referrals.manage');

    const isPembinaEskul =
      can('affairs.achievements.create') ||
      can('affairs.achievements.create') ||
      can('attendance.schedules.view.list');

    const isKaprog =
      can('academic.teaching.rekap') ||
      (can('hubin.pkl.manage') && !can('hubin.partners.manage'));

    const isKabeng =
      can('sarpras.inventory.delete') &&
      !can('sarpras.inventory.manage');

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 4 & 5: MANAJEMEN MANAJERIAL & PIMPINAN EKSEKUTIF
    // ═══════════════════════════════════════════════════════════════════
    const isKurikulum =
      can('dashboard.view.kurikulum') ||
      can('academic.manage.academic') ||
      can('curriculum.piket.schedules.manage') ||
      can('academic.schedules.manage');

    const isKesiswaan =
      can('dashboard.view.kesiswaan') ||
      can('affairs.violations.manage') ||
      can('affairs.violations.report') ||
      can('affairs.violation.types.manage');

    const isHubin =
      can('dashboard.view.hubin') ||
      can('hubin.pkl.manage') ||
      can('hubin.partners.manage') ||
      can('hubin.mou.manage');

    const isBkk =
      can('hubin.tracer.view') ||
      can('hubin.bkk.manage');

    const isSarpras =
      can('dashboard.view.sarpras') ||
      can('sarpras.inventory.manage') ||
      can('sarpras.inventory.view.list');

    const isTUKepala =
      can('tu.staff.manage') &&
      can('correspondence.outbox.sign');

    const isKepsek =
      can('dashboard.view.kepsek') ||
      can('correspondence.outbox.sign') ||
      can('curriculum.supervision.manage');

    const isBillingAdmin =
      can('billing.subscriptions.view.active');

    return {
      // Level 1
      isPetugasKelas,
      isGerbang,
      isToolman,

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
