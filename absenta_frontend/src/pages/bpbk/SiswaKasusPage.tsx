import React, { useState, useCallback, Suspense, lazy } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SiswaKasusSection } from './components/SiswaKasusSection';
import { Loader } from '../../components/ui/Loader';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';

const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SiswaForm = lazy(() => import('../../components/academic/siswa/SiswaForm').then(m => ({ default: m.SiswaForm })));

export default function SiswaKasusPage() {
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
      featureName="Data Kasus Siswa"
      description="Kelola data kasus siswa, riwayat pembinaan, akumulasi poin pelanggaran, dan linimasa konseling secara komprehensif."
    >
      <AcademicPageLayout
        title="Data Kasus Siswa BP/BK"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' },
          { label: 'Data Kasus Siswa', path: '/bpbk/siswa' }
        ]}
        hardeningModuleKey="bpbk_siswa_kasus"
        instruction={{
          title: "Panduan Data Kasus Siswa",
          description: "Halaman ini menampilkan profil siswa beserta akumulasi poin dan riwayat pembinaan secara detail.",
          items: [
            { text: "Cari siswa menggunakan nama atau NIS untuk memantau riwayat kasus mereka secara komprehensif." },
            { text: "Klik ikon detail pada siswa untuk membuka dialog profil lengkap dan garis waktu konseling." }
          ]
        }}
      >
        <div className="w-full min-w-0">
          <SiswaKasusSection onViewSiswaDetail={viewSiswaDetail} />
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
}
