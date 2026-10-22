import React from 'react';
import { PrestasiView } from '@/components/kesiswaan/prestasi';

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
  return (
    <div className="w-full max-w-full">
      <PrestasiView
        jurusanId={jurusanId}
        jurusanNama={jurusanNama}
        tahunPelajaranId={tahunPelajaranId}
        tahunAjaran={tahunAjaran}
        semesterId={semesterId}
        hideLayout={true}
      />
    </div>
  );
});

KaprogPrestasiTab.displayName = 'KaprogPrestasiTab';
