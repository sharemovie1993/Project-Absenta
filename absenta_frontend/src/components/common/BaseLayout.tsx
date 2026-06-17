/**
 * Base Layout Component
 * Komponen layout dasar yang dapat digunakan oleh modul billing dan invoice
 * untuk memastikan konsistensi UI dan UX di seluruh aplikasi
 */

import React from 'react';
import type { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRightIcon } from 'lucide-react';

// Types untuk base layout
export interface BaseTabItem {
  key: string;
  label: string;
  path: string;
  icon: ReactNode;
}

export interface BaseMetricCard {
  key: string;
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
}

export interface BaseLayoutProps {
  /** Judul halaman */
  title: string;
  /** Subtitle halaman */
  subtitle?: string;
  /** Apakah menampilkan overview metrics */
  showOverview?: boolean;
  /** Apakah menampilkan tab navigasi */
  showTabs?: boolean;
  /** Data metrics untuk overview */
  metrics?: BaseMetricCard[];
  /** Tab navigation items */
  tabs: BaseTabItem[];
  /** Children content */
  children: ReactNode;
  /** Loading state untuk metrics */
  metricsLoading?: boolean;
  /** Error state untuk metrics */
  metricsError?: string | null;
  /** Custom breadcrumb items */
  breadcrumbItems?: Array<{ label: string; path?: string }>;
  /** Module name untuk breadcrumb */
  moduleName: string;
}

/**
 * Utility function untuk mendapatkan warna gradient berdasarkan tipe
 */
const getColorClasses = (color: BaseMetricCard['color']) => {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600'
  };
  return colorMap[color] || colorMap.blue;
};

/**
 * Utility function untuk mendapatkan warna change indicator
 */
const getChangeColor = (changeType: BaseMetricCard['changeType']) => {
  switch (changeType) {
    case 'positive':
      return 'text-green-100';
    case 'negative':
      return 'text-red-100';
    default:
      return 'text-gray-100';
  }
};

/**
 * Animation configuration untuk framer-motion
 */
const animationConfig = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  title,
  subtitle,
  showOverview = true,
  showTabs = true,
  metrics = [],
  tabs,
  children,
  metricsLoading = false,
  metricsError = null,
  breadcrumbItems = [],
  moduleName
}) => {
  const location = useLocation();

  /**
   * Mendapatkan tab yang sedang aktif berdasarkan path
   */
  const getCurrentTab = () => {
    const currentPath = location.pathname;
    return tabs.find(tab => tab.path === currentPath) || tabs[0];
  };

  const currentTab = getCurrentTab();

  /**
   * Render metric card component
   */
  const renderMetricCard = (metric: BaseMetricCard, index: number) => (
    <motion.div
      key={metric.key}
      {...animationConfig}
      transition={{ ...animationConfig.transition, delay: index * 0.1 }}
      className={`bg-gradient-to-r ${getColorClasses(metric.color)} p-6 rounded-lg text-white shadow-lg hover:shadow-xl transition-shadow duration-300`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-white/80 text-sm font-medium mb-1">
            {metric.label}
          </p>
          <p className="text-2xl font-bold mb-1">
            {typeof metric.value === 'number' 
              ? metric.value.toLocaleString('id-ID') 
              : metric.value
            }
          </p>
          {metric.change && (
            <p className={`text-sm ${getChangeColor(metric.changeType)}`}>
              {metric.change}
            </p>
          )}
        </div>
        <div className="text-3xl opacity-80">
          {metric.icon}
        </div>
      </div>
    </motion.div>
  );

  /**
   * Render loading skeleton untuk metrics
   */
  const renderMetricsLoading = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-200 animate-pulse p-6 rounded-lg">
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-8 bg-gray-300 rounded mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );

  /**
   * Render error state untuk metrics
   */
  const renderMetricsError = () => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center">
        <div className="text-red-400 mr-3">⚠️</div>
        <div>
          <h3 className="text-red-800 font-medium">Error Loading Metrics</h3>
          <p className="text-red-600 text-sm mt-1">{metricsError}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb bg-white border-b border-gray-200">
        <div className="px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-4">
                <li>
                  <div className="flex items-center">
                    <Link 
                      to="/dashboard" 
                      className="text-gray-400 hover:text-gray-500 transition-colors"
                    >
                      Dashboard
                    </Link>
                  </div>
                </li>
                <li>
                  <div className="flex items-center">
                    <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                    <span className="ml-4 text-sm font-medium text-gray-500">
                      {moduleName}
                    </span>
                  </div>
                </li>
                {breadcrumbItems.map((item, index) => (
                  <li key={index}>
                    <div className="flex items-center">
                      <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                      {item.path ? (
                        <Link 
                          to={item.path}
                          className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className="ml-4 text-sm font-medium text-gray-900">
                          {item.label}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
                {currentTab && (
                  <li>
                    <div className="flex items-center">
                      <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                      <span className="ml-4 text-sm font-medium text-gray-900">
                        {currentTab.label}
                      </span>
                    </div>
                  </li>
                )}
              </ol>
            </nav>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <motion.div 
        {...animationConfig}
        className="page-header bg-white border-b border-gray-200"
      >
        <div className="px-4 md:px-6 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          {showTabs && (
            <div className="mt-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {tabs.map((tab) => {
                    const isActive = currentTab.key === tab.key;
                    return (
                      <Link
                        key={tab.key}
                        to={tab.path}
                        className={`
                          flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                          ${isActive
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-primary hover:border-primary/50'
                          }
                        `}
                      >
                        <span className="mr-2">{tab.icon}</span>
                        {tab.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Overview Metrics Section */}
      {showOverview && (
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 md:px-6 py-6">
            {metricsLoading ? (
              renderMetricsLoading()
            ) : metricsError ? (
              renderMetricsError()
            ) : metrics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, index) => renderMetricCard(metric, index))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No metrics available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <motion.main 
        {...animationConfig}
        transition={{ ...animationConfig.transition, delay: 0.2 }}
        className="px-4 md:px-6 py-6"
      >
        {children}
      </motion.main>
    </div>
  );
};

export default BaseLayout;
