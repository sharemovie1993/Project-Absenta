import React from 'react';
import { KalenderAkademikView } from '@/components/kurikulum/kalender/KalenderAkademikView';

export interface KurikulumKalenderTabProps {
  tahunPelajaranId?: string;
  tahunPelajaranNama?: string;
}

export const KurikulumKalenderTab: React.FC<KurikulumKalenderTabProps> = ({
  tahunPelajaranId,
  tahunPelajaranNama,
}) => {
  return (
    <div className="w-full min-w-0">
      <KalenderAkademikView
        hideLayout={true}
        propTahunPelajaranId={tahunPelajaranId}
        propTahunPelajaranNama={tahunPelajaranNama}
      />
    </div>
  );
};
