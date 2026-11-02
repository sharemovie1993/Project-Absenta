import React from 'react';
import { JadwalDelegasiView } from '@/components/kurikulum/delegasi/JadwalDelegasiView';

export const KurikulumDelegasiTab: React.FC = () => {
  return (
    <div className="w-full min-w-0">
      <JadwalDelegasiView hideLayout={true} />
    </div>
  );
};
