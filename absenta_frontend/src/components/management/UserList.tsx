import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Edit, Trash2, Eye, Plus, Search, RefreshCw, KeyRound } from 'lucide-react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { 
  Table, 
  Button, 
  Input, 
  Modal, 
  Badge, 
  Loader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Checkbox
} from '../ui';
import { getStatusBadgeClass, getStatusLabel } from '../../utils/layoutUtils';
import UserFilter, { type UserFilterState } from './UserFilter';
import { getUsers, deleteUser, resetUserPassword, type User } from '../../api/user.api';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { isSystemSuperAdmin } from '../../utils/rbac';

interface UserListProps {
  onEdit?: (user: User) => void;
  onView?: (user: User) => void;
  onAdd?: () => void;
  refreshTrigger?: number;
}

const UserList: React.FC<UserListProps> = ({ 
  onEdit, 
  onView, 
  onAdd,
  refreshTrigger = 0 
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilterState>({
    search: '',
    role: '',
    status: '',
    tenant: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkErrorDetails, setBulkErrorDetails] = useState<{ id: string; name: string; message: string }[]>([]);
  const [bulkErrorModalOpen, setBulkErrorModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  

  const { user, can, isAdmin, isSuperAdmin, isLoading: isAuthLoading } = useAuth();
  const confirm = useConfirm();
  
  if (isAuthLoading) {
    return <Loader size="lg" />;
  }
  
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Check if user can perform CRUD operations
  const canManage = useMemo(() => {
    return isAdmin() || can('core.users.create') || can('core.users.update') || can('core.users.delete');
  }, [isAdmin, can]);

  const canDelete = useMemo(() => {
    return isAdmin() || can('core.users.delete');
  }, [isAdmin, can]);
  
  const isSuper = isSuperAdmin();

  const debouncedFilters = useDebounce(filters, 500);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const tenantId = isSuper ? undefined : user?.tenant_id;
      const response = await getUsers(
        currentPage,
        itemsPerPage,
        debouncedFilters.search,
        tenantId,
        { skipTenantHeader: isSystemSuperAdmin(user?.role, user?.tenant_id) },
        { role: debouncedFilters.role, status: debouncedFilters.status, tenant: debouncedFilters.tenant }
      );
      const usersData = Array.isArray((response as any)?.data) ? (response as any).data : [];
      const pagination = (response as any)?.pagination;
      setUsers(usersData);
      setTotalPages(pagination?.totalPages ?? (usersData.length > 0 ? Math.ceil(usersData.length / itemsPerPage) : 1));
      setTotalItems(pagination?.total ?? usersData.length);
      if (pagination?.page) setCurrentPage(pagination.page);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Gagal memuat daftar pengguna');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedFilters, user]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers, currentPage, debouncedFilters, refreshTrigger, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  const handleFiltersChange = (newFilters: UserFilterState) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      role: '',
      status: '',
      tenant: ''
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const allVisibleSelected = useMemo(() => {
    if (users.length === 0) return false;
    return users.every(u => selectedIds.has(u.id));
  }, [users, selectedIds]);

  const handleItemsPerPageChange = useCallback((value: string) => {
    const n = parseInt(value, 10) || 10;
    setItemsPerPage(n);
    setCurrentPage(1);
  }, []);

  const handlePageJump = useCallback(() => {
    let p = parseInt(pageInput, 10) || 1;
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    setCurrentPage(p);
  }, [pageInput, totalPages]);

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      setDeleting(true);
      
      // Determine tenant ID based on user role (SUPERADMIN global only)
      const role = user?.role?.name || user?.role;
      // Prevent SUPERADMIN from deleting their own account (UI safety)
      if (isSystemSuperAdmin(role, user?.tenant_id) && selectedUser.id === user?.id) {
        toast.error('SUPERADMIN tidak boleh menghapus akun sendiri');
        return;
      }
      const tenantId = isSystemSuperAdmin(role, user?.tenant_id) ? selectedUser.tenant_id : user?.tenant_id;
      
      const response = await deleteUser(selectedUser.id, tenantId);
      
      if (response.success) {
        toast.success('Pengguna berhasil dihapus');
        await loadUsers();
      } else {
        toast.error(response.message || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
        toast.error(
          error.response?.data?.message || 'An error occurred while deleting user'
        );
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setSelectedUser(null);
    }
  };

  const canDeleteUser = (targetUser: User) => {
    const role = user?.role?.name || user?.role;
    const tenantId = user?.tenant_id;
    // SUPERADMIN cannot delete self
    if (isSystemSuperAdmin(role, tenantId)) {
      if (targetUser.id === user?.id) return false;
      return true;
    }
    if (role === 'ADMIN') {
      // ADMIN can only delete users in their tenant and cannot delete SUPERADMIN
      return targetUser.tenant_id === user?.tenant_id && targetUser.role?.name !== 'SUPERADMIN';
    }
    return false;
  };

  const canResetPassword = (targetUser: User) => {
    const role = user?.role?.name || user?.role;
    const tenantId = user?.tenant_id;
    if (isSystemSuperAdmin(role, tenantId)) return true;
    if (role === 'ADMIN') {
      return targetUser.tenant_id === user?.tenant_id && targetUser.role?.name !== 'SUPERADMIN';
    }
    return false;
  };

  const canEditUser = (targetUser: User) => {
    const role = user?.role?.name || user?.role;
    const tenantId = user?.tenant_id;
    if (isSystemSuperAdmin(role, tenantId)) return true;
    if (role === 'ADMIN') {
      // ADMIN can only edit users in their tenant and cannot edit SUPERADMIN
      return targetUser.tenant_id === user?.tenant_id && targetUser.role?.name !== 'SUPERADMIN';
    }
    return false;
  };

  const getStatusBadge = (status: string) => {
    const cls = getStatusBadgeClass(status, 'users');
    const label = getStatusLabel(status, 'users');
    return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
  };

  const getRoleBadge = (roleName: string) => {
    const roleColors: Record<string, string> = {
      'SUPERADMIN': 'bg-purple-100 text-purple-800',
      'ADMIN': 'bg-blue-100 text-blue-800',
      'GURU': 'bg-green-100 text-green-800',
      'SISWA': 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge 
        variant="outline" 
        className={roleColors[roleName] || 'bg-gray-100 text-gray-800'}
      >
        {roleName}
      </Badge>
    );
  };

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  if (loading && users.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader size="lg" />
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar Baris Atas - Aksi Utama */}
      <div className="flex flex-wrap items-center px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 overflow-x-auto gap-2">
          {canManage && onAdd && (
            <div 
              onClick={onAdd}
              className="flex items-center cursor-pointer text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none py-1"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-xs font-bold uppercase tracking-tight">Tambah Pengguna</span>
            </div>
          )}
          
          {canManage && onAdd && <div className="text-gray-200 dark:text-gray-700 mx-2 select-none">|</div>}

          {canManage && selectedIds.size > 0 && (
            <>
              <div 
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Hapus Beberapa Pengguna',
                    description: `Anda akan menghapus ${selectedIds.size} pengguna secara permanen. Lanjutkan?`,
                    confirmText: 'Hapus',
                    cancelText: 'Batal',
                    style: 'danger'
                  });
                  if (!ok) return;

                  const role = user?.role?.name || user?.role;
                  try {
                    setBulkDeleting(true);
                    const ids = Array.from(selectedIds);
                    const results = await Promise.allSettled(ids.map(async (id) => {
                      const target = users.find(u => u.id === id);
                      const tenantId = isSystemSuperAdmin(role, user?.tenant_id) ? target?.tenant_id : user?.tenant_id;
                      const res = await deleteUser(id, tenantId);
                      if (!res.success) throw new Error(res.message || 'Gagal menghapus');
                      return id;
                    }));

                    const failed: { id: string; name: string; message: string }[] = [];
                    const succeeded: string[] = [];

                    results.forEach((r, idx) => {
                      const id = ids[idx];
                      if (r.status === 'fulfilled') {
                        succeeded.push(id);
                      } else {
                        const u = users.find(x => x.id === id);
                        failed.push({ 
                          id, 
                          name: u?.full_name || u?.email || id, 
                          message: (r as any).reason?.message || 'Gagal menghapus' 
                        });
                      }
                    });

                    if (failed.length > 0) {
                      setBulkErrorDetails(failed);
                      setBulkErrorModalOpen(true);
                      toast(`Berhasil: ${succeeded.length}, Gagal: ${failed.length}`, { icon: '⚠️' });
                    } else {
                      toast.success(`Berhasil menghapus ${succeeded.length} pengguna`);
                    }

                    const next = new Set<string>(selectedIds);
                    succeeded.forEach(id => next.delete(id));
                    setSelectedIds(next);
                    await loadUsers();
                  } catch (err: any) {
                    toast.error(err?.message || 'Terjadi kesalahan saat bulk delete');
                  } finally {
                    setBulkDeleting(false);
                  }
                }}
                className={`flex items-center cursor-pointer text-red-500 hover:text-red-600 transition-colors select-none py-1 ${bulkDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span className="text-xs font-bold uppercase tracking-tight text-red-500">Hapus ({selectedIds.size})</span>
              </div>
              <div className="text-gray-200 dark:text-gray-700 mx-2 select-none">|</div>
            </>
          )}

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 px-2"
            onClick={() => loadUsers()}
            aria-label="Refresh Data"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold uppercase tracking-tight">Refresh</span>
          </Button>
      </div>

      {/* Toolbar Baris Kedua - Filter & Search */}
      <div className="px-1 border-b border-gray-50 dark:border-gray-800">
        <UserFilter
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleResetFilters}
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-950 overflow-hidden">
        <Table
          compact={true}
          columns={[
            ...(canManage ? [{
              key: '__select',
              label: (
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const next = new Set<string>(selectedIds);
                      users.forEach(u => next.add(u.id));
                      setSelectedIds(next);
                    } else {
                      const next = new Set<string>(selectedIds);
                      users.forEach(u => next.delete(u.id));
                      setSelectedIds(next);
                    }
                  }}
                  label="Semua"
                />
              ),
              className: 'w-16',
              render: (_: any, row: User) => (
                <Checkbox
                  checked={selectedIds.has(row.id)}
                  onCheckedChange={(checked) => {
                    const next = new Set<string>(selectedIds);
                    if (checked) next.add(row.id); else next.delete(row.id);
                    setSelectedIds(next);
                  }}
                />
              )
            }] : []),
            {
              key: 'email',
              label: 'Email',
              render: (value, row) => (
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {value}
                </div>
              )
            },
            {
              key: 'full_name',
              label: 'Nama Lengkap',
              render: (value, row) => (
                <div className="text-gray-900 dark:text-gray-100">
                  {value}
                </div>
              )
            },
            {
              key: 'role',
              label: 'Role',
              render: (value, row) => getRoleBadge(row.role?.name || 'Unknown')
            },
            ...(isSuper ? [{
              key: 'tenant',
              label: 'Tenant',
              render: (value: unknown, row: User) => (
                <div className="text-gray-600 dark:text-gray-400">
                  {row.tenant?.name || row.tenant_id || 'Superadmin'}
                </div>
              )
            }] : []),
            {
              key: 'status',
              label: 'Status',
              render: (value, row) => getStatusBadge(row.status)
            },
            {
              key: 'actions',
              label: 'Aksi',
              render: (value, row) => (
                <div className="flex items-center gap-2">
                  {onView && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(row)}
                      aria-label={`Lihat Detail ${row.full_name}`}
                      className="flex items-center"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {onEdit && canEditUser(row) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(row)}
                      aria-label={`Edit Data ${row.full_name}`}
                      className="flex items-center"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canResetPassword(row) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedUser(row); setNewPassword(''); setConfirmPassword(''); setResetModalOpen(true); }}
                      aria-label={`Reset Password ${row.full_name}`}
                      className="flex items-center"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {canDeleteUser(row) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(row)}
                      aria-label={`Hapus Pengguna ${row.full_name}`}
                      className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            }
          ]}
          data={users}
          loading={loading}
          emptyMessage={
            filters.search || filters.role || filters.status || filters.tenant 
              ? 'Tidak ada pengguna yang sesuai dengan filter.' 
              : 'Belum ada pengguna yang terdaftar.'
          }
          pagination={{
            currentPage,
            totalPages,
            totalItems,
            itemsPerPage,
            onPageChange: handlePageChange,
            onLimitChange: (limit) => handleItemsPerPageChange(String(limit))
          }}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Konfirmasi Hapus Pengguna"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Apakah Anda yakin ingin menghapus pengguna <strong>{selectedUser?.full_name}</strong>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
               variant="danger"
               onClick={handleDeleteConfirm}
               disabled={deleting}
               className="flex items-center"
             >
              {deleting && <Loader size="sm" className="mr-2" />}
              Hapus
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Password Pengguna"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Atur password baru untuk <strong>{selectedUser?.full_name || selectedUser?.email}</strong>.
          </div>
          <div className="space-y-3">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password baru"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Konfirmasi password"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setResetModalOpen(false)} disabled={resetting}>Batal</Button>
            <Button
              onClick={async () => {
                if (!selectedUser) return;
                if (!newPassword || newPassword.length < 8) { toast.error('Password minimal 8 karakter'); return; }
                if (newPassword !== confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return; }
                try {
                  setResetting(true);
                  const role = user?.role?.name || user?.role;
                  const tenantId = isSystemSuperAdmin(role, user?.tenant_id) ? selectedUser.tenant_id : user?.tenant_id;
                  const res = await resetUserPassword(selectedUser.id, newPassword, tenantId || undefined);
                  if (res.success) {
                    toast.success('Password berhasil direset');
                    setResetModalOpen(false);
                    setSelectedUser(null);
                    await loadUsers();
                  } else {
                    toast.error(res.message || 'Gagal reset password');
                  }
                } catch (err: any) {
                  toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat reset password');
                } finally {
                  setResetting(false);
                }
              }}
              disabled={resetting}
            >
              {resetting && <Loader size="sm" className="mr-2" />}
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={bulkErrorModalOpen}
        onClose={() => { setBulkErrorModalOpen(false); setBulkErrorDetails([]); }}
        title="Gagal Menghapus Beberapa Pengguna"
      >
        <div className="space-y-3">
          <div className="text-sm">Ada {bulkErrorDetails.length} data gagal dihapus karena relasi atau batasan.</div>
          <div className="border rounded p-3 max-h-64 overflow-auto">
            {bulkErrorDetails.map((e) => (
              <div key={e.id} className="text-sm py-1 border-b last:border-b-0 border-slate-200 dark:border-slate-700">
                {e.name}: {e.message}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setBulkErrorModalOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserList;
