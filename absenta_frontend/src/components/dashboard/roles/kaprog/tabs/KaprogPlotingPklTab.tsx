import React, { Suspense, lazy } from 'react';

// Code-splitting universal placement view (Pilar 21B & TBT Optimization)
const PenempatanPklView = lazy(() =>
  import('@/components/hubin/penempatan/PenempatanPklView').then((m) => ({ default: m.PenempatanPklView }))
);

export interface KaprogPlotingPklTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogPlotingPklTab: React.FC<KaprogPlotingPklTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="space-y-3.5">
      <Suspense
        fallback={
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="animate-spin w-8 h-8 mx-auto text-indigo-600 mb-2 border-2 border-current border-t-transparent rounded-full" />
            Memuat modul penempatan siswa PKL...
          </div>
        }
      >
        <PenempatanPklView
          isModal={false}
          hideLayout={true}
          hideScopeBanner={true}
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
          className="w-full"
        />
      </Suspense>
    </div>
  );
});

KaprogPlotingPklTab.displayName = 'KaprogPlotingPklTab';
export default KaprogPlotingPklTab;
