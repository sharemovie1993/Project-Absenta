import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import type { PaymentHealthSummary } from '@/api/superadmin-intelligence.api';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

function pct(n: number) {
  if (!Number.isFinite(n)) return '0%';
  return `${Math.round(n * 100)}%`;
}

export function IntelligencePaymentChart({ data }: { data: PaymentHealthSummary | null | undefined }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const failureRate7d = data?.failureRate7d ?? 0;
  const overdueCount = data?.overdueCount ?? 0;
  const suspensionCount = data?.suspensionCount ?? 0;

  const chartData = useMemo(
    () => [
      { name: 'Failure Rate', value: Math.round(failureRate7d * 100) },
      { name: 'Overdue', value: overdueCount },
      { name: 'Suspended', value: suspensionCount },
    ],
    [failureRate7d, overdueCount, suspensionCount]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payment Health (7 hari)</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={failureRate7d > 0.15 ? 'destructive' : failureRate7d > 0.08 ? 'warning' : 'success'}>
            Failure {pct(failureRate7d)}
          </Badge>
          <Badge variant="outline">Overdue {overdueCount}</Badge>
        </div>
      </CardHeader>
      <CardContent className="h-[260px] w-full min-w-0">
        <div className="w-full h-full min-h-[200px] min-w-0 relative">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full min-h-[200px] flex items-center justify-center">
              <span className="text-sm text-gray-400">Loading chart...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default IntelligencePaymentChart;
