import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { WorkspaceAppLauncherCard } from '../../components/common/WorkspaceAppLauncherCard';
import { DashboardSection } from './components/DashboardSection';
import { Loader } from '../../components/ui/Loader';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { useCapabilities } from '../../hooks/useCapabilities';

const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SiswaForm = lazy(() => import('../../components/academic/siswa/SiswaForm').then(m => ({ default: m.SiswaForm })));

export default React.memo(function DashboardPage() {
  const { isBpbk, isAdmin, can } = useCapabilities();
  const [selectedSiswaId, setSelectedSiswaId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const viewSiswaDetail = useCallback((id: string) => {
    setSelectedSiswaId(id);
    setIsDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
  }, []);

  const handleDetailSuccess = useCallback(() => {
    setIsDetailOpen(false);
    window.location.reload();
  }, []);

  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Bimbingan Konseling (BP/BK)"
      description="Layanan Bimbingan Konseling terpadu sekolah untuk mengelola data kasus siswa, konseling klinis, pemanggilan orang tua, home visit, asesmen/angket, dan Early Warning System (EWS)."
    >
      <AcademicPageLayout
        title="Pusat Kendali Bimbingan Konseling (BP/BK)"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' }
        ]}
        hardeningModuleKey="bpbk_dashboard"
        topSlot={<WorkspaceAppLauncherCard workspaceId="BPBK_WORKSPACE" />}
        toolbar={
          <Link
            to="/bpbk/konseling"
            className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-violet-600/20 transition-all cursor-pointer select-none"
          >
            <span>Buka Ruang Kerja</span>
            <span style={{fontSize: '14px'}}>→</span>
          </Link>
        }
        instruction={{
          title: "Panduan Dashboard BPBK",
          description: "Halaman ini menampilkan ringkasan data kasus, konseling aktif, dan tindak lanjut terbaru.",
          items: [
            { text: "Dashboard menampilkan statistik kasus terbuka, selesai, dan rujukan." },
            { text: "Gunakan menu sidebar untuk mengelola siswa kasus, layanan konseling, pemanggilan, dan home visit." }
          ]
        }}
      >
        <div className="w-full min-w-0">
          <DashboardSection onViewSiswaDetail={viewSiswaDetail} onViewSiswa={() => window.location.href = '/bpbk/siswa'} />
        </div>

        <Suspense fallback={null}>
          <Modal isOpen={isDetailOpen} onClose={handleCloseDetail} title="Profil Lengkap & Linimasa Siswa" size="4xl">
            <Suspense fallback={<div className="p-12 flex justify-center"><Loader /></div>}>
              {selectedSiswaId && (
                <SiswaForm
                  siswaId={selectedSiswaId}
                  mode="view"
                  onSuccess={handleDetailSuccess}
                  onCancel={handleCloseDetail}
                />
              )}
            </Suspense>
          </Modal>
        </Suspense>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
