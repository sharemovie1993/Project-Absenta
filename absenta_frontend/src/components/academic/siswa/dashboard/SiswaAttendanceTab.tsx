import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { TrackingSiswaView } from '@/components/attendance/tracking/TrackingSiswaView';

export interface SiswaAttendanceTabProps {
  gamification?: {
    attendanceRate: number;
    [key: string]: any;
  };
  handlePrevMonth?: () => void;
  handleNextMonth?: () => void;
  selectedMonthFormatted?: string;
  calendarGridData?: any;
  todayIso?: string;
  selectedDate?: string;
  onSelectDate?: (dateIso: string) => void;
  sessionAttendanceHistory?: any[];
  todayKbmSchedule?: any[];
  isLoadingSchedule?: boolean;
  isApiConnected?: boolean;
  monthlyRecap?: any;
  dailyRecapRes?: any;
  kelasId?: string;
  siswaId?: string;
  studentName?: string;
  studentNis?: string;
  kelasNama?: string;
  jurusanNama?: string;
}

export const SiswaAttendanceTab: React.FC<SiswaAttendanceTabProps> = ({
  kelasId,
  siswaId,
  studentName,
  studentNis,
  kelasNama,
  jurusanNama,
}) => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-4">
      <TrackingSiswaView
        siswaId={siswaId || (user as any)?.siswa_id || user?.id}
        initialSiswaNama={studentName}
        initialSiswaNis={studentNis}
        kelasId={kelasId}
        kelasNama={kelasNama}
        jurusanNama={jurusanNama}
        hideLayout={true}
        hideHeader={true}
        hideScopeBanner={true}
        hideStudentSelector={true}
      />
    </div>
  );
};
