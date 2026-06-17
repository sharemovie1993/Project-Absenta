import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Checkbox, Tabs, TabsList, TabsTrigger, TabsContent, Modal, ModalFooter } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import useConfirm from '@/hooks/useConfirm';
import { formatErrorMessage } from '@/api/apiUtils';
import { Loader2, CheckCircle, Edit, Trash2, Plus, Save, Settings, GraduationCap, CalendarCheck, CreditCard, Users, Box, Shield, FileText, ArrowUp, AlertTriangle, Bell } from 'lucide-react';
import { 
  getRoles, 
  updateRolePermissions, 
  createRole, 
  updateRole, 
  deleteRole, 
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
import { getStrukturList, getStrukturPermissions, updateStrukturPermissions, distributeStrukturPermissions, type StrukturOrganisasi, type StrukturPermissionItem } from '@/api/academic/strukturOrganisasi.api';
import { StrukturPermissionMatrix, type StrukturWithPermissions } from '@/components/academic/struktur/StrukturPermissionMatrix';
import { JobdeskSettingsPanel } from './components/JobdeskSettingsPanel';

// --- Helper Functions ---

function parsePermissions(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  
  const rawStr = String(raw).trim();
  if (rawStr.startsWith('[') && rawStr.endsWith(']')) {
    try {
      const parsed = JSON.parse(rawStr);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Fallback to comma split if JSON parse fails
    }
  }
  
  return rawStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

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

// --- Components ---

const PermissionMatrix = ({
  roles,
  permissionCatalog,
  searchQuery,
  onUpdatePermissions,
  onEditRole,
  onDeleteRole,
  onSave,
  isSaving,
  hasUnsavedChanges
}: {
  roles: RoleItem[];
  permissionCatalog: PermissionCatalogItem[];
  searchQuery: string;
  onUpdatePermissions: (roleId: string, newPermissions: string[]) => void;
  onEditRole: (role: RoleItem) => void;
  onDeleteRole: (role: RoleItem) => void;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}) => {
  // Group Permissions by Module (Domain.Entity)
  const groupedModules = useMemo(() => {
    const groups: Record<string, { name: string; permissions: PermissionCatalogItem[] }> = {};
    
    permissionCatalog.forEach(p => {
      const parts = p.id.split('.');
      const domain = p.group || parts[0] || 'other';
      const entity = p.module || parts[1] || 'general';
      // Normalize module name
      const domainName = domain.replace(/_/g, ' ');
      const entityName = entity.replace(/_/g, ' ');
      
      const key = `${domain}.${entity}`;
      const name = `${domainName.charAt(0).toUpperCase() + domainName.slice(1)} - ${entityName.charAt(0).toUpperCase() + entityName.slice(1)}`;
      
      if (!groups[key]) {
        groups[key] = { name, permissions: [] };
      }
      groups[key].permissions.push(p);
    });
    
    // Sort modules by name
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [permissionCatalog]);

  const categorize = (p: PermissionCatalogItem) => {
    const parts = p.id.split('.');
    // Assuming format: domain.entity.verb.action...
    // We look for known verbs in any part after entity
    const suffix = parts.slice(2).join('.').toLowerCase();
    
    if (suffix.includes('view') || suffix.includes('read') || suffix.includes('get') || suffix.includes('list') || suffix.includes('detail') || suffix.includes('history') || suffix.includes('show')) return 'VIEW';
    if (suffix.includes('create') || suffix.includes('add') || suffix.includes('store') || suffix.includes('enroll') || suffix.includes('generate') || suffix.includes('import') || suffix.includes('upload')) return 'CREATE';
    if (suffix.includes('update') || suffix.includes('edit') || suffix.includes('change') || suffix.includes('modify') || suffix.includes('assign') || suffix.includes('revoke') || suffix.includes('set') || suffix.includes('reset') || suffix.includes('process') || suffix.includes('cancel') || suffix.includes('resume') || suffix.includes('renew') || suffix.includes('pay') || suffix.includes('tap') || suffix.includes('bypass') || suffix.includes('verify')) return 'UPDATE';
    if (suffix.includes('delete') || suffix.includes('remove') || suffix.includes('destroy') || suffix.includes('erase')) return 'DELETE';
    return 'OTHER';
  };

  const formatLabel = (p: PermissionCatalogItem, col: string) => {
    // 1. Try to use description if it's short (<= 3 words)
    // if (p.description && p.description.split(' ').length <= 3) return p.description;

    // 2. Format ID
    const parts = p.id.split('.');
    if (parts.length < 3) return p.description || p.id;

    // Remove domain and entity (first 2 parts)
    let suffix = parts.slice(2).join(' ');
    
    // Remove the verb if it matches the column
    const colLower = col.toLowerCase();
    if (suffix.toLowerCase().startsWith(colLower)) {
        suffix = suffix.substring(colLower.length).trim();
    }
    
    // Clean up underscores and dots
    suffix = suffix.replace(/[_.]/g, ' ');
    
    // If empty (e.g. "view"), show "General" or "All"
    if (!suffix.trim()) return 'General';

    // Title Case
    return suffix.split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  };

  const COLUMNS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'OTHER'];

  return (
    <div className="space-y-8 pb-10">
      {groupedModules.map((module) => {
        // Group permissions in this module by Verb
        const permColumns: Record<string, PermissionCatalogItem[]> = {
          'VIEW': [], 'CREATE': [], 'UPDATE': [], 'DELETE': [], 'OTHER': []
        };
        module.permissions.forEach(p => permColumns[categorize(p)].push(p));

        // Helper to check status for Column Bulk Toggle
        const getColumnStatus = (col: string) => {
           const colPerms = permColumns[col];
           if (colPerms.length === 0) return { checked: false, indeterminate: false, disabled: true };
           
           let allGranted = true;
           let someGranted = false;
           
           roles.forEach(role => {
               const rolePerms = parsePermissions(role.permissions);
               const hasAll = colPerms.every(p => rolePerms.includes(p.id));
               const hasSome = colPerms.some(p => rolePerms.includes(p.id));
               if (!hasAll) allGranted = false;
               if (hasSome) someGranted = true;
           });
           
           return { checked: allGranted && roles.length > 0, indeterminate: someGranted && !allGranted, disabled: roles.length === 0 };
        };

        const handleColumnToggle = (col: string, checked: boolean) => {
            const colPerms = permColumns[col];
            if (colPerms.length === 0) return;
            const colPermIds = colPerms.map(p => p.id);

            roles.forEach(role => {
                const currentPerms = parsePermissions(role.permissions);
                let newPerms = [...currentPerms];
                if (checked) {
                    // Add all
                    colPermIds.forEach(id => {
                        if (!newPerms.includes(id)) newPerms.push(id);
                    });
                } else {
                    // Remove all
                    newPerms = newPerms.filter(id => !colPermIds.includes(id));
                }
                if (JSON.stringify(currentPerms.sort()) !== JSON.stringify(newPerms.sort())) {
                    onUpdatePermissions(role.id, newPerms);
                }
            });
        };

        const Icon = getModuleIcon(module.name);

        return (
          <div key={module.name} id={`module-${module.name.replace(/\s+/g, '-')}`} className="scroll-mt-20">
            <Card className="overflow-hidden border-t-4 border-t-blue-500 shadow-sm">
              <CardHeader className="bg-gray-50 dark:bg-gray-800/50 pb-4 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {module.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      onClick={onSave} 
                      disabled={isSaving} 
                      className={`gap-2 shadow-sm transition-all duration-300 ${
                          hasUnsavedChanges 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse' 
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className={`w-4 h-4 ${hasUnsavedChanges ? 'text-white' : 'text-gray-500'}`} />}
                      {hasUnsavedChanges ? 'Simpan Perubahan' : 'Simpan'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      title="Kembali ke atas"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Wrapper for scrolling */}
                <div className="overflow-auto max-h-[600px] relative">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-gray-700 uppercase bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
                      <tr>
                        <th className="px-6 py-4 font-bold min-w-[250px] sticky left-0 bg-white dark:bg-gray-900 z-30 border-r border-gray-100 dark:border-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          Role
                        </th>
                        {COLUMNS.map(col => {
                          const status = getColumnStatus(col);
                          return (
                          <th key={col} className="px-6 py-4 font-semibold min-w-[140px] text-left whitespace-nowrap bg-white dark:bg-gray-900">
                             <div className="flex flex-col items-start gap-2 pl-4">
                                 <div className={`inline-block px-2 py-1 rounded text-[10px] tracking-wider ${
                                   col === 'VIEW' ? 'text-blue-700 bg-blue-50 border border-blue-100' :
                                   col === 'CREATE' ? 'text-green-700 bg-green-50 border border-green-100' :
                                   col === 'UPDATE' ? 'text-orange-700 bg-orange-50 border border-orange-100' :
                                   col === 'DELETE' ? 'text-red-700 bg-red-50 border border-red-100' :
                                   'text-gray-600 bg-gray-50 border border-gray-200'
                                 }`}>
                                   {col}
                                 </div>
                                 {!status.disabled && (
                                     <div className="flex items-center gap-2">
                                         <Checkbox 
                                           checked={status.checked || (status.indeterminate ? 'indeterminate' : false)}
                                           onCheckedChange={(c) => handleColumnToggle(col, c === true)}
                                           className="h-3 w-3"
                                         />
                                         <span className="text-[10px] text-gray-400 font-normal normal-case">Select All</span>
                                     </div>
                                 )}
                             </div>
                          </th>
                        )})}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {roles.map(role => {
                         const rolePerms = parsePermissions(role.permissions);
                         const modulePermIds = module.permissions.map(p => p.id);
                         
                         // Check Role Status for this Module
                         const roleHasAll = modulePermIds.every(id => rolePerms.includes(id));
                         const roleHasSome = modulePermIds.some(id => rolePerms.includes(id));
                         
                         const handleRoleModuleToggle = (checked: boolean) => {
                             let newPerms = [...rolePerms];
                             if (checked) {
                                 modulePermIds.forEach(id => {
                                     if (!newPerms.includes(id)) newPerms.push(id);
                                 });
                             } else {
                                 newPerms = newPerms.filter(id => !modulePermIds.includes(id));
                             }
                             onUpdatePermissions(role.id, newPerms);
                         };
  
                         return (
                           <tr key={role.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                             <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50 z-20 border-r border-gray-100 dark:border-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                               <div className="flex items-center justify-between gap-2">
                                 <div className="flex items-center gap-3">
                                   <Checkbox 
                                      checked={roleHasAll || (roleHasSome && !roleHasAll ? 'indeterminate' : false)}
                                      onCheckedChange={(c) => handleRoleModuleToggle(c === true)}
                                      className="h-4 w-4"
                                   />
                                   <div className="flex flex-col">
                                     <span className="font-semibold">{role.name}</span>
                                     <span className="text-[10px] text-gray-400 font-normal truncate max-w-[150px]">{role.description}</span>
                                   </div>
                                 </div>
                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditRole(role)}>
                                      <Edit className="h-3 w-3 text-gray-500" />
                                    </Button>
                                 </div>
                               </div>
                             </td>
                             {COLUMNS.map(col => (
                               <td key={col} className="px-6 py-4 text-left align-top border-l border-dashed border-gray-100 dark:border-gray-800">
                                 <div className="flex flex-col gap-3 items-start pl-4">
                                   {permColumns[col].map(p => (
                                     <div key={p.id} className="flex items-start gap-2" title={p.description || p.id}>
                                       <Checkbox 
                                         checked={rolePerms.includes(p.id)}
                                         onCheckedChange={(checked) => {
                                             let newPerms = [...rolePerms];
                                             if (checked) newPerms.push(p.id);
                                             else newPerms = newPerms.filter(id => id !== p.id);
                                             onUpdatePermissions(role.id, newPerms);
                                         }}
                                         className="h-4 w-4 mt-0.5"
                                       />
                                       {permColumns[col].length > 0 && (
                                         <span className="text-[11px] text-gray-600 dark:text-gray-400 select-none cursor-help leading-tight">
                                           {formatLabel(p, col)}
                                         </span>
                                       )}
                                    </div>
                                   ))}
                                   {permColumns[col].length === 0 && <span className="text-gray-200 text-xs pl-1">-</span>}
                                 </div>
                               </td>
                             ))}
                           </tr>
                         );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

const PermissionSelector = ({
  permissions,
  selectedIds,
  onToggle,
  onBulkToggle,
  searchQuery
}: {
  permissions: PermissionCatalogItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onBulkToggle: (ids: string[], shouldSelect: boolean) => void;
  searchQuery: string;
}) => {
    // Simplified grouped list for Struktur Tab usage
    
    const groups = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const filtered = permissions.filter(p => {
           if (!q) return true;
           return p.id.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.group || '').toLowerCase().includes(q);
        });
        const g: Record<string, PermissionCatalogItem[]> = {};
        filtered.forEach(p => {
            const key = p.group || 'Other';
            if (!g[key]) g[key] = [];
            g[key].push(p);
        });
        return g;
    }, [permissions, searchQuery]);

    return (
        <div className="space-y-4">
            {Object.entries(groups).map(([group, items]) => (
                <div key={group} className="border rounded-md p-3">
                    <h4 className="font-bold text-sm mb-2 capitalize">{group}</h4>
                    <div className="grid grid-cols-1 gap-2">
                        {items.map(p => (
                            <div key={p.id} className="flex items-center gap-2">
                                <Checkbox 
                                    checked={selectedIds.includes(p.id)}
                                    onCheckedChange={() => onToggle(p.id)}
                                    id={`perm-${p.id}`}
                                />
                                <label htmlFor={`perm-${p.id}`} className="text-xs cursor-pointer select-none">
                                    <span className="font-mono text-gray-600">{p.id}</span>
                                    {p.description && <span className="text-gray-400 ml-2">- {p.description}</span>}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Main Page Component ---

export default function RoleManagementPage() {
  const confirm = useConfirm();
  const { user, isSuperAdmin } = useAuth();
  const { showToast } = useToast();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  
  // Batch Save State
  const [dirtyRoleIds, setDirtyRoleIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<{ name: string; description?: string; permissions?: string }>({ name: '' });
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{ id: string; name: string; description?: string; permissions?: string | string[] } | null>(null);
  
  // Permissions Data
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionCatalogItem[]>([]);
  
  // Struktur Data
  const [activeTab, setActiveTab] = useState<'ROLE' | 'STRUKTUR' | 'EFFECTIVE' | 'JOBDESK'>('ROLE');
  const [strukturList, setStrukturList] = useState<StrukturOrganisasi[]>([]);
  const [strukturLoading, setStrukturLoading] = useState<boolean>(false);
  const [strukturSearch, setStrukturSearch] = useState<string>('');
  const [selectedStrukturId, setSelectedStrukturId] = useState<string>('');
  const [strukturPermissions, setStrukturPermissions] = useState<StrukturPermissionItem[]>([]);
  const [strukturPermissionsLoading, setStrukturPermissionsLoading] = useState<boolean>(false);
  const [strukturSaving, setStrukturSaving] = useState<boolean>(false);
  const [strukturPermissionIds, setStrukturPermissionIds] = useState<string[]>([]);
  const [permissionSearch, setPermissionSearch] = useState<string>(''); // For Struktur tab search
  
  // Matrix State for Struktur
  const [structurePermissionsMap, setStructurePermissionsMap] = useState<Record<string, string[]>>({});
  const [dirtyStructureIds, setDirtyStructureIds] = useState<Set<string>>(new Set());

  // Effective Caps Data
  const [effectiveCapsUserId, setEffectiveCapsUserId] = useState<string>('');
  const [effectiveCaps, setEffectiveCaps] = useState<string[]>([]);
  const [effectiveCapsLoading, setEffectiveCapsLoading] = useState<boolean>(false);
  
  // Import/Export
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
        showToast('Gagal memuat role', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await getPermissionCatalog();
        setPermissionCatalog(res?.data ?? []);
      } catch {
        showToast('Gagal memuat daftar permission', 'error');
      }
    };
    loadPermissions();
  }, [showToast]);

  useEffect(() => {
    if (activeTab === 'STRUKTUR') {
      const loadStrukturData = async () => {
        try {
          setStrukturLoading(true);
          const params: any = { is_active: true };
          if (selectedTenantFilter) params.tenant_id = selectedTenantFilter;
          
          // 1. Fetch Structures
          const tenantId = params.tenant_id || user?.tenant_id;
          if (!params.tenant_id && user?.tenant_id) {
             params.tenant_id = user.tenant_id;
          }
          const res = await getStrukturList(params);
          const list = res?.data ?? [];
          setStrukturList(list);

          // 2. Fetch Permissions for ALL structures (for Matrix)
          // Ensure we pass the tenant_id for context, although getStrukturPermissions usually takes (id, tenant_id)
          const promises = list.map(s => getStrukturPermissions(s.id, s.tenant_id));
          const results = await Promise.all(promises);
          
          const newMap: Record<string, string[]> = {};
          results.forEach((res, idx) => {
             const sId = list[idx].id;
             // Extract permission IDs
             const perms = (res?.data ?? [])
                .map((sp: any) => sp.permission?.id || sp.permission_id)
                .filter((x: any): x is string => typeof x === 'string' && x.trim() !== '');
             newMap[sId] = perms;
          });
          setStructurePermissionsMap(newMap);
          setDirtyStructureIds(new Set()); // Reset dirty state on reload

        } catch {
          showToast('Gagal memuat data struktur', 'error');
        } finally {
          setStrukturLoading(false);
        }
      };
      loadStrukturData();
    }
  }, [activeTab, selectedTenantFilter, showToast]);

  // --- Handlers ---

  const handleUpdateStrukturPermissionsMatrix = (id: string, newPerms: string[]) => {
      setStructurePermissionsMap(prev => ({
          ...prev,
          [id]: newPerms
      }));
      setDirtyStructureIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
      });
  };

  const handleSaveStrukturMatrix = async () => {
    if (dirtyStructureIds.size === 0) {
        showToast('Tidak ada perubahan untuk disimpan', 'info');
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
            
            // Note: getStrukturPermissions uses tenant_id, so update might need it too.
            // updateStrukturPermissions(id, permissionIds, tenant_id)
            const res = await updateStrukturPermissions(strukturId, perms, structure.tenant_id);
            if (res.success) successCount++;
            else failCount++;
        });

        await Promise.all(promises);

        if (failCount === 0) {
            showToast(`Berhasil menyimpan perubahan pada ${successCount} struktur`, 'success');
            setDirtyStructureIds(new Set());
        } else {
            showToast(`Disimpan: ${successCount}, Gagal: ${failCount}`, 'warning');
        }
    } catch (e) {
        showToast('Terjadi kesalahan saat menyimpan permissions struktur', 'error');
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
      // We pass the tenant_id of the structure to ensure backend knows the source context
      const res = await distributeStrukturPermissions(strukturId, structure?.tenant_id);
      
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message || 'Gagal mendistribusikan permission', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Terjadi kesalahan saat distribusi', 'error');
    } finally {
      setStrukturSaving(false);
    }
  };

  const handleUpdateRolePermissions = (roleId: string, newPerms: string[]) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    const uniquePerms = Array.from(new Set(newPerms));
    const jsonPerms = JSON.stringify(uniquePerms);

    // Update Local State
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, permissions: jsonPerms, permission_count: uniquePerms.length } : r));
    
    // Mark as dirty
    setDirtyRoleIds(prev => {
        const next = new Set(prev);
        next.add(roleId);
        return next;
    });
  };

  const handleSave = async () => {
    if (dirtyRoleIds.size === 0) {
        showToast('Tidak ada perubahan untuk disimpan', 'info');
        return;
    }
    
    setIsSaving(true);
    let successCount = 0;
    let failCount = 0;

    try {
        const promises = Array.from(dirtyRoleIds).map(async (roleId) => {
            const role = roles.find(r => r.id === roleId);
            if (!role) return;
            // role.permissions is already updated in local state (JSON string)
            const perms = role.permissions;
            const payload = Array.isArray(perms) ? JSON.stringify(perms) : (perms ?? '[]');
            const res = await updateRolePermissions(roleId, payload);
            if (res.success) successCount++;
            else failCount++;
        });

        await Promise.all(promises);

        if (failCount === 0) {
            showToast(`Berhasil menyimpan perubahan pada ${successCount} role`, 'success');
            setDirtyRoleIds(new Set());
        } else {
            showToast(`Disimpan: ${successCount}, Gagal: ${failCount}`, 'warning');
        }
    } catch (e) {
        showToast('Terjadi kesalahan saat menyimpan', 'error');
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
      showToast('Policy berhasil diexport', 'success');
    } catch (error) {
      showToast('Gagal export policy', 'error');
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
          showToast(res.message || 'Gagal import policy', 'error');
        }
      } catch (error) {
        showToast('File tidak valid atau gagal import', 'error');
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
        showToast('Semua policy berhasil di-reset', 'success');
        const resRoles = await getRoles();
        setRoles(resRoles?.data ?? []);
      } else {
        showToast(res.message || 'Gagal reset policy', 'error');
      }
    } catch (error) {
      showToast('Terjadi kesalahan saat reset policy', 'error');
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
    
    // Sort by Priority
    const ROLE_PRIORITY: Record<string, number> = {
        'SUPERADMIN': 0,
        'ADMIN': 1,
        'GURU': 2,
        'SISWA': 3
    };

    return [...result].sort((a, b) => {
        const nameA = (a.name || '').toUpperCase();
        const nameB = (b.name || '').toUpperCase();
        
        // Exact match check first
        const pA = ROLE_PRIORITY[nameA];
        const pB = ROLE_PRIORITY[nameB];
        
        if (pA !== undefined && pB !== undefined) return pA - pB;
        if (pA !== undefined) return -1;
        if (pB !== undefined) return 1;
        
        // Partial match check (e.g. "GURU MAPEL")
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

  const selectedStruktur = useMemo(
    () => strukturList.find((s) => s.id === selectedStrukturId) || null,
    [strukturList, selectedStrukturId]
  );

  // Analitik Stats Terstandar yang Premium
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

  // Toolbar slot dengan aksi ekspor/impor/reset policy
  const toolbarSlot = useMemo(() => (
    <div className="flex gap-2 flex-wrap items-center">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".json"
        onChange={handleImport}
      />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isImporting}
        className="rounded-xl h-9 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        {isImporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="mr-1.5 h-3.5 w-3.5" />}
        {isImporting ? 'Mengimpor...' : 'Import Policy'}
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExport} 
        disabled={isImporting}
        className="rounded-xl h-9 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        Export Policy
      </Button>
      <Button 
        variant="danger" 
        size="sm" 
        onClick={handleReset} 
        disabled={isImporting}
        className="rounded-xl h-9 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 dark:bg-red-900 dark:hover:bg-red-800"
      >
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
    >
      <div className="space-y-6 font-sans">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'ROLE' | 'STRUKTUR' | 'EFFECTIVE' | 'JOBDESK')} className="space-y-6">
          <TabsList className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 flex w-max max-w-full overflow-x-auto scrollbar-none">
            <TabsTrigger value="ROLE" className="rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              Role & Permission
            </TabsTrigger>
            <TabsTrigger value="STRUKTUR" className="rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              Struktur & Permission
            </TabsTrigger>
            <TabsTrigger value="EFFECTIVE" className="rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              Effective Capabilities
            </TabsTrigger>
            <TabsTrigger value="JOBDESK" className="rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              📋 Pengelola Jobdesk
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-6">
            <TabsContent value="ROLE" className="outline-none m-0">
              <div className="space-y-4">
                 <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex-1 max-w-md">
                        <Input 
                            placeholder="Cari Role..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            className="rounded-xl text-xs h-9"
                        />
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl text-xs font-semibold gap-1.5 h-9">
                        <Plus className="h-4 w-4" />
                        Buat Role Baru
                    </Button>
                 </div>

                 {/* MATRIX LAYOUT */}
                 <PermissionMatrix 
                    roles={filteredRoles}
                    permissionCatalog={permissionCatalog}
                    searchQuery={search}
                    onUpdatePermissions={handleUpdateRolePermissions}
                    onEditRole={(role) => {
                        setEditForm({ id: role.id, name: role.name, description: role.description ?? '', permissions: role.permissions ?? '' });
                        setIsEditOpen(true);
                    }}
                    onDeleteRole={(role) => {
                        // Optional delete implementation
                    }}
                    onSave={handleSave}
                    isSaving={isSaving}
                    hasUnsavedChanges={dirtyRoleIds.size > 0}
                 />
              </div>
            </TabsContent>

            <TabsContent value="STRUKTUR" className="outline-none m-0">
              <div className="space-y-4">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex-1 flex flex-col md:flex-row gap-3 items-center w-full">
                        {tenants.length > 0 && (
                          <div className="w-full md:w-1/3">
                            <SearchableSelect
                              value={selectedTenantFilter}
                              onValueChange={setSelectedTenantFilter}
                              options={[{ label: 'Semua Tenant', value: '' }, ...tenants.map(t => ({ label: t.name, value: t.id }))]}
                              placeholder="Pilih Tenant..."
                              triggerClassName="w-full h-9 rounded-xl text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                            />
                          </div>
                        )}
                        <div className="w-full md:max-w-md">
                            <Input 
                                placeholder="Cari Struktur (Kode, Nama, Scope)..." 
                                value={strukturSearch} 
                                onChange={(e) => setStrukturSearch(e.target.value)} 
                                className="rounded-xl text-xs h-9"
                            />
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
                        structures={filteredStrukturList.map(s => ({
                        ...s,
                        permissions: structurePermissionsMap[s.id] || []
                        }))}
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
              <Card className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6">
                <CardHeader className="p-0 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-500" />
                    Effective Capabilities per User
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">User ID (UUID)</label>
                            <Input 
                                placeholder="Masukkan User ID (UUID)..." 
                                value={effectiveCapsUserId} 
                                onChange={(e) => setEffectiveCapsUserId(e.target.value)} 
                                className="rounded-xl text-xs h-10"
                            />
                        </div>
                        <Button 
                            disabled={!effectiveCapsUserId || effectiveCapsLoading} 
                            onClick={async () => {
                                setEffectiveCapsLoading(true);
                                try {
                                    const res = await getUserEffectiveCapabilitiesApi(effectiveCapsUserId);
                                    setEffectiveCaps(res?.data || []);
                                } finally {
                                    setEffectiveCapsLoading(false);
                                }
                            }}
                            className="w-full rounded-xl text-xs font-semibold h-10 gap-1.5"
                        >
                            {effectiveCapsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Lihat Capabilities
                        </Button>
                    </div>
                    <div className="flex-[2] border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-4 max-h-[300px] overflow-y-auto scrollbar-thin">
                        {effectiveCaps.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {effectiveCaps.map(c => (
                                    <div key={c} className="font-mono text-[11px] bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {c}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-600 gap-2">
                                <Shield className="h-8 w-8 stroke-[1.5]" />
                                <span className="text-xs font-medium">Belum ada capability yang dimuat. Masukkan User ID untuk memeriksa.</span>
                            </div>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="JOBDESK" className="outline-none m-0">
              <JobdeskSettingsPanel />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Modals */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Tambah Role Baru"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nama Role</label>
              <Input placeholder="Masukkan nama role..." value={createForm.name} onChange={(e) => setCreateForm({...createForm, name: e.target.value})} className="rounded-xl text-xs h-10" />
          </div>
          <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Deskripsi</label>
              <Input placeholder="Masukkan deskripsi..." value={createForm.description} onChange={(e) => setCreateForm({...createForm, description: e.target.value})} className="rounded-xl text-xs h-10" />
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
                        showToast('Role berhasil dibuat', 'success');
                    }
                } catch(e) { showToast('Gagal membuat role', 'error'); }
            }} className="rounded-xl text-xs font-semibold h-10 px-4">Simpan</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditOpen && !!editForm}
        onClose={() => setIsEditOpen(false)}
        title="Edit Role Info"
        size="md"
      >
        {editForm && (
          <div className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nama Role</label>
                <Input placeholder="Nama Role" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="rounded-xl text-xs h-10" />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Deskripsi</label>
                <Input placeholder="Deskripsi" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} className="rounded-xl text-xs h-10" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl text-xs font-semibold h-10 px-4">Batal</Button>
              <Button onClick={async () => {
                  try {
                      const res = await updateRole(editForm.id, { name: editForm.name, description: editForm.description });
                      if(res?.success) {
                          setRoles(roles.map(r => r.id === editForm.id ? { ...r, name: editForm.name, description: editForm.description } : r));
                          setIsEditOpen(false);
                          showToast('Role berhasil diupdate', 'success');
                      }
                  } catch(e) { showToast('Gagal update role', 'error'); }
              }} className="rounded-xl text-xs font-semibold h-10 px-4">Simpan</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!importSuccessData}
        onClose={() => setImportSuccessData(null)}
        title="Import Berhasil"
      >
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
