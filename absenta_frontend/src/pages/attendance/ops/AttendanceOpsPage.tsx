import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../hooks/useTenant';
import { Loader, Activity, ShieldCheck, Zap, User, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { SectionCard } from '../../../components/ui';
import { useGerbangModeAndRole } from '../../../hooks/attendance/useGerbangModeAndRole';

import { useAuthStore } from '../../../store/authStore';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';
import { OperationalPageLayout } from '../../../components/layout/OperationalPageLayout';
import { Button } from '../../../components/ui/Button';

import ModeSimpleView from './components/ModeSimpleView';
import ModeMultiSesiView from './components/ModeMultiSesiView';
const CatatPelanggaranModal = lazy(() => import('../../../components/kesiswaan/modals/CatatPelanggaranModal').then(m => ({ default: m.CatatPelanggaranModal })));
const TindakMasalPelanggaranModal = lazy(() => import('../../../components/kesiswaan/modals/TindakMasalPelanggaranModal').then(m => ({ default: m.TindakMasalPelanggaranModal })));

export default React.memo(function AttendanceOpsPage() {
  const navigate = useNavigate();
  const { subscription } = useAuthStore();
  const { user } = useAuth();
  const { tenantId } = useTenant();

  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [catatModalOpen, setCatatModalOpen] = useState(false);
  const [tindakMasalModalOpen, setTindakMasalModalOpen] = useState(false);
  
  const {
    absensiMode,
    isPetugasSiswa: isPetugasSiswaHook,
    isPetugasGuru: isPetugasGuruHook,
    petugasVariant,
    petugasLabel,
    roleLabel,
    kelasNama,
    managedKelasIds
  } = useGerbangModeAndRole({ user, tenantId, selectedKelasId });

  const roleName = user?.role?.name || '';
  const caps = (user as any)?.capabilities || [];
  const isPetugasClassOrAdmin = 
    roleName === 'ADMIN' || 
    roleName === 'SUPERADMIN' || 
    roleName === 'GURU' || 
    isPetugasSiswaHook || 
    petugasLabel === 'Aktif' ||
    caps.includes('attendance.markGateAbsence') || 
    caps.includes('attendance.sessions.create') ||
    caps.includes('attendance.scan');

  // Shared Props
  const sharedProps = {
    user,
    absensiMode,
    isPetugasSiswa: isPetugasClassOrAdmin,
    isPetugasGuru: roleName === 'GURU' || caps.includes('attendance.sessions.view.list') || isPetugasGuruHook,
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
});
