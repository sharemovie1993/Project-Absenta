import React from 'react';
import { UkkView } from '@/components/academic/ukk/UkkView';

interface KaprogUkkTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogUkkTab: React.FC<KaprogUkkTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <UkkView
      hideLayout
      jurusanId={jurusanId}
      jurusanNama={jurusanNama}
      tahunPelajaranId={tahunPelajaranId}
      semesterId={semesterId}
    />
  );
});

KaprogUkkTab.displayName = 'KaprogUkkTab';
