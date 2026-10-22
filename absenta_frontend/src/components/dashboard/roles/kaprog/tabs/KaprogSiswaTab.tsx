import React from 'react';
import { SiswaView } from '@/components/academic/siswa/SiswaView';
import type { KelasKehadiranItem } from '../types';

export interface KaprogSiswaTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  kelasList?: KelasKehadiranItem[];
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogSiswaTab: React.FC<KaprogSiswaTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  kelasList,
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      <SiswaView
        hideLayout
        jurusanId={jurusanId}
        jurusanNama={jurusanNama}
        tahunPelajaranId={tahunPelajaranId}
        semesterId={semesterId}
      />
    </div>
  );
});

export default KaprogSiswaTab;
