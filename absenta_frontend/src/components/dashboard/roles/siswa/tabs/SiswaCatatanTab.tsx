import React from 'react';
import { SiswaPointsTab } from '@/components/academic/siswa/dashboard/SiswaPointsTab';

export interface SiswaCatatanTabProps {
  bukuCatatanList: any[];
  catatanFilter: 'semua' | 'prestasi' | 'pelanggaran';
  setCatatanFilter: (val: 'semua' | 'prestasi' | 'pelanggaran') => void;
  filteredBukuCatatan: any[];
  totalPoinPrestasi: number;
  totalPoinPelanggaran: number;
  netPoin: number;
}

export const SiswaCatatanTab: React.FC<SiswaCatatanTabProps> = ({
  bukuCatatanList,
  catatanFilter,
  setCatatanFilter,
  filteredBukuCatatan,
  totalPoinPrestasi,
  totalPoinPelanggaran,
  netPoin,
}) => {
  return (
    <div className="space-y-4">
      <SiswaPointsTab
        bukuCatatanList={bukuCatatanList}
        catatanFilter={catatanFilter}
        setCatatanFilter={setCatatanFilter}
        filteredBukuCatatan={filteredBukuCatatan}
        totalPoinPrestasi={totalPoinPrestasi}
        totalPoinPelanggaran={totalPoinPelanggaran}
        netPoin={netPoin}
      />
    </div>
  );
};
