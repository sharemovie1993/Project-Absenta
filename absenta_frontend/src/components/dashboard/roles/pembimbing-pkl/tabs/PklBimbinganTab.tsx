import React from 'react';
import { PenempatanPklView } from '@/components/hubin/penempatan/PenempatanPklView';

export interface PklBimbinganTabProps {
  guruId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  siswaList?: any[];
  onOpenSiswaDetail?: (siswa: any) => void;
  onOpenKunjunganModal?: (siswa: any) => void;
  onOpenJurnal?: (siswa: any) => void;
  onOpenPenilaian?: (siswa: any) => void;
}

export const PklBimbinganTab: React.FC<PklBimbinganTabProps> = ({
  guruId,
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="w-full min-w-0 space-y-4">
      <PenempatanPklView
        guruId={guruId}
        tahunPelajaranId={tahunPelajaranId}
        semesterId={semesterId}
        initialTab="MY_GUIDANCE"
        hideLayout={true}
        hideHeaderStats={false}
        hideScopeBanner={true}
        className="w-full"
      />
    </div>
  );
};

export default PklBimbinganTab;
