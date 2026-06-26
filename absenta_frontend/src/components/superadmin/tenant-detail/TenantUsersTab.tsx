import React from 'react';
import { Users, UserPlus, Search, Edit, Trash2, Clock } from 'lucide-react';
import { 
  Loader,
  SectionCard,
  Button,
  Input,
  SearchableSelect,
  Table,
  Badge
} from '@/components/ui';
import type { TenantUser } from '@/api/tenant-detail.api';
import { getStatusBadgeClass, getStatusLabel, formatDateTime } from '@/utils/layoutUtils';

interface TenantUsersTabProps {
  usersDisplay: {
    list: TenantUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  usersFilters: {
    page: number;
    limit: number;
    search: string;
    role: string;
    status: string;
    lastLogin: string;
    sortBy: string;
  };
  setUsersFilters: React.Dispatch<React.SetStateAction<TenantUsersTabProps['usersFilters']>>;
  usersLoading: boolean;
  onAddUser: () => void;
  onEditUser: (user: TenantUser) => void;
  onDeleteUser: (userId: string) => Promise<void>;
}

export const TenantUsersTab: React.FC<TenantUsersTabProps> = ({
  usersDisplay,
  usersFilters,
  setUsersFilters,
  usersLoading,
  onAddUser,
  onEditUser,
  onDeleteUser
}) => {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <SectionCard
        title="Filter Pengguna"
        icon={Users}
        fullWidth
      >
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="user-search" className="block text-sm font-medium mb-2">Pencarian</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="user-search"
                type="text"
                placeholder="Cari nama atau email..."
                className="pl-10 w-full"
                value={usersFilters.search}
                onChange={(e) => setUsersFilters({ ...usersFilters, search: e.target.value, page: 1 })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="filter-role" className="block text-sm font-medium mb-2">Role</label>
            <SearchableSelect
              id="filter-role"
              value={usersFilters.role}
              onValueChange={(val) => setUsersFilters({ ...usersFilters, role: val, page: 1 })}
              options={[
                { value: "", label: "Semua Role" },
                { value: "ADMIN", label: "Admin" },
                { value: "GURU", label: "Guru" },
                { value: "SISWA", label: "Siswa" },
                { value: "PETUGAS", label: "Petugas" },
                { value: "KEUANGAN", label: "Keuangan" }
              ]}
              placeholder="Semua Role"
              searchPlaceholder="Cari role..."
              triggerClassName="w-full"
            />
          </div>

          <div>
            <label htmlFor="filter-status" className="block text-sm font-medium mb-2">Status</label>
            <SearchableSelect
              id="filter-status"
              value={usersFilters.status}
              onValueChange={(val) => setUsersFilters({ ...usersFilters, status: val, page: 1 })}
              options={[
                { value: "", label: "Semua Status" },
                { value: "active", label: "Aktif" },
                { value: "inactive", label: "Tidak Aktif" },
                { value: "pending", label: "Pending" },
                { value: "suspended", label: "Ditangguhkan" }
              ]}
              placeholder="Semua Status"
              searchPlaceholder="Cari status..."
              triggerClassName="w-full"
            />
          </div>

          <div>
            <label htmlFor="filter-last-login" className="block text-sm font-medium mb-2">Login Terakhir</label>
            <SearchableSelect
              id="filter-last-login"
              value={usersFilters.lastLogin}
              onValueChange={(val) => setUsersFilters({ ...usersFilters, lastLogin: val, page: 1 })}
              options={[
                { value: "", label: "Semua Waktu" },
                { value: "today", label: "Hari Ini" },
                { value: "week", label: "Minggu Ini" },
                { value: "month", label: "Bulan Ini" },
                { value: "never", label: "Belum Pernah" }
              ]}
              placeholder="Semua Waktu"
              searchPlaceholder="Cari waktu..."
              triggerClassName="w-full"
            />
          </div>

          <div>
            <label htmlFor="filter-sort" className="block text-sm font-medium mb-2">Urutkan</label>
            <SearchableSelect
              id="filter-sort"
              value={usersFilters.sortBy}
              onValueChange={(val) => setUsersFilters({ ...usersFilters, sortBy: val, page: 1 })}
              options={[
                { value: "name", label: "Nama (A-Z)" },
                { value: "name_desc", label: "Nama (Z-A)" },
                { value: "created_at", label: "Terbaru" },
                { value: "created_at_desc", label: "Terlama" },
                { value: "last_login", label: "Login Terakhir" },
                { value: "role", label: "Role" }
              ]}
              placeholder="Urutkan"
              searchPlaceholder="Cari urutan..."
              triggerClassName="w-full"
            />
          </div>
        </div>
      </SectionCard>

      {/* Users Table */}
      <SectionCard
        title="Daftar Pengguna"
        icon={Users}
        fullWidth
        noPadding
      >
        <div className="p-4 flex-1 flex flex-col">
          {usersLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table
                toolbarRight={
                  <Button onClick={onAddUser} size="sm" className="flex items-center gap-2">
                    <UserPlus size={14} />
                    Tambah Pengguna
                  </Button>
                }
                columns={[
                  {
                    key: 'full_name',
                    label: 'Nama & Email',
                    render: (_: unknown, row: unknown) => {
                      const u = row as TenantUser;
                      return (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{u.full_name}</span>
                          <span className="text-xs text-gray-500">{u.email}</span>
                        </div>
                      );
                    }
                  },
                  {
                    key: 'role_name',
                    label: 'Role',
                    render: (val: unknown) => (
                      <Badge variant="secondary">{String(val || '-')}</Badge>
                    )
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (val: unknown) => (
                      <Badge variant={getStatusBadgeClass(String(val)) as any}>
                        {getStatusLabel(String(val))}
                      </Badge>
                    )
                  },
                  {
                    key: 'last_login',
                    label: 'Login Terakhir',
                    render: (val: unknown) => (
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="mr-1 h-3 w-3" />
                        {val ? formatDateTime(String(val)) : 'Belum pernah'}
                      </div>
                    )
                  },
                  {
                    key: 'actions',
                    label: 'Aksi',
                    className: 'text-right',
                    render: (_: unknown, row: unknown) => {
                      const u = row as TenantUser;
                      return (
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onEditUser(u)}
                            title="Edit Pengguna"
                          >
                            <Edit size={14} className="text-blue-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onDeleteUser(u.id)}
                            title="Hapus Pengguna"
                          >
                            <Trash2 size={14} className="text-red-600" />
                          </Button>
                        </div>
                      );
                    }
                  }
                ]}
                data={usersDisplay.list}
                loading={usersLoading}
                emptyMessage="Tidak ada pengguna ditemukan"
                pagination={{
                  currentPage: usersDisplay.pagination.page,
                  totalPages: usersDisplay.pagination.totalPages,
                  totalItems: usersDisplay.pagination.total,
                  itemsPerPage: usersFilters.limit,
                  onPageChange: (page) => setUsersFilters({ ...usersFilters, page }),
                  onLimitChange: (limit) => setUsersFilters({ ...usersFilters, limit, page: 1 })
                }}
              />
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
};
