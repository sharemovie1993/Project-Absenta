import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';

import { Button } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import {
  TrackingSiswaView,
  type UniversalTrackingSiswaViewProps,
} from '../../components/attendance/tracking/TrackingSiswaView';
import {
  TrackingSiswaModal,
  type TrackingSiswaModalProps,
} from '../../components/attendance/tracking/TrackingSiswaModal';

export {
  TrackingSiswaView,
  TrackingSiswaModal,
  type UniversalTrackingSiswaViewProps,
  type TrackingSiswaModalProps,
};

// ─── Skema Validasi Zod — Google Platform Standards (Pilar 25) ────────────────
const trackingSearchSchema = z.object({
  siswaId: z.string().min(1, 'Siswa wajib dipilih terlebih dahulu'),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)'),
});

const instructionData = {
  title: 'Panduan Tracking Siswa',
  description: 'Lacak kehadiran dan aktivitas log siswa pada hari tertentu.',
  items: [
    { text: 'Pilih siswa dan masukkan tanggal untuk melacak aktivitas.' },
    { text: 'Log aktivitas akan diurutkan secara kronologis berdasarkan waktu pencatatan.' },
  ],
};

export const TrackingSiswaContent = TrackingSiswaView;

export const TrackingSiswaPage: React.FC<UniversalTrackingSiswaViewProps> = React.memo((props) => {
  const navigate = useNavigate();
  const { subscription } = useAuthStore();
  const { can } = useCapabilities();

  const canView = useMemo(() => can('attendance.reports.view'), [can]);
  const subFeatures =
    (subscription as unknown as Record<string, unknown>)?.features ||
    subscription?.Plan?.features_json ||
    subscription?.plan?.features_json ||
    [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="ABSENSI"
      featureName="Tracking Aktivitas Siswa"
      description="Dapatkan laporan jejak aktivitas siswa secara kronologis, mulai dari gerbang kedatangan hingga setiap sesi pelajaran yang diikuti."
    >
      <AcademicPageLayout
        title="Tracking Aktivitas Siswa"
        description="Lihat jejak kehadiran dan aktivitas siswa secara kronologis."
        instruction={instructionData}
        hardeningModuleKey="trackingsiswapage"
        canView={canView}
        breadcrumbs={[
          { label: 'Presensi', path: '/attendance/rekap' },
          { label: 'Tracking Aktivitas Siswa', active: true },
        ]}
        toolbar={
          <Button
            variant="toolbarOutline"
            onClick={() => navigate('/attendance/rekap')}
            size="toolbar"
            className="rounded-xl border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-widest h-10 px-4 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Kembali ke Rekap
          </Button>
        }
      >
        <TrackingSiswaView {...props} hideLayout={true} hideHeader={true} />
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

TrackingSiswaPage.displayName = 'TrackingSiswaPage';
export default TrackingSiswaPage;
