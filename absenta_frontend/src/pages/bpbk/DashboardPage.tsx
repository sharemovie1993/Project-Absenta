import React, { useState, useCallback, Suspense, lazy } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { DashboardSection } from './components/DashboardSection';
import { Loader } from '../../components/ui/Loader';

const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SiswaForm = lazy(() => import('../../components/academic/siswa/SiswaForm').then(m => ({ default: m.SiswaForm })));

export default function DashboardPage() {
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
    <AcademicPageLayout
      title="Pusat Kendali Bimbingan Konseling (BP/BK)"
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' }
      ]}
      hardeningModuleKey="bpbk_dashboard"
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
  );
}
