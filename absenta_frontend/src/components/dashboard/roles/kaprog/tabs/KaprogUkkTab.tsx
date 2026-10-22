import React from 'react';
import { UkkView } from '@/components/academic/ukk/UkkView';

interface KaprogUkkTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  semesterId?: string;
}

export const KaprogUkkTab: React.FC<KaprogUkkTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId,
  tahunAjaran,
  semesterId,
}) => {
  return (
    <UkkView
      hideLayout
      jurusanId={jurusanId}
      jurusanNama={jurusanNama}
      tahunPelajaranId={tahunPelajaranId}
      tahunAjaran={tahunAjaran}
      semesterId={semesterId}
    />
  );
});

KaprogUkkTab.displayName = 'KaprogUkkTab';
