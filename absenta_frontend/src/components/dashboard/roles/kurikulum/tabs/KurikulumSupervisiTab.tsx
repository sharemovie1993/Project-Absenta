import React, { lazy, Suspense } from 'react';
import { Loader } from '@/components/ui';

const SupervisiAkademikView = lazy(() =>
  import('@/components/kurikulum/supervisi/SupervisiAkademikView').then((m) => ({
    default: m.SupervisiAkademikView,
  }))
);

export interface KurikulumSupervisiTabProps {
  tahunPelajaranId?: string;
  semesterId?: string;
  supRows?: any[];
  supPct?: number;
  loading?: boolean;
}

/**
 * KurikulumSupervisiTab - Universal Role-Ready View (DRY Pattern)
 * Merender modul SupervisiAkademikView langsung di dalam lingkungan Dashboard Kurikulum.
 * Seluruh aksi CRUD (Jadwalkan, Edit, Hapus, Analitik) dilakukan in-place tanpa navigasi keluar.
 */
export const KurikulumSupervisiTab: React.FC<KurikulumSupervisiTabProps> = ({
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="w-full min-w-0">
      <Suspense
        fallback={
          <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
            <Loader size="lg" />
            <p className="text-xs text-slate-500 font-semibold">Memuat Supervisi Akademik Kurikulum...</p>
          </div>
        }
      >
        <SupervisiAkademikView
          hideLayout={true}
          roleContext="KURIKULUM"
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
        />
      </Suspense>
    </div>
  );
};
