import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';

// Code-splitting heavy universal view to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const PrestasiView = lazy(() =>
  import('@/components/kesiswaan/prestasi').then((m) => ({ default: m.PrestasiView }))
);

export interface KaprogPrestasiTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  semesterId?: string;
}

export const KaprogPrestasiTab: React.FC<KaprogPrestasiTabProps> = React.memo(({
  jurusanId,
  jurusanNama,
  tahunPelajaranId,
  tahunAjaran,
  semesterId,
}) => {
  const safeJurusanId = jurusanId && jurusanId !== 'jurusan-default' ? jurusanId : undefined;

  return (
    <div className="w-full max-w-full">
      <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
        <PrestasiView
          jurusanId={safeJurusanId}
          jurusanNama={safeJurusanId ? jurusanNama : undefined}
          tahunPelajaranId={tahunPelajaranId}
          tahunAjaran={tahunAjaran}
          semesterId={semesterId}
          hideLayout={true}
        />
      </Suspense>
    </div>
  );
});

KaprogPrestasiTab.displayName = 'KaprogPrestasiTab';
