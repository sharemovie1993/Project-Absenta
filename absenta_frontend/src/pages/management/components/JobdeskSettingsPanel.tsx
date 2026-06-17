import React, { useState, useEffect } from 'react';
import { 
  getAdminRoleJobdesks, 
  updateRoleJobdesk, 
  getAdminPositionJobdesks, 
  updatePositionJobdesk,
  type AdminRoleJobdeskItem,
  type AdminPositionJobdeskItem
} from '../../../api/jobdesk.api';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { getTenants, type TenantItem } from '@/api/user.api';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { 
  Shield, 
  Briefcase, 
  Plus, 
  Trash2, 
  Save, 
  PlusCircle, 
  Loader2, 
  ClipboardList,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

export const JobdeskSettingsPanel: React.FC = () => {
  const { showToast } = useToast();
  const { isSuperAdmin } = useAuth();
  
  // Tenants state (for Superadmin)
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  // Tabs & Lists state
  const [subTab, setSubTab] = useState<'role' | 'position'>('role');
  const [roles, setRoles] = useState<AdminRoleJobdeskItem[]>([]);
  const [positions, setPositions] = useState<AdminPositionJobdeskItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Selected Item
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedPositionId, setSelectedPositionId] = useState<string>('');

  // Form Fields state
  const [description, setDescription] = useState<string>('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTaskInput, setNewTaskInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Load Tenants for Superadmin on Init
  useEffect(() => {
    const fetchTenants = async () => {
      if (!isSuperAdmin()) return;
      try {
        const res = await getTenants();
        if (res?.success && res.data) {
          setTenants(res.data);
          if (res.data.length > 0) {
            setSelectedTenantId(res.data[0].id);
          }
        }
      } catch (e) {
        showToast('Gagal memuat daftar tenant', 'error');
      }
    };
    fetchTenants();
  }, [isSuperAdmin]);

  // Load Data
  const loadData = async () => {
    // If Superadmin is active but no tenant selected yet, wait for tenant selection
    if (isSuperAdmin() && !selectedTenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const tenantIdParam = isSuperAdmin() ? selectedTenantId : undefined;

      if (subTab === 'role') {
        const res = await getAdminRoleJobdesks(tenantIdParam);
        if (res.success && res.data) {
          setRoles(res.data);
          if (res.data.length > 0) {
            const exists = res.data.find(r => r.id === selectedRoleId);
            setSelectedRoleId(exists ? exists.id : res.data[0].id);
          } else {
            setSelectedRoleId('');
          }
        }
      } else {
        const res = await getAdminPositionJobdesks(tenantIdParam);
        if (res.success && res.data) {
          setPositions(res.data);
          if (res.data.length > 0) {
            const exists = res.data.find(p => p.id === selectedPositionId);
            setSelectedPositionId(exists ? exists.id : res.data[0].id);
          } else {
            setSelectedPositionId('');
          }
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal memuat data jobdesk', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subTab, selectedTenantId]);

  // Handle selected role change -> fill form
  useEffect(() => {
    if (subTab === 'role' && selectedRoleId) {
      const activeRole = roles.find(r => r.id === selectedRoleId);
      if (activeRole) {
        setDescription(activeRole.jobdesk?.description || '');
        setTasks(activeRole.jobdesk?.tasks || []);
        setNewTaskInput('');
      }
    }
  }, [selectedRoleId, roles, subTab]);

  // Handle selected position change -> fill form
  useEffect(() => {
    if (subTab === 'position' && selectedPositionId) {
      const activePos = positions.find(p => p.id === selectedPositionId);
      if (activePos) {
        setDescription(activePos.jobdesk?.description || '');
        setTasks(activePos.jobdesk?.tasks || []);
        setNewTaskInput('');
      }
    }
  }, [selectedPositionId, positions, subTab]);

  // Add Task item
  const handleAddTask = () => {
    const trimmed = newTaskInput.trim();
    if (!trimmed) return;
    if (tasks.includes(trimmed)) {
      showToast('Butir tugas tersebut sudah ada di daftar', 'warning');
      return;
    }
    setTasks(prev => [...prev, trimmed]);
    setNewTaskInput('');
  };

  // Remove Task item
  const handleRemoveTask = (idxToRemove: number) => {
    setTasks(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (subTab === 'role') {
        if (!selectedRoleId) return;
        await updateRoleJobdesk(selectedRoleId, description.trim() || null, tasks);
        showToast('Berhasil memperbarui jobdesk peran utama', 'success');
        
        // Refresh local roles data to reflect changes
        setRoles(prev => prev.map(r => {
          if (r.id === selectedRoleId) {
            return {
              ...r,
              jobdesk: {
                id: r.jobdesk?.id || '',
                role_id: selectedRoleId,
                description: description.trim() || null,
                tasks
              }
            };
          }
          return r;
        }));
      } else {
        if (!selectedPositionId) return;
        await updatePositionJobdesk(selectedPositionId, description.trim() || null, tasks);
        showToast('Berhasil memperbarui jobdesk jabatan tambahan', 'success');
        
        // Refresh local positions data to reflect changes
        setPositions(prev => prev.map(p => {
          if (p.id === selectedPositionId) {
            return {
              ...p,
              jobdesk: {
                id: p.jobdesk?.id || '',
                position_id: selectedPositionId,
                description: description.trim() || null,
                tasks
              }
            };
          }
          return p;
        }));
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan perubahan jobdesk', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const activeRoleItem = roles.find(r => r.id === selectedRoleId);
  const activePositionItem = positions.find(p => p.id === selectedPositionId);

  const activeItemName = subTab === 'role' 
    ? activeRoleItem?.name 
    : activePositionItem?.name;

  return (
    <div className="space-y-6">
      
      {/* Superadmin Tenant Selector */}
      {isSuperAdmin() && tenants.length > 0 && (
        <Card className="rounded-xl border border-gray-150/60 dark:border-slate-800 shadow-sm p-5 bg-gradient-to-r from-gray-50/50 to-white dark:from-slate-800/30 dark:to-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-white shadow-sm shadow-indigo-200 dark:shadow-none">
                <Sparkles size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 dark:text-gray-250 uppercase tracking-wider">
                  Sekolah / Tenant Aktif
                </h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                  Pilih sekolah untuk mengonfigurasi deskripsi & tugas harian
                </p>
              </div>
            </div>
            <div className="w-full md:w-1/3">
              <SearchableSelect
                value={selectedTenantId}
                onValueChange={setSelectedTenantId}
                options={tenants.map(t => ({ label: t.name, value: t.id }))}
                placeholder="Pilih Sekolah (Tenant)..."
                triggerClassName="w-full h-9 rounded-xl text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Selector Sub-Tab */}
      <div className="flex border-b border-gray-100 dark:border-slate-800 p-1 bg-gray-50/50 dark:bg-slate-900/20 rounded-t-xl gap-2">
        <button
          onClick={() => setSubTab('role')}
          className={cn(
            "px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 border-b-2",
            subTab === 'role'
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500"
          )}
        >
          <Shield size={14} />
          Peran Utama (Roles)
        </button>
        <button
          onClick={() => setSubTab('position')}
          className={cn(
            "px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 border-b-2",
            subTab === 'position'
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500"
          )}
        >
          <Briefcase size={14} />
          Struktur Jabatan (Positions)
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
              Menyelaraskan Data Jobdesk...
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* List Peran / Jabatan (Kolom Kiri) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-800 border border-gray-150/60 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/10">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Daftar {subTab === 'role' ? 'Peran Utama' : 'Jabatan Tambahan'}
              </h4>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-slate-800/60 max-h-[500px] overflow-y-auto">
              {subTab === 'role' ? (
                roles.map(r => {
                  const hasJobdesk = !!r.jobdesk?.description || (r.jobdesk?.tasks && r.jobdesk.tasks.length > 0);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoleId(r.id)}
                      className={cn(
                        "w-full p-4 text-left transition-all duration-150 flex items-center justify-between gap-3 group",
                        selectedRoleId === r.id
                          ? "bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400"
                          : "hover:bg-gray-50 dark:hover:bg-slate-900/10"
                      )}
                    >
                      <div className="flex flex-col gap-0.5 truncate">
                        <span className="text-xs font-bold truncate group-hover:translate-x-0.5 transition-transform duration-200">
                          {r.name}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate max-w-[180px]">
                          {r.description || 'Tidak ada deskripsi peran.'}
                        </span>
                      </div>
                      
                      {/* Status indicator */}
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide",
                        hasJobdesk 
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/10 dark:text-emerald-400" 
                          : "bg-gray-100 text-gray-400 dark:bg-slate-900/20 dark:text-slate-500"
                      )}>
                        {hasJobdesk ? 'Seeded' : 'Empty'}
                      </span>
                    </button>
                  );
                })
              ) : (
                positions.map(p => {
                  const hasJobdesk = !!p.jobdesk?.description || (p.jobdesk?.tasks && p.jobdesk.tasks.length > 0);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPositionId(p.id)}
                      className={cn(
                        "w-full p-4 text-left transition-all duration-150 flex items-center justify-between gap-3 group",
                        selectedPositionId === p.id
                          ? "bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400"
                          : "hover:bg-gray-50 dark:hover:bg-slate-900/10"
                      )}
                    >
                      <div className="flex flex-col gap-0.5 truncate">
                        <span className="text-xs font-bold truncate group-hover:translate-x-0.5 transition-transform duration-200">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono tracking-tight uppercase">
                          Code: {p.code}
                        </span>
                      </div>
                      
                      {/* Status indicator */}
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide",
                        hasJobdesk 
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/10 dark:text-emerald-400" 
                          : "bg-gray-100 text-gray-400 dark:bg-slate-900/20 dark:text-slate-500"
                      )}>
                        {hasJobdesk ? 'Seeded' : 'Empty'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Form Editor (Kolom Kanan) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-800 border border-gray-150/60 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="text-indigo-500" size={18} />
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-250">
                    Editor Jobdesk: <span className="text-indigo-650 dark:text-indigo-400">{activeItemName}</span>
                  </h4>
                  <p className="text-[10px] text-gray-400 font-medium">
                    Konfigurasi deskripsi and daftar tugas konkret untuk role/jabatan ini.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-indigo-650 hover:bg-indigo-700 text-white gap-1.5 shadow-sm text-xs font-black uppercase tracking-wider"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                Simpan Perubahan
              </Button>
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Deskripsi Operasional Tugas
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tulis ringkasan tugas operasional, hak akses, and wewenang resmi peran ini..."
                className="w-full h-24 p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed"
              />
            </div>

            {/* Concrete Tasks Manager */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                Daftar Tugas Konkret
              </label>

              {/* Add New Task Form */}
              <div className="flex gap-2">
                <Input
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  placeholder="Ketik tugas konkret baru (contoh: Memproses data absensi siswa harian)..."
                  className="text-xs bg-white dark:bg-slate-800"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                />
                <Button
                  onClick={handleAddTask}
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-1 text-xs font-bold uppercase"
                >
                  <Plus size={13} />
                  Tambah
                </Button>
              </div>

              {/* Tasks List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {tasks.length > 0 ? (
                  tasks.map((task, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between gap-3 p-3 bg-gray-50/50 dark:bg-slate-900/10 rounded-xl border border-gray-100 dark:border-slate-800/40 hover:border-gray-200 dark:hover:border-slate-700 transition-all duration-150 group"
                    >
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {task}
                      </span>
                      <button
                        onClick={() => handleRemoveTask(idx)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title="Hapus Tugas"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-150 dark:border-slate-800 rounded-xl">
                    <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 dark:text-slate-500 italic">
                      Belum ada butir tugas konkret. Tambahkan tugas di atas untuk memulai.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
