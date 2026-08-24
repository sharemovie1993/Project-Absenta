import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { getMenuTree } from '@/api/menu.api';
import { getRoles, getTenants, type TenantItem } from '@/api/user.api';
import { getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Card, SectionCard } from '@/components/ui';
import { Info, FolderTree, ShieldAlert, Award, Globe } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const MenuPermissionMatrix = lazy(() => import('@/components/management/MenuPermissionMatrix').then(m => ({ default: m.MenuPermissionMatrix })));
const StrukturMenuMatrix = lazy(() => import('@/components/management/StrukturMenuMatrix').then(m => ({ default: m.StrukturMenuMatrix })));

const filterSchema = z.object({
  tenantId: z.string().optional(),
});

export const MenuManagementPage: React.FC = React.memo(() => {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("role");
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('');

  // Fetch Tenants
  useEffect(() => {
    const loadTenants = async () => {
      if (!isSuperAdmin()) return;
      try {
        const res = await getTenants();
        if (res.success && Array.isArray(res.data)) {
          setTenants(res.data);
        }
      } catch (e) { /* ignore */ }
    };
    loadTenants();
  }, [isSuperAdmin]);

  // Fetch Menu Tree
  const treeQuery = useQuery({
    queryKey: ['menu-tree-full'],
    queryFn: async () => {
      const res = await getMenuTree('management');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Fetch Roles
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await getRoles();
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Fetch Structures
  const structuresQuery = useQuery({
    queryKey: ['structures', selectedTenantFilter],
    queryFn: async () => {
      filterSchema.safeParse({ tenantId: selectedTenantFilter });
      const params: Record<string, unknown> = { is_active: true };
      if (selectedTenantFilter && selectedTenantFilter !== 'ALL') {
        params.tenant_id = selectedTenantFilter;
      }
      const res = await getStrukturList(params);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const isLoading = treeQuery.isLoading || rolesQuery.isLoading || structuresQuery.isLoading;

  const statsList = useMemo(() => {
    const totalMenus = treeQuery.data?.length || 0;
    const totalRoles = rolesQuery.data?.length || 0;
    const totalStructures = structuresQuery.data?.length || 0;

    return [
      {
        title: "Total Struktur Menu",
        value: `${totalMenus} Menu`,
        icon: <FolderTree className="h-4 w-4 text-white" />,
        gradient: "from-blue-500 to-indigo-600",
        subtitle: "Struktur menu utama platform"
      },
      {
        title: "Peran Terdaftar (Roles)",
        value: `${totalRoles} Peran`,
        icon: <ShieldAlert className="h-4 w-4 text-white" />,
        gradient: "from-indigo-500 to-violet-600",
        subtitle: "Hak akses per kelompok pengguna"
      },
      {
        title: "Struktur Akademik",
        value: `${totalStructures} Jabatan`,
        icon: <Award className="h-4 w-4 text-white" />,
        gradient: "from-purple-500 to-fuchsia-600",
        subtitle: "Struktur organisasi sekolah aktif"
      },
      {
        title: "Penyaring Tenant",
        value: selectedTenantFilter ? (tenants.find(t => t.id === selectedTenantFilter)?.name || 'Tenant Khusus') : 'Semua Tenant',
        icon: <Globe className="h-4 w-4 text-white" />,
        gradient: "from-orange-500 to-amber-600",
        subtitle: "Cakupan visibilitas struktur"
      }
    ];
  }, [treeQuery.data, rolesQuery.data, structuresQuery.data, selectedTenantFilter, tenants]);

  const tenantOptions = useMemo(() => [
    { label: 'Semua Tenant', value: '' },
    ...(tenants ?? [])?.map(t => ({ label: t.name, value: t.id }))
  ], [tenants]);

  const handleRefreshTree = useCallback(() => treeQuery.refetch(), [treeQuery]);
  const handleRefreshStructures = useCallback(() => structuresQuery.refetch(), [structuresQuery]);

  const breadcrumbs = useMemo(() => [
    { label: 'System Utilities' },
    { label: 'Manajemen Menu' }
  ], []);

  const tabs = useMemo(() => [
    { id: 'role', label: 'Akses per Peran (Role)' },
    { id: 'struktur', label: 'Akses per Struktur Sekolah' }
  ], []);

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        title="Kelola Struktur Menu & Hak Akses"
        description="Atur peta visibilitas menu sistem, penugasan capability jabatan akademik sekolah, serta kustomisasi jalur navigasi secara global."
        breadcrumbs={breadcrumbs}
        stats={statsList}
        isLoading={isLoading && !treeQuery.data}
        hardeningModuleKey="menumanagementpage"
        instruction={{
          title: 'Panduan Manajemen Menu',
          description: 'Gunakan halaman ini untuk mengatur visibilitas menu berdasarkan Role (Peran) atau Struktur Organisasi (Jabatan).',
          items: [
            { text: 'Tab "Akses per Peran" mengatur akses menu secara global untuk tipe pengguna tertentu.' },
            { text: 'Tab "Akses per Struktur Sekolah" mengatur visibilitas menu melalui pemetaan Capability pada jabatan.' },
            { text: 'Gunakan fitur Pencarian Tenant (khusus Superadmin) untuk memfilter struktur organisasi tenant tertentu.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TabSwitcher
                activeTab={activeTab}
                onChange={setActiveTab}
                tabs={tabs}
              />

              {activeTab === 'struktur' && (
                <div className="w-full sm:w-64">
                  <label htmlFor="tenant-filter-select" className="sr-only">Pilih Tenant</label>
                  <SearchableSelect
                    id="tenant-filter-select"
                    aria-label="Pilih penyaring tenant"
                    value={selectedTenantFilter}
                    onValueChange={setSelectedTenantFilter}
                    options={tenantOptions}
                    placeholder="Pilih Tenant..."
                    searchPlaceholder="Cari tenant..."
                  />
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-900/50 border border-indigo-100/30 dark:border-slate-800 flex items-start gap-3">
              <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium leading-relaxed">
                {activeTab === 'role' 
                  ? 'Mengatur akses navigasi menu secara langsung untuk kelompok pengguna (User Group). Aturan ini berlaku global di seluruh tenant platform.'
                  : 'Mengatur hak visibilitas menu melalui Capability Jabatan. Ketika opsi dicentang, struktur organisasi sekolah akan diberikan capability yang dipetakan oleh menu tersebut.'}
              </p>
            </div>

            <Card className="p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
              <Suspense fallback={<div className="text-center py-20 text-xs text-slate-400">Memuat matriks izin menu...</div>}>
                {activeTab === 'role' ? (
                  <MenuPermissionMatrix 
                    menus={treeQuery.data || []} 
                    roles={rolesQuery.data || []} 
                    onRefresh={handleRefreshTree}
                  />
                ) : (
                  <StrukturMenuMatrix 
                    menus={treeQuery.data || []} 
                    structures={structuresQuery.data || []}
                    onRefresh={handleRefreshStructures}
                  />
                )}
              </Suspense>
            </Card>
          </div>
        </SectionCard>
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default MenuManagementPage;
