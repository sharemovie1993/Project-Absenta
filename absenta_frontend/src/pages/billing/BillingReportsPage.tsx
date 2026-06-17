import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  CreditCard, 
  Users, 
  BarChart3,
  PieChart,
  Filter,
  RefreshCw,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity,
  Target
} from 'lucide-react';
import UnifiedBillingLayout from '../../components/billing/UnifiedBillingLayout';
import StandardFilters from '../../components/billing/StandardFilters';
import StandardTable from '../../components/billing/StandardTable';
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

const BillingReportsPage: React.FC = () => {
  // State Management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentGatewayStats[]>([]);
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
        LogService.error('Error loading report data:', reportResponse.message);
      }

      if (paymentStatsResponse.success) {
        setPaymentStats(paymentStatsResponse.data);
      } else {
        LogService.error('Error loading payment stats:', paymentStatsResponse.message);
      }

      if (trendsResponse.success) {
        setSubscriptionTrends(trendsResponse.data);
      } else {
        LogService.error('Error loading subscription trends:', trendsResponse.message);
      }

      if (revenueResponse.success) {
        setRevenueBreakdown(revenueResponse.data);
      } else {
        LogService.error('Error loading revenue breakdown:', revenueResponse.message);
      }

    } catch (err: any) {
      LogService.error('Error loading reports data:', err);
      setError(err.message || 'Gagal memuat data laporan');
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
    } catch (err: any) {
      LogService.error('Error generating report:', err);
      setError(err.message || 'Gagal membuat laporan');
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
    } catch (err: any) {
      LogService.error('Error exporting report:', err);
      setError(err.message || 'Gagal mengekspor laporan');
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
    } catch (err: any) {
      LogService.error('Error scheduling report:', err);
      setError(err.message || 'Gagal membuat jadwal laporan');
    }
  };

  // Tidak perlu formatter lokal untuk angka; gunakan layoutUtils.formatNumber

  useEffect(() => {
    loadReportsData();
  }, [filters]);

  // Konfigurasi halaman
  const pageConfig = BILLING_PAGE_CONFIG.reports;

  if (loading) {
    return (
      <UnifiedBillingLayout pageKey="reports" title={pageConfig.title} subtitle={pageConfig.subtitle}>
        <div className="flex justify-center items-center h-64">
          <Loader className="w-8 h-8 animate-spin" />
        </div>
      </UnifiedBillingLayout>
    );
  }

  return (
    <UnifiedBillingLayout pageKey="reports" title={pageConfig.title} subtitle={pageConfig.subtitle}>
      {error && (
        <EnhancedAlert
          variant="destructive"
          title="Error"
          description={error}
          dismissible
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}
      {success && (
        <EnhancedAlert
          variant="success"
          title="Success"
          description={success}
          dismissible
          onDismiss={() => setSuccess(null)}
          className="mb-4"
        />
      )}
      {(
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleExportReport('pdf')}
            disabled={isExporting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isExporting ? <Loader className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            Export PDF
          </Button>
          <Button
            onClick={() => handleExportReport('excel')}
            disabled={isExporting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isExporting ? <Loader className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            Export Excel
          </Button>
          <Button
            onClick={() => setShowScheduleModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Calendar className="w-4 h-4" />
            Jadwal Laporan
              </Button>
            </div>
          )}
          <div className="space-y-6">
            {/* Filter Laporan */}
            <StandardFilters
              searchTerm=""
              onSearchChange={() => {}}
              statusFilter={filters.status}
              onStatusFilterChange={(status: string) => setFilters({...filters, status: status as 'all' | 'active' | 'inactive' | 'pending'})}
              onRefresh={loadReportsData}
              searchPlaceholder="Cari laporan..."
              statusOptions={[
                { value: 'all', label: 'Semua Status' },
                { value: 'active', label: 'Aktif' },
                { value: 'inactive', label: 'Tidak Aktif' },
                { value: 'pending', label: 'Pending' }
              ]}
              additionalFilters={
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <SearchableSelect
                      value={filters.report_type}
                      onValueChange={(val) => setFilters({...filters, report_type: val as any})}
                      options={[
                        { label: 'Laporan Pendapatan', value: 'revenue' },
                        { label: 'Laporan Langganan', value: 'subscription' },
                        { label: 'Laporan Pembayaran', value: 'payment' },
                        { label: 'Analisis Churn', value: 'churn' }
                      ]}
                      placeholder="Pilih Tipe Laporan"
                      searchPlaceholder="Cari tipe laporan..."
                      triggerClassName="w-full"
                    />
                  </div>
                  <div>
                    <SearchableSelect
                      value={filters.date_range}
                      onValueChange={(val) => setFilters({...filters, date_range: val as any})}
                      options={[
                        { label: '7 Hari Terakhir', value: 'last_7_days' },
                        { label: '30 Hari Terakhir', value: 'last_30_days' },
                        { label: '3 Bulan Terakhir', value: 'last_3_months' },
                        { label: '6 Bulan Terakhir', value: 'last_6_months' },
                        { label: '1 Tahun Terakhir', value: 'last_year' },
                        { label: 'Kustom', value: 'custom' }
                      ]}
                      placeholder="Pilih Rentang Waktu"
                      searchPlaceholder="Cari rentang waktu..."
                      triggerClassName="w-full"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleGenerateReport}
                      disabled={isGenerating}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isGenerating ? <Loader className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                      Generate Laporan
                    </Button>
                  </div>
                </div>
              }
            />

            {/* Custom Date Range Fields */}
            {filters.date_range === 'custom' && (
              <div
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Mulai
                    </label>
                    <Input
                      type="date"
                      value={filters.start_date}
                      onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Selesai
                    </label>
                    <Input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Empty State for Custom Range */}

        {/* Ringkasan Laporan Pendapatan */}
        {reportData && (
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Ringkasan Pendapatan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div 
                className="text-center p-4 bg-green-50 rounded-lg transition-transform hover:scale-102"
              >
                <div className="text-3xl font-bold text-green-600">{formatCurrency(reportData.total_revenue)}</div>
                <div className="text-sm text-gray-600">Total Pendapatan</div>
              </div>
              <div 
                className="text-center p-4 bg-blue-50 rounded-lg transition-transform hover:scale-102"
              >
                <div className="text-3xl font-bold text-blue-600">{formatCurrency(reportData.monthly_revenue)}</div>
                <div className="text-sm text-gray-600">MRR (Monthly Recurring Revenue)</div>
              </div>
              <div 
                className="text-center p-4 bg-purple-50 rounded-lg transition-transform hover:scale-102"
              >
                <div className="text-3xl font-bold text-purple-600">{formatCurrency(reportData.average_transaction_value)}</div>
                <div className="text-sm text-gray-600">ARPU (Average Revenue Per User)</div>
              </div>
              <div 
                className="text-center p-4 bg-orange-50 rounded-lg transition-transform hover:scale-102"
              >
                <div className="text-3xl font-bold text-orange-600">{formatPercentage(reportData.revenue_growth)}</div>
                <div className="text-sm text-gray-600">Pertumbuhan Pendapatan</div>
              </div>
            </div>
          </div>
        )}

        {/* Grafik Pendapatan */}
        {reportData && (
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Grafik Pendapatan Bulanan
            </h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <div className="text-gray-500">
                  📊 Grafik Pendapatan akan ditampilkan di sini
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  Data: {reportData.revenue_by_month.map(item => `${item.month}: ${formatCurrency(item.revenue)}`).join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analisis Pembayaran */}
        {paymentStats.length > 0 && (
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Analisis Payment Gateway
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Gateway</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Success Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volume</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Processing Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Failed Transactions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {paymentStats.map((gateway, index) => (
                    <tr
                      key={gateway.gateway_name}
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">{gateway.gateway_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <StatusBadge 
                            status={gateway.success_rate >= 98 ? 'active' : gateway.success_rate >= 95 ? 'pending' : 'inactive'}
                          />
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {formatPercentage(gateway.success_rate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{formatPercentage(gateway.volume_percentage)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{formatCurrency(gateway.total_revenue)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{gateway.average_processing_time}s</td>
                      <td className="px-6 py-4 whitespace-nowrap text-red-600">{formatNumber(gateway.failed_transactions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analitik Langganan */}
        {subscriptionTrends && (
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Analitik Langganan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div 
                className="text-center p-4 bg-green-50 rounded-lg transition-transform hover:scale-102"
              >
                <div className="text-2xl font-bold text-green-600">{formatNumber(subscriptionTrends.new_subscriptions)}</div>
                <div className="text-sm text-gray-600">Langganan Baru</div>
              </div>
              <div 
                className="text-center p-4 bg-blue-50 rounded-lg transition-transform hover:scale-102"
              >
                <div className="text-2xl font-bold text-blue-600">{formatNumber(subscriptionTrends.renewals)}</div>
                <div className="text-sm text-gray-600">Perpanjangan</div>
              </div>
              <div 
                className="text-center p-4 bg-red-50 rounded-lg transition-transform hover:scale-102"
              >
                <div className="text-2xl font-bold text-red-600">{formatNumber(subscriptionTrends.cancellations)}</div>
                <div className="text-sm text-gray-600">Pembatalan</div>
              </div>
              <div 
                className="text-center p-4 bg-orange-50 rounded-lg transition-transform hover:scale-102"
              >
                <div className="text-2xl font-bold text-orange-600">{formatPercentage(subscriptionTrends.churn_rate)}</div>
                <div className="text-sm text-gray-600">Churn Rate</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Metrik Tambahan</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Upgrades:</span>
                    <span className="font-medium text-green-600">{formatNumber(subscriptionTrends.upgrades)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Downgrades:</span>
                    <span className="font-medium text-red-600">{formatNumber(subscriptionTrends.downgrades)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Growth Rate:</span>
                    <span className="font-medium text-blue-600">{formatPercentage(subscriptionTrends.growth_rate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lifetime Value:</span>
                    <span className="font-medium text-purple-600">{formatCurrency(subscriptionTrends.lifetime_value)}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Trend 6 Bulan Terakhir</h4>
                <div className="space-y-1 text-xs">
                  {subscriptionTrends.monthly_trends.map((trend, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{trend.month}:</span>
                      <span>
                        <span className="text-green-600">+{trend.new}</span> |
                        <span className="text-blue-600"> ~{trend.renewals}</span> |
                        <span className="text-red-600"> -{trend.cancellations}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Breakdown */}
        {revenueBreakdown && (
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Breakdown Pendapatan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Berdasarkan Plan</h4>
                <div className="space-y-2">
                  {revenueBreakdown.by_plan.map((plan, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{plan.plan_name}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(plan.revenue)}</div>
                        <div className="text-xs text-gray-500">{plan.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Berdasarkan Region</h4>
                <div className="space-y-2">
                  {revenueBreakdown.by_region.map((region, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{region.region}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(region.revenue)}</div>
                        <div className="text-xs text-gray-500">{region.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Berdasarkan Payment Method</h4>
                <div className="space-y-2">
                  {revenueBreakdown.by_payment_method.map((method, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{method.method}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(method.revenue)}</div>
                        <div className="text-xs text-gray-500">{method.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Report Modal */}
        {showScheduleModal && (
          <Modal
            isOpen={showScheduleModal}
            onClose={() => setShowScheduleModal(false)}
            title="Jadwal Laporan Otomatis"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frekuensi
                </label>
                <SearchableSelect
                  value={scheduleData.frequency}
                  onValueChange={(val) => setScheduleData({...scheduleData, frequency: val as 'daily' | 'weekly' | 'monthly'})}
                  options={[
                    { value: "daily", label: "Harian" },
                    { value: "weekly", label: "Mingguan" },
                    { value: "monthly", label: "Bulanan" }
                  ]}
                  placeholder="Pilih Frekuensi"
                  searchPlaceholder="Cari frekuensi..."
                  triggerClassName="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Tujuan
                </label>
                <Input
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
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  onClick={() => setShowScheduleModal(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleScheduleReport}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Calendar className="w-4 h-4" />
                  Buat Jadwal
                </Button>
              </div>
            </div>
          </Modal>
        )}
          </div>
      </UnifiedBillingLayout>
      );
};

export default BillingReportsPage;

