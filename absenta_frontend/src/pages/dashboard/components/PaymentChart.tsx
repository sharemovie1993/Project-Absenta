import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../../../components/ui/Card';
import { getPaymentChart } from '../../../api/dashboard.api';

interface ChartData {
  month: string;
  amount: number;
}

const PaymentChart = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = async (attempt = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getPaymentChart();
      
      // Validate response data
      if (response && response.data && Array.isArray(response.data)) {
        setData(response.data);
      } else if (response && Array.isArray(response)) {
        setData(response);
      } else {
        throw new Error('Invalid data format received from API');
      }
      
      setRetryCount(0);
    } catch (error: any) {
      console.error('Error fetching payment chart data:', error);
      
      if (attempt < 2) {
        // Retry up to 2 times
        setTimeout(() => {
          fetchData(attempt + 1);
        }, 1000 * (attempt + 1)); // Exponential backoff
        return;
      }
      
      // After all retries failed, show error
      setError(error.response?.data?.message || error.message || 'Gagal mengambil data chart pembayaran');
      setData([]); // Clear data instead of using mock data
      setRetryCount(attempt);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetry = () => {
    setRetryCount(0);
    fetchData();
  };

  if (loading) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-3">Tren Pembayaran</h3>
          <div className="h-[250px] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <div className="text-sm text-gray-500">Memuat data chart...</div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-3">Tren Pembayaran</h3>
          <div className="h-[250px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 mb-2">
                <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm text-gray-600 mb-3">{error}</div>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-3">Tren Pembayaran</h3>
          <div className="h-[250px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 mb-2">
                <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-sm text-gray-500">Tidak ada data pembayaran tersedia</div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-3">Tren Pembayaran</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="month" 
              className="text-sm"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-sm"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
            />
            <Tooltip 
              formatter={(value: any) => [`Rp ${(Number(value) || 0).toLocaleString('id-ID')}`, 'Jumlah']}
              labelFormatter={(label) => `Bulan: ${label}`}
              contentStyle={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#2563EB" 
              strokeWidth={2} 
              dot={{ r: 3, fill: '#2563EB' }}
              activeDot={{ r: 5, fill: '#2563EB' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default PaymentChart;
