import { useMemo } from 'react';
import { useAuth } from './useAuth';

/**
 * 🛡️ Centralized Capability & Persona Helper Hook (DRY Single Source of Truth)
 * Mengabaikan string role hardcoded dan mengkonsumsi pre-computed capabilities hasil evaluasi Backend Piramida.
 */
export function useCapabilities() {
  const { user, can, isAdmin, isAuthenticated } = useAuth();
  const caps = useMemo(() => user?.capabilities || [], [user?.capabilities]);

  const personaHelpers = useMemo(() => {
    const isKesiswaan =
      can('dashboard.view.kesiswaan') ||
      can('affairs.violations.manage') ||
      can('affairs.violations.report') ||
      can('affairs.violation.types.manage');

    const isKurikulum =
      can('dashboard.view.kurikulum') ||
      can('academic.manage.academic') ||
      can('curriculum.piket.schedules.manage') ||
      can('academic.schedules.manage');

    const isSarpras =
      can('dashboard.view.sarpras') ||
      can('sarpras.inventory.manage') ||
      can('sarpras.inventory.view.list');

    const isHubin =
      can('dashboard.view.hubin') ||
      can('hubin.pkl.manage') ||
      can('hubin.partners.manage') ||
      can('hubin.mou.manage');

    const isKepsek =
      can('dashboard.view.kepsek') ||
      can('correspondence.outbox.sign') ||
      can('academic.supervision.manage');

    const isWaliKelas =
      can('dashboard.view.walikelas') ||
      can('academic.homeroom.manage') ||
      can('attendance.markGateAbsence');

    const isBpbk =
      can('bk.counseling.view.sensitive') ||
      can('bk.cases.manage') ||
      can('bk.referrals.manage');

    const isBkk =
      can('hubin.tracer.view') ||
      can('hubin.bkk.manage');

    const isGerbang =
      can('dashboard.view.gerbang') ||
      can('attendance.gate.scan') ||
      can('attendance.markGateAbsence');

    const isTU =
      can('tu.staff.manage') ||
      can('correspondence.inbox.view') ||
      can('tu.finance.invoices.view') ||
      can('correspondence.outbox.manage');

    const isToolman =
      can('sarpras.loans.request') &&
      !can('sarpras.inventory.manage');

    const isKaprog =
      can('academic.teaching.rekap') ||
      (can('hubin.pkl.manage') && !can('hubin.partners.manage'));

    const isKabeng =
      can('sarpras.inventory.delete') &&
      !can('sarpras.inventory.manage');

    const isBillingAdmin =
      can('billing.subscriptions.select.plan') ||
      can('billing.subscriptions.view.active');

    return {
      isKesiswaan,
      isKurikulum,
      isSarpras,
      isHubin,
      isKepsek,
      isWaliKelas,
      isBpbk,
      isBkk,
      isGerbang,
      isTU,
      isToolman,
      isKaprog,
      isKabeng,
      isBillingAdmin,
    };
  }, [can]);

  return {
    user,
    can,
    isAdmin: isAdmin(),
    isAuthenticated,
    caps,
    ...personaHelpers,
  };
}

export default useCapabilities;
