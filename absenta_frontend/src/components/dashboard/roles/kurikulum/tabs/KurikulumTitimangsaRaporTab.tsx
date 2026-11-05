import React from 'react';
import { RaporSettingsView } from '@/components/rapor/settings/RaporSettingsView';

export const KurikulumTitimangsaRaporTab: React.FC = React.memo(() => {
  return (
    <div className="w-full">
      <RaporSettingsView hideLayout={true} />
    </div>
  );
});

KurikulumTitimangsaRaporTab.displayName = 'KurikulumTitimangsaRaporTab';
