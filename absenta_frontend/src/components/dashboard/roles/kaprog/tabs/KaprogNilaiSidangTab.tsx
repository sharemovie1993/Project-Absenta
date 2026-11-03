import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';

// Code-splitting heavy universal view to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const NilaiPklView = lazy(() =>
  import('@/components/hubin/nilai-pkl/NilaiPklView').then((m) => ({ default: m.NilaiPklView }))
);

export interface KaprogNilaiSidangTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogNilaiSidangTab: React.FC<KaprogNilaiSidangTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-400">
          <div className="animate-spin w-8 h-8 mx-auto text-indigo-600 mb-2 border-2 border-current border-t-transparent rounded-full" />
          Memuat lembar penilaian sidang PKL...
        </div>
      }
    >
      <NilaiPklView
        hideScopeBanner={true}
        hideHeaderStats={false}
        hideCetakRapor={false}
        jurusanId={jurusanId}
        jurusanNama={jurusanNama}
        tahunPelajaranId={tahunPelajaranId}
        semesterId={semesterId}
        initialTab="sidang"
        layoutMode="hubin"
        className="w-full"
      />
    </Suspense>
  );
});

KaprogNilaiSidangTab.displayName = 'KaprogNilaiSidangTab';
export default KaprogNilaiSidangTab;
