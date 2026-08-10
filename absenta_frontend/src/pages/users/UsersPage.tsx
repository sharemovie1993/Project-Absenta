import React, { useState, useEffect, useMemo, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Shield, Building2, UserCheck } from 'lucide-react';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import UserList from '../../components/management/UserList';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));
const UserForm = lazy(() => import('../../components/management/UserForm'));
import { getUsers, type User } from '../../api/user.api';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import { getTenantById } from '../../api/tenants.api';
import { isSystemSuperAdmin } from '../../utils/rbac';
import toast from 'react-hot-toast';
import axiosInstance from '../../lib/axiosInstance';

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
}

type RoleItem = { id: string; name: string; description?: string | null };

const UserPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    inactive: 0,
    byRole: {}
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const { user, can, isAdmin, isLoading } = useAuth();
  const [tenantLabel, setTenantLabel] = useState<string>('Tenant Anda');


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  // Check permissions
  const canManage = useMemo(() => {
    return isAdmin || can('core.users.view.list');
  }, [isAdmin, can]);

  const canManageRolePermissions = useMemo(() => {
    const role = user?.role?.name || user?.role;
    const tenantId = user?.tenant_id;
    return isSystemSuperAdmin(role, tenantId);
  }, [user]);

  useEffect(() => {
    const role = user?.role?.name || user?.role;
    const tenantId = user?.tenant_id;
    if (!isSystemSuperAdmin(role, tenantId) && tenantId) {
      getTenantById(tenantId)
        .then((res) => {
          const name = res?.data?.name;
          if (typeof name === 'string' && name.trim() !== '') {
            setTenantLabel(name);
          } else {
            setTenantLabel(tenantId);
          }
        })
        .catch(() => {
          setTenantLabel(tenantId || 'Tenant Anda');
        });
    } else {
      setTenantLabel('Semua Tenant');
    }
  }, [user]);

  const [roleList, setRoleList] = useState<RoleItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [permissionsInput, setPermissionsInput] = useState<string>('');
  const [savingPerms, setSavingPerms] = useState(false);

  useEffect(() => {
    const toRoleArray = (input: unknown): RoleItem[] => {
      const wrapper = input as { data?: unknown };
      const src = Array.isArray(wrapper.data)
        ? wrapper.data
        : Array.isArray(input)
          ? input
          : [];
      return (src as unknown[])
        ?.map((r) => {
          const obj = r as Record<string, unknown>;
          const id = obj.id;
          const name = obj.name;
          const description = obj.description;
          return {
            id: typeof id === 'string' ? id : String(id ?? ''),
            name: typeof name === 'string' ? name : String(name ?? ''),
            description: description === null || typeof description === 'string' ? (description as string | null) : undefined,
          };
        })
        .filter((x) => x.id !== '' && x.name !== '');
    };

    const loadRoles = async () => {
      try {
        const res = await axiosInstance.get('/users/roles');
        const normalized = toRoleArray(res.data);
        setRoleList(normalized);
      } catch {
        toast.error('Gagal memuat role');
      }
    };
    loadRoles();
  }, []);

  // Load statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoadingStats(true);

        // Determine tenant ID based on user role (SUPERADMIN global across tenants)
        const role = user?.role?.name || user?.role;
        const tenantId = isSystemSuperAdmin(role, user?.tenant_id) ? undefined : user?.tenant_id;
        const options = { skipTenantHeader: isSystemSuperAdmin(role, user?.tenant_id) };

        // Fetch counts in parallel using pagination.total
        // We use limit=1 because we only care about the total count, not the data
        const [totalRes, activeRes, inactiveRes] = await Promise.all([
          getUsers(1, 1, '', tenantId, options),
          getUsers(1, 1, '', tenantId, options, { status: 'ACTIVE' }),
          getUsers(1, 1, '', tenantId, options, { status: 'INACTIVE' })
        ]);

        const newStats: UserStats = {
          total: totalRes.success ? totalRes.pagination.total : 0,
          active: activeRes.success ? activeRes.pagination.total : 0,
          inactive: inactiveRes.success ? inactiveRes.pagination.total : 0,
          byRole: {}
        };

        // Note: byRole stats are temporarily disabled to improve performance 
        // as they required fetching all users. If needed, a dedicated backend endpoint should be used.

        setStats(newStats);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [user, refreshTrigger]);

  const handleAddUser = useCallback(() => {
    if (!canManage) {
      toast.error('Anda tidak memiliki izin untuk menambah pengguna');
      return;
    }
    setSelectedUser(null);
    setModalMode('create');
    setIsModalOpen(true);
  }, [canManage]);

  const handleEditUser = useCallback((userData: User) => {
    if (!canManage) {
      toast.error('Anda tidak memiliki izin untuk mengedit pengguna');
      return;
    }
    setSelectedUser(userData);
    setModalMode('edit');
    setIsModalOpen(true);
  }, [canManage]);

  const handleViewUser = useCallback((userData: User) => {
    setSelectedUser(userData);
    setModalMode('view');
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedUser(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const getModalTitle = () => {
    switch (modalMode) {
      case 'create':
        return 'Tambah Pengguna Baru';
      case 'edit':
        return 'Edit Pengguna';
      case 'view':
        return 'Detail Pengguna';
      default:
        return 'Pengguna';
    }
  };

  const getRoleColor = (roleName: string) => {
    const colors: Record<string, string> = {
      'SUPERADMIN': 'bg-purple-100 text-purple-800 border-purple-200',
      'ADMIN': 'bg-blue-100 text-blue-800 border-blue-200',
      'GURU': 'bg-green-100 text-green-800 border-green-200',
      'SISWA': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const userStats = useMemo(() => [
    {
      title: "Total Pengguna",
      value: stats.total,
      icon: <Users size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      onClick: () => navigate('/academic/struktur-organisasi')
    },
    {
      title: "Aktif",
      value: stats.active,
      icon: <UserCheck size={14} />,
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      title: "Tidak Aktif",
      value: stats.inactive,
      icon: <Shield size={14} />,
      gradient: "from-red-500 to-pink-600"
    },
    {
      title: "Cakupan Data",
      value: tenantLabel === 'Semua Tenant' ? 'GLOBAL' : tenantLabel,
      icon: <Building2 size={14} />,
      gradient: "from-purple-500 to-indigo-600"
    }
  ], [stats, tenantLabel, navigate]);

  const breadcrumbs = useMemo(() => [
    { label: 'Manajemen', path: '/users' },
    { label: 'Pengguna', path: '/users' }
  ], []);

  return (
    <AcademicPageLayout
      hardeningModuleKey="userspage"
      breadcrumbs={breadcrumbs}
      stats={userStats}
      isLoadingStats={loadingStats}
      instruction={{
        title: "Manajemen Pengguna",
        description: "Kelola akun pengguna, hak akses (role), dan status aktifasi dalam satu tempat terpusat.",
        items: [
          { text: "ADMIN sekolah hanya dapat melihat pengguna di lingkungan sekolahnya sendiri." },
          { text: "Gunakan 'Reset Password' jika pengguna lupa kredensial mereka." },
          { text: "Hapus pengguna akan memutuskan semua akses mereka ke sistem ini." }
        ]
      }}
      canView={canManage}
      isLoading={isLoading}
    >
      <Card>
        <CardContent className="p-0">
          <UserList
            onEdit={handleEditUser}
            onView={handleViewUser}
            onAdd={handleAddUser}
            refreshTrigger={refreshTrigger}
          />
        </CardContent>
      </Card>

      {/* User Form Modal */}
      <Suspense fallback={<Loader size="lg" />}>
        <Modal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          title={getModalTitle()}
          size={modalMode === 'view' ? 'lg' : 'md'}
        >
          <UserForm
            user={selectedUser}
            mode={modalMode}
            onSuccess={handleFormSuccess}
            onCancel={handleModalClose}
          />
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
};

export default UserPage;
