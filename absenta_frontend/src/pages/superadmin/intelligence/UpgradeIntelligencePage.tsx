import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle, Badge, Card, CardContent, CardHeader, CardTitle, Loader, Table, SectionCard, SearchableSelect } from '@/components/ui';
import { SuperAdminPageLayout } from '../../../components/layout/SuperAdminPageLayout';
import { superadminIntelligenceApi, type UpgradeIntentDistributionRow } from '@/api/superadmin-intelligence.api';
import { BarChart3, PieChart as PieChartIcon, Award, ShieldAlert, LineChart as LineChartIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

function formatPct(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(1)}%`;
}

function levelBadge(level: string) {
  const v = String(level || '').toUpperCase();
  if (v === 'HOT') return <Badge variant="secondary">Tinggi</Badge>;
  if (v === 'HIGH') return <Badge variant="secondary">Sedang</Badge>;
  if (v === 'WARM') return <Badge variant="secondary">Rendah</Badge>;
  return <Badge variant="secondary">Rendah</Badge>;
}

function distributionToRow(dist: UpgradeIntentDistributionRow[]) {
  const map = new Map<string, number>();
  for (const d of dist || []) {
    map.set(String(d.intent_level), Number(d?._count?._all || 0));
  }
  return ['LOW', 'WARM', 'HIGH', 'HOT'].map((k) => ({ level: k, count: map.get(k) || 0 }));
}

function levelColor(level: string): string {
  const v = String(level || '').toUpperCase();
  if (v === 'HOT') return '#22c55e';
  if (v === 'HIGH') return '#4ade80';
  if (v === 'WARM') return '#a7f3d0';
  return '#d1d5db';
}

export default function UpgradeIntelligencePage() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: ['superadmin', 'analytics', 'upgrade-intelligence', 'overview', 12],
    queryFn: async () => {
      const res = await superadminIntelligenceApi.getUpgradeOverview(12);
      return res.data;
    },
  });

  const latestMonth = overviewQuery.data?.latest_month || null;
  const month = selectedMonth || latestMonth;

  const monthQuery = useQuery({
    queryKey: ['superadmin', 'analytics', 'upgrade-intelligence', 'month', month],
    queryFn: async () => {
      if (!month) return null;
      const res = await superadminIntelligenceApi.getUpgradeMonthSnapshot(month);
      return res.data;
    },
    enabled: Boolean(month),
  });

  const anyLoading = overviewQuery.isLoading || monthQuery.isLoading;
  const anyError = overviewQuery.isError || monthQuery.isError;

  // Move hooks to the very top, before any early returns to respect the Rules of Hooks
  const monthSnapshot = monthQuery.data || null;
  const funnels = overviewQuery.data?.funnels || [];
  const months = funnels.map((f) => String(f.month)).slice().reverse();
  const funnelChartData = months.map((m) => {
    const row = funnels.find((f) => String(f.month) === m);
    const rate = row ? Number(row.conversion_rate || 0) * 100 : 0;
    return { month: m, conversion_rate: rate };
  });

  const funnel = monthSnapshot?.funnel || null;
  const distribution = distributionToRow(monthSnapshot?.intent_distribution || overviewQuery.data?.intent_distribution || []);
  const topHot = monthSnapshot?.top_hot_tenants || overviewQuery.data?.top_hot_tenants || [];
  const scatter = monthSnapshot?.risk_vs_intent_scatter || [];

  const funnelStageData = [
    { stage: 'Intent', value: funnel ? Number((funnel as any).intent_count || 0) : 0 },
    { stage: 'Invoice Created', value: funnel ? Number((funnel as any).invoice_created_count || 0) : 0 },
    { stage: 'Invoice Paid', value: funnel ? Number((funnel as any).invoice_paid_count || 0) : 0 },
    { stage: 'Upgrade Applied', value: funnel ? Number((funnel as any).upgrade_applied_count || 0) : 0 },
  ];

  const pieData = distribution.map((d) => ({ name: d.level, value: d.count, fill: levelColor(d.level) }));

  const scatterData = (scatter || []).map((s: any) => ({
    tenant_id: String(s.tenant_id),
    intent_score: Number(s.intent_score || 0),
    risk_score_snapshot: Number(s.risk_score_snapshot || 0),
    intent_level: String(s.intent_level || 'LOW'),
    upgrade_paid_count: Number(s.upgrade_paid_count || 0),
    size: Math.max(1, Math.min(20, Number(s.upgrade_paid_count || 0) + 2)),
  }));

  const statsMetrics = useMemo(() => [
    {
      title: "Minat Upgrade",
      value: funnel ? Number(funnel.intent_count || 0) : 0,
      icon: <Badge variant="info" className="text-white bg-blue-500 border-none font-bold">INT</Badge>,
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      title: "Tagihan Dibuat",
      value: funnel ? Number(funnel.invoice_created_count || 0) : 0,
      icon: <Badge variant="warning" className="text-white bg-amber-500 border-none font-bold">INV</Badge>,
      gradient: "from-amber-500 to-orange-600"
    },
    {
      title: "Upgrade Berhasil",
      value: funnel ? Number(funnel.upgrade_applied_count || 0) : 0,
      icon: <Badge variant="success" className="text-white bg-green-500 border-none font-bold">SUC</Badge>,
      gradient: "from-green-500 to-emerald-600"
    },
    {
      title: "Keberhasilan Upgrade",
      value: funnel ? formatPct(Number(funnel.conversion_rate || 0) * 100) : '0.0%',
      icon: <Badge className="text-white bg-purple-500 border-none font-bold">RATE</Badge>,
      gradient: "from-purple-500 to-pink-600"
    }
  ], [funnel]);

  // Conditional early returns (MUST be placed after all hooks definitions)
  if (anyLoading && !overviewQuery.data) {
    return (
      <div className="flex justify-center p-10">
        <Loader />
      </div>
    );
  }

  if (anyError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat Analisis Upgrade Langganan</AlertTitle>
          <AlertDescription>Pastikan snapshot bulan sudah terbentuk, lalu coba ulang.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!overviewQuery.data) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>Snapshot belum tersedia</AlertTitle>
          <AlertDescription>Upgrade Intelligence belum pernah digenerate untuk bulan ini.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const toolbarActions = (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Bulan:</span>
      <SearchableSelect
        value={month || ''}
        onValueChange={(val) => setSelectedMonth(val || null)}
        options={months.map((m) => ({ value: m, label: m }))}
        placeholder="Pilih bulan..."
        searchPlaceholder="Cari bulan..."
        triggerClassName="w-36 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 dark:text-gray-100 h-8"
      />
    </div>
  );

  return (
    <SuperAdminPageLayout
      title="Analisis Upgrade & Konversi"
      description="Analisis mendalam mengenai alur konversi minat upgrade, status tagihan, dan tingkat keberhasilan upgrade tenant."
      breadcrumbs={[
        { label: 'Analisis & Kecerdasan Bisnis', path: '/superadmin/intelligence/upgrade' },
        { label: 'Upgrade & Konversi' }
      ]}
      stats={statsMetrics}
      isLoadingStats={overviewQuery.isLoading}
      toolbar={toolbarActions}
    >

      <SectionCard
        title="Alur Proses Upgrade"
        icon={BarChart3}
        fullWidth
      >
        <div className="w-full space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Perjalanan sekolah dari minat upgrade hingga upgrade berhasil.
          </p>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[520px]">
              <BarChart
                width={500}
                height={260}
                data={funnelStageData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.4} />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card className="shadow-sm rounded-xl border border-gray-100/80 dark:border-gray-800/80">
          <CardHeader>
            <CardTitle>Minat Upgrade</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Jumlah sekolah yang menunjukkan minat untuk upgrade.
            </p>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{funnel ? Number(funnel.intent_count || 0) : 0}</CardContent>
        </Card>
        <Card className="shadow-sm rounded-xl border border-gray-100/80 dark:border-gray-800/80">
          <CardHeader>
            <CardTitle>Tagihan Dibuat</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Jumlah tagihan upgrade yang telah dibuat.
            </p>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{funnel ? Number(funnel.invoice_created_count || 0) : 0}</CardContent>
        </Card>
        <Card className="shadow-sm rounded-xl border border-gray-100/80 dark:border-gray-800/80">
          <CardHeader>
            <CardTitle>Tagihan Dibayar</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Jumlah tagihan upgrade yang sudah dibayar.
            </p>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{funnel ? Number(funnel.invoice_paid_count || 0) : 0}</CardContent>
        </Card>
        <Card className="shadow-sm rounded-xl border border-gray-100/80 dark:border-gray-800/80">
          <CardHeader>
            <CardTitle>Upgrade Berhasil</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Jumlah upgrade yang berhasil diterapkan.
            </p>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{funnel ? Number(funnel.upgrade_applied_count || 0) : 0}</CardContent>
        </Card>
        <Card className="shadow-sm rounded-xl border border-gray-100/80 dark:border-gray-800/80">
          <CardHeader>
            <CardTitle>Tingkat Keberhasilan Upgrade</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Persentase upgrade berhasil dari total minat.
            </p>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{funnel ? formatPct(Number(funnel.conversion_rate || 0) * 100) : '0.0%'}</CardContent>
        </Card>
      </div>

      <SectionCard
        title="Distribusi Minat Upgrade"
        icon={PieChartIcon}
        fullWidth
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 w-full">
          <div className="w-full flex items-center justify-center">
            <PieChart width={260} height={240}>
              <Tooltip />
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div>
            <Table
              columns={[
                { key: 'level', label: 'Tingkat Minat' },
                { key: 'count', label: 'Jumlah Sekolah' },
              ]}
              data={distribution.map((d) => ({
                level: levelBadge(d.level),
                count: d.count,
              }))}
              emptyMessage="Belum ada data distribusi intent."
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Top 10 HOT Tenants"
        icon={Award}
        fullWidth
        noPadding
      >
        <div className="p-4 w-full">
          <Table
            columns={[
              { key: 'tenant_id', label: 'Tenant' },
              { key: 'intent', label: 'Intent' },
              { key: 'attempts', label: 'Attempts' },
              { key: 'paid', label: 'Paid' },
              { key: 'overdue', label: 'Overdue' },
              { key: 'risk', label: 'Risk' },
              { key: 'growth', label: 'Usage Growth' },
            ]}
            data={topHot.map((t) => ({
              tenant_id: String((t as any).tenant_id),
              intent: (
                <div className="flex items-center gap-2">
                  {levelBadge(String((t as any).intent_level))}
                  <span className="font-semibold">{Number((t as any).intent_score || 0)}</span>
                </div>
              ),
              attempts: Number((t as any).upgrade_attempt_count || 0),
              paid: Number((t as any).upgrade_paid_count || 0),
              overdue: Number((t as any).invoice_overdue_count || 0),
              risk: Number((t as any).risk_score_snapshot || 0),
              growth: (t as any).usage_growth_percent == null ? '-' : formatPct(Number((t as any).usage_growth_percent || 0)),
            }))}
            emptyMessage="Belum ada tenant HOT untuk bulan ini."
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Risk vs Intent Scatter"
        icon={ShieldAlert}
        fullWidth
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 w-full">
          <div className="w-full overflow-x-auto">
            <div className="min-w-[520px]">
              <ScatterChart
                width={500}
                height={260}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="intent_score" name="Intent" type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis dataKey="risk_score_snapshot" name="Risk" type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <ZAxis dataKey="size" range={[20, 200]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value: any, name: any) => {
                    if (name === 'risk_score_snapshot') return [Number(value || 0), 'Risk'];
                    if (name === 'intent_score') return [Number(value || 0), 'Intent'];
                    return [value, name];
                  }}
                  labelFormatter={(_, payload: any) => {
                    const p = (payload as any)?.[0]?.payload;
                    return p ? `Tenant: ${String(p.tenant_id)}` : '';
                  }}
                />
                <Scatter data={scatterData} fill="#3b82f6">
                  {scatterData.map((p: any) => (
                    <Cell key={p.tenant_id} fill={levelColor(p.intent_level)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </div>
          </div>
          <div>
            <Table
              columns={[
                { key: 'tenant_id', label: 'Tenant' },
                { key: 'intent', label: 'Intent' },
                { key: 'risk', label: 'Risk' },
                { key: 'paid', label: 'Paid' },
              ]}
              data={scatter.map((s) => ({
                tenant_id: String((s as any).tenant_id),
                intent: (
                  <div className="flex items-center gap-2">
                    {levelBadge(String((s as any).intent_level))}
                    <span className="font-semibold">{Number((s as any).intent_score || 0)}</span>
                  </div>
                ),
                risk: Number((s as any).risk_score_snapshot || 0),
                paid: Number((s as any).upgrade_paid_count || 0),
              }))}
              emptyMessage="Belum ada data scatter untuk bulan ini."
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Upgrade Conversion Rate"
        icon={LineChartIcon}
        fullWidth
      >
        <div className="w-full overflow-x-auto">
          <div className="min-w-[520px]">
            <LineChart
              width={500}
              height={240}
              data={funnelChartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} />
              <YAxis tick={{ fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} domain={[0, 100]} />
              <Tooltip formatter={(value: any) => [formatPct(Number(value || 0)), 'Conversion']} />
              <Line type="monotone" dataKey="conversion_rate" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} name="Conversion" />
            </LineChart>
          </div>
        </div>
      </SectionCard>
    </SuperAdminPageLayout>
  );
}
