import React from 'react';
import { NilaiPklView } from '@/components/hubin/nilai-pkl/NilaiPklView';

export interface PklPenilaianTabProps {
  siswaList?: any[];
  guruId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const PklPenilaianTab: React.FC<PklPenilaianTabProps> = ({
  guruId,
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="w-full min-w-0 space-y-4">
      <NilaiPklView
        guruId={guruId}
        tahunPelajaranId={tahunPelajaranId}
        semesterId={semesterId}
        hideScopeBanner={true}
        hideHeaderStats={false}
        layoutMode="hubin"
        className="w-full"
      />
    </div>
  );
};

export default PklPenilaianTab;
