import React, { useState, useEffect, useMemo } from 'react';
import { Save, X, Eye, EyeOff, User as UserIcon, Mail, ShieldCheck, Globe, Key, Info as InfoIcon, RefreshCw } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
  Loader,
  ButtonLoader,
  ModalFooter
} from '../ui';
import { SearchableSelect } from '../ui/SearchableSelect';
import { 
  createUser, 
  updateUser, 
  getRoles, 
  getUsers,
  type User as UserType, 
  type RoleItem, 
  type TenantItem 
} from '../../api/user.api';
import { getAllTenants, getTenantById } from '../../api/tenants.api';
import { createTenantUser, getTenantUsers, updateTenantUser } from '../../api/tenant-detail.api';
import { siswaApi } from '../../api/academic.api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { isSystemSuperAdmin } from '../../utils/rbac';
import { createUserSchema, updateUserSchema } from '../../schemas/management/user.schema';

interface UserFormProps {
  user?: UserType | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

interface FormData {
  email: string;
  full_name: string;
  password: string;
  confirm_password?: string;
  role_id: string;
  tenant_id: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface FormErrors {
  email?: string;
  full_name?: string;
  password?: string;
  confirm_password?: string;
  role_id?: string;
  tenant_id?: string;
  status?: string;
}

const UserForm: React.FC<UserFormProps> = ({
  user,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    full_name: '',
    password: '',
    role_id: '',
    tenant_id: '',
    status: 'ACTIVE'
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const { showToast } = useToast();
  const { user: currentUser, can, isAdmin, isSuperAdmin, isLoading: isAuthLoading } = useAuth();
  
  const isSuperAdminUser = useMemo(() => isSuperAdmin(), [isSuperAdmin]);
  const currentTenantId = currentUser?.tenant_id;

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        setLoadingDropdowns(true);
        
        // Parallel load roles and tenants
        const rolesPromise = getRoles();
        let tenantsPromise: Promise<any>;

        if (isSuperAdminUser) {
          tenantsPromise = getAllTenants({ limit: 1000 }, { skipTenantHeader: true });
        } else if (currentTenantId) {
          // For regular Admin, fetch their specific tenant info to display name instead of UUID
          tenantsPromise = getTenantById(currentTenantId).then(res => ({
            success: true,
            data: res.data ? [res.data] : []
          }));
        } else {
          tenantsPromise = Promise.resolve({ success: true, data: [] });
        }

        const [rolesResponse, tenantsResponse] = await Promise.all([
          rolesPromise,
          tenantsPromise
        ]);

        if (rolesResponse.success) {
          let availableRoles = rolesResponse.data;
          if (!isSuperAdminUser) {
            availableRoles = availableRoles.filter(role => role.name !== 'SUPERADMIN');
          }
          if (isCreateMode) {
            availableRoles = availableRoles.filter(role => role.name !== 'SUPERADMIN');
          }
          setRoles(availableRoles);
        }

        if (tenantsResponse.success) {
          setTenants(tenantsResponse.data || []);
        }
      } catch (error) {
        console.error('Error loading dropdown data:', error);
        showToast('Gagal memuat data dropdown', 'error');
      } finally {
        setLoadingDropdowns(false);
      }
    };
    loadDropdownData();
  }, [isSuperAdminUser, currentTenantId, isCreateMode, showToast]);

  // Initialize form data
  useEffect(() => {
    if (user && (isEditMode || isViewMode)) {
      setFormData({
        email: user.email || '',
        full_name: user.full_name || '',
        password: '',
        confirm_password: '',
        role_id: user.role_id || user.role?.id || '',
        tenant_id: user.tenant_id || user.tenant?.id || '',
        status: user.status || 'ACTIVE'
      });
    } else if (isCreateMode) {
      const defaultTenantId = !isSuperAdminUser ? (currentTenantId || '') : '';
      setFormData({
        email: '',
        full_name: '',
        password: '',
        confirm_password: '',
        role_id: '',
        tenant_id: defaultTenantId,
        status: 'ACTIVE'
      });
    }
  }, [user, mode, currentTenantId, isEditMode, isViewMode, isCreateMode, isSuperAdminUser]);

  // Role IDs and Tenant IDs synchronization
  useEffect(() => {
    if ((isEditMode || isViewMode) && user && !formData.role_id && (user.role?.id)) {
      setFormData(prev => ({ ...prev, role_id: user.role!.id }));
    }
    if ((isEditMode || isViewMode) && user && !formData.tenant_id && (user.tenant?.id || user.tenant_id)) {
      setFormData(prev => ({ ...prev, tenant_id: (user.tenant?.id || user.tenant_id || '') }));
    }
  }, [user, isEditMode, isViewMode, formData.role_id, formData.tenant_id]);

  const validateForm = (): boolean => {
    const baseResult = (isCreateMode ? createUserSchema : updateUserSchema).safeParse({
      email: formData.email,
      full_name: formData.full_name,
      password: formData.password,
      confirm_password: formData.confirm_password,
      role_id: formData.role_id,
      tenant_id: formData.tenant_id,
      status: formData.status,
    });
    const newErrors: FormErrors = {};
    if (!baseResult.success) {
      for (const issue of baseResult.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        newErrors[key] = issue.message;
      }
    }
    const selectedRole = roles.find(role => role.id === formData.role_id);
    if (selectedRole?.name !== 'SUPERADMIN' && !formData.tenant_id) {
      newErrors.tenant_id = 'Tenant wajib dipilih untuk role ini';
    }
    const currentRoleName = currentUser?.role?.name || currentUser?.role;
    if (isCreateMode && isSystemSuperAdmin(currentRoleName, currentUser?.tenant_id) && !formData.tenant_id) {
      newErrors.tenant_id = 'SUPERADMIN wajib memilih tenant untuk membuat user';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    if (field === 'role_id') {
      const selectedRole = roles.find(role => role.id === value);
      if (selectedRole?.name === 'SUPERADMIN') setFormData(prev => ({ ...prev, tenant_id: '' }));
    }
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
      if (errors.confirm_password) setErrors(prev => ({ ...prev, confirm_password: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!validateForm()) { showToast('Mohon perbaiki kesalahan pada form', 'error'); return; }
    if (emailAvailable === false) { showToast('Email sudah digunakan pada tenant ini', 'error'); return; }

    try {
      setLoading(true);
      const selectedRole = roles.find(role => role.id === formData.role_id);
      let response;
      const currentRoleName = currentUser?.role?.name || currentUser?.role;

      if (isCreateMode) {
        if (isSystemSuperAdmin(currentRoleName, currentUser?.tenant_id)) {
          const superPayload: any = {
            email: formData.email.trim(),
            full_name: formData.full_name.trim(),
            role: selectedRole?.name,
            status: formData.status,
            password: formData.password || undefined
          };
          response = await createTenantUser(formData.tenant_id, superPayload as any);
        } else {
          const adminPayload: any = {
            email: formData.email.trim(),
            full_name: formData.full_name.trim(),
            role: selectedRole?.name,
            status: formData.status,
            password: formData.password || undefined,
            tenant_id: selectedRole?.name !== 'SUPERADMIN' ? formData.tenant_id : undefined
          };
          response = await createUser(adminPayload as any);
        }
      } else if (isEditMode && user) {
        const updatePayload: any = {
          email: formData.email.trim(),
          full_name: formData.full_name.trim(),
          status: formData.status,
          password: formData.password || undefined,
          role_id: formData.role_id,
          tenant_id: selectedRole?.name !== 'SUPERADMIN' && formData.tenant_id ? formData.tenant_id : undefined
        };
        if (isSystemSuperAdmin(currentRoleName, currentUser?.tenant_id) && formData.tenant_id) {
          response = await updateTenantUser(formData.tenant_id, user.id, updatePayload as any);
        } else {
          response = await updateUser(user.id, updatePayload as any);
        }
        // Handle teacher/student internal status sync
        if (response?.success && selectedRole?.name === 'SISWA') {
          const siswaTargetStatus = formData.status === 'INACTIVE' ? 'TIDAK_AKTIF' : 'AKTIF';
          try {
            const siswaList = await siswaApi.getAll({ user_id: user.id, limit: 1 } as any);
            const siswaId = siswaList?.data?.[0]?.id;
            if (siswaId) await siswaApi.update(siswaId, { status: siswaTargetStatus });
          } catch {}
        }
      }

      if (response?.success) {
        showToast(isCreateMode ? 'Pengguna berhasil dibuat' : 'Pengguna berhasil diperbarui', 'success');
        onSuccess?.();
      } else {
        showToast(response?.message || 'Terjadi kesalahan', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculatePasswordStrength = (pwd: string): { score: number; label: string } => {
    let score = 0; if (pwd.length >= 8) score++; if (/[A-Z]/.test(pwd)) score++; if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++; if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const labels = ['Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'];
    return { score, label: labels[Math.min(score - 1, labels.length - 1)] || 'Sangat Lemah' };
  };

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const email = formData.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !email) { setEmailAvailable(null); return; }
      try {
        setCheckingEmail(true);
        const currentRoleName = currentUser?.role?.name || currentUser?.role;
        if (isSystemSuperAdmin(currentRoleName, currentUser?.tenant_id) && formData.tenant_id) {
          const res = await getTenantUsers(formData.tenant_id, { limit: 50, search: email });
          const exists = res.data.users?.some(u => u.email.toLowerCase() === email.toLowerCase() && (!isEditMode || u.id !== user?.id));
          setEmailAvailable(!exists);
        } else {
          const res = await getUsers(1, 100, email);
          const list: any[] = (res as any)?.data?.users ?? (res as any)?.data ?? [];
          const exists = Array.isArray(list) && list.some((u: any) => u.email?.toLowerCase() === email.toLowerCase() && (!isEditMode || u.id !== user?.id));
          setEmailAvailable(!exists);
        }
      } catch { setEmailAvailable(null); } finally { setCheckingEmail(false); }
    }, 500);
    return () => clearTimeout(timeout);
  }, [formData.email, formData.tenant_id, currentUser, isEditMode, user?.id]);

  const selectedRole = roles.find(role => role.id === formData.role_id);
  const isSuperAdminRole = selectedRole?.name === 'SUPERADMIN';
  const roleOptions = useMemo(() => {
    const initialRoleId = user?.role_id || user?.role?.id || '';
    if (!initialRoleId) return roles;
    if (roles.some(r => r.id === initialRoleId)) return roles;
    return [...roles, { id: initialRoleId, name: user?.role?.name || 'Unknown Role' }];
  }, [roles, user]);

  if (loadingDropdowns || isAuthLoading) {
    return <div className="flex justify-center items-center py-12"><Loader size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Account Info Section */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                   <Mail size={16} />
                </div>
                <div>
                   <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Informasi Akun</h3>
                   <p className="text-[9px] text-slate-500 font-bold">Data Identitas Login</p>
                </div>
             </div>
             <div className="hidden sm:block">
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[9px] font-black rounded-full border border-blue-100/50">
                  REQUIRED
                </span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-2 group">
              <Label htmlFor="full_name" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                 Nama Lengkap <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                disabled={isViewMode || loading}
                placeholder="Entry Nama Lengkap..."
                className={`h-10 text-sm font-bold tracking-tight bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all ${errors.full_name ? 'border-red-500' : ''}`}
              />
              {errors.full_name && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.full_name}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2 group">
              <Label htmlFor="email" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                 Alamat Email <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isViewMode || loading}
                placeholder="user@example.com"
                className={`h-10 text-sm font-bold tracking-tight bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all ${errors.email ? 'border-red-500' : ''}`}
              />
              <div className="flex justify-between items-center px-1">
                {checkingEmail && <p className="text-[9px] text-slate-500 font-medium italic">Memeriksa ketersediaan...</p>}
                {!checkingEmail && emailAvailable === true && <p className="text-[9px] text-green-600 font-bold italic">Email tersedia</p>}
                {!checkingEmail && emailAvailable === false && <p className="text-[9px] text-red-500 font-bold italic">Email sudah digunakan</p>}
                {errors.email && <p className="text-[10px] font-bold text-red-500">{errors.email}</p>}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2 group relative">
              <Label htmlFor="password" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                 Password {isCreateMode ? <span className="text-rose-500">*</span> : <span className="text-[9px] italic text-slate-400 capitalize">(Opsional)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isViewMode || loading}
                  placeholder={isCreateMode ? "Entry Password..." : "Kosongkan jika tidak diubah"}
                  className={`h-10 pr-10 text-sm font-bold tracking-tight bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all ${errors.password ? 'border-red-500' : ''}`}
                />
                {!isViewMode && (
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
              {errors.password && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2 group">
              <Label htmlFor="confirm_password" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                 Konfirmasi Password
              </Label>
              <Input
                id="confirm_password"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirm_password || ''}
                onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                disabled={isViewMode || loading}
                placeholder="Ulangi Password..."
                className={`h-10 text-sm font-bold tracking-tight bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all ${errors.confirm_password ? 'border-red-500' : ''}`}
              />
              {errors.confirm_password && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.confirm_password}</p>}
            </div>
          </div>
          
          {formData.password && !isViewMode && (
            <div className="bg-white/50 dark:bg-slate-950/20 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Keamanan Kata Sandi</p>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider">{passwordStrength?.label}</p>
              </div>
              <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${ (passwordStrength?.score || 0) >= 4 ? 'bg-emerald-500' : (passwordStrength?.score || 0) >= 3 ? 'bg-amber-500' : 'bg-rose-500' }`}
                  style={{ width: `${Math.min((passwordStrength?.score || 1) * 20, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Access & Status Section */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                   <ShieldCheck size={16} />
                </div>
                <div>
                   <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Akses & Status</h3>
                   <p className="text-[9px] text-slate-500 font-bold">Otorisasi & Kedudukan User</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Hak Akses / Role *</Label>
              <SearchableSelect
                value={formData.role_id}
                onValueChange={(value) => handleInputChange('role_id', value)}
                disabled={isViewMode || loading || ((!isSuperAdminUser) && (user?.role?.name === 'SUPERADMIN'))}
                options={roleOptions.map((r) => ({ value: r.id, label: r.name }))}
                placeholder="Pilih role..."
                searchPlaceholder="Cari role..."
                triggerClassName={`h-10 text-sm font-bold ${errors.role_id ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
              />
              {errors.role_id && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.role_id}</p>}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Status User *</Label>
              <SearchableSelect
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value as 'ACTIVE' | 'INACTIVE')}
                disabled={isViewMode || loading}
                options={[ { value: 'ACTIVE', label: 'AKTIF (User dapat Login)' }, { value: 'INACTIVE', label: 'TIDAK AKTIF (User Terblokir)' } ]}
                placeholder="Pilih status..."
                triggerClassName={`h-10 text-sm font-bold ${errors.status ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
              />
              {errors.status && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.status}</p>}
            </div>

            {/* Tenant Selection for Superadmin */}
            {!isSuperAdminRole && (
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter flex items-center gap-1.5">
                  <Globe size={10} className="text-blue-500" /> Penempatan Tenant / Sekolah *
                </Label>
                <SearchableSelect
                  value={formData.tenant_id}
                  onValueChange={(value) => handleInputChange('tenant_id', value)}
                  disabled={isViewMode || loading || currentUser?.role?.name === 'ADMIN'}
                  options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="Pilih tenant sekolah..."
                  searchPlaceholder="Cari nama sekolah..."
                  triggerClassName={`h-10 text-sm font-bold ${errors.tenant_id ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
                />
                {errors.tenant_id && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.tenant_id}</p>}
                {currentUser?.role?.name === 'ADMIN' && <p className="text-[9px] text-slate-500 font-bold italic px-1">Otomatis terkunci pada tenant Anda saat ini.</p>}
              </div>
            )}
          </div>

          {isSuperAdminRole && (
            <div className="flex items-center gap-2 p-2.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
               <ShieldCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
               <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 tracking-tight leading-relaxed">
                  ROLE SUPERADMIN bersifat GLOBAL dan memiliki akses penuh lintas tenant.
               </p>
            </div>
          )}
        </div>

        <ModalFooter className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
           <Button 
             type="button" 
             variant="toolbarOutline" 
             size="toolbar"
             onClick={onCancel} 
             disabled={loading}
           >
             <X className="w-3.5 h-3.5 mr-2" />
             {isViewMode ? 'Tutup Detail' : 'Batalkan'}
           </Button>
           
           {!isViewMode && (
             <Button 
               type="submit" 
               variant="toolbarPrimary"
               size="toolbar"
               disabled={loading} 
               className="px-8"
             >
               {loading ? (
                 <RefreshCw size={14} className="mr-2 animate-spin" />
               ) : (
                 <Save className="w-3.5 h-3.5 mr-2" />
               )}
               {isEditMode ? 'Simpan Perubahan' : 'Simpan User Baru'}
             </Button>
           )}
        </ModalFooter>
      </form>
    </div>
  );
};

export default UserForm;
