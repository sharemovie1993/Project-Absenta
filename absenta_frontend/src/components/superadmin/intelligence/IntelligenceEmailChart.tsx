import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import type { EmailHealthSummary } from '@/api/superadmin-intelligence.api';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

function pct(n: number) {
  if (!Number.isFinite(n)) return '0%';
  return `${Math.round(n * 100)}%`;
}

const COLORS = {
  ok: '#10b981',
  bad: '#ef4444',
};

export function IntelligenceEmailChart({ data }: { data: EmailHealthSummary | null | undefined }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const failureRate7d = data?.failureRate7d ?? 0;
  const totalEmails7d = data?.totalEmails7d ?? 0;
  const anomalyCount7d = data?.anomalyCount7d ?? 0;

  const failed = Math.round(totalEmails7d * failureRate7d);
  const sent = Math.max(0, totalEmails7d - failed);

  const chartData = useMemo(
    () => [
      { name: 'Sent', value: sent, color: COLORS.ok },
      { name: 'Failed', value: failed, color: COLORS.bad },
    ],
    [sent, failed]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Email Health (7 hari)</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={failureRate7d > 0.2 ? 'destructive' : failureRate7d > 0.1 ? 'warning' : 'success'}>
            Failure {pct(failureRate7d)}
          </Badge>
          <Badge variant="outline">Anomali {anomalyCount7d}</Badge>
        </div>
      </CardHeader>
      <CardContent className="h-[260px] w-full min-w-0">
        <div className="w-full h-full min-h-[200px] min-w-0 relative">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
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

export default IntelligenceEmailChart;
