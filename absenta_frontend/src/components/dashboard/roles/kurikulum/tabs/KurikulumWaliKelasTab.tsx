import React from 'react';
import { WaliKelasView } from '@/components/kurikulum/wali-kelas/WaliKelasView';

export interface KurikulumWaliKelasTabProps {
  tahunPelajaranId?: string;
}

export const KurikulumWaliKelasTab: React.FC<KurikulumWaliKelasTabProps> = ({
  tahunPelajaranId,
}) => {
  return (
    <div className="w-full min-w-0">
      <WaliKelasView
        hideLayout={true}
        tahunPelajaranId={tahunPelajaranId}
      />
    </div>
  );
};

export default KurikulumWaliKelasTab;
