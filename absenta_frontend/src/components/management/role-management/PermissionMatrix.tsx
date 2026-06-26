import React from 'react';
import { Checkbox, Button } from '@/components/ui';
import { Edit, Loader2, Save, ArrowUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { type RoleItem, type PermissionCatalogItem } from '@/api/user.api';

// --- Helper Functions ---
function parsePermissions(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  
  const rawStr = String(raw).trim();
  if (rawStr.startsWith('[') && rawStr.endsWith(']')) {
    try {
      const parsed = JSON.parse(rawStr);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Fallback
    }
  }
  
  return rawStr.split(',').map((s) => s.trim()).filter(Boolean);
}

const COLUMNS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'OTHER'] as const;
type ColumnType = typeof COLUMNS[number];

interface PermissionMatrixProps {
  roles: RoleItem[];
  permissionCatalog: PermissionCatalogItem[];
  searchQuery: string;
  onUpdatePermissions: (roleId: string, newPermissions: string[]) => void;
  onEditRole: (role: RoleItem) => void;
  onDeleteRole: (role: RoleItem) => void;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  getModuleIcon: (name: string) => React.ElementType;
}

export const PermissionMatrix = ({
  roles,
  permissionCatalog,
  onUpdatePermissions,
  onEditRole,
  onSave,
  isSaving,
  hasUnsavedChanges,
  getModuleIcon
}: PermissionMatrixProps) => {
  
  const groupedModules = React.useMemo(() => {
    const groups: Record<string, { name: string; permissions: PermissionCatalogItem[] }> = {};
    
    permissionCatalog.forEach(p => {
      const parts = p.id.split('.');
      const domain = p.group || parts[0] || 'other';
      const entity = p.module || parts[1] || 'general';
      const domainName = domain.replace(/_/g, ' ');
      const entityName = entity.replace(/_/g, ' ');
      
      const key = `${domain}.${entity}`;
      const name = `${domainName.charAt(0).toUpperCase() + domainName.slice(1)} - ${entityName.charAt(0).toUpperCase() + entityName.slice(1)}`;
      
      if (!groups[key]) {
        groups[key] = { name, permissions: [] };
      }
      groups[key].permissions.push(p);
    });
    
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [permissionCatalog]);

  const categorize = (p: PermissionCatalogItem): ColumnType => {
    const parts = p.id.split('.');
    const suffix = parts.slice(2).join('.').toLowerCase();
    
    if (suffix.includes('view') || suffix.includes('read') || suffix.includes('get') || suffix.includes('list') || suffix.includes('detail') || suffix.includes('history') || suffix.includes('show')) return 'VIEW';
    if (suffix.includes('create') || suffix.includes('add') || suffix.includes('store') || suffix.includes('enroll') || suffix.includes('generate') || suffix.includes('import') || suffix.includes('upload')) return 'CREATE';
    if (suffix.includes('update') || suffix.includes('edit') || suffix.includes('change') || suffix.includes('modify') || suffix.includes('assign') || suffix.includes('revoke') || suffix.includes('set') || suffix.includes('reset') || suffix.includes('process') || suffix.includes('cancel') || suffix.includes('resume') || suffix.includes('renew') || suffix.includes('pay') || suffix.includes('tap') || suffix.includes('bypass') || suffix.includes('verify')) return 'UPDATE';
    if (suffix.includes('delete') || suffix.includes('remove') || suffix.includes('destroy') || suffix.includes('erase')) return 'DELETE';
    return 'OTHER';
  };

  const formatLabel = (p: PermissionCatalogItem, col: string) => {
    const parts = p.id.split('.');
    if (parts.length < 3) return p.description || p.id;

    let suffix = parts.slice(2).join(' ');
    const colLower = col.toLowerCase();
    if (suffix.toLowerCase().startsWith(colLower)) {
        suffix = suffix.substring(colLower.length).trim();
    }
    
    suffix = suffix.replace(/[_.]/g, ' ');
    if (!suffix.trim()) return 'General';

    return suffix.split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  };

  return (
    <div className="space-y-8 pb-10">
      {groupedModules.map((module) => {
        const permColumns: Record<ColumnType, PermissionCatalogItem[]> = {
          'VIEW': [], 'CREATE': [], 'UPDATE': [], 'DELETE': [], 'OTHER': []
        };
        module.permissions.forEach(p => permColumns[categorize(p)].push(p));

        const getColumnStatus = (col: ColumnType) => {
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

        const handleColumnToggle = (col: ColumnType, checked: boolean) => {
            const colPerms = permColumns[col];
            if (colPerms.length === 0) return;
            const colPermIds = colPerms.map(p => p.id);

            roles.forEach(role => {
                const currentPerms = parsePermissions(role.permissions);
                let newPerms = [...currentPerms];
                if (checked) {
                    colPermIds.forEach(id => {
                        if (!newPerms.includes(id)) newPerms.push(id);
                    });
                } else {
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
