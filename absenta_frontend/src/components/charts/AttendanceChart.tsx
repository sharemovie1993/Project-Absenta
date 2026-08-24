
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ChartData } from "../../types/dashboard";

interface AttendanceChartProps {
  data: ChartData | null;
  title?: string;
  height?: number;
}

export default function AttendanceChart({ 
  data, 
  title = "Grafik Kehadiran",
  height = 300 
}: AttendanceChartProps) {
  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Tidak ada data untuk ditampilkan
        </div>
      </div>
    );
  }

  // Transform API data to chart format
  const chartData = data.labels.map((label, index) => {
    const dataPoint: any = { day: label };
    data.datasets.forEach(dataset => {
      dataPoint[dataset.label] = dataset.data[index] || 0;
    });
    return dataPoint;
  });

  // Color mapping for different attendance types
  const colorMap: { [key: string]: string } = {
    'HADIR': '#10b981',
    'SAKIT': '#f59e0b',
    'IZIN': '#3b82f6',
    'ALPA': '#ef4444',
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer minWidth={0} width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          />
          <Legend />
          {data.datasets.map((dataset, idx) => (
            <Line
              key={`${dataset.label}-${idx}`}
              type="monotone"
              dataKey={dataset.label}
              stroke={colorMap[dataset.label] || '#6b7280'}
              strokeWidth={2}
              dot={{ fill: colorMap[dataset.label] || '#6b7280', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
              name={dataset.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
