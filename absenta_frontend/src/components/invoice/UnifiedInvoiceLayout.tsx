/**
 * Unified Invoice Layout Component
 * Wrapper component yang menggunakan BaseLayout untuk modul invoice
 * Menyediakan konfigurasi dan data yang spesifik untuk invoice
 */

import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FileText, 
  DollarSign, 
  Send, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus
} from 'lucide-react';

import BaseLayout from '../common/BaseLayout';
import { ErrorBoundary } from '../common/ErrorBoundary';
import type { BaseMetricCard } from '../common/BaseLayout';
import { 
  invoiceTabItems, 
  invoicePageConfig, 
  getPageConfig, 
  getTabItems 
} from '../../config/layoutConfig';
import { 
  formatCurrency, 
  formatNumber, 
  formatPercentage,
  generateMetrics,
  extractErrorMessage
} from '../../utils/layoutUtils';

// Import API functions (akan disesuaikan dengan API yang ada)
import { getInvoiceStats } from '../../api/invoice.api';

interface InvoiceStats {
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  draft_count: number;
  sent_count: number;
  paid_count: number;
  overdue_count: number;
  this_month_count: number;
  last_month_count: number;
  growth_rate: number;
  average_amount: number;
}

interface UnifiedInvoiceLayoutProps {
  /** Children content */
  children: ReactNode;
  /** Override page key untuk konfigurasi */
  pageKey?: string;
  /** Override title */
  title?: string;
  /** Override subtitle */
  subtitle?: string;
  /** Override showOverview */
  showOverview?: boolean;
  /** Custom breadcrumb items */
  breadcrumbItems?: Array<{ label: string; path?: string }>;
  /** Custom metrics */
  customMetrics?: BaseMetricCard[];
}

const UnifiedInvoiceLayout: React.FC<UnifiedInvoiceLayoutProps> = ({
  children,
  pageKey,
  title,
  subtitle,
  showOverview,
  breadcrumbItems = [],
  customMetrics
}) => {
  const location = useLocation();
  
  // State untuk metrics
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  /**
   * Mendapatkan page key dari URL jika tidak disediakan
   */
  const getCurrentPageKey = (): string => {
    if (pageKey) return pageKey;
    
    const path = location.pathname;
    if (path.includes('/invoice/create')) return 'create';
    // Sesuaikan dengan route yang digunakan: /invoice/list
    if (path.includes('/invoice/list')) return 'invoices';
    return 'dashboard';
  };

  const currentPageKey = getCurrentPageKey();
  const pageConfig = getPageConfig('invoice', currentPageKey);

  /**
   * Load invoice statistics
   */
  const loadInvoiceStats = async () => {
    try {
      setMetricsLoading(true);
      setMetricsError(null);
      const response = await getInvoiceStats();
      const raw = (response as any)?.data ?? {};
      const totalInvoices = Number(raw?.total_invoices ?? 0);
      const totalAmount = Number(raw?.total_amount ?? 0);
      const thisMonth = Number(raw?.this_month_count ?? 0);
      const lastMonth = Number(raw?.last_month_count ?? 0);
      const normalized: InvoiceStats = {
        total_invoices: totalInvoices,
        total_amount: totalAmount,
        paid_amount: Number(raw?.paid_amount ?? 0),
        pending_amount: Number(raw?.unpaid_amount ?? raw?.pending_amount ?? 0),
        overdue_amount: Number(raw?.overdue_amount ?? 0),
        draft_count: Number(raw?.draft_invoices ?? raw?.draft_count ?? 0),
        sent_count: Number(raw?.sent_invoices ?? raw?.sent_count ?? 0),
        paid_count: Number(raw?.paid_invoices ?? raw?.paid_count ?? 0),
        overdue_count: Number(raw?.overdue_invoices ?? raw?.overdue_count ?? 0),
        this_month_count: thisMonth,
        last_month_count: lastMonth,
        growth_rate: lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0,
        average_amount: totalInvoices > 0 ? Math.round(totalAmount / totalInvoices) : 0
      };
      setStats(normalized);
    } catch (error) {
      console.error('Error loading invoice stats:', error);
      setMetricsError(extractErrorMessage(error));
    } finally {
      setMetricsLoading(false);
    }
  };

  /**
   * Generate metrics dari stats
   */
  const generateInvoiceMetrics = (): BaseMetricCard[] => {
    if (!stats) return [];

    if (customMetrics) return customMetrics;

    const growthType = stats.growth_rate > 0 ? 'positive' : stats.growth_rate < 0 ? 'negative' : 'neutral';
    const growthSign = stats.growth_rate > 0 ? '+' : '';

    return [
      {
        key: 'total_invoices',
        label: 'Total Invoices',
        value: formatNumber(stats.total_invoices),
        change: `${growthSign}${formatPercentage(stats.growth_rate)} dari bulan lalu`,
        changeType: growthType,
        icon: React.createElement(FileText, { size: 20 }),
        color: 'blue'
      },
      {
        key: 'total_amount',
        label: 'Total Amount',
        value: formatCurrency(stats.total_amount),
        change: `Rata-rata ${formatCurrency(stats.average_amount)}`,
        changeType: 'neutral',
        icon: React.createElement(DollarSign, { size: 20 }),
        color: 'green'
      },
      {
        key: 'paid_amount',
        label: 'Paid Amount',
        value: formatCurrency(stats.paid_amount),
        change: `${stats.paid_count} invoices`,
        changeType: 'positive',
        icon: React.createElement(CheckCircle, { size: 20 }),
        color: 'green'
      },
      {
        key: 'pending_amount',
        label: 'Pending Amount',
        value: formatCurrency(stats.pending_amount),
        change: `${stats.sent_count} sent, ${stats.draft_count} draft`,
        changeType: 'neutral',
        icon: React.createElement(Clock, { size: 20 }),
        color: 'yellow'
      }
    ];
  };

  /**
   * Load data saat component mount atau page berubah
   */
  useEffect(() => {
    if (showOverview !== false && pageConfig.showOverview !== false) {
      loadInvoiceStats();
    }
  }, [currentPageKey, showOverview, pageConfig.showOverview]);

  return (
    <BaseLayout
      title={title || pageConfig.title}
      subtitle={subtitle || pageConfig.subtitle}
      showOverview={showOverview !== undefined ? showOverview : pageConfig.showOverview}
      showTabs={false}
      metrics={generateInvoiceMetrics()}
      tabs={getTabItems('invoice')}
      metricsLoading={metricsLoading}
      metricsError={metricsError}
      breadcrumbItems={breadcrumbItems}
      moduleName="Invoice Management"
    >
      <ErrorBoundary
        showDetails
        onError={(error, errorInfo) => {
          const log = {
            route: location.pathname,
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString()
          };
          try {
            const existing = JSON.parse(localStorage.getItem('app_error_logs') || '[]');
            existing.push(log);
            localStorage.setItem('app_error_logs', JSON.stringify(existing));
          } catch (e) {
            // noop
          }
          const w: any = window as any;
          w.__APP_ERROR_LOGS__ = Array.isArray(w.__APP_ERROR_LOGS__)
            ? [...w.__APP_ERROR_LOGS__, log]
            : [log];
          console.error('Invoice module error:', log);
        }}
      >
        {children}
      </ErrorBoundary>
    </BaseLayout>
  );
};

export default UnifiedInvoiceLayout;
