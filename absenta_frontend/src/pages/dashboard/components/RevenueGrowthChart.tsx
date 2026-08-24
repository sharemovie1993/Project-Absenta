import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader } from '@/components/ui/Loader';

interface RevenueGrowthPoint {
  month: string;
  revenue: number;
}

interface RevenueGrowthChartProps {
  data: RevenueGrowthPoint[];
  loading: boolean;
}

const RevenueGrowthChart: React.FC<RevenueGrowthChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <ResponsiveContainer minWidth={0} width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `Rp ${Number(v || 0).toLocaleString('id-ID')}`} />
        <Tooltip formatter={(value: any) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`} />
        <Area type="monotone" dataKey="revenue" stroke="#22C55E" fill="#22C55E" fillOpacity={0.2} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default RevenueGrowthChart;
