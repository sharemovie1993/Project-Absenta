import React from 'react';
import { FileText, Users, Activity, Calendar, History, Clock } from 'lucide-react';
import { SectionCard, AnalyticsCard, Input, SearchableSelect, Button, Table, Badge } from '@/components/ui';
import type { ActivityLogItem, TenantUser, GetTenantLogsParams } from '@/api/tenant-detail.api';

interface TenantLogsTabProps {
  logsData: ActivityLogItem[];
  logsLoading: boolean;
  logsStats: {
    totalLogs: number;
    uniqueUsers: number;
    uniqueActions: number;
    dateRange: { from: string; to: string };
  };
  logsFilters: GetTenantLogsParams;
  setLogsFilters: React.Dispatch<React.SetStateAction<GetTenantLogsParams>>;
  loadTenantLogs: (filters?: Partial<GetTenantLogsParams>) => Promise<void>;
  users: TenantUser[];
  logsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  formatLastUpdated: (date: Date) => string;
  lastUpdatedLogs?: Date;
}

export const TenantLogsTab: React.FC<TenantLogsTabProps> = ({
  logsData,
  logsLoading,
  logsStats,
  logsFilters,
  setLogsFilters,
  loadTenantLogs,
  users,
  logsPagination,
  formatLastUpdated,
  lastUpdatedLogs
}) => {
  return (
    <div className="space-y-6">
      {/* Logs Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Total Log"
          value={logsStats.totalLogs.toLocaleString('id-ID')}
          icon={<FileText size={20} className="text-white" />}
          gradient="from-blue-500 to-cyan-600"
        />
        <AnalyticsCard
          title="Pengguna Aktif"
          value={logsStats.uniqueUsers}
          icon={<Users size={20} className="text-white" />}
          gradient="from-green-500 to-emerald-600"
        />
        <AnalyticsCard
          title="Jenis Aktivitas"
          value={logsStats.uniqueActions}
          icon={<Activity size={20} className="text-white" />}
          gradient="from-purple-500 to-pink-600"
        />
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rentang Waktu</p>
            <p className="text-sm font-bold">
              {logsStats.dateRange.from && logsStats.dateRange.to 
                ? `${new Date(logsStats.dateRange.from).toLocaleDateString('id-ID')} - ${new Date(logsStats.dateRange.to).toLocaleDateString('id-ID')}`
                : 'Semua waktu'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <SectionCard title="Filter Log Aktivitas" icon={History} fullWidth>
        <div className="w-full">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter cepat:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const preset = { page: 1, limit: logsFilters.limit ?? 10, search: 'ADMIN_', user_id: undefined, action: undefined, entity: undefined, date_from: undefined, date_to: undefined };
                setLogsFilters(preset);
                loadTenantLogs(preset);
              }}
            >
              Policy Changes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const preset = { page: 1, limit: logsFilters.limit ?? 10 };
                setLogsFilters(preset);
                loadTenantLogs(preset);
              }}
            >
              Semua Aktivitas
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Pencarian</label>
              <Input
                type="text"
                placeholder="Cari detail aktivitas..."
                value={logsFilters.search || ''}
                onChange={(e) => {
                  const newFilters = { ...logsFilters, search: e.target.value || undefined, page: 1 };
                  setLogsFilters(newFilters);
                  loadTenantLogs(newFilters);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Pengguna</label>
              <SearchableSelect
                value={logsFilters.user_id || ''}
                onValueChange={(val) => {
                  const newFilters = { ...logsFilters, user_id: val || undefined, page: 1 };
                  setLogsFilters(newFilters);
                  loadTenantLogs(newFilters);
                }}
                options={[{ value: "", label: "Semua Pengguna" }, ...users.map(user => ({ value: user.id, label: user.full_name }))]}
                placeholder="Semua Pengguna"
                searchPlaceholder="Cari pengguna..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Aksi</label>
              <SearchableSelect
                value={logsFilters.action || ''}
                onValueChange={(val) => {
                  const newFilters = { ...logsFilters, action: val || undefined, page: 1 };
                  setLogsFilters(newFilters);
                  loadTenantLogs(newFilters);
                }}
                options={[
                  { value: "", label: "Semua Aksi" },
                  { value: "CREATE", label: "Create" },
                  { value: "UPDATE", label: "Update" },
                  { value: "DELETE", label: "Delete" },
                  { value: "LOGIN", label: "Login" },
                  { value: "LOGOUT", label: "Logout" },
                  { value: "VIEW", label: "View" }
                ]}
                placeholder="Semua Aksi"
                searchPlaceholder="Cari aksi..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Entitas</label>
              <SearchableSelect
                value={logsFilters.entity || ''}
                onValueChange={(val) => {
                  const newFilters = { ...logsFilters, entity: val || undefined, page: 1 };
                  setLogsFilters(newFilters);
                  loadTenantLogs(newFilters);
                }}
                options={[
                  { value: "", label: "Semua Entitas" },
                  { value: "USER", label: "User" },
                  { value: "STUDENT", label: "Student" },
                  { value: "TEACHER", label: "Teacher" },
                  { value: "CLASS", label: "Class" },
                  { value: "ATTENDANCE", label: "Attendance" },
                  { value: "ACADEMIC", label: "Academic" }
                ]}
                placeholder="Semua Entitas"
                searchPlaceholder="Cari entitas..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Dari Tanggal</label>
              <Input
                type="date"
                value={logsFilters.date_from || ''}
                onChange={(e) => {
                  const newFilters = { ...logsFilters, date_from: e.target.value || undefined, page: 1 };
                  setLogsFilters(newFilters);
                  loadTenantLogs(newFilters);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sampai Tanggal</label>
              <Input
                type="date"
                value={logsFilters.date_to || ''}
                onChange={(e) => {
                  const newFilters = { ...logsFilters, date_to: e.target.value || undefined, page: 1 };
                  setLogsFilters(newFilters);
                  loadTenantLogs(newFilters);
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  const resetFilters = { page: 1, limit: 10 };
                  setLogsFilters(resetFilters);
                  loadTenantLogs(resetFilters);
                }}
                variant="outline"
                className="w-full"
              >
                Reset Filter
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Logs Table */}
      <SectionCard title="Log Aktivitas" icon={FileText} fullWidth noPadding
        actions={
          <div className="flex items-center gap-4">
            {lastUpdatedLogs && (
              <div className="flex items-center text-xs text-gray-500 font-sans">
                <Clock className="mr-1 h-3.5 w-3.5" />
                Diperbarui {formatLastUpdated(lastUpdatedLogs)}
              </div>
            )}
            <div className="text-xs text-gray-500 font-semibold font-sans">
              Menampilkan {((logsPagination.page - 1) * logsPagination.limit) + 1} - {Math.min(logsPagination.page * logsPagination.limit, logsPagination.total)} dari {logsPagination.total} log
            </div>
          </div>
        }
      >
        <div className="p-4 flex-1 flex flex-col">
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : logsData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table
                columns={[
                  {
                    key: 'timestamp',
                    label: 'Waktu',
                    render: (_: unknown, row: unknown) => {
                      const l = row as ActivityLogItem;
                      return (
                        <div className="text-sm">
                          <div className="font-medium">{new Date(l.timestamp).toLocaleDateString('id-ID')}</div>
                          <div className="text-gray-500">{new Date(l.timestamp).toLocaleTimeString('id-ID')}</div>
                        </div>
                      );
                    }
                  },
                  {
                    key: 'user',
                    label: 'Pengguna',
                    render: (_: unknown, row: unknown) => {
                      const l = row as ActivityLogItem;
                      return (
                        <div className="text-sm">
                          <div className="font-medium">{l.user?.full_name || 'System'}</div>
                          <div className="text-gray-500">{l.user?.email || ''}</div>
                        </div>
                      );
                    }
                  },
                  {
                    key: 'action',
                    label: 'Aksi',
                    render: (_: unknown, row: unknown) => {
                      const l = row as ActivityLogItem;
                      return (
                        <Badge variant={l.action === 'CREATE' ? 'success' : l.action === 'DELETE' ? 'destructive' : 'default'}>
                          {l.action ?? '-'}
                        </Badge>
                      );
                    }
                  },
                  {
                    key: 'entity',
                    label: 'Entitas',
                    render: (_: unknown, row: unknown) => {
                      const l = row as ActivityLogItem;
                      return (
                        <div>
                          <span className="text-sm font-medium">{l.entity || '-'}</span>
                          {l.entity_id && <div className="text-xs text-gray-500">ID: {l.entity_id}</div>}
                        </div>
                      );
                    }
                  },
                  {
                    key: 'ip_address',
                    label: 'IP Address',
                    render: (_: unknown, row: unknown) => {
                      const l = row as ActivityLogItem;
                      return <div className="text-sm font-mono">{l.ip_address || '-'}</div>;
                    }
                  },
                  {
                    key: 'metadata',
                    label: 'Detail',
                    render: (_: unknown, row: unknown) => {
                      const l = row as ActivityLogItem;
                      return l.metadata ? (
                        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {typeof l.metadata === 'string' ? l.metadata : JSON.stringify(l.metadata)}
                        </div>
                      ) : null;
                    }
                  }
                ]}
                data={logsData}
                loading={logsLoading}
                pagination={{
                  currentPage: logsPagination.page,
                  totalPages: logsPagination.totalPages,
                  totalItems: logsPagination.total,
                  itemsPerPage: logsFilters.limit,
                  onPageChange: (page) => loadTenantLogs({ page }),
                  onLimitChange: (limit) => loadTenantLogs({ limit, page: 1 })
                }}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Tidak Ada Log</p>
              <p className="text-sm">Belum ada aktivitas yang tercatat untuk tenant ini</p>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
};
