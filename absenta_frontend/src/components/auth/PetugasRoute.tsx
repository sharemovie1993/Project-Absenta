import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { isPetugasActive } from '../../api/attendanceGerbang.api';
import { Loader } from '../ui/Loader';

export const PetugasRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    
    // Wait for auth loading to complete
    if (isLoading) return;

    async function check() {
      if (!isAuthenticated || !user) {
        if (mounted) setIsAllowed(false);
        return;
      }

      // Admin/Superadmin always allowed
      if (['SUPERADMIN', 'ADMIN'].includes(user.role?.name || '')) {
        if (mounted) setIsAllowed(true);
        return;
      }

      // Allow GURU if has specific monitoring or attendance capabilities
      if (user.role?.name === 'GURU') {
        const hasScanCap = user?.capabilities?.includes('attendance.scan') ?? false;
        const hasGerbangCap = user?.capabilities?.includes('dashboard.view.gerbang') ?? false;
        const hasMonitoringCap = user?.capabilities?.includes('attendance.sessions.view.list') ?? false;
        const hasKurikulumCap = user?.capabilities?.includes('dashboard.view.kurikulum') ?? false;
        
        if (mounted) setIsAllowed(hasScanCap || hasGerbangCap || hasMonitoringCap || hasKurikulumCap);
        return;
      }

      // ── SISWA PETUGAS_KELAS: shortcut via capabilities ──────────────────────
      // Jika user SISWA sudah memiliki capability operasional absensi di capabilities array
      // (dikirim dari server saat login), langsung izinkan tanpa API call tambahan.
      // Ini mencegah redirect ke dashboard akibat race condition atau API error.
      if (user.role?.name === 'SISWA') {
        const caps = user?.capabilities || [];
        const hasPetugasKelasAccess =
          caps.includes('attendance.sessions.create') ||
          caps.includes('attendance.sessions.view.list') ||
          caps.includes('attendance.schedules.view.list');

        if (hasPetugasKelasAccess) {
          if (mounted) setIsAllowed(true);
          return;
        }
      }

      // Fallback: Check Petugas status via API (Siswa tanpa capability di token)
      try {
        const res = await isPetugasActive();
        if (mounted) setIsAllowed(!!res?.data?.active);
      } catch (e) {
        if (mounted) setIsAllowed(false);
      }
    }
    check();
    return () => { mounted = false; };
  }, [isAuthenticated, user]);

  if (isLoading || isAllowed === null) {
    return <div className="flex justify-center p-10"><Loader /></div>;
  }

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
