import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import WaliKelasList from '../../components/academic/wali-kelas/WaliKelasList';
import { useAuth } from '../../hooks/useAuth';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { Users, School, GraduationCap, User, Network } from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui';

const WaliKelasPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Permission: Admin handled by layout, but we need it for stats loading
  const canView = useMemo(() => can('academic.homeroom.manage'), [can]);

  const { data: statsRes, isLoading: isLoadingStats } = useQuery({
    queryKey: ['academic-stats', canView, refreshKey],
    queryFn: () => getAcademicStats(),
    enabled: canView,
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

  return (
    <AcademicPageLayout
      title="Penugasan Wali Kelas"
      description="Tentukan guru yang menjadi wali kelas di setiap kelas. Digunakan setiap awal semester atau tahun ajaran baru."
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
            <p>Menentukan guru penanggung jawab untuk setiap kelas. Wali kelas memiliki hak khusus untuk memeriksa dan menyetujui kehadiran siswanya.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Menugaskan wali kelas di setiap kelas.</p>
              <p><strong>Waktu Penggunaan:</strong> Setiap awal semester atau tahun ajaran baru.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Satu guru hanya boleh menjadi wali kelas di satu kelas aktif." },
          { text: "Wali kelas memiliki akses khusus untuk memverifikasi absensi harian siswa." },
          { text: "Gunakan tombol 'Nonaktifkan' jika guru sudah tidak menjabat di periode ini." }
        ]
      }}
    >
      <div className="space-y-6">
        <SectionCard
          fullWidth
          noPadding
        >
          <WaliKelasList refreshTrigger={refreshKey} />
        </SectionCard>
      </div>
    </AcademicPageLayout>
  );
};

export default WaliKelasPage;

