import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface StatusDataEntry {
  name: string;
  value: number;
  color: string;
}

interface MemberParticipationChartProps {
  statusData: StatusDataEntry[];
}

export const MemberParticipationChart: React.FC<MemberParticipationChartProps> = React.memo(({
  statusData
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
      <div className="space-y-2 max-w-sm">
        <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-3 bg-emerald-500 rounded" />
          Status Partisipasi Anggota
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Grafik ini memvisualisasikan persentase keaktifan anggota koperasi sekolah saat ini. Anggota aktif berhak menggunakan fasilitas pinjaman, simpanan, dan belanja di POS koperasi.
        </p>
      </div>
      <div className="h-48 w-full md:w-80 shrink-0">
        <ResponsiveContainer minWidth={0} width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
              itemStyle={{ color: '#fff' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={28} 
              formatter={(value) => <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
