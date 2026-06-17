import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { TrendingUp, Users, Clock, Award } from 'lucide-react';
import { getAttendanceData } from '../../api/tenant-detail.api';
import type { AttendanceData } from '../../api/tenant-detail.api';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

import { toLocalDate } from '../../utils/attendance/time';

interface TenantAttendanceChartsProps {
  data: AttendanceData;
  tenantId: string;
}

// Color palette untuk charts
const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  indigo: '#6366f1',
  pink: '#ec4899',
  teal: '#14b8a6',
  success: '#10b981',
  info: '#6366f1'
};

const PIE_COLORS = [COLORS.secondary, COLORS.warning, COLORS.danger, COLORS.purple];

function TenantAttendanceCharts({ data, tenantId }: TenantAttendanceChartsProps) {
  const [enhancedDailyTrendData, setEnhancedDailyTrendData] = useState<any[]>([]);
  const [enhancedStatusDistribution, setEnhancedStatusDistribution] = useState<any[]>([]);
  const [enhancedClassPerformanceData, setEnhancedClassPerformanceData] = useState<any[]>([]);
  const [enhancedWeeklyTrendData, setEnhancedWeeklyTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real attendance data for charts
  useEffect(() => {
    const fetchAttendanceChartData = async () => {
      try {
        setLoading(true);
        
        // Fetch last 30 days attendance data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Use local date helper that respects virtual time/timezone
        const dateFrom = toLocalDate(thirtyDaysAgo);
        const dateTo = toLocalDate(); // No arguments = use current virtual/real time

        const attendanceResponse = await getAttendanceData(tenantId, {
          date_from: dateFrom,
          date_to: dateTo
        });

        if (attendanceResponse.success) {
          const attendanceData = attendanceResponse.data;
          
          // Process daily trend data
          const dailyData = processDailyTrend(attendanceData);
          setEnhancedDailyTrendData(dailyData);
          
          // Process status distribution
          const statusData = processStatusDistribution(attendanceData);
          setEnhancedStatusDistribution(statusData);
          
          // Process class performance data
          const classData = processClassPerformance(attendanceData);
          setEnhancedClassPerformanceData(classData);
          
          // Process weekly trend data
          const weeklyData = processWeeklyTrend(attendanceData);
          setEnhancedWeeklyTrendData(weeklyData);
        }

      } catch (error) {
        console.error('Error fetching attendance chart data:', error);
        // Fallback to default data if API fails
        setEnhancedDailyTrendData(getDefaultDailyTrend());
        setEnhancedStatusDistribution(getDefaultStatusDistribution());
        setEnhancedClassPerformanceData(getDefaultClassPerformance());
        setEnhancedWeeklyTrendData(getDefaultWeeklyTrend());
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchAttendanceChartData();
    }
  }, [tenantId]);

  // Process daily attendance trend from API data
  const processDailyTrend = (attendanceData: any) => {
    const dailyStats: { [key: string]: { hadir: number; terlambat: number; tidak_hadir: number; izin: number } } = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = toLocalDate(date);
      dailyStats[dateKey] = { hadir: 0, terlambat: 0, tidak_hadir: 0, izin: 0 };
    }

    // Process attendance records
    if (attendanceData.records) {
      attendanceData.records.forEach((record: any) => {
        const dateKey = record.date;
        if (dailyStats[dateKey]) {
          switch (record.status?.toLowerCase()) {
            case 'hadir':
            case 'present':
              dailyStats[dateKey].hadir++;
              break;
            case 'terlambat':
            case 'late':
              dailyStats[dateKey].terlambat++;
              break;
            case 'tidak_hadir':
            case 'absent':
              dailyStats[dateKey].tidak_hadir++;
              break;
            case 'izin':
            case 'excused':
              dailyStats[dateKey].izin++;
              break;
          }
        }
      });
    }

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date: new Date(date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
      ...stats
    }));
  };

  // Process status distribution from API data
  const processStatusDistribution = (attendanceData: any) => {
    const statusCount = { hadir: 0, terlambat: 0, tidak_hadir: 0, izin: 0 };
    
    if (attendanceData.records) {
      attendanceData.records.forEach((record: any) => {
        switch (record.status?.toLowerCase()) {
          case 'hadir':
          case 'present':
            statusCount.hadir++;
            break;
          case 'terlambat':
          case 'late':
            statusCount.terlambat++;
            break;
          case 'tidak_hadir':
          case 'absent':
          case 'alpa':
            statusCount.tidak_hadir++;
            break;
          case 'izin':
          case 'excused':
            statusCount.izin++;
            break;
        }
      });
    }

    return [
      { name: 'Hadir', value: statusCount.hadir, color: COLORS.secondary },
      { name: 'Terlambat', value: statusCount.terlambat, color: COLORS.warning },
      { name: 'Tidak Hadir', value: statusCount.tidak_hadir, color: COLORS.danger },
      { name: 'Izin', value: statusCount.izin, color: COLORS.purple }
    ].filter(item => item.value > 0);
  };

  // Process class performance from API data
  const processClassPerformance = (attendanceData: any) => {
    const classStats: { [key: string]: { total: number; hadir: number } } = {};
    
    if (attendanceData.records) {
      attendanceData.records.forEach((record: any) => {
        const className = record.class_name || 'Unknown';
        if (!classStats[className]) {
          classStats[className] = { total: 0, hadir: 0 };
        }
        classStats[className].total++;
        if (record.status?.toLowerCase() === 'hadir' || record.status?.toLowerCase() === 'present') {
          classStats[className].hadir++;
        }
      });
    }

    return Object.entries(classStats).map(([className, stats]) => ({
      class: className,
      percentage: stats.total > 0 ? Math.round((stats.hadir / stats.total) * 100) : 0,
      total: stats.total
    })).sort((a, b) => b.percentage - a.percentage).slice(0, 10); // Top 10 classes
  };

  // Process weekly trend from API data
  const processWeeklyTrend = (attendanceData: any) => {
    const weeklyStats: { [key: string]: number } = {};
    
    // Initialize last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const weekKey = `Minggu ${4 - i}`;
      weeklyStats[weekKey] = 0;
    }

    if (attendanceData.records) {
      attendanceData.records.forEach((record: any) => {
        const recordDate = new Date(record.date);
        const weeksAgo = Math.floor((Date.now() - recordDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weeksAgo >= 0 && weeksAgo < 4) {
          const weekKey = `Minggu ${4 - weeksAgo}`;
          if (record.status?.toLowerCase() === 'hadir' || record.status?.toLowerCase() === 'present') {
            weeklyStats[weekKey]++;
          }
        }
      });
    }

    return Object.entries(weeklyStats).map(([week, attendance]) => ({
      week,
      attendance
    }));
  };

  // Fallback data functions
  const getDefaultDailyTrend = () => {
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    return days.map(day => ({
      date: day,
      hadir: data.overview?.summary?.total_attendance_records || 0,
      terlambat: 0,
      tidak_hadir: 0,
      izin: 0
    }));
  };

  const getDefaultStatusDistribution = () => [
    { name: 'Hadir', value: data.overview?.summary?.total_attendance_records || 0, color: COLORS.secondary },
    { name: 'Terlambat', value: 0, color: COLORS.warning },
    { name: 'Tidak Hadir', value: 0, color: COLORS.danger },
    { name: 'Izin', value: 0, color: COLORS.purple }
  ].filter(item => item.value > 0);

  const getDefaultClassPerformance = () => [
    { class: 'Kelas A', percentage: 95, total: 30 },
    { class: 'Kelas B', percentage: 88, total: 25 },
    { class: 'Kelas C', percentage: 92, total: 28 }
  ];

  const getDefaultWeeklyTrend = () => [
    { week: 'Minggu 1', attendance: 0 },
    { week: 'Minggu 2', attendance: 0 },
    { week: 'Minggu 3', attendance: 0 },
    { week: 'Minggu 4', attendance: data.overview?.summary?.total_attendance_records || 0 }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Clock className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Data Kehadiran</h3>
        <p className="text-gray-500">Data kehadiran akan muncul setelah ada aktivitas absensi.</p>
      </div>
    );
  }

  // Use enhanced data if available, otherwise fallback to original data
  const dailyTrendData = enhancedDailyTrendData.length > 0 ? enhancedDailyTrendData : 
    data.analytics?.trends?.map((trend: any) => ({
      date: new Date(trend.period).toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'short' 
      }),
      hadir: Math.round((trend.attendance_rate / 100) * trend.total_students),
      tidak_hadir: trend.total_students - Math.round((trend.attendance_rate / 100) * trend.total_students),
      terlambat: 0,
      rate: trend.attendance_rate
    })) || [];

  const statusDistribution = enhancedStatusDistribution.length > 0 ? enhancedStatusDistribution : [
    { name: 'Hadir', value: data.overview?.summary?.total_attendance_records || 0, color: COLORS.success },
    { name: 'Tidak Hadir', value: 0, color: COLORS.danger },
    { name: 'Terlambat', value: 0, color: COLORS.warning },
    { name: 'Izin', value: 0, color: COLORS.info }
  ].filter(item => item.value > 0);

  const classPerformanceData = enhancedClassPerformanceData.length > 0 ? enhancedClassPerformanceData :
    data.overview?.by_class?.map((kelas: any) => ({
      name: kelas.kelas_nama.length > 15 ? 
        `${kelas.kelas_nama.substring(0, 15)}...` : 
        kelas.kelas_nama,
      fullName: kelas.kelas_nama,
      rate: kelas.attendance_rate,
      total_siswa: kelas.total_siswa,
      hadir: Math.round((kelas.attendance_rate / 100) * kelas.total_siswa),
      tidak_hadir: kelas.total_siswa - Math.round((kelas.attendance_rate / 100) * kelas.total_siswa)
    })) || [];

  const weeklyTrendData = enhancedWeeklyTrendData.length > 0 ? enhancedWeeklyTrendData :
    data.analytics?.trends?.map((trend: any, index: number) => ({
      week: `Periode ${index + 1}`,
      rata_rata: trend.attendance_rate,
      total_sesi: trend.total_sessions,
      kehadiran: Math.round((trend.attendance_rate / 100) * trend.total_students)
    })) || [];

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Total Hadir"
          value={data.overview?.summary?.total_attendance_records?.toLocaleString() || 0}
          icon={<Users size={20} />}
          gradient="from-green-500 to-emerald-600"
        />

        <AnalyticsCard
          title="Rata-rata Kehadiran"
          value={`${data.overview?.summary?.average_attendance_rate?.toFixed(1) || 0}%`}
          icon={<TrendingUp size={20} />}
          gradient="from-blue-500 to-cyan-600"
        />

        <AnalyticsCard
          title="Total Sesi"
          value={data.overview?.summary?.total_sessions?.toLocaleString() || 0}
          icon={<Clock size={20} />}
          gradient="from-indigo-500 to-purple-600"
        />

        <AnalyticsCard
          title="Kelas Terbaik"
          value={`${classPerformanceData[0]?.rate?.toFixed(1) || 0}%`}
          subtitle={classPerformanceData[0]?.fullName || undefined}
          icon={<Award size={20} />}
          gradient="from-yellow-500 to-orange-600"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tren Kehadiran Harian */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Tren Kehadiran Harian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fill: '#6B7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="hadir"
                  stackId="1"
                  stroke={COLORS.success}
                  fill={COLORS.success}
                  fillOpacity={0.6}
                  name="Hadir"
                />
                <Area
                  type="monotone"
                  dataKey="terlambat"
                  stackId="1"
                  stroke={COLORS.warning}
                  fill={COLORS.warning}
                  fillOpacity={0.6}
                  name="Terlambat"
                />
                <Area
                  type="monotone"
                  dataKey="tidak_hadir"
                  stackId="1"
                  stroke={COLORS.danger}
                  fill={COLORS.danger}
                  fillOpacity={0.6}
                  name="Tidak Hadir"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribusi Status Kehadiran */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Distribusi Status Kehadiran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number | undefined) => [
                    (value ?? 0).toLocaleString(),
                    'Jumlah'
                  ]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performa Kehadiran per Kelas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Performa Kehadiran per Kelas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classPerformanceData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  fontSize={12}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  fontSize={12}
                  tick={{ fill: '#6B7280' }}
                />
                <Tooltip 
                  formatter={(value: number | undefined) => [
                    `${value ?? 0}%`, 
                    'Tingkat Kehadiran'
                  ]}
                  labelFormatter={(label) => {
                    const labelText = String(label ?? '');
                    const item = classPerformanceData.find((d: any) => d.name === labelText);
                    return item?.fullName || labelText;
                  }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="rate" 
                  fill={COLORS.primary}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tren Mingguan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Tren Kehadiran Mingguan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  fontSize={12}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis 
                  yAxisId="rate"
                  orientation="left"
                  domain={[0, 100]}
                  fontSize={12}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis 
                  yAxisId="count"
                  orientation="right"
                  fontSize={12}
                  tick={{ fill: '#6B7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="rata_rata"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                  name="Rata-rata Kehadiran (%)"
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="total_sesi"
                  stroke={COLORS.secondary}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 3 }}
                  name="Total Sesi"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Memoize komponen untuk optimasi performa
export default React.memo(TenantAttendanceCharts, (prevProps, nextProps) => {
  return (
    prevProps.tenantId === nextProps.tenantId &&
    prevProps.data === nextProps.data
  );
});
