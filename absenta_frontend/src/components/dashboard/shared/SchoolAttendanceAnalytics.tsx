import React, { useMemo } from 'react';
import { TrendingUp, Users } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { CompactSectionCard } from '@/components/dashboard/shared/CompactSectionCard';
import type { ChartData, ChartDataResponse } from '@/types/dashboard';

export interface SchoolAttendanceAnalyticsProps {
  studentChartData?: ChartData | ChartDataResponse | null;
  teacherChartData?: ChartData | ChartDataResponse | null;
  stats?: {
    total_siswa?: number;
    total_guru?: number;
    siswa_hadir?: number;
    siswa_sakit?: number;
    siswa_izin?: number;
    siswa_alpa?: number;
  } | null;
  height?: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

function unwrapChart(input?: ChartData | ChartDataResponse | null): ChartData | null {
  if (!input) return null;
  if ('labels' in input && Array.isArray(input.labels)) return input;
  if ('data' in input && input.data && Array.isArray(input.data.labels)) return input.data;
  return null;
}

/**
 * Komponen Analitik Kehadiran Sekolah Terpadu (SSOT untuk Admin & Kepala Sekolah):
 * 1. Tren Kehadiran Sekolah (Guru vs Siswa) dalam persentase harian.
 * 2. Distribusi Kehadiran Siswa Hari Ini (Hadir, Sakit, Izin, Alpa).
 */
export const SchoolAttendanceAnalytics: React.FC<SchoolAttendanceAnalyticsProps> = React.memo(({
  studentChartData,
  teacherChartData,
  stats,
  height = 220,
}) => {
  const trendData = useMemo(() => {
    const siswaPayload = unwrapChart(studentChartData);
    const guruPayload = unwrapChart(teacherChartData);
    const labels: string[] = siswaPayload?.labels || guruPayload?.labels || [];
    if (labels.length === 0) return [];

    const siswaDatasets = siswaPayload?.datasets || [];
    const guruDatasets = guruPayload?.datasets || [];
    const siswaHadirDs = siswaDatasets.find((d) => String(d.label || '').toLowerCase() === 'hadir');
    const guruHadirDs = guruDatasets.find((d) => String(d.label || '').toLowerCase() === 'hadir');

    const totalSiswa = Number(stats?.total_siswa) || 0;
    const totalGuru = Number(stats?.total_guru) || 0;

    return labels.map((label: string, index: number) => {
      const siswaRaw = Number(siswaHadirDs?.data?.[index] ?? 0);
      const guruRaw = Number(guruHadirDs?.data?.[index] ?? 0);

      const siswaPct = totalSiswa > 0 ? Math.min(100, Math.round((siswaRaw / totalSiswa) * 100)) : 0;
      const guruPct = totalGuru > 0 ? Math.min(100, Math.round((guruRaw / totalGuru) * 100)) : 0;

      return {
        name: label,
        Siswa: siswaPct,
        Guru: guruPct,
      };
    });
  }, [studentChartData, teacherChartData, stats?.total_siswa, stats?.total_guru]);

  const distributionData = useMemo(
    () =>
      [
        { name: 'Hadir', value: stats?.siswa_hadir || 0 },
        { name: 'Sakit', value: stats?.siswa_sakit || 0 },
        { name: 'Izin', value: stats?.siswa_izin || 0 },
        { name: 'Alpa', value: stats?.siswa_alpa || 0 },
      ].filter((d) => d.value > 0),
    [stats?.siswa_hadir, stats?.siswa_sakit, stats?.siswa_izin, stats?.siswa_alpa]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <CompactSectionCard title="Tren Kehadiran Sekolah (Guru vs Siswa)" icon={TrendingUp} iconColor="blue">
        <div style={{ height }} className="w-full pt-2">
          {trendData.length > 0 ? (
            <ResponsiveContainer minWidth={0} width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, undefined]}
                  contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="Siswa" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Guru" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              Data tren kehadiran belum tersedia
            </div>
          )}
        </div>
      </CompactSectionCard>

      <CompactSectionCard title="Distribusi Kehadiran Siswa Hari Ini" icon={Users} iconColor="indigo">
        <div className="flex flex-col sm:flex-row items-center gap-6" style={{ minHeight: height }}>
          <div className="w-full sm:w-1/2 h-44">
            {distributionData.length > 0 ? (
              <ResponsiveContainer minWidth={0} width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {distributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Belum ada presensi hari ini
              </div>
            )}
          </div>
          <div className="w-full sm:w-1/2 space-y-2">
            {distributionData.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-slate-600 dark:text-slate-300 font-bold uppercase">{item.name}</span>
                </div>
                <span className="font-black text-slate-900 dark:text-white">{item.value} Siswa</span>
              </div>
            ))}
          </div>
        </div>
      </CompactSectionCard>
    </div>
  );
});

SchoolAttendanceAnalytics.displayName = 'SchoolAttendanceAnalytics';
