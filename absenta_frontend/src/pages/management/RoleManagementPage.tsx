import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Button, Input, Tabs, TabsList, TabsTrigger, TabsContent, Modal, ModalFooter, Loader } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import useConfirm from '@/hooks/useConfirm';
import { Loader2, CheckCircle, Plus, Settings, GraduationCap, CalendarCheck, CreditCard, Users, Box, Shield, FileText, ArrowUp, AlertTriangle, Bell } from 'lucide-react';
import { 
  getRoles, 
  updateRolePermissions, 
  createRole, 
  updateRole, 
  getPermissionCatalog, 
  getUserEffectiveCapabilitiesApi, 
  getTenants, 
  exportPoliciesApi, 
  importPoliciesApi, 
  resetPoliciesApi, 
  type RoleItem, 
  type PermissionCatalogItem, 
  type TenantItem 
} from '@/api/user.api';
import { getStrukturList, getStrukturPermissions, updateStrukturPermissions, distributeStrukturPermissions, type StrukturOrganisasi } from '@/api/academic/strukturOrganisasi.api';
import { StrukturPermissionMatrix } from '@/components/academic/struktur/StrukturPermissionMatrix';

// Lazy load components
const PermissionMatrix = lazy(() => import('@/components/management/role-management/PermissionMatrix').then(m => ({ default: m.PermissionMatrix })));
const JobdeskSettingsPanel = lazy(() => import('./components/JobdeskSettingsPanel').then(m => ({ default: m.JobdeskSettingsPanel })));

// --- Helper Functions ---
function getModuleIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('core') || lower.includes('system') || lower.includes('auth')) return Settings;
  if (lower.includes('academic') || lower.includes('siswa') || lower.includes('guru') || lower.includes('kelas')) return GraduationCap;
  if (lower.includes('attendance') || lower.includes('absen')) return CalendarCheck;
  if (lower.includes('billing') || lower.includes('finance') || lower.includes('payment')) return CreditCard;
  if (lower.includes('users') || lower.includes('pengguna')) return Users;
  if (lower.includes('affairs') || lower.includes('violation')) return AlertTriangle;
  if (lower.includes('document') || lower.includes('file')) return FileText;
  if (lower.includes('superadmin') || lower.includes('infra')) return Shield;
  if (lower.includes('notify') || lower.includes('notifikasi') || lower.includes('pesan')) return Bell;
  return Box;
}

export default function RoleManagementPage() {
  const confirm = useConfirm();
  const { user, isSuperAdmin } = useAuth();

  
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  
  const [dirtyRoleIds, setDirtyRoleIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<{ name: string; description?: string; permissions?: string }>({ name: '' });
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{ id: string; name: string; description?: string; permissions?: string | string[] } | null>(null);
  
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionCatalogItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ROLE' | 'STRUKTUR' | 'EFFECTIVE' | 'JOBDESK'>('ROLE');
  
  const [strukturList, setStrukturList] = useState<StrukturOrganisasi[]>([]);
  const [strukturLoading, setStrukturLoading] = useState<boolean>(false);
  const [strukturSearch, setStrukturSearch] = useState<string>('');
  const [strukturSaving, setStrukturSaving] = useState<boolean>(false);
  const [structurePermissionsMap, setStructurePermissionsMap] = useState<Record<string, string[]>>({});
  const [dirtyStructureIds, setDirtyStructureIds] = useState<Set<string>>(new Set());

  const [effectiveCapsUserId, setEffectiveCapsUserId] = useState<string>('');
  const [effectiveCaps, setEffectiveCaps] = useState<string[]>([]);
  const [effectiveCapsLoading, setEffectiveCapsLoading] = useState<boolean>(false);
  
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccessData, setImportSuccessData] = useState<{ roles: number; structures: number } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    const loadTenants = async () => {
      if (!isSuperAdmin()) return;
      try {
        const res = await getTenants();
        if (res?.success) setTenants(res.data);
      } catch (e) { /* ignore */ }
    };
    loadTenants();
  }, [isSuperAdmin]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getRoles();
        setRoles(res?.data ?? []);
      } catch {
        toast.error('Gagal memuat role');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await getPermissionCatalog();
        setPermissionCatalog(res?.data ?? []);
      } catch {
        toast.error('Gagal memuat daftar permission');
      }
    };
    loadPermissions();
  }, []);

  useEffect(() => {
    if (activeTab === 'STRUKTUR') {
      const loadStrukturData = async () => {
        try {
          setStrukturLoading(true);
          const params: Record<string, unknown> = { is_active: true };
          if (selectedTenantFilter) params.tenant_id = selectedTenantFilter;
          
          const tenantId = params.tenant_id || user?.tenant_id;
          if (!params.tenant_id && user?.tenant_id) {
             params.tenant_id = user.tenant_id;
          }
          const res = await getStrukturList(params);
          const list = res?.data ?? [];
          setStrukturList(list);

          const promises = list.map(s => getStrukturPermissions(s.id, s.tenant_id));
          const results = await Promise.all(promises);
          
          const newMap: Record<string, string[]> = {};
          results.forEach((res, idx) => {
             const sId = list[idx].id;
             const perms = (res?.data ?? [])
                .map((sp: any) => sp.permission?.id || sp.permission_id)
                .filter((x: unknown): x is string => typeof x === 'string' && x.trim() !== '');
             newMap[sId] = perms;
          });
          setStructurePermissionsMap(newMap);
          setDirtyStructureIds(new Set());

        } catch {
          toast.error('Gagal memuat data struktur');
        } finally {
          setStrukturLoading(false);
        }
      };
      loadStrukturData();
    }
  }, [activeTab, selectedTenantFilter, user?.tenant_id]);

  // --- Handlers ---
  const handleUpdateStrukturPermissionsMatrix = (id: string, newPerms: string[]) => {
      setStructurePermissionsMap(prev => ({ ...prev, [id]: newPerms }));
      setDirtyStructureIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
      });
  };

  const handleSaveStrukturMatrix = async () => {
    if (dirtyStructureIds.size === 0) {
        toast('Tidak ada perubahan untuk disimpan', { icon: 'ℹ️' });
        return;
    }
    
    setStrukturSaving(true);
    let successCount = 0;
    let failCount = 0;

    try {
        const promises = Array.from(dirtyStructureIds).map(async (strukturId) => {
            const structure = strukturList.find(s => s.id === strukturId);
            if (!structure) return;
            const perms = structurePermissionsMap[strukturId] || [];
            const res = await updateStrukturPermissions(strukturId, perms, structure.tenant_id);
            if (res.success) successCount++;
            else failCount++;
        });

        await Promise.all(promises);

        if (failCount === 0) {
            toast.success(`Berhasil menyimpan perubahan pada ${successCount} struktur`);
            setDirtyStructureIds(new Set());
        } else {
            toast(`Disimpan: ${successCount}, Gagal: ${failCount}`, { icon: '⚠️' });
        }
    } catch (e) {
        toast.error('Terjadi kesalahan saat menyimpan permissions struktur');
    } finally {
        setStrukturSaving(false);
    }
  };

  const handleDistributePermissions = async (strukturId: string) => {
    const ok = await confirm({
      title: 'Distribusikan Permission',
      description: 'Apakah Anda yakin ingin mendistribusikan permission struktur ini ke SEMUA sekolah? Aksi ini akan menimpa permission struktur dengan kode yang sama di tenant lain.',
      confirmText: 'Distribusikan',
      cancelText: 'Batal',
      style: 'warning'
    });
    if (!ok) return;

    try {
      setStrukturSaving(true);
      const structure = strukturList.find(s => s.id === strukturId);
      const res = await distributeStrukturPermissions(strukturId, structure?.tenant_id);
      if (res.success) toast.success(res.message);
      else toast.error(res.message || 'Gagal mendistribusikan permission');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Terjadi kesalahan saat distribusi');
    } finally {
      setStrukturSaving(false);
    }
  };

  const handleUpdateRolePermissions = (roleId: string, newPerms: string[]) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    const uniquePerms = Array.from(new Set(newPerms));
    const jsonPerms = JSON.stringify(uniquePerms);

    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, permissions: jsonPerms, permission_count: uniquePerms.length } : r));
    setDirtyRoleIds(prev => {
        const next = new Set(prev);
        next.add(roleId);
        return next;
    });
  };

  const handleSave = async () => {
    if (dirtyRoleIds.size === 0) {
        toast('Tidak ada perubahan untuk disimpan', { icon: 'ℹ️' });
        return;
    }
    
    setIsSaving(true);
    let successCount = 0;
    let failCount = 0;

    try {
        const promises = Array.from(dirtyRoleIds).map(async (roleId) => {
            const role = roles.find(r => r.id === roleId);
            if (!role) return;
            const perms = role.permissions;
            const payload = Array.isArray(perms) ? JSON.stringify(perms) : (perms ?? '[]');
            const res = await updateRolePermissions(roleId, payload);
            if (res.success) successCount++;
            else failCount++;
        });

        await Promise.all(promises);

        if (failCount === 0) {
            toast.success(`Berhasil menyimpan perubahan pada ${successCount} role`);
            setDirtyRoleIds(new Set());
        } else {
            toast(`Disimpan: ${successCount}, Gagal: ${failCount}`, { icon: '⚠️' });
        }
    } catch (e) {
        toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
        setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportPoliciesApi();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `policy-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Policy berhasil diexport');
    } catch (error) {
      toast.error('Gagal export policy');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawJson = JSON.parse(event.target?.result as string);
        let payload = rawJson;
        if (rawJson.data && (rawJson.data.roles || rawJson.data.structures)) {
          payload = rawJson.data;
        }

        const res = await importPoliciesApi(payload);
        if (res.success) {
          const data = res.data as { roles_updated: number; structures_updated: number; errors: string[] };
          setImportSuccessData({ roles: data.roles_updated, structures: data.structures_updated });
          const resRoles = await getRoles();
          setRoles(resRoles?.data ?? []);
        } else {
          toast.error(res.message || 'Gagal import policy');
        }
      } catch (error) {
        toast.error('File tidak valid atau gagal import');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Hapus Semua Permission?',
      description: 'PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA permission pada Role dan Struktur?\n\nTindakan ini akan mengosongkan semua konfigurasi akses dan tidak dapat dibatalkan.\n\nPastikan Anda sudah melakukan Export Policy sebagai backup.',
      confirmText: 'Reset Sekarang',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;
    try {
      const res = await resetPoliciesApi('all');
      if (res.success) {
        toast.success('Semua policy berhasil di-reset');
        const resRoles = await getRoles();
        setRoles(resRoles?.data ?? []);
      } else {
        toast.error(res.message || 'Gagal reset policy');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat reset policy');
    }
  };

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = roles;
    if (q) {
        result = roles.filter((r) => {
          const name = (r.name ?? '').toLowerCase();
          const desc = (r.description ?? '').toLowerCase();
          return name.includes(q) || desc.includes(q);
        });
    }
    
    const ROLE_PRIORITY: Record<string, number> = { 'SUPERADMIN': 0, 'ADMIN': 1, 'GURU': 2, 'SISWA': 3 };

    return [...result].sort((a, b) => {
        const nameA = (a.name || '').toUpperCase();
        const nameB = (b.name || '').toUpperCase();
        const pA = ROLE_PRIORITY[nameA];
        const pB = ROLE_PRIORITY[nameB];
        if (pA !== undefined && pB !== undefined) return pA - pB;
        if (pA !== undefined) return -1;
        if (pB !== undefined) return 1;
        
        const getPartialPriority = (name: string) => {
            if (name.includes('SUPERADMIN')) return 0;
            if (name.includes('ADMIN')) return 1;
            if (name.includes('GURU')) return 2;
            if (name.includes('SISWA')) return 3;
            return 99;
        };
        const ppA = getPartialPriority(nameA);
        const ppB = getPartialPriority(nameB);
        if (ppA !== ppB) return ppA - ppB;
        return nameA.localeCompare(nameB);
    });
  }, [roles, search]);

  const filteredStrukturList = useMemo(() => {
    const q = strukturSearch.trim().toLowerCase();
    if (!q) return strukturList;
    return strukturList.filter((s) => {
      const kode = (s.kode ?? '').toLowerCase();
      const nama = (s.nama ?? '').toLowerCase();
      const scope = (s.scope ?? '').toLowerCase();
      return kode.includes(q) || nama.includes(q) || scope.includes(q);
    });
  }, [strukturList, strukturSearch]);

  const statsList = useMemo(() => {
    const totalRoles = roles.length;
    const totalPermissions = permissionCatalog.length;
    const totalStructures = strukturList.length;
    const unsavedChanges = dirtyRoleIds.size + dirtyStructureIds.size;

    return [
      {
        title: "Peran Terdaftar (Roles)",
        value: `${totalRoles} Role`,
        icon: <Shield className="h-4 w-4 text-white" />,
        gradient: "from-blue-500 to-indigo-600",
        subtitle: "Kelompok otorisasi platform"
      },
      {
        title: "Katalog Otorisasi",
        value: `${totalPermissions} Capabilities`,
        icon: <FileText className="h-4 w-4 text-white" />,
        gradient: "from-indigo-500 to-purple-600",
        subtitle: "Total izin akses sistem"
      },
      {
        title: "Struktur Organisasi",
        value: `${totalStructures} Jabatan`,
        icon: <Users className="h-4 w-4 text-white" />,
        gradient: "from-purple-500 to-fuchsia-600",
        subtitle: "Struktur jabatan sekolah aktif"
      },
      {
        title: "Perubahan Belum Disimpan",
        value: `${unsavedChanges} Item`,
        icon: <AlertTriangle className="h-4 w-4 text-white" />,
        gradient: unsavedChanges > 0 ? "from-amber-500 to-orange-600 animate-pulse" : "from-slate-500 to-slate-600",
        subtitle: unsavedChanges > 0 ? "Ada perubahan yang belum disimpan" : "Semua perubahan telah disimpan",
        onClick: unsavedChanges > 0 ? () => {
          if (dirtyRoleIds.size > 0) handleSave();
          if (dirtyStructureIds.size > 0) handleSaveStrukturMatrix();
        } : undefined
      }
    ];
  }, [roles.length, permissionCatalog.length, strukturList.length, dirtyRoleIds.size, dirtyStructureIds.size]);

  const toolbarSlot = useMemo(() => (
    <div className="flex gap-2 flex-wrap items-center">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="rounded-xl h-9 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        {isImporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="mr-1.5 h-3.5 w-3.5" />}
        {isImporting ? 'Mengimpor...' : 'Import Policy'}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExport} disabled={isImporting} className="rounded-xl h-9 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        Export Policy
      </Button>
      <Button variant="danger" size="sm" onClick={handleReset} disabled={isImporting} className="rounded-xl h-9 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 dark:bg-red-900 dark:hover:bg-red-800">
        Reset Policy
      </Button>
    </div>
  ), [isImporting, handleImport, handleExport, handleReset]);

  return (
    <SuperAdminPageLayout
      title="Manajemen Hak Akses & Policy"
      description="Kelola matriks otorisasi global platform, otorisasi default per kelompok peran (Roles), penugasan permission struktur jabatan sekolah, serta auditing kemampuan pengguna."
      stats={statsList}
      toolbar={toolbarSlot}
      hardeningModuleKey="rolemanagementpage"
      breadcrumbs={[{ label: 'System Utilities' }, { label: 'Roles & Permissions' }]}
      instruction={{
        title: 'Panduan Manajemen Akses',
        description: 'Gunakan halaman ini untuk mengatur kebijakan otorisasi (RBAC) di seluruh platform.',
        items: [
          { text: 'Tab "Role & Permission" mengatur izin dasar per kelompok peran (global).' },
          { text: 'Tab "Struktur & Permission" mengatur izin spesifik per jabatan di sekolah (tenant-specific).' },
          { text: 'Gunakan fitur Export/Import Policy untuk memindahkan kebijakan antar lingkungan.' },
          { text: 'Perubahan pada matriks bersifat temporary sampai Anda menekan tombol Simpan.' }
        ]
      }}
    >
      <div className="space-y-6 font-sans">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 flex w-max max-w-full overflow-x-auto scrollbar-none">
            <TabsTrigger value="ROLE" className="rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">Role & Permission</TabsTrigger>
            <TabsTrigger value="STRUKTUR" className="rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">Struktur & Permission</TabsTrigger>
            <TabsTrigger value="EFFECTIVE" className="rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">Effective Capabilities</TabsTrigger>
            <TabsTrigger value="JOBDESK" className="rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">📋 Pengelola Jobdesk</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-6">
            <TabsContent value="ROLE" className="outline-none m-0">
              <div className="space-y-4">
                 <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex-1 max-w-md">
                        <Input placeholder="Cari Role..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl text-xs h-9" />
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl text-xs font-semibold gap-1.5 h-9">
                        <Plus className="h-4 w-4" /> Buat Role Baru
                    </Button>
                 </div>
                 <Suspense fallback={<Loader />}>
                   <PermissionMatrix 
                      roles={filteredRoles}
                      permissionCatalog={permissionCatalog}
                      searchQuery={search}
                      onUpdatePermissions={handleUpdateRolePermissions}
                      onEditRole={(role) => {
                          setEditForm({ id: role.id, name: role.name, description: role.description ?? '', permissions: role.permissions ?? '' });
                          setIsEditOpen(true);
                      }}
                      onDeleteRole={() => {}}
                      onSave={handleSave}
                      isSaving={isSaving}
                      hasUnsavedChanges={dirtyRoleIds.size > 0}
                      getModuleIcon={getModuleIcon}
                   />
                 </Suspense>
              </div>
            </TabsContent>

            <TabsContent value="STRUKTUR" className="outline-none m-0">
              <div className="space-y-4">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex-1 flex flex-col md:flex-row gap-3 items-center w-full">
                        {tenants.length > 0 && (
                          <div className="w-full md:w-1/3">
                            <SearchableSelect
                              id="tenant-filter"
                              value={selectedTenantFilter}
                              onValueChange={setSelectedTenantFilter}
                              options={[{ label: 'Semua Tenant', value: '' }, ...(tenants ?? [])?.map(t => ({ label: t.name, value: t.id }))]}
                              placeholder="Pilih Tenant..."
                              triggerClassName="w-full h-9 rounded-xl text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                            />
                          </div>
                        )}
                        <div className="w-full md:max-w-md">
                            <Input placeholder="Cari Struktur..." value={strukturSearch} onChange={(e) => setStrukturSearch(e.target.value)} className="rounded-xl text-xs h-9" />
                        </div>
                    </div>
                 </div>
                 {strukturLoading ? (
                    <div className="flex items-center justify-center p-8 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <span className="ml-2 text-slate-500 text-xs font-semibold">Memuat data struktur...</span>
                    </div>
                 ) : (
                    <StrukturPermissionMatrix 
                        structures={filteredStrukturList.map(s => ({ ...s, permissions: structurePermissionsMap[s.id] || [] }))}
                        permissionCatalog={permissionCatalog}
                        searchQuery={strukturSearch}
                        onUpdatePermissions={handleUpdateStrukturPermissionsMatrix}
                        onSave={handleSaveStrukturMatrix}
                        onDistribute={handleDistributePermissions}
                        isSaving={strukturSaving}
                        hasUnsavedChanges={dirtyStructureIds.size > 0}
                        canDistribute={user?.role?.name === 'SUPERADMIN'}
                    />
                 )}
              </div>
            </TabsContent>

            <TabsContent value="EFFECTIVE" className="outline-none m-0">
              <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">User ID (UUID)</label>
                            <Input placeholder="Masukkan User ID..." value={effectiveCapsUserId} onChange={(e) => setEffectiveCapsUserId(e.target.value)} className="rounded-xl text-xs h-10" />
                        </div>
                        <Button disabled={!effectiveCapsUserId || effectiveCapsLoading} onClick={async () => {
                            setEffectiveCapsLoading(true);
                            try {
                                const res = await getUserEffectiveCapabilitiesApi(effectiveCapsUserId);
                                setEffectiveCaps(res?.data || []);
                            } finally { setEffectiveCapsLoading(false); }
                        }} className="w-full rounded-xl text-xs font-semibold h-10 gap-1.5">
                            {effectiveCapsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Lihat Capabilities
                        </Button>
                    </div>
                    <div className="flex-[2] border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-4 max-h-[300px] overflow-y-auto scrollbar-thin">
                        {effectiveCaps.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {effectiveCaps.map(c => (
                                    <div key={c} className="font-mono text-[11px] bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {c}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-600 gap-2">
                                <Shield className="h-8 w-8 stroke-[1.5]" /> <span className="text-xs font-medium">Belum ada capability yang dimuat.</span>
                            </div>
                        )}
                    </div>
                  </div>
              </div>
            </TabsContent>

            <TabsContent value="JOBDESK" className="outline-none m-0">
              <Suspense fallback={<Loader />}>
                <JobdeskSettingsPanel />
              </Suspense>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Tambah Role Baru" size="md">
        <div className="space-y-4">
          <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nama Role</label>
              <Input placeholder="Nama role..." value={createForm.name} onChange={(e) => setCreateForm({...createForm, name: e.target.value})} className="rounded-xl text-xs h-10" />
          </div>
          <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Deskripsi</label>
              <Input placeholder="Deskripsi..." value={createForm.description} onChange={(e) => setCreateForm({...createForm, description: e.target.value})} className="rounded-xl text-xs h-10" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl text-xs font-semibold h-10 px-4">Batal</Button>
            <Button onClick={async () => {
                if(!createForm.name) return;
                try {
                    const res = await createRole(createForm);
                    if(res?.success && res.data) {
                        setRoles([res.data as RoleItem, ...roles]);
                        setIsCreateOpen(false);
                        setCreateForm({name: ''});
                        toast.success('Role berhasil dibuat');
                    }
                } catch(e) { toast.error('Gagal membuat role'); }
            }} className="rounded-xl text-xs font-semibold h-10 px-4">Simpan</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditOpen && !!editForm} onClose={() => setIsEditOpen(false)} title="Edit Role Info" size="md">
        {editForm && (
          <div className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nama Role</label>
                <Input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="rounded-xl text-xs h-10" />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Deskripsi</label>
                <Input value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} className="rounded-xl text-xs h-10" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl text-xs font-semibold h-10 px-4">Batal</Button>
              <Button onClick={async () => {
                  try {
                      const res = await updateRole(editForm.id, { name: editForm.name, description: editForm.description });
                      if(res?.success) {
                          setRoles(roles.map(r => r.id === editForm.id ? { ...r, name: editForm.name, description: editForm.description } : r));
                          setIsEditOpen(false);
                          toast.success('Role berhasil diupdate');
                      }
                  } catch(e) { toast.error('Gagal update role'); }
              }} className="rounded-xl text-xs font-semibold h-10 px-4">Simpan</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!importSuccessData} onClose={() => setImportSuccessData(null)} title="Import Berhasil">
        <div className="text-center space-y-4 p-2">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto animate-bounce" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Roles updated: <span className="font-bold text-indigo-600 dark:text-indigo-400">{importSuccessData?.roles}</span></p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Structures updated: <span className="font-bold text-indigo-600 dark:text-indigo-400">{importSuccessData?.structures}</span></p>
          </div>
        </div>
        <ModalFooter>
            <Button onClick={() => setImportSuccessData(null)} className="rounded-xl text-xs font-semibold h-9 px-4">Tutup</Button>
        </ModalFooter>
      </Modal>
    </SuperAdminPageLayout>
  );
}
