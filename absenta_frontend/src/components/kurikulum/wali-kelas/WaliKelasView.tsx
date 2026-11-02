import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import WaliKelasList from '../../academic/wali-kelas/WaliKelasList';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { getAcademicStats } from '../../../api/academic-stats.api';
import { Users, School, GraduationCap, Network } from 'lucide-react';
import { AcademicPageLayout } from '../../academic/AcademicPageLayout';
import { SectionCard } from '../../ui';
import { AcademicFilterToolbar, useAcademicFilter } from '../../common/academic-filter';

export interface UniversalWaliKelasViewProps {
  tahunPelajaranId?: string;
  semesterId?: string;
  jurusanId?: string;
  kelasId?: string;
  isModal?: boolean;
  hideLayout?: boolean;
  readOnly?: boolean;
  onClose?: () => void;
}

export const WaliKelasView: React.FC<UniversalWaliKelasViewProps> = React.memo(({
  tahunPelajaranId,
  hideLayout = false,
  isModal = false,
  readOnly = false,
  onClose,
}) => {
  const { can, isKurikulum, isWaliKelas, isAdmin, isAuthenticated } = useCapabilities();
  const authLoading = !isAuthenticated;

  // Academic Filter SSOT saat berdiri sebagai standalone page
  const academicFilter = useAcademicFilter({
    enableTp: !hideLayout,
    initialTpId: tahunPelajaranId,
  });

  const canView = useMemo(
    () => isAdmin || isKurikulum || isWaliKelas || can('academic.homeroom.manage') || can('academic.manage.academic'),
    [isAdmin, isKurikulum, isWaliKelas, can]
  );

  const { data: statsRes, isLoading: isLoadingStats } = useQuery({
    queryKey: ['academic-stats', canView],
    queryFn: () => getAcademicStats(),
    enabled: canView && !hideLayout,
    staleTime: 10 * 60 * 1000,
  });
  const stats = statsRes?.data || null;

  const navigate = useNavigate();

  const academicStats = useMemo(() => [
    { title: "Total Kelas", value: stats?.total_kelas || 0, icon: <School size={14} />, gradient: "from-blue-500 to-cyan-600", onClick: () => navigate('/academic/kelas') },
    { title: "Total Guru", value: stats?.total_guru || 0, icon: <Users size={14} />, gradient: "from-green-500 to-emerald-600", onClick: () => navigate('/academic/guru') },
    { title: "Total Siswa", value: stats?.total_siswa || 0, icon: <GraduationCap size={14} />, gradient: "from-purple-500 to-pink-600", onClick: () => navigate('/academic/siswa') },
    { title: "Pemetaan Wali Kelas", value: "Diagram Struktur", icon: <Network size={14} />, gradient: "from-amber-500 to-orange-600", subtitle: "Gunakan diagram agar pemetaan lebih mudah", onClick: () => navigate('/academic/struktur-organisasi?tab=WALI_KELAS') }
  ], [stats, navigate]);

  const innerContent = (
    <div className="space-y-4">
      {!hideLayout && (
        <AcademicFilterToolbar
          {...academicFilter.toolbarProps}
          variant="plain"
          searchPlaceholder="Cari kelas atau wali kelas..."
        />
      )}
      <SectionCard fullWidth className="p-0 border-none shadow-none bg-transparent">
        <WaliKelasList />
      </SectionCard>
    </div>
  );

  if (hideLayout) {
    return innerContent;
  }

  return (
    <AcademicPageLayout
      title="Penugasan Wali Kelas"
      description="Tentukan guru yang menjadi wali kelas di setiap rombel. Dilakukan setiap awal semester atau tahun ajaran baru."
      canView={canView}
      isLoading={authLoading}
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      hardeningModuleKey="walikelas"
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum/dashboard' },
        { label: 'Wali Kelas' }
      ]}
      instruction={{
        title: "Panduan Wali Kelas",
        description: (
          <div className="space-y-2">
            <p>Menentukan guru penanggung jawab untuk setiap rombongan belajar. Wali kelas memiliki hak otorisasi presensi, catatan siswa, dan penerbitan rapor.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Menugaskan wali kelas di setiap kelas.</p>
              <p><strong>Waktu Penggunaan:</strong> Setiap awal semester atau tahun ajaran baru.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Pilih kelas dan tentukan guru yang bertugas sebagai wali kelas." },
          { text: "Cetak SK Wali Kelas langsung melalui tombol aksi atau generator SK massal." }
        ]
      }}
    >
      {innerContent}
    </AcademicPageLayout>
  );
});

WaliKelasView.displayName = 'WaliKelasView';
export default WaliKelasView;
