import React, { Suspense, lazy } from 'react';
import type { SiswaBimbinganItem } from '../types';

const KunjunganPklView = lazy(() =>
  import('@/components/hubin/kunjungan/KunjunganPklView').then((m) => ({ default: m.KunjunganPklView }))
);

export interface PklMonitoringTabProps {
  guruId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  siswaList?: SiswaBimbinganItem[];
  kunjunganList?: any[];
}

export const PklMonitoringTab: React.FC<PklMonitoringTabProps> = ({
  guruId,
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="w-full min-w-0 space-y-4">
      <Suspense
        fallback={
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="animate-spin w-6 h-6 mx-auto text-indigo-600 mb-2 border-2 border-current border-t-transparent rounded-full" />
            Memuat modul supervisi kunjungan...
          </div>
        }
      >
        <KunjunganPklView
          guruId={guruId}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
          hideLayout={true}
          hideScopeBanner={true}
          className="w-full"
        />
      </Suspense>
    </div>
  );
};

export default PklMonitoringTab;
