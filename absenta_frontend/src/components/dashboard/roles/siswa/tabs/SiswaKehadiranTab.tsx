import React from 'react';
import { SiswaAttendanceTab } from '@/components/academic/siswa/dashboard/SiswaAttendanceTab';

export interface SiswaKehadiranTabProps {
  gamification: any;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  selectedMonthFormatted: string;
  calendarGridData: any[];
  todayIso: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  sessionAttendanceHistory: any[];
  todayKbmSchedule: any[];
  isLoadingSchedule: boolean;
  isApiConnected: boolean;
  kelasId: string;
  siswaId?: string;
  studentName?: string;
  studentNis?: string;
  kelasNama?: string;
  jurusanNama?: string;
}

export const SiswaKehadiranTab: React.FC<SiswaKehadiranTabProps> = ({
  gamification,
  handlePrevMonth,
  handleNextMonth,
  selectedMonthFormatted,
  calendarGridData,
  todayIso,
  selectedDate,
  onSelectDate,
  sessionAttendanceHistory,
  todayKbmSchedule,
  isLoadingSchedule,
  isApiConnected,
  kelasId,
  siswaId,
  studentName,
  studentNis,
  kelasNama,
  jurusanNama,
}) => {
  return (
    <div className="space-y-4">
      <SiswaAttendanceTab
        gamification={gamification}
        handlePrevMonth={handlePrevMonth}
        handleNextMonth={handleNextMonth}
        selectedMonthFormatted={selectedMonthFormatted}
        calendarGridData={calendarGridData}
        todayIso={todayIso}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        sessionAttendanceHistory={sessionAttendanceHistory}
        todayKbmSchedule={todayKbmSchedule}
        isLoadingSchedule={isLoadingSchedule}
        isApiConnected={isApiConnected}
        kelasId={kelasId}
        siswaId={siswaId}
        studentName={studentName}
        studentNis={studentNis}
        kelasNama={kelasNama}
        jurusanNama={jurusanNama}
      />
    </div>
  );
};
