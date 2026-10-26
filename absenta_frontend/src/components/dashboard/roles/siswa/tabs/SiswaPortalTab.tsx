import React from 'react';
import { StaffPortalTab } from '@/components/dashboard/staff/tabs/StaffPortalTab';

export interface SiswaPortalTabProps {
  onBackToBeranda: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const SiswaPortalTab: React.FC<SiswaPortalTabProps> = ({
  onBackToBeranda,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-4">
      <StaffPortalTab
        onBackToBeranda={onBackToBeranda}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
};
