import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import WaliKelasList from '../../components/academic/wali-kelas/WaliKelasList';
import { useAuth } from '../../hooks/useAuth';
import { getAcademicStats } from '../../api/academic-stats.api';
import { Users, School, GraduationCap, User } from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui';

const WaliKelasPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Permission: Admin handled by layout, but we need it for stats loading
  const canView = useMemo(() => can('academic.homeroom.manage'), [can]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoadingStats(true);
        const response = await getAcademicStats();
        setStats(response.data);
      } catch (error) { console.error('Failed to load stats:', error); }
      finally { setIsLoadingStats(false); }
    };
    if (canView) loadStats();
  }, [refreshKey, canView]);

  const navigate = useNavigate();

  const academicStats = useMemo(() => [
    { title: "Total Kelas", value: stats?.total_kelas || 0, icon: <School size={14} />, gradient: "from-blue-500 to-cyan-600", onClick: () => navigate('/academic/kelas') },
    { title: "Total Guru", value: stats?.total_guru || 0, icon: <Users size={14} />, gradient: "from-green-500 to-emerald-600", onClick: () => navigate('/academic/guru') },
    { title: "Total Siswa", value: stats?.total_siswa || 0, icon: <GraduationCap size={14} />, gradient: "from-purple-500 to-pink-600", onClick: () => navigate('/academic/siswa') }
  ], [stats, navigate]);

  return (
    <AcademicPageLayout
      title="Penugasan Wali Kelas"
      description="Pemetaan tanggung jawab wali dan pembinaan untuk setiap rombongan belajar aktif."
      canView={canView}
      isLoading={authLoading}
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      instruction={{
        title: "Panduan Wali Kelas",
        description: "Wali kelas bertanggung jawab atas administrasi dan pemantauan siswa di satu kelas tertentu.",
        items: [
          { text: "Satu guru hanya boleh menjadi wali kelas di satu kelas aktif." },
          { text: "Wali kelas memiliki akses khusus untuk memverifikasi absensi harian siswa." },
          { text: "Gunakan tombol 'Nonaktifkan' jika guru sudah tidak menjabat di periode ini." }
        ]
      }}
    >
      <div className="space-y-6">
        <SectionCard
          title="Daftar Penugasan Wali Kelas"
          icon={User}
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

