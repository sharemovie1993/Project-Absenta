import React from 'react';
import { CetakBerkasKurikulumPage } from '@/pages/kurikulum/CetakBerkasKurikulumPage';

export const KurikulumCetakTab: React.FC = () => {
  return (
    <div className="w-full min-w-0">
      <CetakBerkasKurikulumPage hideHeader={true} />
    </div>
  );
};
