import React from 'react';
import { Navigate } from 'react-router-dom';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';

export default React.memo(function BpbkWorkspacePage() {
  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Workspace BPBK"
      description="Akses ruang kerja Bimbingan Konseling (BP/BK) terintegrasi."
    >
      <Navigate to="/bpbk/dashboard" replace />
    </PremiumFeatureGate>
  );
});
