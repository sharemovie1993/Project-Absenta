import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Loader,
  Table,
} from '@/components/ui';
import {
  superadminIntelligenceApi,
  type AttendanceHealthResponse,
  type AttendanceTenantSummaryResponse,
  type AttendanceTenantTrendsResponse,
  type TopRiskTenant,
} from '@/api/superadmin-intelligence.api';
import type { Column } from '@/components/ui/Table';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

type TenantAttendanceRow = {
  tenantId: string;
  tenantName: string;
  gateP95: number | null;
  sessionP95: number | null;
};

function formatMs(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return `${Math.round(value)} ms`;
}

function ratioLabel(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return `${(value * 100).toFixed(0)}%`;
}

function anomalyVariant(isAnomaly: boolean): 'secondary' | 'success' {
  return isAnomaly ? 'secondary' : 'success';
}

function anomalyText(isAnomaly: boolean): string {
  return isAnomaly ? 'Anomali' : 'Normal';
}

function AttendanceKpiCards({ data }: { data: AttendanceHealthResponse | undefined }) {
  if (!data) {
    return null;
  }

  const items = [
    {
      label: 'Gate Avg P95',
      value: formatMs(data.kpi.attendance_gate_p95_ms),
      baseline: formatMs(data.baseline.gate_p95_median_ms),
      ratio: ratioLabel(data.deviation.gate_p95_ratio),
      anomaly: data.deviation.gate_is_anomaly,
    },
    {
      label: 'Gate Avg',
      value: formatMs(data.kpi.attendance_gate_avg_ms),
      baseline: '-',
      ratio: '-',
      anomaly: false,
    },
    {
      label: 'Session Avg P95',
      value: formatMs(data.kpi.attendance_session_p95_ms),
      baseline: formatMs(data.baseline.session_p95_median_ms),
      ratio: ratioLabel(data.deviation.session_p95_ratio),
      anomaly: data.deviation.session_is_anomaly,
    },
    {
      label: 'Session Avg',
      value: formatMs(data.kpi.attendance_session_avg_ms),
      baseline: '-',
      ratio: '-',
      anomaly: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className="shadow-sm rounded-xl border border-gray-100/80 dark:border-gray-800/80"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {item.value}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Baseline: {item.baseline}
            </div>
            {item.ratio !== '-' && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={anomalyVariant(item.anomaly)}>{anomalyText(item.anomaly)}</Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Rasio vs baseline: {item.ratio}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AttendanceTenantTable({
  rows,
  loading,
  onSelectTenant,
  selectedTenantId,
}: {
  rows: TenantAttendanceRow[];
  loading: boolean;
  onSelectTenant: (tenantId: string) => void;
  selectedTenantId: string | null;
}) {
  const columns: Column[] = useMemo(
    () => [
      {
        key: 'tenant',
        label: 'Tenant',
        render: (_val: unknown, row: TenantAttendanceRow) => (
          <button
            type="button"
            className="text-left w-full"
            onClick={() => onSelectTenant(row.tenantId)}
          >
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{row.tenantName || 'Unknown'}</span>
              <span className="text-xs text-gray-500 font-mono">{row.tenantId}</span>
            </div>
          </button>
        ),
      },
      {
        key: 'sessionP95',
        label: 'Session P95',
        className: 'w-[140px]',
        render: (val: unknown, row: TenantAttendanceRow) => (
          <span className="font-semibold">{formatMs(row.sessionP95)}</span>
        ),
      },
      {
        key: 'gateP95',
        label: 'Gate P95',
        className: 'w-[140px]',
        render: (val: unknown, row: TenantAttendanceRow) => (
          <span className="font-semibold">{formatMs(row.gateP95)}</span>
        ),
      },
    ],
    [onSelectTenant]
  );

  return (
    <Card className="shadow-sm rounded-xl border border-gray-100/80 dark:border-gray-800/80">
      <CardHeader>
        <CardTitle>Top 10 Tenant berdasarkan Session P95 (via Top Risk)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table columns={columns} data={rows} loading={loading} emptyMessage="Tidak ada data attendance tenant." rowKey="tenantId" />
      </CardContent>
    </Card>
  );
}

function AttendanceTrendChart({
  data,
  loading,
  tenantName,
}: {
  data: AttendanceTenantTrendsResponse | undefined;
  loading: boolean;
  tenantName: string | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader />
      </div>
    );
  }

  if (!data || !data.points.length) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">
        Tidak ada data tren attendance.
      </div>
    );
  }

  return (
    <Card className="shadow-sm rounded-xl border border-gray-100/80 dark:border-gray-800/80">
      <CardHeader>
        <CardTitle>{tenantName || 'Tren Attendance Tenant'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}`}
                domain={['auto', 'auto']}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="attendance_session_p95_ms"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                name="Session P95"
              />
              <Line
                type="monotone"
                dataKey="attendance_gate_p95_ms"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                name="Gate P95"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AttendancePerformanceSection({
  topRiskTenants,
}: {
  topRiskTenants: TopRiskTenant[];
}) {
  const attendanceHealthQuery = useQuery({
    queryKey: ['superadmin', 'intelligence', 'attendance-health'],
    queryFn: async () => {
      const res = await superadminIntelligenceApi.getAttendanceHealth();
      return res.data;
    },
  });

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTenantId && topRiskTenants && topRiskTenants.length > 0) {
      setSelectedTenantId(topRiskTenants[0].tenantId);
    }
  }, [selectedTenantId, topRiskTenants]);

  const tenantSummaryQueries = useMemo(
    () =>
      (topRiskTenants || []).slice(0, 10).map((tenant) => ({
        tenant,
        query: {
          queryKey: ['superadmin', 'intelligence', 'attendance-tenant-summary', tenant.tenantId],
          queryFn: async () => {
            const res = await superadminIntelligenceApi.getAttendanceTenantSummary(tenant.tenantId);
            return res.data;
          },
          staleTime: 5 * 60 * 1000,
        },
      })),
    [topRiskTenants]
  );

  const rows: TenantAttendanceRow[] = [];
  let anyTenantSummaryLoading = false;

  for (const item of tenantSummaryQueries) {
    const query = useQuery<AttendanceTenantSummaryResponse | undefined>(item.query as any);
    if (query.isLoading && !query.data) {
      anyTenantSummaryLoading = true;
    }
    if (query.data) {
      rows.push({
        tenantId: item.tenant.tenantId,
        tenantName: item.tenant.tenantName,
        gateP95: query.data.today.attendance_gate_p95_ms,
        sessionP95: query.data.today.attendance_session_p95_ms,
      });
    }
  }

  const sortedRows = rows.slice().sort((a, b) => {
    const av = Number.isFinite(a.sessionP95 || 0) ? Number(a.sessionP95 || 0) : 0;
    const bv = Number.isFinite(b.sessionP95 || 0) ? Number(b.sessionP95 || 0) : 0;
    return bv - av;
  });

  const selectedTenantName =
    topRiskTenants.find((t) => t.tenantId === selectedTenantId)?.tenantName || null;

  const attendanceTrendQuery = useQuery({
    queryKey: ['superadmin', 'intelligence', 'attendance-tenant-trends', selectedTenantId],
    enabled: !!selectedTenantId,
    queryFn: async () => {
      if (!selectedTenantId) return null;
      const res = await superadminIntelligenceApi.getAttendanceTenantTrends(selectedTenantId, 30);
      return res.data;
    },
  });

  if (attendanceHealthQuery.isLoading && !attendanceHealthQuery.data) {
    return (
      <div className="flex justify-center p-6">
        <Loader />
      </div>
    );
  }

  if (attendanceHealthQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Gagal memuat Attendance Performance</AlertTitle>
        <AlertDescription>Periksa koneksi atau coba ulang.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <AttendanceKpiCards data={attendanceHealthQuery.data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AttendanceTenantTable
          rows={sortedRows}
          loading={anyTenantSummaryLoading}
          onSelectTenant={setSelectedTenantId}
          selectedTenantId={selectedTenantId}
        />
        <AttendanceTrendChart
          data={attendanceTrendQuery.data || undefined}
          loading={attendanceTrendQuery.isLoading && !attendanceTrendQuery.data}
          tenantName={selectedTenantName}
        />
      </div>
    </div>
  );
}
