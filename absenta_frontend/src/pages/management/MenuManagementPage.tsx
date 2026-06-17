import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { MenuPermissionMatrix } from '@/components/management/MenuPermissionMatrix';
import { StrukturMenuMatrix } from '@/components/management/StrukturMenuMatrix';
import { getMenuTree } from '@/api/menu.api';
import { getRoles, getTenants, type TenantItem } from '@/api/user.api';
import { getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Info, FolderTree, ShieldAlert, Award, Globe } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function MenuManagementPage() {
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
      const params: any = { is_active: true };
      if (selectedTenantFilter && selectedTenantFilter !== 'ALL') {
        params.tenant_id = selectedTenantFilter;
      }
      const res = await getStrukturList(params);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const isLoading = treeQuery.isLoading || rolesQuery.isLoading || structuresQuery.isLoading;

  // Stats analitik terstandar
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

  // Toolbar slot dengan pemilih tenant premium
  const toolbarSlot = useMemo(() => {
    if (activeTab !== 'struktur') return null;

    return (
      <div className="w-[240px] shrink-0">
        <SearchableSelect
          value={selectedTenantFilter}
          onValueChange={setSelectedTenantFilter}
          options={[
            { label: 'Semua Tenant', value: '' },
            ...tenants.map(t => ({ label: t.name, value: t.id }))
          ]}
          placeholder="Pilih Tenant..."
          searchPlaceholder="Cari tenant..."
          triggerClassName="w-full h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
        />
      </div>
    );
  }, [activeTab, tenants, selectedTenantFilter]);

  return (
    <SuperAdminPageLayout
      title="Kelola Struktur Menu & Hak Akses"
      description="Atur peta visibilitas menu sistem, penugasan capability jabatan akademik sekolah, serta kustomisasi jalur navigasi secara global."
      breadcrumbs={[
        { label: 'System Utilities' },
        { label: 'Manajemen Menu' }
      ]}
      stats={statsList}
      isLoading={isLoading && !treeQuery.data}
      toolbar={toolbarSlot}
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 flex w-max max-w-full overflow-x-auto scrollbar-none">
            <TabsTrigger value="role" className="rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              Akses per Peran (Role)
            </TabsTrigger>
            <TabsTrigger value="struktur" className="rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              Akses per Struktur Sekolah
            </TabsTrigger>
          </TabsList>

          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-slate-900/50 border border-indigo-100/30 dark:border-slate-800 flex items-start gap-3">
            <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold leading-relaxed">
              {activeTab === 'role' 
                ? 'Mengatur akses navigasi menu secara langsung untuk kelompok pengguna (User Group). Aturan ini berlaku global di seluruh tenant platform.'
                : 'Mengatur hak visibilitas menu melalui Capability Jabatan. Ketika opsi dicentang, struktur organisasi sekolah akan diberikan capability yang dipetakan oleh menu tersebut.'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6">
            <TabsContent value="role" className="outline-none m-0">
              <MenuPermissionMatrix 
                menus={treeQuery.data || []} 
                roles={rolesQuery.data || []} 
                onRefresh={() => treeQuery.refetch()}
              />
            </TabsContent>
            
            <TabsContent value="struktur" className="outline-none m-0">
              <StrukturMenuMatrix 
                menus={treeQuery.data || []} 
                structures={structuresQuery.data || []}
                onRefresh={() => structuresQuery.refetch()}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </SuperAdminPageLayout>
  );
}
