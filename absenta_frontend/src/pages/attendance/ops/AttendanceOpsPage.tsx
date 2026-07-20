import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../hooks/useTenant';
import { Loader, Activity, ShieldCheck, Zap, User, AlertTriangle } from 'lucide-react';
import { SectionCard } from '../../../components/ui';
import { useGerbangModeAndRole } from '../../../hooks/attendance/useGerbangModeAndRole';

import { useAuthStore } from '../../../store/authStore';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';

// Lazy load mode views to reduce initial bundle size
const ModeSimpleView = lazy(() => import('./components/ModeSimpleView'));
const ModeMultiSesiView = lazy(() => import('./components/ModeMultiSesiView'));

export default function AttendanceOpsPage() {
  const { subscription } = useAuthStore();
  const { user, isLoading: authLoading } = useAuth();
  const { tenantId } = useTenant();
  
  // Reuse existing hook for mode and role resolution logic
  const { 
    absensiMode, 
    roleLabel, 
    petugasLabel, 
    petugasVariant, 
    petugasChecked, 
    petugasGuruChecked,
    isPetugasSiswa,
    isPetugasGuru,
    kelasLabel
  } = useGerbangModeAndRole({ user, tenantId });

  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  if (authLoading || absensiMode === null) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // Access Denied Logic
  // SISWA dengan capability PETUGAS_KELAS diizinkan masuk walau isPetugasSiswa belum terkonfirmasi
  const siswaCaps = (user as any)?.capabilities || [];
  const siswaHasPetugasKelasAccess =
    siswaCaps.includes('attendance.sessions.create') ||
    siswaCaps.includes('attendance.sessions.view.list') ||
    siswaCaps.includes('academic.schedules.view.list') ||
    siswaCaps.includes('attendance.schedules.view.list');
  const isSiswaDenied = user?.role?.name === 'SISWA' && petugasChecked && !isPetugasSiswa && !siswaHasPetugasKelasAccess;
  const isGuruDenied = user?.role?.name === 'GURU' && petugasGuruChecked && !isPetugasGuru;

  const sharedProps = {
    user,
    absensiMode,
    isPetugasSiswa,
    isPetugasGuru,
    kelasLabel,
    roleLabel,
    petugasLabel,
    petugasVariant
  };

  const stats = [
    {
      title: "Mode Operasi",
      value: absensiMode === 'SIMPLE' ? "Gerbang" : "Multi Sesi",
      icon: <Zap size={14} />,
      gradient: "from-amber-500 to-orange-600",
      subtitle: "Konfigurasi Tenant"
    },
    {
      title: "Peran Petugas",
      value: roleLabel || "Umum",
      icon: <User size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Akses Terverifikasi"
    }
  ];

  if (isSiswaDenied || isGuruDenied) {
    return (
      <AcademicPageLayout
        title="Akses Terbatas"
        description="Ruang operasional absensi hanya untuk petugas yang ditunjuk."
        hardeningModuleKey="attendanceopspage"
      >
        <div className="flex items-center justify-center py-12">
           <SectionCard className="max-w-xl w-full text-center p-12">
              <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 mx-auto mb-6">
                 <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-4">Akses Ditolak</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed">
                Anda login sebagai <span className="text-rose-600">{user?.role?.name}</span>, tetapi belum ditugaskan sebagai Petugas Absensi/Gerbang.
              </p>
              <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  Silakan hubungi administrator kurikulum atau kesiswaan untuk mendapatkan penugasan agar bisa mulai mencatat kehadiran.
                </p>
              </div>
           </SectionCard>
        </div>
      </AcademicPageLayout>
    );
  }

  const pageContent = (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Suspense fallback={
        <div className="flex justify-center py-40">
          <div className="flex flex-col items-center gap-4">
             <Loader className="animate-spin text-blue-600" size={42} />
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Menyiapkan Ruang Operasional...</p>
          </div>
        </div>
      }>
        {absensiMode === 'SIMPLE' ? (
          <ModeSimpleView {...sharedProps} />
        ) : (
          <ModeMultiSesiView {...sharedProps} />
        )}
      </Suspense>
    </div>
  );

  return (
    <AcademicPageLayout
      title="Operasional Presensi"
      description="Pencatatan kehadiran siswa secara langsung dan realtime."
      hardeningModuleKey="attendanceopspage"
      breadcrumbs={[
        { label: "Presensi", path: "/attendance" },
        { label: "Operasional", path: "/attendance/ops" }
      ]}
      stats={stats}
      instruction={{
        title: "Panduan Operasional",
        description: "Gunakan halaman ini untuk mencatat kehadiran siswa secara langsung.",
        items: [
          { text: "Pastikan koneksi internet stabil untuk sinkronisasi real-time." },
          { text: "Gunakan scanner barcode atau input manual untuk mencatat NIS." },
          { text: "Pilih status kehadiran yang sesuai (Masuk/Pulang/Sesi)." }
        ]
      }}
    >
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Operasional Presensi Realtime"
        description="Kelola pencatatan kehadiran siswa di gerbang atau kelas secara langsung dengan validasi otomatis."
      >
        {pageContent}
      </PremiumFeatureGate>
    </AcademicPageLayout>
  );
}
