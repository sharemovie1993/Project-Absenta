import React from 'react';
import { BarChart3, Activity, RefreshCw, Calendar } from 'lucide-react';
import { 
  SectionCard,
  Button,
  Loader
} from '@/components/ui';
import type { AttendanceData } from '@/api/tenant-detail.api';

const TenantAttendanceCharts = React.lazy(() => import('../../charts/TenantAttendanceCharts'));

interface TenantAttendanceTabProps {
  attendanceData: AttendanceData | null;
  attendanceLoading: boolean;
  onRefresh: () => void;
  tenantId: string;
}

export const TenantAttendanceTab: React.FC<TenantAttendanceTabProps> = ({
  attendanceData,
  attendanceLoading,
  onRefresh,
  tenantId
}) => {
  return (
    <div className="space-y-6">
      {/* Attendance Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Analisis Kehadiran & Partisipasi
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={attendanceLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw size={14} className={attendanceLoading ? 'animate-spin' : ''} />
          Refresh Data
        </Button>
      </div>

      {attendanceLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Menganalisis data absensi...</span>
        </div>
      ) : attendanceData ? (
        <div className="space-y-6">
          <React.Suspense fallback={<div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl"><Loader /></div>}>
            <TenantAttendanceCharts data={attendanceData} tenantId={tenantId} />
          </React.Suspense>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SectionCard
              title="Statistik Harian"
              icon={Calendar}
              fullWidth
            >
              <div className="space-y-4 w-full">
                {attendanceData?.overview?.daily_stats?.slice(0, 7)?.map((day: { date: string; present_count: number; total_students: number; attendance_rate: number }, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{new Date(day.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                      <p className="text-xs text-gray-500">{day.present_count} Hadir / {day.total_students} Siswa</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{Math.round(day.attendance_rate)}%</p>
                      <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: `${day.attendance_rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Aktivitas Real-time"
              icon={Activity}
              fullWidth
            >
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 text-sm">Data aktivitas real-time akan muncul saat proses absensi berjalan di sekolah.</p>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed">
          <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Data absensi tidak tersedia</p>
        </div>
      )}
    </div>
  );
};
