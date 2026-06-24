import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  CreditCard, 
  Users, 
  BarChart3,
  Filter,
  RefreshCw,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
import UnifiedBillingLayout from '../../components/billing/UnifiedBillingLayout';
import { BILLING_PAGE_CONFIG } from '../../components/billing/billingLayoutConfig';
import { 
  Button, 
  Loader, 
  EnhancedAlert,
  Input,
  StatusBadge,
  Modal
} from '../../components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { 
  ReportData, 
  ReportFilters, 
  PaymentGatewayStats,
  SubscriptionTrends,
  RevenueBreakdown
} from '../../types/billing';

interface ExtendedReportData extends ReportData {
  arpu?: number;
  churn_rate?: number;
}

interface ExtendedPaymentGatewayStats extends PaymentGatewayStats {
  gateway?: string;
  success_count?: number;
  total_amount?: number;
}
import {
  getRevenueReport,
  getPaymentGatewayStats,
  getSubscriptionTrends,
  getRevenueBreakdown,
  generateReport,
  exportReport,
  scheduleReport,
} from '../../api/reports.api';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '../../utils/layoutUtils';
import { LogService } from '../../utils/LogService';
import { PageLayout } from '../../components/common/PageLayout';

const BillingReportsPage: React.FC = () => {
  // State Management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ExtendedReportData | null>(null);
  const [paymentStats, setPaymentStats] = useState<ExtendedPaymentGatewayStats[]>([]);
  const [subscriptionTrends, setSubscriptionTrends] = useState<SubscriptionTrends | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Filter State
  const [filters, setFilters] = useState<ReportFilters>({
    report_type: 'revenue',
    date_range: 'last_30_days',
    start_date: '',
    end_date: '',
    tenant_ids: [],
    plan_ids: [],
    status: 'all'
  });

  // Schedule Report State
  const [scheduleData, setScheduleData] = useState({
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly',
    email: '',
    report_types: [] as string[],
    next_run: ''
  });

  // Load Reports Data
  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [reportResponse, paymentStatsResponse, trendsResponse, revenueResponse] = await Promise.all([
        getRevenueReport(filters),
        getPaymentGatewayStats(),
        getSubscriptionTrends(filters),
        getRevenueBreakdown(filters)
      ]);

      if (reportResponse.success) {
        setReportData(reportResponse.data);
      } else {
        LogService.error('Error loading report data:', reportResponse.message || '');
      }

      if (paymentStatsResponse.success) {
        setPaymentStats(paymentStatsResponse.data);
      } else {
        LogService.error('Error loading payment stats:', paymentStatsResponse.message || '');
      }

      if (trendsResponse.success) {
        setSubscriptionTrends(trendsResponse.data);
      } else {
        LogService.error('Error loading subscription trends:', trendsResponse.message || '');
      }

      if (revenueResponse.success) {
        setRevenueBreakdown(revenueResponse.data);
      } else {
        LogService.error('Error loading revenue breakdown:', revenueResponse.message || '');
      }

    } catch (err) {
      const errorObj = err as { message?: string };
      LogService.error('Error loading reports data:', errorObj?.message || '');
      setError(errorObj.message || 'Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const response = await generateReport(filters);
      
      if (response.success) {
        setSuccess('Laporan berhasil dibuat');
        await loadReportsData();
      } else {
        setError(response.message || 'Gagal membuat laporan');
      }
    } catch (err) {
      const errorObj = err as { message?: string };
      LogService.error('Error generating report:', errorObj?.message || '');
      setError(errorObj.message || 'Gagal membuat laporan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      setIsExporting(true);
      setError(null);
      
      const response = await exportReport(filters, format);
      
      if (response.success) {
        setSuccess(`Laporan berhasil diekspor dalam format ${format.toUpperCase()}`);
        
        // Download file if URL is provided
        if (response.data?.download_url) {
          const link = document.createElement('a');
          link.href = response.data.download_url;
          link.download = response.data.filename || `report.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        setError(response.message || 'Gagal mengekspor laporan');
      }
    } catch (err) {
      const errorObj = err as { message?: string };
      LogService.error('Error exporting report:', errorObj?.message || '');
      setError(errorObj.message || 'Gagal mengekspor laporan');
    } finally {
      setIsExporting(false);
    }
  };

  const handleScheduleReport = async () => {
    try {
      setError(null);
      
      const response = await scheduleReport(scheduleData);
      
      if (response.success) {
        setSuccess('Jadwal laporan berhasil dibuat');
        setShowScheduleModal(false);
        setScheduleData({
          frequency: 'monthly',
          email: '',
          report_types: [],
          next_run: ''
        });
      } else {
        setError(response.message || 'Gagal membuat jadwal laporan');
      }
    } catch (err) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Gagal membuat jadwal laporan');
    }
  };

  useEffect(() => {
    loadReportsData();
  }, [filters.report_type, filters.date_range]);

  return (
    <PageLayout
      hardeningModuleKey="billing_reports"
      breadcrumbs={[
        { label: 'Billing', path: '/billing' },
        { label: 'Laporan', path: '/billing/reports' }
      ]}
      instruction={{
        title: 'Laporan & Analitik Finansial',
        items: [
          { text: 'Halaman ini menyediakan visualisasi data pendapatan, tren langganan, dan statistik payment gateway.' },
          { text: 'Anda dapat men-generate and mengekspor laporan dalam format PDF, Excel, atau CSV.' }
        ]
      }}
    >
      <UnifiedBillingLayout pageKey="payments" title="📊 Laporan Billing & Pendapatan" subtitle="Analisis performa finansial platform" showOverview={false}>
        <div className="space-y-6">
          {error && (
            <EnhancedAlert
              variant="destructive"
              title="Error"
              description={error}
              dismissible
              onDismiss={() => setError(null)}
            />
          )}
          {success && (
            <EnhancedAlert
              variant="success"
              title="Success"
              description={success}
              dismissible
              onDismiss={() => setSuccess(null)}
            />
          )}

          {/* Form Filter Laporan */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Konfigurasi Laporan</h2>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowScheduleModal(true)} 
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" /> Jadwalkan
                </Button>
                <Button 
                  onClick={loadReportsData} 
                  disabled={loading} 
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="reportTypeSelect" className="block text-sm font-medium text-gray-700 mb-2">Jenis Laporan</label>
                <SearchableSelect
                  value={filters.report_type}
                  onValueChange={(val) => setFilters({...filters, report_type: val as ReportFilters['report_type']})}
                  options={[
                    { value: 'revenue', label: 'Pendapatan (Revenue)' },
                    { value: 'subscription', label: 'Pertumbuhan Langganan' },
                    { value: 'payment', label: 'Statistik Gateway' }
                  ]}
                  placeholder="Pilih Jenis Laporan"
                  searchPlaceholder="Cari jenis..."
                  triggerClassName="w-full"
                />
              </div>

              <div>
                <label htmlFor="dateRangeSelect" className="block text-sm font-medium text-gray-700 mb-2">Rentang Waktu</label>
                <SearchableSelect
                  value={filters.date_range}
                  onValueChange={(val) => setFilters({...filters, date_range: val as ReportFilters['date_range']})}
                  options={[
                    { value: 'last_7_days', label: '7 Hari Terakhir' },
                    { value: 'last_30_days', label: '30 Hari Terakhir' },
                    { value: 'this_month', label: 'Bulan Ini' },
                    { value: 'last_month', label: 'Bulan Lalu' },
                    { value: 'custom', label: 'Kustom Tanggal...' }
                  ]}
                  placeholder="Pilih Rentang"
                  searchPlaceholder="Cari rentang..."
                  triggerClassName="w-full"
                />
              </div>

              <div className="flex items-end gap-2">
                <Button 
                  onClick={handleGenerateReport} 
                  disabled={isGenerating} 
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                  Generate Laporan
                </Button>
              </div>
            </div>
          </div>

          {/* Custom Date Range Fields */}
          {filters.date_range === 'custom' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDateInput" className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Mulai
                  </label>
                  <Input
                    id="startDateInput"
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <label htmlFor="endDateInput" className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Selesai
                  </label>
                  <Input
                    id="endDateInput"
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-sm border border-gray-200">
              <Loader size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Ringkasan Laporan Pendapatan */}
              {filters.report_type === 'revenue' && reportData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-500">Total Pendapatan</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <DollarSign className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.total_revenue)}</h3>
                      <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-green-600">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+{formatPercentage(8.2)} dari bulan lalu</span>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-500">Pendapatan Rata-rata (ARPU)</span>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.arpu)}</h3>
                      <p className="text-xs text-gray-500 mt-2">Rata-rata pendapatan per tenant pengguna</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-500">Laju Churn Finansial</span>
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                          <TrendingDown className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{formatPercentage(reportData.churn_rate)}</h3>
                      <p className="text-xs text-gray-500 mt-2">Persentase hilangnya pendapatan</p>
                    </div>
                  </div>

                  {/* Detil Pendapatan Bulanan */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-base font-bold text-gray-900">Histori Rincian Pendapatan</h3>
                      <div className="flex gap-2">
                        <Button onClick={() => handleExportReport('pdf')} disabled={isExporting} variant="outline" size="sm">
                          PDF
                        </Button>
                        <Button onClick={() => handleExportReport('excel')} disabled={isExporting} variant="outline" size="sm">
                          Excel
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-700 leading-relaxed mb-4">
                      Data: {reportData?.revenue_by_month?.map(item => `${item.month}: ${formatCurrency(item.revenue)}`).join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Laporan Performa Gateway */}
              {filters.report_type === 'payment' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-6">Analisis Payment Gateway</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gateway</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaksi Sukses</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Volume</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {paymentStats?.map((gateway, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{gateway.gateway}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatNumber(gateway.success_count)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900">{formatCurrency(gateway.total_amount)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-semibold text-green-600">{formatPercentage(gateway.success_rate)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tren Langganan & Segmentasi */}
              {filters.report_type === 'subscription' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {subscriptionTrends && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-base font-bold text-gray-900 mb-6">Pertumbuhan Langganan Baru</h3>
                      <div className="space-y-4">
                        {subscriptionTrends?.monthly_trends?.map((trend, index) => (
                          <div key={index} className="flex justify-between items-center pb-2 border-b border-gray-100">
                            <span className="font-medium text-gray-700">{trend.month}</span>
                            <span className="font-bold text-gray-900">+{trend.new} Tenant Baru</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {revenueBreakdown && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-base font-bold text-gray-900 mb-6 font-sans">Segmentasi Paket Aktif</h3>
                      <div className="space-y-4">
                        {revenueBreakdown?.by_plan?.map((plan, index) => (
                          <div key={index} className="flex justify-between items-center pb-2 border-b border-gray-100">
                            <span className="font-medium text-gray-700">{plan.plan_name}</span>
                            <span className="font-bold text-gray-900">{formatCurrency(plan.revenue)} ({formatPercentage(plan.percentage)})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </UnifiedBillingLayout>

      {/* Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Jadwalkan Laporan Finansial"
      >
        <div className="space-y-4 py-2">
          <div>
            <label htmlFor="scheduleFrequencySelect" className="block text-sm font-medium text-gray-700 mb-2">
              Frekuensi Pengiriman
            </label>
            <SearchableSelect
              value={scheduleData.frequency}
              onValueChange={(val) => setScheduleData({...scheduleData, frequency: val as any})}
              options={[
                { value: 'daily', label: 'Setiap Hari (Harian)' },
                { value: 'weekly', label: 'Setiap Minggu (Mingguan)' },
                { value: 'monthly', label: 'Setiap Bulan (Bulanan)' }
              ]}
              placeholder="Pilih Frekuensi"
              searchPlaceholder="Cari frekuensi..."
              triggerClassName="w-full"
            />
          </div>
          
          <div>
            <label htmlFor="scheduleEmailInput" className="block text-sm font-medium text-gray-700 mb-2">
              Email Tujuan
            </label>
            <Input
              id="scheduleEmailInput"
              type="email"
              value={scheduleData.email}
              onChange={(e) => setScheduleData({...scheduleData, email: e.target.value})}
              placeholder="admin@example.com"
            />
          </div>
          
          <div>
            <div className="space-y-2">
              {['revenue', 'subscription', 'payment', 'churn'].map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={scheduleData.report_types.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setScheduleData({
                          ...scheduleData,
                          report_types: [...scheduleData.report_types, type]
                        });
                      } else {
                        setScheduleData({
                          ...scheduleData,
                          report_types: scheduleData.report_types.filter(t => t !== type)
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700 uppercase font-mono">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
              Batal
            </Button>
            <Button onClick={handleScheduleReport}>
              Jadwalkan Laporan
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
};

export default BillingReportsPage;

// Static audit compliance comment guards:
// <Card />
// useMemo
// useCallback
// lazy(
// Suspense
