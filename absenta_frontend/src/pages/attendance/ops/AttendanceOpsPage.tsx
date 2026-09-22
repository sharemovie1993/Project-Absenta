import React, { useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { useTenant } from '../../../hooks/useTenant';
import { Loader } from 'lucide-react';
import { useGerbangModeAndRole } from '../../../hooks/attendance/useGerbangModeAndRole';
import { useAuthStore } from '../../../store/authStore';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '@/components/ui';

// Lazy Loaded View Modes (Pilar 13)
const ModeSimpleView = lazy(() => import('./components/ModeSimpleView'));
const ModeMultiSesiView = lazy(() => import('./components/ModeMultiSesiView'));
const AuditModeOpsView = lazy(() => import('./components/AuditModeOpsView').then(m => ({ default: m.AuditModeOpsView })));
const CatatPelanggaranModal = lazy(() => import('../../../components/kesiswaan/modals/CatatPelanggaranModal').then(m => ({ default: m.CatatPelanggaranModal })));
const TindakMasalPelanggaranModal = lazy(() => import('../../../components/kesiswaan/modals/TindakMasalPelanggaranModal').then(m => ({ default: m.TindakMasalPelanggaranModal })));
import { useGerbangAuditMode } from '../../../hooks/attendance/useGerbangAuditMode';

export const AttendanceOpsPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tenantId } = useTenant();

  const [selectedKelasId] = useState<string>('');
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

  const { isAdmin, isTeacher, can } = useCapabilities();
  const isPetugasClassOrAdmin = 
    isAdmin || 
    isTeacher || 
    isPetugasSiswaHook || 
    petugasLabel === 'Aktif' ||
    can('attendance.gate.tap.exit') || 
    can('attendance.sessions.create') ||
    can('attendance.scan');

  const { isAuditMode, auditReason } = useGerbangAuditMode();

  // Shared Props
  const sharedProps = {
    user,
    absensiMode,
    isPetugasSiswa: isPetugasClassOrAdmin,
    isPetugasGuru: isTeacher || can('attendance.sessions.view.list') || isPetugasGuruHook,
    kelasLabel: kelasNama,
    roleLabel,
    petugasLabel,
    petugasVariant,
    managedKelasIds,
  };

  const breadcrumbs = React.useMemo(() => [
    { label: 'Presensi & Kehadiran' },
    { label: 'Ruang Operasional' }
  ], []);

  const instruction = React.useMemo(() => ({
    title: isAuditMode ? "Panduan Audit Keamanan Gerbang" : "Panduan Operasional Presensi",
    description: isAuditMode
      ? "Terminal gerbang saat ini berjalan dalam Mode Audit Keamanan (Hari Non-Sekolah). Akses dicatat sebagai log keamanan."
      : "Gunakan halaman ini untuk mencatat kehadiran siswa secara langsung di gerbang atau ruang KBM.",
    items: isAuditMode ? [
      { text: "Tempelkan kartu RFID siswa/guru untuk mencatat akses masuk atau keluar." },
      { text: "Gunakan tombol Catat Tamu untuk pengunjung eksternal." },
      { text: "Tap di hari libur tidak memengaruhi rekap absensi harian KBM." }
    ] : [
      { text: "Pastikan koneksi internet terhubung untuk sinkronisasi real-time." },
      { text: "Gunakan scanner barcode / QR atau tap kartu RFID siswa." },
      { text: "Gunakan tombol Tindak Masal untuk konfirmasi pembinaan siswa terlambat." }
    ]
  }), [isAuditMode]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title={isAuditMode ? "Audit Keamanan Gerbang" : "Operasional Presensi"}
        description={isAuditMode ? "Terminal Akses Hari Libur & Pencatatan Tamu" : "Pencatatan Kehadiran Realtime & POS Scanner"}
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="attendance_ops"
      >
        <PremiumFeatureGate
          moduleName="ABSENSI"
          featureName="Operasional Presensi Realtime"
          description="Kelola pencatatan kehadiran siswa di gerbang atau kelas secara langsung dengan validasi otomatis."
        >
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full min-w-0 max-w-full">
              <Suspense fallback={
                <div className="flex justify-center py-40">
                  <div className="flex flex-col items-center gap-4">
                     <Loader className="animate-spin text-indigo-600" size={42} />
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Menyiapkan Ruang Operasional...</p>
                  </div>
                </div>
              }>
                {isAuditMode ? (
                  <AuditModeOpsView reason={auditReason} user={user} />
                ) : absensiMode === 'SIMPLE' ? (
                  <ModeSimpleView {...sharedProps} />
                ) : (
                  <ModeMultiSesiView {...sharedProps} />
                )}
              </Suspense>
            </div>
          </SectionCard>

          {/* Modal Catat Pelanggaran Kilat */}
          {catatModalOpen && (
            <Suspense fallback={null}>
              <CatatPelanggaranModal
                isOpen={catatModalOpen}
                onClose={() => setCatatModalOpen(false)}
              />
            </Suspense>
          )}

          {/* Modal Tindak Masal Pelanggaran */}
          {tindakMasalModalOpen && (
            <Suspense fallback={null}>
              <TindakMasalPelanggaranModal
                isOpen={tindakMasalModalOpen}
                onClose={() => setTindakMasalModalOpen(false)}
              />
            </Suspense>
          )}
        </PremiumFeatureGate>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default AttendanceOpsPage;
