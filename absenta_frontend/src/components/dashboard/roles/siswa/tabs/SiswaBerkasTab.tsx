import React from 'react';
import { SiswaDocsPanel } from '@/components/academic/siswa/SiswaDocsPanel';

export interface SiswaBerkasTabProps {
  siswaId?: string;
  siswaName: string;
  nis?: string;
  nisn?: string;
}

export const SiswaBerkasTab: React.FC<SiswaBerkasTabProps> = ({
  siswaId,
  siswaName,
  nis,
  nisn,
}) => {
  if (!siswaId) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 font-semibold animate-pulse">
        Memuat data berkas siswa...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SiswaDocsPanel
        siswaId={siswaId}
        siswaName={siswaName}
        nis={nis}
        nisn={nisn}
        mode="full"
        canManage={true}
      />
    </div>
  );
};
