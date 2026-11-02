import React, { useState } from 'react';
import {
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { JadwalPelajaranView } from '@/components/kurikulum/jadwal/JadwalPelajaranView';

export interface KurikulumJadwalTabProps {
  semesterId?: string;
  tahunPelajaranId?: string;
}

export const KurikulumJadwalTab: React.FC<KurikulumJadwalTabProps> = ({
  semesterId,
  tahunPelajaranId,
}) => {
  return (
    <div className="space-y-4">
      <JadwalPelajaranView
        hideLayout={true}
        tahunPelajaranId={tahunPelajaranId}
        semesterId={semesterId}
      />
    </div>
  );
};
