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

      const caps = user?.capabilities || [];
      const isSystemAdmin = ['SUPERADMIN', 'ADMIN'].includes(user.role?.name || '');

      // ── Full Capability Access Guard ──────────────────────────────────────
      // User dengan capability operasional absensi / gerbang / jadwal langsung diizinkan
      const hasPetugasAccess =
        isSystemAdmin ||
        caps.includes('attendance.scan') ||
        caps.includes('dashboard.view.gerbang') ||
        caps.includes('attendance.sessions.create') ||
        caps.includes('attendance.sessions.view.list') ||
        caps.includes('academic.schedules.view.list') ||
        caps.includes('attendance.schedules.view.list') ||
        caps.includes('dashboard.view.kurikulum');

      if (hasPetugasAccess) {
        if (mounted) setIsAllowed(true);
        return;
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
