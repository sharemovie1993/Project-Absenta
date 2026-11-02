import React from 'react';
import { RekapKBMView } from '@/components/kurikulum/rekap-kbm/RekapKBMView';

export interface KurikulumRekapKbmTabProps {
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KurikulumRekapKbmTab: React.FC<KurikulumRekapKbmTabProps> = ({
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="w-full min-w-0">
      <RekapKBMView
        hideLayout={true}
        tahunPelajaranId={tahunPelajaranId}
        semesterId={semesterId}
      />
    </div>
  );
};

export default KurikulumRekapKbmTab;
