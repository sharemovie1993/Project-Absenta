/**
 * Unified Billing Layout Component
 * Wrapper component yang menggunakan BaseLayout untuk modul billing
 * Menyediakan konfigurasi dan data yang spesifik untuk billing
 */

import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  DollarSign, 
  FileText, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard
} from 'lucide-react';

import BaseLayout from '../common/BaseLayout';
import type { BaseMetricCard } from '../common/BaseLayout';
import { 
  billingTabItems, 
  billingPageConfig, 
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
import { getBillingStats } from '../../api/billing.api';

interface BillingStats {
  total_billings: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
  this_month_count: number;
  last_month_count: number;
  growth_rate: number;
}

interface UnifiedBillingLayoutProps {
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

const UnifiedBillingLayout: React.FC<UnifiedBillingLayoutProps> = ({
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
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  /**
   * Mendapatkan page key dari URL jika tidak disediakan
   */
  const getCurrentPageKey = (): string => {
    if (pageKey) return pageKey;
    
    const path = location.pathname;
    if (path.includes('/billing/plans')) return 'plans';
    if (path.includes('/billing/subscriptions')) return 'subscriptions';
    if (path.includes('/management/subscriptions')) return 'subscriptions';
    if (path.includes('/billing/invoices')) return 'invoices';
    if (path.includes('/billing/billings')) return 'billing';
    if (path.includes('/billing/payments')) return 'payments';
    if (path.includes('/billing/reports')) return 'reports';
    if (path.includes('/billing/settings')) return 'settings';
    return 'dashboard';
  };

  const currentPageKey = getCurrentPageKey();
  const pageConfig = getPageConfig('billing', currentPageKey);

  /**
   * Load billing statistics
   */
  const loadBillingStats = async () => {
    try {
      setMetricsLoading(true);
      setMetricsError(null);
      
      const response = await getBillingStats();
      // Adjust response structure if needed based on API
      // Assuming response.data matches BillingStats or mapping is needed
      const statsData = (response as any).data || response;
      setStats(statsData);
    } catch (error) {
      console.error('Error loading billing stats:', error);
      setMetricsError(extractErrorMessage(error));
    } finally {
      setMetricsLoading(false);
    }
  };

  /**
   * Generate metrics dari stats
   */
  const generateBillingMetrics = (): BaseMetricCard[] => {
    if (!stats) return [];

    if (customMetrics) return customMetrics;

    const growthType = stats.growth_rate > 0 ? 'positive' : stats.growth_rate < 0 ? 'negative' : 'neutral';
    const growthSign = stats.growth_rate > 0 ? '+' : '';

    return [
      {
        key: 'total_revenue',
        label: 'Total Revenue',
        value: formatCurrency(stats.total_amount),
        change: `${growthSign}${formatPercentage(stats.growth_rate)} dari bulan lalu`,
        changeType: growthType,
        icon: React.createElement(DollarSign, { size: 20 }),
        color: 'blue'
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
        change: `${stats.pending_count} invoices`,
        changeType: 'neutral',
        icon: React.createElement(Clock, { size: 20 }),
        color: 'yellow'
      },
      {
        key: 'overdue_amount',
        label: 'Overdue Amount',
        value: formatCurrency(stats.overdue_amount),
        change: `${stats.overdue_count} invoices`,
        changeType: 'negative',
        icon: React.createElement(AlertTriangle, { size: 20 }),
        color: 'red'
      }
    ];
  };

  /**
   * Load data saat component mount atau page berubah
   */
  useEffect(() => {
    if (showOverview !== false && pageConfig.showOverview !== false) {
      loadBillingStats();
    }
  }, [currentPageKey, showOverview, pageConfig.showOverview]);

  return (
    <BaseLayout
      title={title || pageConfig.title}
      subtitle={subtitle || pageConfig.subtitle}
      showOverview={showOverview !== undefined ? showOverview : pageConfig.showOverview}
      showTabs={false}
      metrics={generateBillingMetrics()}
      tabs={getTabItems('billing')}
      metricsLoading={metricsLoading}
      metricsError={metricsError}
      breadcrumbItems={breadcrumbItems}
      moduleName="Billing & Payment"
    >
      {children}
    </BaseLayout>
  );
};

export default UnifiedBillingLayout;
