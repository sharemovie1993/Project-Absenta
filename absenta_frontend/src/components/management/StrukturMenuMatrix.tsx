import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronRight, ChevronDown, AlertCircle, Share2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import iconForName from '@/lib/iconForName';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { 
  getStrukturPermissions, 
  updateStrukturPermissions,
  distributeStrukturPermissions,
  type StrukturOrganisasi 
} from '@/api/academic/strukturOrganisasi.api';
import { type MenuItem } from '@/api/menu.api';
import Tooltip from '@/components/ui/Tooltip';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Label } from '@/components/ui/Label';

interface StrukturMenuMatrixProps {
  menus: MenuItem[];
  structures: StrukturOrganisasi[];
  onRefresh?: () => void;
}

interface FlattenedMenu extends MenuItem {
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

export const StrukturMenuMatrix: React.FC<StrukturMenuMatrixProps> = ({
  menus = [],
  structures = [],
  onRefresh
}) => {
  const { showToast } = useToast();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  
  // Map structure_id -> Set of permission_ids
  const [structurePermissions, setStructurePermissions] = useState<Record<string, Set<string>>>({});
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, Set<string>>>({});
  const [changedStructures, setChangedStructures] = useState<Set<string>>(new Set());
  const [loadingPerms, setLoadingPerms] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [distributeTargetId, setDistributeTargetId] = useState<string>('');

  // Flatten menus logic
  const flattenedMenus = useMemo(() => {
    const result: FlattenedMenu[] = [];
    const traverse = (nodes: MenuItem[], depth: number) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        const isExpanded = expandedIds.has(node.id);
        const children = Array.isArray(node.children) ? node.children : [];
        const hasChildren = children.length > 0;
        result.push({ ...node, depth, hasChildren, expanded: isExpanded });
        if (hasChildren && isExpanded) traverse(children, depth + 1);
      }
    };
    traverse(menus, 0);
    return result;
  }, [menus, expandedIds]);

  // Initial Expand All
  useEffect(() => {
    if (menus.length === 0) return;
    const ids = new Set<string>();
    const collect = (nodes: MenuItem[]) => {
      for (const n of nodes) {
        ids.add(n.id);
        if (n.children) collect(n.children);
      }
    };
    collect(menus);
    setExpandedIds(ids);
  }, [menus.length]);

  // Fetch Permissions for ALL Structures
  const fetchAllPermissions = async () => {
    if (structures.length === 0) {
      setLoadingPerms(false);
      return;
    }

    setLoadingPerms(true);
    const map: Record<string, Set<string>> = {};
    
    try {
      await Promise.all(structures.map(async (str) => {
        const res = await getStrukturPermissions(str.id);
        if (res.success) {
          const permIds = new Set(res.data.map(p => p.permission_id));
          map[str.id] = permIds;
        }
      }));
      setStructurePermissions(map);
      setOriginalPermissions(JSON.parse(JSON.stringify(map, (key, value) => 
        value instanceof Set ? Array.from(value) : value
      ))); // Deep copy for reset
      
      // Reconstruct Sets from JSON copy
      const originalMap: Record<string, Set<string>> = {};
      Object.entries(map).forEach(([k, v]) => {
         originalMap[k] = new Set(v);
      });
      setOriginalPermissions(originalMap);
      
      setChangedStructures(new Set());
    } catch (err) {
      console.error("Failed to fetch permissions", err);
      showToast("Gagal memuat permission struktur", "error");
    } finally {
      setLoadingPerms(false);
    }
  };

  useEffect(() => {
    fetchAllPermissions();
  }, [structures.length]); 

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggle = (menu: MenuItem, structureId: string, isChecked: boolean) => {
    const capability = menu.required_capability;
    if (!capability) {
      showToast("Menu ini tidak memiliki Capability yang didefinisikan", "warning");
      return;
    }

    setStructurePermissions(prev => {
      const currentSet = prev[structureId] || new Set();
      const newSet = new Set(currentSet);
      
      if (!isChecked) {
        // Was false, becoming true -> Add
        newSet.add(capability);
      } else {
        // Was true, becoming false -> Remove
        newSet.delete(capability);
      }

      return {
        ...prev,
        [structureId]: newSet
      };
    });

    setChangedStructures(prev => {
      const next = new Set(prev);
      next.add(structureId);
      return next;
    });
  };

  const handleSave = async () => {
    if (changedStructures.size === 0) return;
    
    setIsSaving(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const promises = Array.from(changedStructures).map(async (structureId) => {
        const perms = Array.from(structurePermissions[structureId] || new Set());
        try {
          const res = await updateStrukturPermissions(structureId, perms as string[]);
          if (res.success) successCount++;
          else failCount++;
        } catch (e) {
          console.error(e);
          failCount++;
        }
      });

      await Promise.all(promises);

      if (failCount === 0) {
        showToast(`Berhasil menyimpan perubahan untuk ${successCount} struktur`, "success");
        setChangedStructures(new Set());
        // Update original permissions
        const newOriginals = { ...structurePermissions };
        setOriginalPermissions(newOriginals);
        if (onRefresh) onRefresh();
      } else {
        showToast(`Disimpan: ${successCount}, Gagal: ${failCount}`, "warning");
      }

    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan saat menyimpan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("Batalkan semua perubahan yang belum disimpan?")) return;
    
    // Restore from originalPermissions
    const restored: Record<string, Set<string>> = {};
    Object.keys(originalPermissions).forEach(key => {
      restored[key] = new Set(originalPermissions[key]);
    });
    
    setStructurePermissions(restored);
    setChangedStructures(new Set());
  };

  const handleDistribute = async (structureId: string) => {
    if (changedStructures.has(structureId)) {
      showToast("Harap simpan perubahan terlebih dahulu sebelum mendistribusikan pengaturan.", "warning");
      return;
    }

    if (!confirm('Apakah Anda yakin ingin mendistribusikan permission struktur ini ke SEMUA sekolah? Aksi ini akan menimpa permission struktur dengan kode yang sama di tenant lain.')) return;

    const key = `distribute-${structureId}`;
    if (updating[key]) return;
    setUpdating(prev => ({ ...prev, [key]: true }));

    try {
      const structure = structures.find(s => s.id === structureId);
      if (!structure) return;

      const res = await distributeStrukturPermissions(structureId, structure.tenant_id);
      
      if (res.success) {
        showToast(res.message || "Berhasil mendistribusikan permission", "success");
        setIsDistributeOpen(false);
      } else {
        showToast(res.message || "Gagal mendistribusikan permission", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Terjadi kesalahan saat distribusi", "error");
    } finally {
      setUpdating(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleOpenDistribute = () => {
    setDistributeTargetId('');
    setIsDistributeOpen(true);
  };

  if (loadingPerms) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Action Bar for Unsaved Changes */}
      {changedStructures.size > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-yellow-800 dark:text-yellow-200">
            <div className="bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded-full">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="font-medium">Perubahan belum disimpan</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Terdapat perubahan pada <strong>{changedStructures.size}</strong> struktur.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 hover:text-yellow-900 dark:hover:text-yellow-200 flex-1 sm:flex-none">
              <X className="w-4 h-4 mr-1" />
              Batal
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600 text-white flex-1 sm:flex-none">
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Simpan Konfigurasi
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
           {/* Left side actions if any */}
        </div>
        <Button 
          variant="outline"
          size="sm"
          onClick={handleOpenDistribute}
          className="gap-2"
        >
          <Share2 className="w-4 h-4" />
          Distribusi
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 min-w-[300px] font-semibold sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 border-r dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Menu Structure
                </th>
                {structures.map(str => (
                  <th key={str.id} className="px-4 py-3 text-center min-w-[140px] font-semibold align-top bg-gray-50 dark:bg-gray-800">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="whitespace-nowrap font-bold text-gray-900 dark:text-gray-100">{str.nama}</span>
                        <span className="text-[10px] font-mono text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          {str.kode}
                        </span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {flattenedMenus.map((menu) => {
              const IconCmp = iconForName(menu.icon || 'Circle');
              const capability = menu.required_capability;
              
              return (
                <tr key={menu.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-2 sticky left-0 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 z-10 border-r dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div 
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${menu.depth * 24}px` }}
                    >
                      <div className="w-5 flex justify-center shrink-0">
                        {menu.hasChildren ? (
                          <button 
                            onClick={() => toggleExpand(menu.id)}
                            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-500"
                          >
                            {menu.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        ) : null}
                      </div>
                      
                      <IconCmp className="w-4 h-4 text-gray-500 shrink-0" />
                      <div className="flex flex-col">
                        <span className={`font-medium truncate ${menu.depth === 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                          {menu.name}
                        </span>
                        {capability && (
                          <span className="text-[9px] text-gray-400 font-mono">
                            {capability}
                          </span>
                        )}
                      </div>
                      
                      {!menu.is_active && (
                        <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded ml-2 shrink-0">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {structures.map(str => {
                    const hasPermission = structurePermissions[str.id]?.has(capability || '');
                    const isUpdating = updating[`${menu.id}-${str.id}`];
                    const isDisabled = !capability;

                    return (
                      <td key={str.id} className="px-4 py-2 text-center border-l dark:border-gray-700 border-dashed">
                        <div className="flex justify-center">
                          {isDisabled ? (
                             <Tooltip content="Menu ini tidak memiliki Capability.">
                               <div className="opacity-30 cursor-not-allowed">
                                  <AlertCircle className="w-4 h-4 text-gray-400" />
                               </div>
                             </Tooltip>
                          ) : isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          ) : (
                            <Checkbox 
                              checked={hasPermission}
                              onCheckedChange={() => handleToggle(menu, str.id, !!hasPermission)}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 h-5 w-5"
                            />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

      <Modal
        isOpen={isDistributeOpen}
        onClose={() => setIsDistributeOpen(false)}
        title="Distribusi Permission"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Pilih struktur yang akan didistribusikan konfigurasinya ke seluruh tenant.
            Pastikan Anda telah menyimpan perubahan sebelum melakukan distribusi.
          </p>
          
          <div className="space-y-2">
            <Label>Struktur Organisasi</Label>
            <SearchableSelect
              value={distributeTargetId}
              onValueChange={setDistributeTargetId}
              options={structures.map(s => ({ label: `${s.nama} (${s.kode})`, value: s.id }))}
              placeholder="Pilih Struktur..."
            />
          </div>

          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
             <div className="flex items-start gap-2">
               <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
               <p className="text-xs text-yellow-700">
                 Aksi ini akan menyalin permission dari struktur yang dipilih ke SEMUA struktur dengan kode yang sama di tenant lain.
               </p>
             </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setIsDistributeOpen(false)}>
            Batal
          </Button>
          <Button 
            onClick={() => handleDistribute(distributeTargetId)}
            disabled={!distributeTargetId || updating[`distribute-${distributeTargetId}`]}
          >
            {updating[`distribute-${distributeTargetId}`] ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            Distribusikan
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
