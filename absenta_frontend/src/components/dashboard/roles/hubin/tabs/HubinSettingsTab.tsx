import React from 'react';
import { HubinSettingsView } from '@/components/hubin/settings/HubinSettingsView';

export const HubinSettingsTab: React.FC = React.memo(() => {
  return (
    <div className="space-y-4">
      <HubinSettingsView hideLayout={true} />
    </div>
  );
});

HubinSettingsTab.displayName = 'HubinSettingsTab';
export default HubinSettingsTab;
