import React from 'react';
import { StudentWeeklyScheduleWidget } from '../components/StudentWeeklyScheduleWidget';

export interface SiswaJadwalTabProps {
  kelasId?: string;
  kelasNama?: string;
}

export const SiswaJadwalTab: React.FC<SiswaJadwalTabProps> = ({
  kelasId,
  kelasNama,
}) => {
  return (
    <div className="space-y-4">
      <StudentWeeklyScheduleWidget
        kelasId={kelasId}
        kelasNama={kelasNama}
      />
    </div>
  );
};
