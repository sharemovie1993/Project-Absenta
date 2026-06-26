import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Loader2, Save, ChevronRight, ChevronDown, RotateCcw, Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import iconForName, { iconNames } from '@/lib/iconForName';
import { setMenuRoles, createMenu, updateMenu, deleteMenu, type MenuItem, type MenuRoleItem, type MenuPayload } from '@/api/menu.api';
import { type RoleItem } from '@/api/user.api';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Switch } from '@/components/ui/Switch';

const SimpleFormField = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);

const INITIAL_FORM: MenuPayload = {
  name: '',
  path: '',
  icon: '',
  parent_id: null,
  order: 0,
  is_active: true,
  requires_petugas_active: false
};

interface MenuPermissionMatrixProps {
  menus: MenuItem[];
  roles: RoleItem[];
  onRefresh: () => void;
}

interface FlattenedMenu extends MenuItem {
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

export const MenuPermissionMatrix: React.FC<MenuPermissionMatrixProps> = ({
  menus = [],
  roles = [],
  onRefresh
}) => {

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Track changes: menuId -> roleId -> newValue
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, boolean>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // CRUD States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingMenu, setDeletingMenu] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<MenuPayload>({
    name: '',
    path: '',
    icon: '',
    parent_id: null,
    order: 0,
    is_active: true,
    requires_petugas_active: false
  });

  // Ensure arrays are valid
  const safeMenus = Array.isArray(menus) ? menus : [];
  const safeRoles = Array.isArray(roles) ? roles : [];

  // Initialize expanded state (expand all by default)
  useEffect(() => {
    if (safeMenus.length === 0) return;
    
    const ids = new Set<string>();
    const collect = (nodes: MenuItem[]) => {
      if (!Array.isArray(nodes)) return;
      for (const n of nodes) {
        ids.add(n.id);
        if (n.children && Array.isArray(n.children)) {
          collect(n.children);
        }
      }
    };
    collect(safeMenus);
    setExpandedIds(ids);
  }, [safeMenus.length]); 

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const flattenedMenus = useMemo(() => {
    const result: FlattenedMenu[] = [];
    
    const traverse = (nodes: MenuItem[], depth: number) => {
      if (!Array.isArray(nodes)) return;
      
      for (const node of nodes) {
        const isExpanded = expandedIds.has(node.id);
        const children = Array.isArray(node.children) ? node.children : [];
        const hasChildren = children.length > 0;

        result.push({
          ...node,
          depth,
          hasChildren,
          expanded: isExpanded
        });
        
        if (hasChildren && isExpanded) {
          traverse(children, depth + 1);
        }
      }
    };
    
    traverse(safeMenus, 0);
    return result;
  }, [safeMenus, expandedIds]);

  // CRUD Handlers
  const handleAdd = () => {
    setEditingMenu(null);
    setFormData(INITIAL_FORM);
    setIsFormOpen(true);
  };

  const handleEdit = (menu: MenuItem) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      path: menu.path || '',
      icon: menu.icon || 'Circle',
      order: menu.order,
      is_active: menu.is_active,
      requires_petugas_active: menu.requires_petugas_active || false,
      parent_id: menu.parent_id || null,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (menu: MenuItem) => {
    setDeletingMenu(menu);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Nama menu wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (editingMenu) {
        res = await updateMenu(editingMenu.id, formData);
      } else {
        res = await createMenu(formData);
      }

      if (res.success) {
        toast.success(
          editingMenu ? 'Menu berhasil diperbarui' : 'Menu berhasil ditambahkan'
        );
        setIsFormOpen(false);
        onRefresh();
      } else {
        toast.error(res.message || 'Gagal menyimpan menu');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menyimpan menu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMenu) return;

    setIsSubmitting(true);
    try {
      const res = await deleteMenu(deletingMenu.id);
      if (res.success) {
        toast.success('Menu berhasil dihapus');
        setIsDeleteOpen(false);
        setDeletingMenu(null);
        onRefresh();
      } else {
        toast.error(res.message || 'Gagal menghapus menu');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menghapus menu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePermission = (menu: MenuItem, roleId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    
    setPendingChanges(prev => {
      const menuChanges = prev[menu.id] || {};
      
      // Check if we are reverting to original value
      // We need to know the original value here. 
      // But for simplicity, we just track the new intended value.
      // If we want to clean up the state when it matches original, we'd need to look it up.
      // For now, just setting the new value is fine.
      
      return {
        ...prev,
        [menu.id]: {
          ...menuChanges,
          [roleId]: newVal
        }
      };
    });
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleReset = () => {
    setPendingChanges({});
    toast('Perubahan telah di-reset');
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const menuIds = Object.keys(pendingChanges);
      
      const promises = menuIds.map(async (menuId) => {
        const roleChanges = pendingChanges[menuId];
        const menu = safeMenus.find(m => m.id === menuId) || 
                     // Deep search if not at root level (which it likely isn't)
                     flattenedMenus.find(m => m.id === menuId);
        
        if (!menu) return; // Should not happen

        const safeMenuRoles = Array.isArray(menu.menuRoles) ? menu.menuRoles : [];
        
        const payload = Object.entries(roleChanges).map(([roleId, newVal]) => {
          const existingRole = safeMenuRoles.find(r => r.role_id === roleId);
          return {
            role_id: roleId,
            can_view: newVal,
            can_create: existingRole?.can_create ?? false,
            can_update: existingRole?.can_update ?? false,
            can_delete: existingRole?.can_delete ?? false,
          };
        });

        try {
          await setMenuRoles(menuId, payload);
          successCount++;
        } catch (err) {
          console.error(`Failed to update menu ${menuId}`, err);
          failCount++;
        }
      });

      await Promise.all(promises);

      if (failCount === 0) {
        toast.success(`Berhasil menyimpan perubahan pada ${successCount} menu`);
        setPendingChanges({});
        onRefresh();
      } else {
        toast(`Disimpan: ${successCount}, Gagal: ${failCount}`, { icon: '⚠️' });
        // We keep pending changes if there were failures, or maybe just clear all?
        // Better to clear all and refresh to see true state.
        setPendingChanges({});
        onRefresh();
      }

    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  // Safe checks for rendering
  if (!safeMenus.length) {
    return <div className="p-4 text-center text-gray-500">Tidak ada data menu.</div>;
  }
  
  if (!safeRoles.length) {
    return <div className="p-4 text-center text-gray-500">Tidak ada data role.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
           <Button onClick={handleAdd} size="sm" className="h-8">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Menu
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">Terdapat perubahan yang belum disimpan</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              disabled={isSaving}
              className="h-8"
            >
              <RotateCcw className="w-3 h-3 mr-2" />
              Reset
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving}
              className="h-8"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 mr-2" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden shadow-sm bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 min-w-[300px] font-semibold sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 border-r dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Menu Structure
                </th>
                {safeRoles.map(role => (
                  <th key={role.id} className="px-4 py-3 text-center min-w-[100px] font-semibold">
                    <div className="flex flex-col items-center gap-1">
                      <span className="whitespace-nowrap">{role.name}</span>
                      <span className="text-[10px] font-normal text-gray-500 max-w-[120px] truncate">
                        {role.description || '-'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {flattenedMenus.map((menu) => {
                const IconCmp = iconForName(menu.icon || 'Circle');
                const safeMenuRoles = Array.isArray(menu.menuRoles) ? menu.menuRoles : [];
                
                return (
                  <tr key={menu.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-2 sticky left-0 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 z-10 border-r dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-2 flex-1 min-w-0"
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
                          <span className={`font-medium truncate ${menu.depth === 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                            {menu.name}
                          </span>
                          {!menu.is_active && (
                            <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded ml-2 shrink-0">
                              Inactive
                            </span>
                          )}
                        </div>

                        {/* Action Buttons - Always visible */}
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-500 hover:text-blue-600"
                            onClick={() => handleEdit(menu)}
                            title="Edit Menu"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
                            onClick={() => handleDeleteClick(menu)}
                            title="Hapus Menu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </td>
                    
                    {safeRoles.map(role => {
                      const roleConfig = safeMenuRoles.find(r => r.role_id === role.id);
                      const originalVal = roleConfig ? roleConfig.can_view : false;
                      
                      // Check for pending changes
                      const pendingVal = pendingChanges[menu.id]?.[role.id];
                      const displayVal = pendingVal !== undefined ? pendingVal : originalVal;
                      const isChanged = pendingVal !== undefined && pendingVal !== originalVal;

                      return (
                        <td key={role.id} className={`px-4 py-2 text-center border-l dark:border-gray-700 border-dashed ${isChanged ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                          <div className="flex justify-center">
                            <Checkbox 
                              checked={displayVal}
                              onCheckedChange={() => handleTogglePermission(menu, role.id, displayVal)}
                              className={isChanged ? 'border-blue-500 data-[state=checked]:bg-blue-500' : ''}
                            />
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

      {/* CRUD Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingMenu ? 'Edit Menu' : 'Tambah Menu Baru'}
        size="lg"
      >
        <div className="space-y-4">
          <SimpleFormField label="Nama Menu">
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Contoh: Dashboard"
            />
          </SimpleFormField>

          <div className="grid grid-cols-2 gap-4">
            <SimpleFormField label="Path (URL)">
              <Input
                value={formData.path || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                placeholder="/dashboard"
              />
            </SimpleFormField>

            <SimpleFormField label="Icon (Lucide Name)">
              <Input
                value={formData.icon || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="Home"
              />
            </SimpleFormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SimpleFormField label="Urutan (Order)">
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
              />
            </SimpleFormField>

            <SimpleFormField label="Parent Menu">
               <SearchableSelect
                  value={formData.parent_id || ''}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, parent_id: val === 'ROOT' ? null : val }))}
                  options={[
                    { label: 'Root (Paling Atas)', value: 'ROOT' },
                    ...flattenedMenus
                      .filter(m => m.id !== editingMenu?.id) // Prevent selecting self as parent
                      .map(m => ({
                        label: `${'-'.repeat(m.depth)} ${m.name}`,
                        value: m.id
                      }))
                  ]}
                  placeholder="Pilih Parent..."
               />
            </SimpleFormField>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="space-y-0.5">
              <Label className="text-base">Status Aktif</Label>
              <p className="text-xs text-gray-500">Menu yang tidak aktif tidak akan muncul di sidebar</p>
            </div>
            <Switch
              checked={!!formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="space-y-0.5">
              <Label className="text-base">Wajib Petugas Aktif?</Label>
              <p className="text-xs text-gray-500">Hanya muncul jika user sedang bertugas (Petugas Mode)</p>
            </div>
            <Switch
              checked={formData.requires_petugas_active || false}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_petugas_active: checked }))}
            />
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Menu"
        description={`Apakah Anda yakin ingin menghapus menu "${deletingMenu?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        style="danger"
        loading={isSubmitting}
      />
    </div>
  );
};
