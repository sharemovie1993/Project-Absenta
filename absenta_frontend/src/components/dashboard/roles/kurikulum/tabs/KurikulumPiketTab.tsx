import React from 'react';
import { JadwalPiketGuruView } from '@/components/kurikulum/piket/JadwalPiketGuruView';

export interface KurikulumPiketTabProps {
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KurikulumPiketTab: React.FC<KurikulumPiketTabProps> = () => {
  return (
    <div className="space-y-4">
      <JadwalPiketGuruView hideLayout={true} />
    </div>
  );
};
