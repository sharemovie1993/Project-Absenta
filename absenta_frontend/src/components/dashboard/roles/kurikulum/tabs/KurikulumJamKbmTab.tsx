import React from 'react';
import { JamKBMView } from '@/components/kurikulum/jam-kbm/JamKBMView';

export const KurikulumJamKbmTab: React.FC = () => {
  return (
    <div className="w-full min-w-0">
      <JamKBMView hideLayout={true} />
    </div>
  );
};
