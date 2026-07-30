import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../hooks/useTenant';
import { Loader, Activity, ShieldCheck, Zap, User, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { SectionCard } from '../../../components/ui';
import { useGerbangModeAndRole } from '../../../hooks/attendance/useGerbangModeAndRole';

import { useAuthStore } from '../../../store/authStore';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';
import { OperationalPageLayout } from '../../../components/layout/OperationalPageLayout';
import { Button } from '../../../components/ui/Button';

// Lazy load mode views to reduce initial bundle size
const ModeSimpleView = lazy(() => import('./components/ModeSimpleView'));
const ModeMultiSesiView = lazy(() => import('./components/ModeMultiSesiView'));
const CatatPelanggaranModal = lazy(() => import('../../../components/kesiswaan/modals/CatatPelanggaranModal').then(m => ({ default: m.CatatPelanggaranModal })));
const TindakMasalPelanggaranModal = lazy(() => import('../../../components/kesiswaan/modals/TindakMasalPelanggaranModal').then(m => ({ default: m.TindakMasalPelanggaranModal })));

export default function AttendanceOpsPage() {
  const { subscription } = useAuthStore();
  const { user } = useAuth();
  const { tenantId } = useTenant();

  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [catatModalOpen, setCatatModalOpen] = useState(false);
  const [tindakMasalModalOpen, setTindakMasalModalOpen] = useState(false);
  
  const {
    absensiMode,
    petugasVariant,
    petugasLabel,
    roleLabel,
    kelasNama,
    managedKelasIds
  } = useGerbangModeAndRole({ user, tenantId, selectedKelasId });

interface AuthUserCaps {
  capabilities?: string[];
  role?: { name?: string };
}

  // Shared Props
  const sharedProps = {
    user,
    absensiMode,
    isPetugasSiswa: petugasLabel === 'Petugas Absensi Kelas' || petugasLabel === 'GURU' || petugasLabel === 'Admin',
    isPetugasGuru: user?.role?.name === 'GURU' || (user as AuthUserCaps | null)?.capabilities?.includes('attendance.sessions.view.list'),
    kelasLabel: kelasNama,
    roleLabel,
    petugasLabel,
    petugasVariant,
    managedKelasIds,
  };

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
    <OperationalPageLayout
      title="OPERASIONAL PRESENSI"
      shortTitle="OPERASIONAL"
      subtitle="Pencatatan Kehadiran Realtime & POS Scanner"
      backPath="/dashboard"
      backLabel="Kembali ke Dashboard"
      actions={
        <div className="flex gap-2 items-center">
          <Button 
            onClick={() => setTindakMasalModalOpen(true)}
            variant="outline"
            className="rounded-lg h-8 px-3 font-bold text-xs border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={14} /> ⚡ Tindak Masal
          </Button>
          <Button 
            onClick={() => setCatatModalOpen(true)}
            variant="default"
            className="rounded-lg h-8 px-3 font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white hidden sm:inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> ⚡ Catat Pelanggaran
          </Button>
        </div>
      }
      instruction={{
        title: "Panduan Operasional Presensi",
        description: "Gunakan halaman ini untuk mencatat kehadiran siswa secara langsung di gerbang.",
        items: [
          { text: "Pastikan koneksi internet terhubung untuk sinkronisasi real-time." },
          { text: "Gunakan scanner barcode / QR atau tap kartu RFID siswa." },
          { text: "Gunakan tombol Tindak Masal untuk konfirmasi pembinaan siswa terlambat." }
        ]
      }}
      hardeningModuleKey="attendance_ops"
    >
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Operasional Presensi Realtime"
        description="Kelola pencatatan kehadiran siswa di gerbang atau kelas secara langsung dengan validasi otomatis."
      >
        {pageContent}

        {/* Modal Catat Pelanggaran Kilat */}
        <Suspense fallback={null}>
          <CatatPelanggaranModal
            isOpen={catatModalOpen}
            onClose={() => setCatatModalOpen(false)}
          />
        </Suspense>

        {/* Modal Tindak Masal Pelanggaran */}
        <Suspense fallback={null}>
          <TindakMasalPelanggaranModal
            isOpen={tindakMasalModalOpen}
            onClose={() => setTindakMasalModalOpen(false)}
          />
        </Suspense>
      </PremiumFeatureGate>
    </OperationalPageLayout>
  );
}
