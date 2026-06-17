import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { getTenantLogs } from '../../api/tenant-detail.api';
import type { UserStatistics, TenantMetrics } from '../../api/tenant-detail.api';
import { toLocalDate } from '../../utils/attendance/time';

interface TenantOverviewChartsProps {
  userStats: UserStatistics;
  metrics: TenantMetrics;
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
  teal: '#14b8a6'
};

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.warning, COLORS.danger, COLORS.purple];

function TenantOverviewCharts({ userStats, metrics, tenantId }: TenantOverviewChartsProps) {
  const [monthlyRegistrationData, setMonthlyRegistrationData] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real data for charts
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        
        // Fetch monthly registration data from logs
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const logsResponse = await getTenantLogs(tenantId, {
          action: 'CREATE_USER',
          date_from: sixMonthsAgo.toISOString().split('T')[0],
          limit: 1000
        });

        if (logsResponse.success) {
          // Process monthly registration data
          const monthlyData = processMonthlyRegistrations(logsResponse.data.logs);
          setMonthlyRegistrationData(monthlyData);
        }

        // Fetch weekly activity data from logs
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const activityLogsResponse = await getTenantLogs(tenantId, {
          date_from: oneWeekAgo.toISOString().split('T')[0],
          limit: 1000
        });

        if (activityLogsResponse.success) {
          // Process weekly activity data
          const weeklyData = processWeeklyActivity(activityLogsResponse.data.logs);
          setActivityData(weeklyData);
        }

      } catch (error) {
        console.error('Error fetching chart data:', error);
        // Fallback to default data if API fails
        setMonthlyRegistrationData(getDefaultMonthlyData());
        setActivityData(getDefaultActivityData());
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchChartData();
    }
  }, [tenantId]);

  // Process monthly registration data from logs
  const processMonthlyRegistrations = (logs: any[]) => {
    const monthlyCount: { [key: string]: number } = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = months[date.getMonth()];
      monthlyCount[monthKey] = 0;
    }

    // Count registrations by month
    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      const monthKey = months[logDate.getMonth()];
      if (monthlyCount.hasOwnProperty(monthKey)) {
        monthlyCount[monthKey]++;
      }
    });

    return Object.entries(monthlyCount).map(([month, users]) => ({
      month,
      users
    }));
  };

  // Process weekly activity data from logs
  const processWeeklyActivity = (logs: any[]) => {
    const dailyActivity: { [key: string]: { logins: number; activities: number } } = {};
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    
    // Initialize week days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = days[date.getDay()];
      dailyActivity[dayKey] = { logins: 0, activities: 0 };
    }

    // Count activities by day
    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      const dayKey = days[logDate.getDay()];
      if (dailyActivity[dayKey]) {
        dailyActivity[dayKey].activities++;
        if (log.action === 'LOGIN' || log.action === 'USER_LOGIN') {
          dailyActivity[dayKey].logins++;
        }
      }
    });

    return Object.entries(dailyActivity).map(([day, data]) => ({
      day,
      logins: data.logins,
      activities: data.activities
    }));
  };

  // Fallback data functions
  const getDefaultMonthlyData = () => [
    { month: 'Jan', users: 0 },
    { month: 'Feb', users: 0 },
    { month: 'Mar', users: 0 },
    { month: 'Apr', users: 0 },
    { month: 'May', users: 0 },
    { month: 'Jun', users: userStats.newUsersThisMonth || 0 }
  ];

  const getDefaultActivityData = () => [
    { day: 'Sen', logins: 0, activities: 0 },
    { day: 'Sel', logins: 0, activities: 0 },
    { day: 'Rab', logins: 0, activities: 0 },
    { day: 'Kam', logins: 0, activities: 0 },
    { day: 'Jum', logins: 0, activities: 0 },
    { day: 'Sab', logins: 0, activities: 0 },
    { day: 'Min', logins: 0, activities: 0 }
  ];

  // Transform user statistics by role for pie chart
  const usersByRoleData = userStats.usersByRole?.map((role, index) => ({
    name: role.roleName,
    value: role.count,
    color: PIE_COLORS[index % PIE_COLORS.length]
  })) || [];

  // Transform user status data for bar chart
  const userStatusData = [
    { status: 'Aktif', count: userStats.activeUsers || 0, color: COLORS.secondary },
    { status: 'Tidak Aktif', count: (userStats.totalUsers || 0) - (userStats.activeUsers || 0), color: COLORS.warning },
    { status: 'Baru Bulan Ini', count: userStats.newUsersThisMonth || 0, color: COLORS.primary }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label for slices smaller than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* User Distribution by Role - Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            Distribusi Pengguna per Peran
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersByRoleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usersByRoleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {usersByRoleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry: any) => (
                    <span style={{ color: entry.color }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Tidak ada data pengguna
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Status Overview - Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            Status Pengguna
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="status" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {userStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly User Registration Trend - Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            Tren Registrasi Pengguna (6 Bulan Terakhir)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyRegistrationData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke={COLORS.purple} 
                strokeWidth={3}
                dot={{ fill: COLORS.purple, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: COLORS.purple, strokeWidth: 2 }}
                name="Pengguna Baru"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Activity Overview - Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
            Aktivitas Mingguan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={activityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="activities" 
                stackId="1"
                stroke={COLORS.teal} 
                fill={COLORS.teal}
                fillOpacity={0.6}
                name="Total Aktivitas"
              />
              <Area 
                type="monotone" 
                dataKey="logins" 
                stackId="2"
                stroke={COLORS.indigo} 
                fill={COLORS.indigo}
                fillOpacity={0.8}
                name="Login"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Memoize komponen untuk optimasi performa
export default React.memo(TenantOverviewCharts, (prevProps, nextProps) => {
  return (
    prevProps.tenantId === nextProps.tenantId &&
    prevProps.userStats === nextProps.userStats &&
    prevProps.metrics === nextProps.metrics
  );
});
