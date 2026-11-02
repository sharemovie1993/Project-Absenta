import React from 'react';
import { JadwalDelegasiView } from '@/components/kurikulum/delegasi/JadwalDelegasiView';

export interface KurikulumDelegasiTabProps {
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KurikulumDelegasiTab: React.FC<KurikulumDelegasiTabProps> = ({
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="w-full min-w-0">
      <JadwalDelegasiView
        hideLayout={true}
        tahunPelajaranId={tahunPelajaranId}
        semesterId={semesterId}
      />
    </div>
  );
};
