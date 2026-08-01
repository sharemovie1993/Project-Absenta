/**
 * dashboardModeHelper.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * HELPER RESOLUSI SMART DEFAULT DASHBOARD MODE (HYBRID CONTEXT-AWARE)
 *
 * Aturan Resolusi Mode Dashboard:
 * 1. Jika pengguna sudah pernah manual toggle (tersimpan di localStorage),
 *    pilihan manual pengguna tetep menjadi PRIORITAS UTAMA (User Override).
 * 2. Jika belum pernah manual toggle (sesi awal/fresh):
 *    - Role SISWA ➔ Default Mode Portal Apps 📱 (Mobile & Desktop)
 *    - Role GURU/STAF di Mobile & Tablet (< 1024px) ➔ Default Mode Portal Apps 📱
 *    - Role GURU/STAF di Laptop & Desktop (>= 1024px) ➔ Default Mode Desktop 🖥️
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type DashboardModeType = 'portal' | 'desktop';

export const resolveSmartDashboardMode = (user: any): DashboardModeType => {
  if (typeof window === 'undefined') return 'portal';

  // 1. User Manual Override Check (localStorage)
  const savedMode = localStorage.getItem('absenta_dashboard_mode') as DashboardModeType | null;
  if (savedMode === 'portal' || savedMode === 'desktop') {
    return savedMode;
  }

  // 2. Hybrid Context-Aware Smart Default
  const roleName = String(user?.role?.name || '').toUpperCase();
  const isSiswa = roleName === 'SISWA';
  const isMobileOrTablet = window.innerWidth < 1024;

  if (isSiswa) {
    return 'portal';
  }

  if (isMobileOrTablet) {
    return 'portal';
  }

  return 'desktop';
};

export const setManualDashboardMode = (newMode: DashboardModeType) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('absenta_dashboard_mode', newMode);
    window.dispatchEvent(new CustomEvent('absenta-dashboard-mode-change', { detail: newMode }));
  }
};
