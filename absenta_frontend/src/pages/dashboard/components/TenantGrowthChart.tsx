import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader } from '@/components/ui/Loader';

interface TenantGrowthPoint {
  month: string;
  registrations: number;
}

interface TenantGrowthChartProps {
  data: TenantGrowthPoint[];
  loading: boolean;
}

const TenantGrowthChart: React.FC<TenantGrowthChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <ResponsiveContainer minWidth={0} width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="registrations" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TenantGrowthChart;
