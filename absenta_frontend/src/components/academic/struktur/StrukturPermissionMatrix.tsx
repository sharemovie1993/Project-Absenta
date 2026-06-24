import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Checkbox, Modal, ModalFooter, Label, SearchableSelect } from '@/components/ui';
import Tooltip from '@/components/ui/Tooltip';
import { Loader2, Save, ArrowUp, Settings, GraduationCap, CalendarCheck, CreditCard, Users, Box, Shield, FileText, AlertTriangle, Share2, Bell, AlertCircle, RefreshCw, X } from 'lucide-react';
import type { PermissionCatalogItem } from '@/api/user.api';
import type { StrukturOrganisasi } from '@/api/academic/strukturOrganisasi.api';

// Extend StrukturOrganisasi to include permissions for UI display
export interface StrukturWithPermissions extends StrukturOrganisasi {
  permissions: string[];
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

interface StrukturPermissionMatrixProps {
  structures: StrukturWithPermissions[];
  permissionCatalog: PermissionCatalogItem[];
  searchQuery: string;
  onUpdatePermissions: (strukturId: string, newPermissions: string[]) => void;
  onSave: () => void;
  onDistribute?: (strukturId: string) => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  canDistribute?: boolean; // Only for superadmin
}

export const StrukturPermissionMatrix: React.FC<StrukturPermissionMatrixProps> = React.memo(({
  structures,
  permissionCatalog,
  searchQuery,
  onUpdatePermissions,
  onSave,
  onDistribute,
  isSaving,
  hasUnsavedChanges,
  canDistribute = false
}) => {
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [distributeTargetId, setDistributeTargetId] = useState<string>('');
  const [isDistributing, setIsDistributing] = useState(false);

  const handleOpenDistribute = () => {
    setIsDistributeOpen(true);
    setDistributeTargetId('');
  };

  const handleDistributeSubmit = async () => {
    if (!distributeTargetId || !onDistribute) return;
    
    setIsDistributing(true);
    try {
      await onDistribute(distributeTargetId);
      setIsDistributeOpen(false);
    } catch (error) {
      console.error('Distribution failed:', error);
    } finally {
      setIsDistributing(false);
    }
  };

  // Group Permissions by Module (Domain.Entity)
  const filteredCatalog = useMemo(() => {
    if (!searchQuery) return permissionCatalog;
    const lowerQuery = searchQuery.toLowerCase();
    return permissionCatalog.filter(p => 
      p.id.toLowerCase().includes(lowerQuery) || 
      (p.description && p.description.toLowerCase().includes(lowerQuery)) ||
      (p.group && p.group.toLowerCase().includes(lowerQuery))
    );
  }, [permissionCatalog, searchQuery]);

  const groupedModules = useMemo(() => {
    const groups: Record<string, { name: string; permissions: PermissionCatalogItem[] }> = {};
    
    filteredCatalog.forEach(p => {
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
  }, [filteredCatalog]);

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
    if (!suffix.trim()) return 'Global ' + col.charAt(0) + col.slice(1).toLowerCase();

    // Title Case
    const label = suffix.split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    
    return label;
  };

  const COLUMNS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'OTHER'];

  return (
    <div className="space-y-6 pb-10">
      {/* Header Actions */}
      {canDistribute && onDistribute && (
        <div className="flex justify-end mb-2">
            <Button 
                onClick={handleOpenDistribute}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
                <Share2 className="w-4 h-4" />
                Distribusi Permission
            </Button>
        </div>
      )}

      <div className="space-y-8">
        {groupedModules.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
             <Shield className="w-12 h-12 text-gray-300 mb-4" />
             <p className="text-lg font-medium text-gray-500">Izin tidak ditemukan</p>
             <p className="text-sm text-gray-400 text-center max-w-xs">
               Tidak ada izin yang cocok dengan kata kunci "{searchQuery}". Coba gunakan kata kunci lain.
             </p>
          </div>
        )}
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
           
           structures.forEach(struktur => {
               const hasAll = colPerms.every(p => struktur.permissions.includes(p.id));
               const hasSome = colPerms.some(p => struktur.permissions.includes(p.id));
               if (!hasAll) allGranted = false;
               if (hasSome) someGranted = true;
           });
           
           return { checked: allGranted && structures.length > 0, indeterminate: someGranted && !allGranted, disabled: structures.length === 0 };
        };

        const handleColumnToggle = (col: string, checked: boolean) => {
            const colPerms = permColumns[col];
            if (colPerms.length === 0) return;
            const colPermIds = colPerms.map(p => p.id);

            structures.forEach(struktur => {
                const currentPerms = struktur.permissions;
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
                    onUpdatePermissions(struktur.id, newPerms);
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
                      variant="toolbarPrimary"
                      size="toolbar"
                      onClick={onSave} 
                      disabled={isSaving} 
                      className={hasUnsavedChanges ? 'animate-pulse' : ''}
                    >
                      {isSaving ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                      {hasUnsavedChanges ? 'Simpan Perubahan' : 'Simpan'}
                    </Button>
                    <Button
                      variant="toolbarOutline"
                      size="toolbarIcon"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      title="Kembali ke atas"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
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
                          Struktur Organisasi
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
                      {structures.map(struktur => {
                         const modulePermIds = module.permissions.map(p => p.id);
                         
                         // Check Status for this Module
                         const roleHasAll = modulePermIds.every(id => struktur.permissions.includes(id));
                         const roleHasSome = modulePermIds.some(id => struktur.permissions.includes(id));
                         
                         const handleRoleModuleToggle = (checked: boolean) => {
                             let newPerms = [...struktur.permissions];
                             if (checked) {
                                 modulePermIds.forEach(id => {
                                     if (!newPerms.includes(id)) newPerms.push(id);
                                 });
                             } else {
                                 newPerms = newPerms.filter(id => !modulePermIds.includes(id));
                             }
                             onUpdatePermissions(struktur.id, newPerms);
                         };
  
                         return (
                           <tr key={struktur.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                             <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50 z-20 border-r border-gray-100 dark:border-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                               <div className="flex items-center justify-between gap-2">
                                 <div className="flex items-center gap-3">
                                   <Checkbox 
                                      checked={roleHasAll || (roleHasSome && !roleHasAll ? 'indeterminate' : false)}
                                      onCheckedChange={(c) => handleRoleModuleToggle(c === true)}
                                      className="h-4 w-4"
                                   />
                                   <div className="flex flex-col">
                                     <span className="font-semibold">{struktur.nama}</span>
                                     <span className="text-[10px] text-gray-400 font-normal truncate max-w-[150px]">{struktur.kode}</span>
                                   </div>
                                 </div>
                               </div>
                             </td>
                             {COLUMNS.map(col => (
                               <td key={col} className="px-6 py-4 text-left align-top border-l border-dashed border-gray-100 dark:border-gray-800">
                                 <div className="flex flex-col gap-3 items-start pl-4">
                                   {permColumns[col].map(p => (
                                     <div key={p.id} className="flex items-start gap-2" title={p.description || p.id}>
                                       <Checkbox 
                                         checked={struktur.permissions.includes(p.id)}
                                         onCheckedChange={(checked) => {
                                             let newPerms = [...struktur.permissions];
                                             if (checked) newPerms.push(p.id);
                                             else newPerms = newPerms.filter(id => id !== p.id);
                                             onUpdatePermissions(struktur.id, newPerms);
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

      <Modal
        isOpen={isDistributeOpen}
        onClose={() => setIsDistributeOpen(false)}
        title="Distribusi Permission"
        size="md"
      >
        <div className="space-y-6">
          <p className="text-[11px] font-medium text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            Pilih struktur yang akan didistribusikan konfigurasinya ke seluruh tenant.
            Pastikan Anda telah menyimpan perubahan sebelum melakukan distribusi.
          </p>
          
          <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
            <div className="space-y-2 group">
              <Label htmlFor="distribute_target" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Struktur Organisasi Target <span className="text-rose-500">*</span>
              </Label>
              <SearchableSelect
                id="distribute_target"
                value={distributeTargetId}
                onValueChange={setDistributeTargetId}
                options={(structures || []).map(s => ({ label: `${s.nama} (${s.kode})`, value: s.id }))}
                placeholder="Pilih Struktur..."
                triggerClassName="h-10 text-[13px] font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
               <div className="flex items-start gap-3">
                 <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                 <p className="text-[11px] font-medium text-amber-800 leading-normal">
                   <strong>Peringatan Keamanan:</strong> Aksi ini akan menyalin permission dari struktur yang dipilih ke <strong className="uppercase">Semua</strong> struktur dengan kode yang sama di seluruh tenant sistem.
                 </p>
               </div>
            </div>
          </div>

          <ModalFooter className="pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
            <Button 
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => setIsDistributeOpen(false)}
              disabled={isDistributing}
            >
              <X className="w-3.5 h-3.5 mr-2" />
              Batalkan
            </Button>
            <Button 
              variant="toolbarPrimary"
              size="toolbar"
              onClick={handleDistributeSubmit}
              disabled={!distributeTargetId || isDistributing}
              className="px-8"
            >
              {isDistributing ? (
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5 mr-2" />
              )}
              Distribusikan Sekarang
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
});

StrukturPermissionMatrix.displayName = 'StrukturPermissionMatrix';
