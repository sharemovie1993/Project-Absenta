import React from 'react';
import { EvaluasiKinerjaGuruView } from '@/components/kurikulum/evaluasi-kinerja/EvaluasiKinerjaGuruView';

export interface KurikulumEvaluasiKinerjaTabProps {
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KurikulumEvaluasiKinerjaTab: React.FC<KurikulumEvaluasiKinerjaTabProps> = React.memo(({
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="w-full min-w-0">
      <EvaluasiKinerjaGuruView
        hideLayout={true}
        tahunPelajaranId={tahunPelajaranId}
        semesterId={semesterId}
      />
    </div>
  );
});

KurikulumEvaluasiKinerjaTab.displayName = 'KurikulumEvaluasiKinerjaTab';

export default KurikulumEvaluasiKinerjaTab;
