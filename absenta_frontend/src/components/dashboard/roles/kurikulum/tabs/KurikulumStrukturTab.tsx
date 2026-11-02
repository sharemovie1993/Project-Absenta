import React from 'react';
import { StrukturKurikulumView } from '@/components/kurikulum/struktur/StrukturKurikulumView';

export interface KurikulumStrukturTabProps {
  tahunPelajaranId?: string;
  strRows?: any[];
  kelompokOptions?: { value: string; label: string }[];
  isVocational?: boolean;
  loading?: boolean;
}

export const KurikulumStrukturTab: React.FC<KurikulumStrukturTabProps> = ({
  tahunPelajaranId,
}) => {
  return (
    <div className="w-full min-w-0">
      <StrukturKurikulumView
        hideLayout={true}
        propTahunPelajaranId={tahunPelajaranId}
      />
    </div>
  );
};
