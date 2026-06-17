import React from 'react';
import { MonitoringKbmWidget } from '../../../components/dashboard/shared/MonitoringKbmWidget';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';
import PageLayout from '../../../components/common/PageLayout';

const MonitoringKbmPage: React.FC = () => {
  return (
    <PageLayout
      title="Monitoring KBM"
      description="Pantau aktivitas pembelajaran dan jurnal mengajar guru secara real-time di seluruh kelas."
    >
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Monitoring KBM (Realtime Dashboard)"
        description="Dapatkan pandangan menyeluruh terhadap seluruh aktivitas belajar mengajar yang sedang berlangsung di sekolah Anda."
      >
        <div className="space-y-6">
          <MonitoringKbmWidget />
        </div>
      </PremiumFeatureGate>
    </PageLayout>
  );
};

export default MonitoringKbmPage;
