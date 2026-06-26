import React from 'react';
import { Users, Activity, Building2, BarChart3, Clock } from 'lucide-react';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

import type { TenantMetrics, UserStatistics, AcademicData, AttendanceData } from '@/api/tenant-detail.api';

interface TenantStatsOverviewProps {
  metrics: TenantMetrics | null;
  userStats: UserStatistics | null;
  academicData: AcademicData | null;
  attendanceData: AttendanceData | null;
  metricsLoading: boolean;
  attendanceLoading: boolean;
  formatLastUpdated: (date: Date) => string;
  lastUpdatedMetrics?: Date;
}

export const TenantStatsOverview: React.FC<TenantStatsOverviewProps> = ({
  metrics,
  userStats,
  academicData,
  attendanceData,
  metricsLoading,
  attendanceLoading,
  formatLastUpdated,
  lastUpdatedMetrics
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Statistik Tenant
        </h3>
        {lastUpdatedMetrics && (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Clock className="mr-1 h-4 w-4" />
            Diperbarui: {formatLastUpdated(lastUpdatedMetrics)}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <AnalyticsCard
          title="Total Pengguna"
          value={(userStats?.totalUsers ?? metrics?.users?.total) || 0}
          isLoading={metricsLoading}
          icon={<Users size={20} className="text-white" />}
          gradient="from-blue-500 to-cyan-600"
        />
        <AnalyticsCard
          title="Pengguna Aktif"
          value={userStats?.activeUsers ?? 0}
          isLoading={metricsLoading}
          icon={<Activity size={20} className="text-white" />}
          gradient="from-green-500 to-emerald-600"
        />
        <AnalyticsCard
          title="Total Siswa"
          value={(metrics?.users?.siswa ?? academicData?.statistics?.totalSiswa) || 0}
          isLoading={metricsLoading}
          icon={<Users size={20} className="text-white" />}
          gradient="from-purple-500 to-pink-600"
        />
        <AnalyticsCard
          title="Total Guru"
          value={(metrics?.users?.guru ?? academicData?.statistics?.totalGuru) || 0}
          isLoading={metricsLoading}
          icon={<Users size={20} className="text-white" />}
          gradient="from-orange-500 to-red-600"
        />
        <AnalyticsCard
          title="Total Kelas"
          value={(metrics?.academic?.kelas ?? academicData?.statistics?.totalKelas) || 0}
          isLoading={metricsLoading}
          icon={<Building2 size={20} className="text-white" />}
          gradient="from-indigo-500 to-purple-600"
        />
        <AnalyticsCard
          title="Tingkat Kehadiran"
          value={attendanceData?.overview?.summary?.average_attendance_rate !== undefined
            ? `${Math.round(attendanceData?.overview?.summary?.average_attendance_rate || 0)}%`
            : attendanceLoading ? '...' : '0%'}
          isLoading={attendanceLoading}
          icon={<BarChart3 size={20} className="text-white" />}
          gradient="from-teal-500 to-cyan-600"
        />
      </div>
    </div>
  );
};
