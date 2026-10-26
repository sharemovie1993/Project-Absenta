import React from 'react';
import { KepalaSekolahBkDashboardWidget } from '@/components/dashboard/widgets/KepalaSekolahBkDashboardWidget';

export const KepsekBkTab: React.FC = React.memo(() => {
  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      <KepalaSekolahBkDashboardWidget />
    </div>
  );
});

KepsekBkTab.displayName = 'KepsekBkTab';
