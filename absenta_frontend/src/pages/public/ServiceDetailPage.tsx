import React, { lazy, Suspense } from 'react';
import { Loader, SectionCard } from '@/components/ui';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';

const ServiceDetailContent = lazy(() => import('./components/ServiceDetailContent').then(m => ({ default: m.ServiceDetailContent })));

export const ServiceDetailPage: React.FC = React.memo(() => {
  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Detail Layanan"
        description="Informasi spesifikasi paket, fitur unggulan, dan aktivasi langganan modul sekolah."
        hardeningModuleKey="service_detail_page"
        instruction={{
          title: 'Panduan Detail Layanan',
          description: 'Pilih kapasitas siswa dan periode tagihan yang sesuai untuk sekolah Anda.',
          items: [
            { text: 'Pilih kapasitas siswa sesuai dengan kuota sekolah Anda.' },
            { text: 'Pilih siklus penagihan Tahunan untuk diskon biaya operasional.' },
            { text: 'Klik Beli Sekarang untuk melanjutkan ke proses checkout.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center"><Loader size="lg" /></div>}>
            <ServiceDetailContent />
          </Suspense>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default ServiceDetailPage;
