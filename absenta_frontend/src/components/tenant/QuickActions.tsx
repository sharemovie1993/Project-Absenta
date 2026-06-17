import React, { useState } from 'react';
import { 
  Download, 
  RefreshCw, 
  Settings, 
  Users, 
  Calendar, 
  BarChart3,
  FileText,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface QuickActionsProps {
  tenantId: string;
  tenantName: string;
  onRefreshData?: () => void;
  onExportData?: (type: string) => void;
  onSendNotification?: () => void;
  onManageUsers?: () => void;
  onViewReports?: () => void;
  onTenantSettings?: () => void;
  className?: string;
}

interface ActionItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  description?: string;
}

/**
 * Komponen Quick Actions untuk halaman detail tenant
 */
export function QuickActions({
  tenantId,
  tenantName,
  onRefreshData,
  onExportData,
  onSendNotification,
  onManageUsers,
  onViewReports,
  onTenantSettings,
  className = ''
}: QuickActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (actionId: string, action: () => void) => {
    setIsLoading(actionId);
    try {
      await action();
    } catch (error) {
      console.error(`Error executing action ${actionId}:`, error);
    } finally {
      setIsLoading(null);
    }
  };

  const primaryActions: ActionItem[] = [
    {
      id: 'refresh',
      label: 'Refresh Data',
      icon: RefreshCw,
      action: () => onRefreshData?.(),
      variant: 'primary',
      description: 'Perbarui semua data tenant'
    },
    {
      id: 'export-attendance',
      label: 'Export Absensi',
      icon: Download,
      action: () => onExportData?.('attendance'),
      variant: 'secondary',
      description: 'Download data absensi'
    },
    {
      id: 'manage-users',
      label: 'Kelola User',
      icon: Users,
      action: () => onManageUsers?.(),
      variant: 'secondary',
      description: 'Manajemen pengguna tenant'
    },
    {
      id: 'view-reports',
      label: 'Lihat Laporan',
      icon: BarChart3,
      action: () => onViewReports?.(),
      variant: 'secondary',
      description: 'Buka dashboard laporan'
    }
  ];

  const secondaryActions: ActionItem[] = [
    {
      id: 'send-notification',
      label: 'Kirim Notifikasi',
      icon: Mail,
      action: () => onSendNotification?.(),
      variant: 'warning',
      description: 'Kirim notifikasi ke tenant'
    },
    {
      id: 'export-users',
      label: 'Export Users',
      icon: FileText,
      action: () => onExportData?.('users'),
      variant: 'secondary',
      description: 'Download data pengguna'
    },
    {
      id: 'export-billing',
      label: 'Export Billing',
      icon: Download,
      action: () => onExportData?.('billing'),
      variant: 'secondary',
      description: 'Download data billing'
    },
    {
      id: 'tenant-settings',
      label: 'Pengaturan',
      icon: Settings,
      action: () => onTenantSettings?.(),
      variant: 'secondary',
      description: 'Konfigurasi tenant'
    }
  ];

  const getButtonClasses = (variant: string, isActive: boolean = false) => {
    const baseClasses = 'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 ${isActive ? 'ring-2 ring-blue-300' : ''}`;
      case 'success':
        return `${baseClasses} bg-green-600 text-white hover:bg-green-700 ${isActive ? 'ring-2 ring-green-300' : ''}`;
      case 'warning':
        return `${baseClasses} bg-yellow-600 text-white hover:bg-yellow-700 ${isActive ? 'ring-2 ring-yellow-300' : ''}`;
      case 'danger':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700 ${isActive ? 'ring-2 ring-red-300' : ''}`;
      default: // secondary
        return `${baseClasses} bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 ${isActive ? 'ring-2 ring-gray-300' : ''}`;
    }
  };

  const renderActionButton = (action: ActionItem) => {
    const Icon = action.icon;
    const isActionLoading = isLoading === action.id;

    return (
      <button
        key={action.id}
        onClick={() => handleAction(action.id, action.action)}
        disabled={isActionLoading}
        className={getButtonClasses(action.variant, isActionLoading)}
        title={action.description}
      >
        {isActionLoading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
        <span className="text-sm">{action.label}</span>
      </button>
    );
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <span className="text-sm text-gray-500">
          Tenant: {tenantName}
        </span>
      </div>

      {/* Primary Actions */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Aksi Utama</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {primaryActions.map(renderActionButton)}
        </div>
      </div>

      {/* Secondary Actions */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Aksi Lainnya</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {secondaryActions.map(renderActionButton)}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Tenant ID: {tenantId}</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Aktif</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Update: {new Date().toLocaleDateString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Komponen Quick Actions versi compact untuk sidebar atau panel kecil
 */
export function QuickActionsCompact({
  tenantId,
  onRefreshData,
  onExportData,
  className = ''
}: Pick<QuickActionsProps, 'tenantId' | 'onRefreshData' | 'onExportData' | 'className'>) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const compactActions = [
    {
      id: 'refresh',
      icon: RefreshCw,
      action: () => onRefreshData?.(),
      title: 'Refresh Data'
    },
    {
      id: 'export',
      icon: Download,
      action: () => onExportData?.('attendance'),
      title: 'Export Data'
    },
    {
      id: 'users',
      icon: Users,
      action: () => console.log('Manage users'),
      title: 'Kelola User'
    },
    {
      id: 'reports',
      icon: BarChart3,
      action: () => console.log('View reports'),
      title: 'Lihat Laporan'
    }
  ];

  const handleAction = async (actionId: string, action: () => void) => {
    setIsLoading(actionId);
    try {
      await action();
    } catch (error) {
      console.error(`Error executing action ${actionId}:`, error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
      <div className="flex flex-col gap-2">
        {compactActions.map((action) => {
          const Icon = action.icon;
          const isActionLoading = isLoading === action.id;

          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id, action.action)}
              disabled={isActionLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
              title={action.title}
            >
              {isActionLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span>{action.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
