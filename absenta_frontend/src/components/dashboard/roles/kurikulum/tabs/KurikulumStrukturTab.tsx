import React from 'react';
import { StrukturKurikulumView } from '@/components/kurikulum/struktur/StrukturKurikulumView';

export interface KurikulumStrukturTabProps {
  strRows?: any[];
  kelompokOptions?: { value: string; label: string }[];
  isVocational?: boolean;
  loading?: boolean;
}

export const KurikulumStrukturTab: React.FC<KurikulumStrukturTabProps> = () => {
  return (
    <div className="w-full min-w-0">
      <StrukturKurikulumView hideLayout={true} />
    </div>
  );
};
