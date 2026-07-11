import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BebanGuruItem {
  nama_guru: string;
  total_jp: number;
}

interface BebanMengajarChartProps {
  data: BebanGuruItem[];
  isLoading?: boolean;
  standarMin?: number;
  standarMax?: number;
}

const STANDAR_MIN = 12;
const STANDAR_MAX = 24;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const jp = payload[0]?.value ?? 0;
  const status = jp > STANDAR_MAX ? 'Overload' : jp < STANDAR_MIN ? 'Underload' : 'Normal';
  const statusColor = jp > STANDAR_MAX ? 'text-rose-600' : jp < STANDAR_MIN ? 'text-amber-600' : 'text-emerald-600';
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-1 truncate max-w-[180px]">{label}</p>
      <p className="text-slate-500"><span className="font-black text-slate-800 dark:text-slate-100">{jp} JP</span> / minggu</p>
      <p className={cn('font-black uppercase text-[10px] mt-1', statusColor)}>{status}</p>
    </div>
  );
};

const getBarColor = (jp: number) => {
  if (jp > STANDAR_MAX) return '#f43f5e';   // rose — overload
  if (jp < STANDAR_MIN) return '#f59e0b';   // amber — underload
  return '#0d9488';                          // teal — normal
};

export const BebanMengajarChart: React.FC<BebanMengajarChartProps> = ({
  data, isLoading = false,
}) => {
  const overload = data.filter(d => d.total_jp > STANDAR_MAX).length;
  const underload = data.filter(d => d.total_jp < STANDAR_MIN).length;
  const normal = data.length - overload - underload;

  if (isLoading) {
    return (
      <div className="h-72 flex items-end gap-2 px-4 pb-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-t-md"
            style={{ height: `${40 + Math.random() * 50}%` }} />
        ))}
      </div>
    );
  }

  // Potong nama supaya tidak terlalu panjang di axis
  const chartData = data.map(d => ({
    ...d,
    label: d.nama_guru.split(',')[0].split(' ').slice(0, 2).join(' '),
  }));

  return (
    <div className="space-y-4">
      {/* Legend / Summary badges */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-900/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Normal: {normal} guru
        </span>
        {overload > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 rounded-full border border-rose-100 dark:border-rose-900/30">
            <AlertTriangle size={10} /> Overload: {overload} guru
          </span>
        )}
        {underload > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-900/30">
            <TrendingUp size={10} /> Underload: {underload} guru
          </span>
        )}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
            <XAxis
              dataKey="label"
              stroke="#94a3b8"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 30]} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100,116,139,0.05)' }} />
            <ReferenceLine y={STANDAR_MAX} stroke="#0d9488" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: `Maks ${STANDAR_MAX}JP`, position: 'insideTopRight', fontSize: 9, fill: '#0d9488' }} />
            <ReferenceLine y={STANDAR_MIN} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: `Min ${STANDAR_MIN}JP`, position: 'insideBottomRight', fontSize: 9, fill: '#f59e0b' }} />
            <Bar dataKey="total_jp" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={getBarColor(entry.total_jp)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
