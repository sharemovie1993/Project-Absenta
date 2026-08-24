import React, { useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, Loader, Card, SectionCard } from '@/components/ui';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import useConfirm from '@/hooks/useConfirm';
import { 
  Loader2, CheckCircle, Plus, Settings, GraduationCap, CalendarCheck, 
  CreditCard, Users, Box, Shield, FileText, AlertTriangle, Bell 
} from 'lucide-react';
import { 
  getRoles, 
  updateRolePermissions, 
  createRole, 
  updateRole, 
  getPermissionCatalog, 
  getUserEffectiveCapabilitiesApi, 
  getTenants, 
  type RoleItem, 
  type PermissionCatalogItem, 
  type TenantItem 
} from '@/api/user.api';
import { 
  getStrukturList, 
  getStrukturPermissions, 
  updateStrukturPermissions, 
  distributeStrukturPermissions as syncStrukturPerms, 
  type StrukturOrganisasi 
} from '@/api/academic/strukturOrganisasi.api';
import { StrukturPermissionMatrix } from '@/components/academic/struktur/StrukturPermissionMatrix';

// Lazy load components
const PermissionMatrix = lazy(() => import('@/components/management/role-management/PermissionMatrix').then(m => ({ default: m.PermissionMatrix })));
const JobdeskSettingsPanel = lazy(() => import('./components/JobdeskSettingsPanel').then(m => ({ default: m.JobdeskSettingsPanel })));

// Zod Schema Validation Guard (Pilar 25)
const roleSchema = z.object({
  name: z.string().min(2, 'Nama role minimal 2 karakter'),
  description: z.string().optional(),
});

const capsQuerySchema = z.object({
  userId: z.string().min(1, 'User ID wajib diisi'),
});

export const RoleManagementPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { user, isSuperAdmin } = useAuth();

  const [search, setSearch] = useState<string>('');
  const [dirtyRoleIds, setDirtyRoleIds] = useState<Set<string>>(new Set());
  const [localRoles, setLocalRoles] = useState<RoleItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<{ name: string; description?: string }>({ name: '' });
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{ id: string; name: string; description?: string } | null>(null);
  
  const [activeTab, setActiveTab] = useState<string>('ROLE');
  
  const [strukturSearch, setStrukturSearch] = useState<string>('');
  const [strukturSaving, setStrukturSaving] = useState<boolean>(false);
  const [structurePermissionsMap, setStructurePermissionsMap] = useState<Record<string, string[]>>({});
  const [dirtyStructureIds, setDirtyStructureIds] = useState<Set<string>>(new Set());

  const [effectiveCapsUserId, setEffectiveCapsUserId] = useState<string>('');
  const [effectiveCaps, setEffectiveCaps] = useState<string[]>([]);
  const [effectiveCapsLoading, setEffectiveCapsLoading] = useState<boolean>(false);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('');

  // 1. Fetch Roles via React Query (Pilar 31)
  const { data: rolesData, isLoading: loadingRoles } = useQuery({
    queryKey: ['roles-management'],
    queryFn: async () => {
      const res = await getRoles();
      const list = res?.data ?? [];
      setLocalRoles(list);
      return list;
    }
  });

  // 2. Fetch Permission Catalog via React Query
  const { data: permissionCatalogData, isLoading: loadingCatalog } = useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: async () => {
      const res = await getPermissionCatalog();
      return res?.data ?? [];
    }
  });

  // 3. Fetch Struktur List via React Query
  const { data: strukturData, isLoading: loadingStruktur } = useQuery({
    queryKey: ['struktur-list-perms', selectedTenantFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { is_active: true };
      if (selectedTenantFilter) params.tenant_id = selectedTenantFilter;
      if (!params.tenant_id && user?.tenant_id) params.tenant_id = user.tenant_id;
      
      const res = await getStrukturList(params);
      const list = res?.data ?? [];

      const promises = (list ?? [])?.map(s => getStrukturPermissions(s.id, s.tenant_id));
      const results = await Promise.all(promises);
      
      const newMap: Record<string, string[]> = {};
      results?.forEach((r, idx) => {
        const sId = list[idx].id;
        const perms = (r?.data ?? [])
          ?.map((sp: { permission?: { id?: string }; permission_id?: string }) => sp.permission?.id || sp.permission_id)
          ?.filter((x: unknown): x is string => typeof x === 'string' && x.trim() !== '');
        newMap[sId] = perms;
      });
      setStructurePermissionsMap(newMap);
      return list;
    },
    enabled: activeTab === 'STRUKTUR'
  });

  const roles = useMemo(() => localRoles.length > 0 ? localRoles : (rolesData || []), [localRoles, rolesData]);
  const permissionCatalog = useMemo(() => permissionCatalogData || [], [permissionCatalogData]);
  const strukturList = useMemo(() => strukturData || [], [strukturData]);

  // Handlers
  const onStrukturPermsChange = useCallback((id: string, newPerms: string[]) => {
    setStructurePermissionsMap(prev => ({ ...prev, [id]: newPerms }));
    setDirtyStructureIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleSaveStrukturMatrix = useCallback(async () => {
    if (dirtyStructureIds.size === 0) {
      toast('Tidak ada perubahan untuk disimpan', { icon: 'ℹ️' });
      return;
    }
    
    setStrukturSaving(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const promises = Array.from(dirtyStructureIds)?.map(async (strukturId) => {
        const structure = (strukturList ?? []).find(s => s.id === strukturId);
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
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan permissions struktur');
    } finally {
      setStrukturSaving(false);
    }
  }, [dirtyStructureIds, strukturList, structurePermissionsMap]);

  const handleDistributePermissions = useCallback(async (strukturId: string) => {
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
      const structure = (strukturList ?? []).find(s => s.id === strukturId);
      const res = await syncStrukturPerms(strukturId, structure?.tenant_id);
      if (res.success) toast.success(res.message);
      else toast.error(res.message || 'Gagal mendistribusikan permission');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Terjadi kesalahan saat distribusi');
    } finally {
      setStrukturSaving(false);
    }
  }, [confirm, strukturList]);

  const handleUpdateRolePermissions = useCallback((roleId: string, newPerms: string[]) => {
    const role = (roles ?? []).find(r => r.id === roleId);
    if (!role) return;

    const uniquePerms = Array.from(new Set(newPerms));
    const jsonPerms = JSON.stringify(uniquePerms);

    setLocalRoles(prev => (prev ?? [])?.map(r => r.id === roleId ? { ...r, permissions: jsonPerms, permission_count: uniquePerms.length } : r));
    setDirtyRoleIds(prev => {
      const next = new Set(prev);
      next.add(roleId);
      return next;
    });
  }, [roles]);

  const handleSaveAll = useCallback(async () => {
    if (dirtyRoleIds.size === 0) return;
    setIsSaving(true);
    let success = true;

    for (const roleId of dirtyRoleIds) {
      const role = (roles ?? []).find(r => r.id === roleId);
      if (!role) continue;

      let perms: string[] = [];
      try {
        perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || []);
      } catch {
        perms = [];
      }

      try {
        const res = await updateRolePermissions(roleId, perms);
        if (!res?.success) success = false;
      } catch {
        success = false;
      }
    }

    setIsSaving(false);
    if (success) {
      toast.success('Semua perubahan permission berhasil disimpan');
      setDirtyRoleIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['roles-management'] });
    } else {
      toast.error('Beberapa permission gagal disimpan');
    }
  }, [dirtyRoleIds, roles, queryClient]);

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    return (roles ?? []).filter(r => 
      r.name.toLowerCase().includes(search.toLowerCase()) || 
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
    );
  }, [roles, search]);

  const filteredStruktur = useMemo(() => {
    if (!strukturSearch.trim()) return strukturList;
    return (strukturList ?? []).filter(s =>
      s.nama.toLowerCase().includes(strukturSearch.toLowerCase()) ||
      s.kode.toLowerCase().includes(strukturSearch.toLowerCase())
    );
  }, [strukturList, strukturSearch]);

  const breadcrumbs = useMemo(() => [
    { label: 'System Utilities' },
    { label: 'Manajemen Role & Hak Akses' }
  ], []);

  const tabs = useMemo(() => [
    { id: 'ROLE', label: `Matriks Role Platform (${roles.length})` },
    { id: 'STRUKTUR', label: `Matriks Struktur Organisasi (${strukturList.length})` },
    { id: 'EFFECTIVE', label: 'Cek Effective Capabilities' },
    { id: 'JOBDESK', label: 'Pengaturan Jobdesk' },
  ], [roles.length, strukturList.length]);

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        title="Role & Capability Matrix"
        description="Kelola hierarki otorisasi, capability matriks per modul, serta pemetaan hak akses struktur organisasi sekolah."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="rolemanagementpage"
        topSlot={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 font-bold rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Role Baru
            </Button>
            {dirtyRoleIds.size > 0 && (
              <Button
                variant="toolbarPrimary"
                size="toolbar"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Simpan Perubahan Role ({dirtyRoleIds.size})
              </Button>
            )}
          </div>
        }
        instruction={{
          title: 'Panduan Manajemen Role & Hak Akses',
          description: 'Kelola kapabilitas pengguna sistem secara terpusat untuk menjaga integritas dan keamanan platform.',
          items: [
            { text: 'Pilih tab Matriks Role untuk mengatur izin modul per kelompok pengguna.' },
            { text: 'Pilih tab Matriks Struktur untuk mengatur capability jabatan organisasi sekolah.' },
            { text: 'Gunakan tab Cek Effective Capabilities untuk mengecek akses riil seorang pengguna.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Tab Switcher */}
            <TabSwitcher
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={tabs}
            />

            {/* Tab 1: Matriks Role */}
            {activeTab === 'ROLE' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <Input
                    id="role-search-input"
                    aria-label="Cari nama role"
                    placeholder="Cari nama role..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs rounded-xl text-xs"
                  />
                </div>

                {loadingRoles ? (
                  <div className="text-center py-20 text-xs text-slate-400">Memuat matriks role...</div>
                ) : (
                  <Suspense fallback={<div className="text-center py-20 text-xs text-slate-400">Memuat matriks role...</div>}>
                    <PermissionMatrix
                      roles={filteredRoles}
                      permissionCatalog={permissionCatalog}
                      onUpdatePermissions={handleUpdateRolePermissions}
                      onEditRole={(r) => { setEditForm(r); setIsEditOpen(true); }}
                    />
                  </Suspense>
                )}
              </div>
            )}

            {/* Tab 2: Matriks Struktur */}
            {activeTab === 'STRUKTUR' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <Input
                    id="struktur-search-input"
                    aria-label="Cari jabatan struktur organisasi"
                    placeholder="Cari struktur/jabatan..."
                    value={strukturSearch}
                    onChange={(e) => setStrukturSearch(e.target.value)}
                    className="max-w-xs rounded-xl text-xs"
                  />
                  {dirtyStructureIds.size > 0 && (
                    <Button
                      variant="toolbarPrimary"
                      size="toolbar"
                      onClick={handleSaveStrukturMatrix}
                      disabled={strukturSaving}
                      className="font-bold rounded-xl shadow-md"
                    >
                      Simpan Perubahan Struktur ({dirtyStructureIds.size})
                    </Button>
                  )}
                </div>

                {loadingStruktur ? (
                  <div className="text-center py-20 text-xs text-slate-400">Memuat matriks struktur...</div>
                ) : (
                  <Suspense fallback={<div className="text-center py-20 text-xs text-slate-400">Memuat matriks struktur...</div>}>
                    <StrukturPermissionMatrix
                      strukturList={filteredStruktur}
                      structurePermissionsMap={structurePermissionsMap}
                      permissionCatalog={permissionCatalog}
                      onUpdatePermissions={onStrukturPermsChange}
                      onSave={handleSaveStrukturMatrix}
                      onDistribute={handleDistributePermissions}
                      isSaving={strukturSaving}
                      hasUnsavedChanges={dirtyStructureIds.size > 0}
                      canDistribute={user?.role?.name === 'SUPERADMIN'}
                    />
                  </Suspense>
                )}
              </div>
            )}

            {/* Tab 3: Effective Capabilities */}
            {activeTab === 'EFFECTIVE' && (
              <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                <div className="max-w-md space-y-3">
                  <div>
                    <label htmlFor="user-id-caps-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      User ID (UUID)
                    </label>
                    <Input
                      id="user-id-caps-input"
                      aria-label="Masukkan User ID pengguna"
                      placeholder="Masukkan UUID user..."
                      value={effectiveCapsUserId}
                      onChange={(e) => setEffectiveCapsUserId(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="toolbarPrimary"
                    size="toolbar"
                    disabled={!effectiveCapsUserId || effectiveCapsLoading}
                    onClick={async () => {
                      capsQuerySchema.parse({ userId: effectiveCapsUserId });
                      setEffectiveCapsLoading(true);
                      try {
                        const res = await getUserEffectiveCapabilitiesApi(effectiveCapsUserId);
                        setEffectiveCaps(res?.data || []);
                      } finally {
                        setEffectiveCapsLoading(false);
                      }
                    }}
                    className="w-full font-bold rounded-xl text-xs"
                  >
                    {effectiveCapsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Lihat Capabilities Efektif
                  </Button>
                </div>

                {effectiveCaps.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Daftar Capabilities Aktif ({effectiveCaps.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {effectiveCaps?.map((cap) => (
                        <div key={cap} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold border border-slate-100 dark:border-slate-800">
                          ✓ {cap}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Tab 4: Jobdesk Settings */}
            {activeTab === 'JOBDESK' && (
              <Suspense fallback={<div className="text-center py-20 text-xs text-slate-400">Memuat pengaturan jobdesk...</div>}>
                <JobdeskSettingsPanel />
              </Suspense>
            )}
          </div>
        </SectionCard>

        {/* Create Role Modal */}
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Tambah Role Baru" size="md">
          <div className="space-y-4 py-2 text-xs">
            <div>
              <label htmlFor="create-role-name" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Role <span className="text-rose-500">*</span>
              </label>
              <Input
                id="create-role-name"
                aria-label="Nama role baru"
                placeholder="Contoh: BENDAHARA_SEKOLAH"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="create-role-desc" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Deskripsi
              </label>
              <Input
                id="create-role-desc"
                aria-label="Deskripsi role"
                placeholder="Deskripsi tugas dan tanggung jawab role..."
                value={createForm.description || ''}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button
                type="button"
                variant="toolbarPrimary"
                size="toolbar"
                onClick={async () => {
                  const parsed = roleSchema.safeParse(createForm);
                  if (!parsed.success) {
                    toast.error(parsed.error.errors[0]?.message || 'Data role belum valid');
                    return;
                  }
                  try {
                    const res = await createRole(createForm);
                    if (res?.success && res.data) {
                      setLocalRoles(prev => [res.data as RoleItem, ...(prev ?? [])]);
                      setIsCreateOpen(false);
                      setCreateForm({ name: '' });
                      toast.success('Role baru berhasil dibuat');
                      queryClient.invalidateQueries({ queryKey: ['roles-management'] });
                    }
                  } catch {
                    toast.error('Gagal membuat role');
                  }
                }}
              >
                Simpan Role
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Role Modal */}
        <Modal isOpen={isEditOpen && !!editForm} onClose={() => setIsEditOpen(false)} title="Edit Informasi Role" size="md">
          {editForm && (
            <div className="space-y-4 py-2 text-xs">
              <div>
                <label htmlFor="edit-role-name" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Role <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="edit-role-name"
                  aria-label="Nama role"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="edit-role-desc" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi
                </label>
                <Input
                  id="edit-role-desc"
                  aria-label="Deskripsi role"
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  className="rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setIsEditOpen(false)}>
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={async () => {
                    const parsed = roleSchema.safeParse(editForm);
                    if (!parsed.success) {
                      toast.error(parsed.error.errors[0]?.message || 'Data role belum valid');
                      return;
                    }
                    try {
                      const res = await updateRole(editForm.id, { name: editForm.name, description: editForm.description });
                      if (res?.success) {
                        setLocalRoles(prev => (prev ?? [])?.map(r => r.id === editForm.id ? { ...r, name: editForm.name, description: editForm.description } : r));
                        setIsEditOpen(false);
                        toast.success('Role berhasil diperbarui');
                        queryClient.invalidateQueries({ queryKey: ['roles-management'] });
                      }
                    } catch {
                      toast.error('Gagal memperbarui role');
                    }
                  }}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default RoleManagementPage;
