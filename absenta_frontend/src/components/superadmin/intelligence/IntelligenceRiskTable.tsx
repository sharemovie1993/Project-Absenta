import React, { useMemo } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Table } from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import type { TopRiskTenant } from '@/api/superadmin-intelligence.api';

function badgeVariant(level: string): 'secondary' | 'success' {
  const v = String(level || '').toUpperCase();
  if (v === 'CRITICAL' || v === 'HIGH_RISK' || v === 'WARNING') return 'secondary';
  return 'success';
}

export function IntelligenceRiskTable({ data, loading }: { data: TopRiskTenant[]; loading: boolean }) {
  const columns: Column[] = useMemo(
    () => [
      {
        key: 'tenantName',
        label: 'Nama Sekolah',
        render: (_val: unknown, row: TopRiskTenant) => (
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{row.tenantName || 'Unknown'}</span>
            <span className="text-xs text-gray-500 font-mono">{row.tenantId}</span>
          </div>
        ),
      },
      {
        key: 'riskScore',
        label: 'Skor Risiko',
        className: 'w-[140px]',
        render: (val: unknown) => <span className="font-semibold">{Number(val || 0)}</span>,
      },
      {
        key: 'riskLevel',
        label: 'Level Risiko',
        className: 'w-[140px]',
        render: (val: unknown) => {
          const raw = String(val);
          const upper = raw.toUpperCase();
          const label = upper === 'WARNING' ? 'Perlu Perhatian' : raw;
          return <Badge variant={badgeVariant(upper)}>{label}</Badge>;
        },
      },
    ],
    []
  );

  return (
    <Card className="shadow-sm rounded-xl border border-gray-100/80 dark:border-gray-800/80">
      <CardHeader>
        <CardTitle>Sekolah dengan Risiko Tertinggi</CardTitle>
      </CardHeader>
      <CardContent>
        <Table columns={columns} data={data || []} loading={loading} emptyMessage="Tidak ada data risk tenant." rowKey="tenantId" />
      </CardContent>
    </Card>
  );
}

export default IntelligenceRiskTable;
