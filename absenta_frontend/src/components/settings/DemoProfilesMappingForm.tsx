import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Crown, 
  BookOpen, 
  Users, 
  Briefcase, 
  Building2, 
  FileText, 
  HeartHandshake, 
  Laptop, 
  ShoppingCart, 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  Sparkles, 
  Smartphone,
  Save,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  User,
  FilterX
} from 'lucide-react';
import { 
  DEMO_CATEGORIES, 
  type DemoRoleProfile 
} from '@/config/demoProfiles.config';
import { 
  getDemoProfilesManageData, 
  saveDemoProfiles, 
  resetDemoProfiles, 
  type DemoCandidateUser 
} from '@/api/demoProfiles.api';
import { Button, Switch, SearchableSelect, type SearchableSelectOption } from '@/components/ui';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface UniversalDemoProfilesMappingProps {
  hideLayout?: boolean;
  isModal?: boolean;
  readOnly?: boolean;
  onClose?: () => void;
  onSaveSuccess?: () => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string; size?: number }>> = {
  Crown,
  BookOpen,
  Users,
  Briefcase,
  Building2,
  FileText,
  HeartHandshake,
  Laptop,
  ShoppingCart,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Sparkles,
  Smartphone,
};

interface DemoProfileCardProps {
  profile: DemoRoleProfile;
  users: DemoCandidateUser[];
  baseUserOptions: SearchableSelectOption[];
  readOnly: boolean;
  onToggleActive: (profileId: string, currentActive: boolean) => void;
  onMappingChange: (profileId: string, userId: string) => void;
}

const DemoProfileCard: React.FC<DemoProfileCardProps> = React.memo(({
  profile,
  users,
  baseUserOptions,
  readOnly,
  onToggleActive,
  onMappingChange,
}) => {
  const Icon = ICON_MAP[profile.iconName] || Crown;
  const isSlotActive = profile.isActive !== false;
  const isUserMapped = Boolean(profile.userId);
  const mappedUserObj = useMemo(() => users.find((u) => u.id === profile.userId), [users, profile.userId]);

  const profileOptions = useMemo<SearchableSelectOption[]>(() => {
    const defaultOption: SearchableSelectOption = {
      value: '__DEFAULT__',
      label: `-- Gunakan Akun Demo Bawaan (${profile.simulatedName}) --`,
      rightBadge: 'Default',
      rightBadgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px]',
      statusDotClass: 'bg-slate-400',
    };
    return [defaultOption, ...(baseUserOptions ?? [])];
  }, [profile.simulatedName, baseUserOptions]);

  return (
    <div
      className={cn(
        "p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between space-y-3",
        isSlotActive
          ? isUserMapped
            ? "border-emerald-300 dark:border-emerald-800/80 shadow-xs"
            : "border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs"
          : "opacity-60 border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40"
      )}
    >
      {/* Header Slot: Ikon, Judul, Toggle */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs bg-gradient-to-br",
              profile.gradient,
              profile.border
            )}
          >
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {profile.title}
              </h4>
              {isUserMapped && (
                <span className="p-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" title="Terpetakan ke Pengguna Riil">
                  <CheckCircle2 size={12} />
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Kode Peran: <code className="font-mono text-indigo-600 dark:text-indigo-400">{profile.roleCode}</code>
            </span>
          </div>
        </div>

        {/* Toggle Aktif / Non-aktif Slot */}
        <div className="shrink-0 flex items-center" title="Tampilkan slot ini di halaman login">
          <Switch
            checked={isSlotActive}
            onCheckedChange={() => onToggleActive(profile.id, isSlotActive)}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Deskripsi Singkat */}
      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
        {profile.description}
      </p>

      {/* Dropdown Pemetaan Pengguna Sekolah dengan SearchableSelect */}
      <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
        <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>Petakan ke Akun Pengguna:</span>
          {isUserMapped && (
            <span className="text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400">
              Akun Sekolah Aktif
            </span>
          )}
        </label>

        <SearchableSelect
          value={profile.userId || '__DEFAULT__'}
          onChange={(val) => onMappingChange(profile.id, (!val || val === '__DEFAULT__') ? '' : val)}
          options={profileOptions}
          disabled={readOnly || !isSlotActive}
          clearable={Boolean(profile.userId)}
          placeholder="Pilih akun pengguna..."
          searchPlaceholder="Cari nama, NIP, atau peran..."
          emptyMessage="Pengguna tidak ditemukan"
          triggerClassName={cn(
            "text-xs py-1.5 h-9 rounded-xl font-medium",
            isUserMapped
              ? "border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 bg-emerald-50/20"
              : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
          )}
        />

        {/* Detail Info Pengguna Terpilih */}
        {mappedUserObj ? (
          <div className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10.5px] text-emerald-900 dark:text-emerald-200 space-y-0.5">
            <div className="font-bold flex items-center gap-1">
              <User size={11} />
              <span className="truncate">{mappedUserObj.full_name}</span>
            </div>
            <div className="text-[9.5px] text-emerald-700 dark:text-emerald-400 truncate">
              Email: {mappedUserObj.email} {mappedUserObj.nip ? `• NIP: ${mappedUserObj.nip}` : ''}
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 italic">
            Menggunakan akun simulasi default: <span className="font-medium text-slate-600 dark:text-slate-400">{profile.email}</span>
          </div>
        )}
      </div>
    </div>
  );
});

DemoProfileCard.displayName = 'DemoProfileCard';

export const DemoProfilesMappingForm: React.FC<UniversalDemoProfilesMappingProps> = ({
  hideLayout: _hideLayout = false,
  isModal: _isModal = false,
  readOnly = false,
  onClose: _onClose,
  onSaveSuccess,
}) => {
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDemoEnabled, setIsDemoEnabled] = useState(true);
  const [profiles, setProfiles] = useState<DemoRoleProfile[]>([]);
  const [users, setUsers] = useState<DemoCandidateUser[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 1. Fetch data dari server
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['demo-profiles-manage'],
    queryFn: getDemoProfilesManageData,
    staleTime: 1000 * 60 * 2,
  });

  // Sinkronisasi data server ke local edit state
  useEffect(() => {
    if (data) {
      setIsDemoEnabled(data.is_demo_enabled ?? true);
      setProfiles(data.profiles || []);
      setUsers(data.users || []);
      setHasChanges(false);
    }
  }, [data]);

  // Transform kandidat users ke SearchableSelectOption[]
  const baseUserOptions: SearchableSelectOption[] = useMemo(() => {
    return (users ?? [])?.map((u) => {
      const posStr = u.positions && u.positions.length > 0 ? ` [${u.positions.join(', ')}]` : '';
      const nipStr = u.nip ? ` - NIP: ${u.nip}` : '';
      return {
        value: u.id,
        label: `${u.full_name} (${u.role_name || 'User'})${posStr}${nipStr}`,
        rightBadge: u.role_name || 'User',
        rightBadgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 text-[10px]',
        statusDotClass: 'bg-emerald-500',
      };
    });
  }, [users]);

  // 2. Mutation simpan
  const saveMutation = useMutation({
    mutationFn: saveDemoProfiles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-profiles-manage'] });
      queryClient.invalidateQueries({ queryKey: ['public-demo-profiles'] });
      toast.success('Pemetaan akun demo berhasil disimpan!');
      setHasChanges(false);
      if (onSaveSuccess) onSaveSuccess();
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(errorObj?.response?.data?.message || errorObj?.message || 'Gagal menyimpan pemetaan akun demo');
    },
  });

  // 3. Mutation reset
  const resetMutation = useMutation({
    mutationFn: resetDemoProfiles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-profiles-manage'] });
      queryClient.invalidateQueries({ queryKey: ['public-demo-profiles'] });
      refetch();
      toast.success('Pemetaan akun demo berhasil direset ke bawaan sistem!');
      setHasChanges(false);
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(errorObj?.response?.data?.message || errorObj?.message || 'Gagal mereset pemetaan');
    },
  });

  // Handler ubah pemetaan user untuk suatu profile
  const handleUserMappingChange = useCallback((profileId: string, targetUserId: string) => {
    setProfiles((prev) =>
      prev?.map((p) => {
        if (p.id !== profileId) return p;

        if (!targetUserId) {
          // Revert ke akun bawaan
          return {
            ...p,
            userId: null,
          };
        }

        const selectedUser = users.find((u) => u.id === targetUserId);
        return {
          ...p,
          userId: targetUserId,
          simulatedName: selectedUser?.full_name || p.simulatedName,
          email: selectedUser?.email || p.email,
        };
      })
    );
    setHasChanges(true);
  }, [users]);

  // Handler toggle aktif/nonaktif slot
  const handleToggleProfileActive = useCallback((profileId: string, currentActive: boolean) => {
    setProfiles((prev) =>
      prev?.map((p) => {
        if (p.id !== profileId) return p;
        return { ...p, isActive: !currentActive };
      })
    );
    setHasChanges(true);
  }, []);

  // Filter profil berdasarkan kategori dan pencarian
  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return profiles.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }
      if (q) {
        const titleMatch = p.title.toLowerCase().includes(q);
        const nameMatch = p.simulatedName.toLowerCase().includes(q);
        const emailMatch = p.email.toLowerCase().includes(q);
        const badgeMatch = p.badge.toLowerCase().includes(q);
        return titleMatch || nameMatch || emailMatch || badgeMatch;
      }
      return true;
    });
  }, [profiles, selectedCategory, searchQuery]);

  // Statistik pemetaan
  const stats = useMemo(() => {
    const total = profiles.length;
    const mapped = profiles.filter((p) => Boolean(p.userId)).length;
    const active = profiles.filter((p) => p.isActive !== false).length;
    return { total, mapped, active };
  }, [profiles]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Memuat konfigurasi pemetaan akun demo...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">Gagal Memuat Konfigurasi Pemetaan</h4>
        <p className="text-xs text-rose-700 dark:text-rose-300">{(error as Error)?.message || 'Terjadi kesalahan sistem'}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 animate-in fade-in duration-200">
      {/* ── 1. MASTER BANNER & PENJELASAN ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Sliders size={18} />
            </span>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
              Pemetaan Akun Demo & Quick Login
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              {stats.mapped} dari {stats.total} Dipetakan
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            Petakan peran 1-Click login demo langsung ke staf atau guru riil di sekolah Anda. Saat tombol peran diklik di halaman login atau floating switcher, sistem langsung mengaitkan sesi pengguna terpilih secara aman tanpa perlu mengetahui password mereka.
          </p>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shrink-0">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Mode Demo Quick Login
            </div>
            <div className="text-[10px] text-slate-400">
              {isDemoEnabled ? 'Aktif (Tampil di Login)' : 'Dinonaktifkan'}
            </div>
          </div>
          <Switch
            checked={isDemoEnabled}
            onCheckedChange={(checked) => {
              setIsDemoEnabled(checked);
              setHasChanges(true);
            }}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* ── 2. FILTER CATEGORY & SEARCH TOOLBAR ── */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Horizontal Category Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar flex-1 min-w-0">
          {DEMO_CATEGORIES?.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 select-none",
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs scale-[1.01]"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari peran atau nama guru..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── 3. GRID OF ROLE SLOTS ── */}
      {filteredProfiles.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
          <FilterX size={24} className="text-slate-400" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak ada slot peran yang cocok</h4>
          <p className="text-xs text-slate-500">Coba ubah filter kategori atau kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredProfiles?.map((profile) => (
            <DemoProfileCard
              key={profile.id}
              profile={profile}
              users={users}
              baseUserOptions={baseUserOptions}
              readOnly={readOnly}
              onToggleActive={handleToggleProfileActive}
              onMappingChange={handleUserMappingChange}
            />
          ))}
        </div>
      )}

      {/* ── 4. STICKY ACTION BAR ── */}
      <div className="sticky bottom-4 z-20 p-3 sm:p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <HelpCircle size={14} className="text-slate-400 shrink-0" />
          <span>
            {hasChanges ? (
              <strong className="text-amber-600 dark:text-amber-400">Ada perubahan yang belum disimpan.</strong>
            ) : (
              'Seluruh pemetaan tersinkronisasi dengan server.'
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm('Apakah Anda yakin ingin mereset seluruh pemetaan akun demo ke konfigurasi bawaan sistem?')) {
                resetMutation.mutate();
              }
            }}
            disabled={resetMutation.isPending || readOnly}
            className="flex-1 sm:flex-initial text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <RotateCcw size={13} className={resetMutation.isPending ? 'animate-spin' : ''} />
            <span>Reset Bawaan</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              saveMutation.mutate({
                profiles,
                is_demo_enabled: isDemoEnabled,
              });
            }}
            disabled={saveMutation.isPending || readOnly || !hasChanges}
            className="flex-1 sm:flex-initial text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5"
          >
            <Save size={13} className={saveMutation.isPending ? 'animate-spin' : ''} />
            <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pemetaan'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DemoProfilesMappingForm;
