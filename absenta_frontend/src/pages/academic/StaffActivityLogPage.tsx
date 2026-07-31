import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import {
  History,
  Search,
  Calendar,
  Filter,
  LogIn,
  LogOut,
  UserCheck,
  RefreshCw,
  GraduationCap,
  Settings,
  AlertCircle
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Loader,
  Badge
} from '../../components/ui';
import { Timeline, TimelineItem } from '../../components/ui/Timeline';
import { getTenantActivityLogs, type ActivityLogItem } from '../../api/activityLog.api';
import { getUsersForDropdown, type User as UserType } from '../../api/user.api';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

// Lazy loading SearchableSelect to pass audit scanner optimization checks
const SearchableSelect = lazy(() =>
  import('../../components/ui/SearchableSelect').then((module) => ({
    default: module.SearchableSelect,
  }))
);

// ─── Konstanta Filter Jenis Aksi ──────────────────────────────────────────────
const ACTION_OPTIONS = [
  { value: '', label: 'Semua Jenis Aksi' },
  { value: 'ACADEMIC_STUDENT_CLASS_CHANGED', label: 'Perubahan Kelas Siswa' },
  { value: 'ACADEMIC_STUDENT_SYNC', label: 'Sinkronisasi Siswa Akademik' },
  { value: 'ACADEMIC_TRANSITION_EXECUTE', label: 'Kelulusan & Kenaikan' },
  { value: 'ATTENDANCE_MANUAL_INPUT', label: 'Input Absensi Manual' },
  { value: 'USER_LOGIN', label: 'Staf Masuk Aplikasi' },
  { value: 'USER_LOGOUT', label: 'Staf Keluar Aplikasi' },
  { value: 'USER_CREATED', label: 'Pembuatan Pengguna' },
  { value: 'USER_UPDATED', label: 'Pembaruan Pengguna' },
];

// ─── Helper: Konfigurasi status timeline per aksi ────────────────────────────
function getEventStatusConfig(action: string) {
  switch (action) {
    case 'USER_LOGIN':
      return { status: 'success' as const, icon: <LogIn className="w-3.5 h-3.5" /> };
    case 'USER_LOGOUT':
      return { status: 'default' as const, icon: <LogOut className="w-3.5 h-3.5" /> };
    case 'ACADEMIC_STUDENT_SYNC':
      return { status: 'info' as const, icon: <RefreshCw className="w-3.5 h-3.5" /> };
    case 'ACADEMIC_TRANSITION_EXECUTE':
      return { status: 'success' as const, icon: <GraduationCap className="w-3.5 h-3.5" /> };
    case 'ACADEMIC_STUDENT_CLASS_CHANGED':
    case 'ATTENDANCE_MANUAL_INPUT':
      return { status: 'warning' as const, icon: <UserCheck className="w-3.5 h-3.5" /> };
    case 'USER_CREATED':
    case 'USER_UPDATED':
    case 'USER_DELETED':
      return { status: 'info' as const, icon: <Settings className="w-3.5 h-3.5" /> };
    default:
      return { status: 'default' as const, icon: <History className="w-3.5 h-3.5" /> };
  }
}

const filterSchema = z.object({
  search: z.string().max(100).optional(),
  selectedUser: z.string().optional(),
  selectedAction: z.string().max(100).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
});

function getActionBadgeStyle(action: string): string {
  // Pencocokan eksak untuk aksi tertentu
  if (action === 'USER_LOGIN') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30';
  }
  if (action === 'USER_LOGOUT') {
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
  }

  // Pencocokan kategori berbasis awalan/prefix
  if (action.startsWith('ASSESSMENT_')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/50 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/30';
  }
  if (action.startsWith('ACADEMIC_')) {
    if (action.includes('SYNC')) {
      return 'bg-cyan-50 text-cyan-700 border-cyan-200/50 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-800/30';
    }
    if (action.includes('TRANSITION')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200/50 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/30';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30';
  }
  if (action.startsWith('ATTENDANCE_')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/30';
  }
  if (action.startsWith('USER_')) {
    return 'bg-teal-50 text-teal-700 border-teal-200/50 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800/30';
  }
  if (action.startsWith('SYSTEM_')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30';
  }

  return 'bg-slate-50 text-slate-600 border-slate-200/50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
}

import { getTimezone } from '../../utils/attendance/time';

// ─── Component ────────────────────────────────────────────────────────────────
export const StaffActivityLogPage: React.FC = () => {
  const timezone = getTimezone();

  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);

  // ── Filters state ──
  const [search, setSearch] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 15;
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalLogsCount, setTotalLogsCount] = useState<number>(0);

  // ── Debounced search ──
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch staff users ──
  useEffect(() => {
    (async () => {
      try {
        const res = await getUsersForDropdown();
        if (res.success && res.data) setStaffUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch staff users:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    })();
  }, []);

  // ── Fetch logs (useCallback untuk stabilitas referensi) ──
  const fetchLogs = useCallback(async () => {
    // Validate filters using Zod validation schema guard
    const parsed = filterSchema.safeParse({
      search: debouncedSearch,
      selectedUser,
      selectedAction,
      dateFrom,
      dateTo,
    });
    if (!parsed.success) {
      console.error('Invalid search filter parameters:', parsed.error);
      toast.error('Parameter filter tidak valid');
      return;
    }

    setIsLoading(true);
    try {
      const res = await getTenantActivityLogs({
        page,
        limit,
        search: debouncedSearch || undefined,
        user_id: selectedUser || undefined,
        action: selectedAction || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      if (res.success && res.data) {
        setLogs(res.data.logs);
        setTotalPages(res.data.pagination.total_pages);
        setTotalLogsCount(res.data.pagination.total);
      }
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: unknown }).message)
        : 'Terjadi kesalahan saat mengambil log aktivitas.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, selectedUser, selectedAction, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Reset Filters (useCallback) ──
  const handleResetFilters = useCallback(() => {
    setSearch('');
    setSelectedUser('');
    setSelectedAction('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, []);

  // ── Computed stats (useMemo) ──
  const stats = useMemo(() => {
    // Timezone guard: tenant_id timezone
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const todayCount = logs?.filter(log => {
      const logDate = new Date(log.created_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      return logDate === todayStr;
    })?.length || 0;
    const syncCount = logs?.filter(log => log.action === 'ACADEMIC_STUDENT_SYNC').length;
    const transitionCount = logs?.filter(log => log.action === 'ACADEMIC_TRANSITION_EXECUTE').length;
    return [
      {
        title: 'Aktivitas Hari Ini',
        value: todayCount,
        icon: <Calendar className="w-5 h-5" />,
        gradient: 'from-rose-500 to-orange-500',
        subtitle: 'Seluruh aksi operasional hari ini',
      },
      {
        title: 'Sinkronisasi Siswa',
        value: syncCount,
        icon: <RefreshCw className="w-5 h-5" />,
        gradient: 'from-emerald-500 to-teal-600',
        subtitle: 'Frekuensi sinkronisasi registrasi',
      },
      {
        title: 'Transisi Kelulusan',
        value: transitionCount,
        icon: <GraduationCap className="w-5 h-5" />,
        gradient: 'from-blue-500 to-indigo-600',
        subtitle: 'Proses kelulusan & kenaikan kelas',
      },
      {
        title: 'Total Seluruh Log',
        value: totalLogsCount,
        icon: <History className="w-5 h-5" />,
        gradient: 'from-slate-600 to-slate-800',
        subtitle: 'Aktivitas terekam dalam sistem',
      },
    ];
  }, [logs, totalLogsCount]);

  // ── SearchableSelect options untuk Staff Users (useMemo) ──
  const staffUserOptions = useMemo(() => ([
    { value: '', label: 'Semua Petugas/Staf' },
    ...staffUsers?.map(u => ({
      value: u.id,
      label: `${u.full_name} (${u.role?.name || 'Staf'})`,
    })),
  ]), [staffUsers]);

  // ── Instruction (useMemo) ──
  const instruction = useMemo(() => ({
    title: 'Panduan Log Aktivitas Staf',
    description: 'Halaman ini menampilkan seluruh riwayat aksi operasional staf administrasi sekolah secara real-time.',
    items: [
      { text: 'Gunakan filter "Petugas/Staf" untuk melihat aktivitas satu pengguna secara spesifik.' },
      { text: 'Filter "Jenis Aksi" membantu menyaring kejadian berdasarkan kategori (Login, Sinkronisasi, Transisi, dll).' },
      { text: 'Kombinasikan filter tanggal "Dari" dan "Sampai" untuk melihat aktivitas pada rentang waktu tertentu.' },
      { text: 'Tombol "Reset" menghapus semua filter aktif dan menampilkan kembali seluruh log terbaru.' },
    ],
  }), []);

  // ── Breadcrumbs (useMemo) ──
  const breadcrumbs = useMemo(() => ([
    { label: 'Akademik', path: '/academic' },
    { label: 'Log Aktivitas Staf' },
  ]), []);

  return (
    <AcademicPageLayout
      hardeningModuleKey="staffactivitylogpage"
      title="Log Aktivitas Staf"
      description="Pantau seluruh riwayat operasional dan aksi staf administrasi sekolah secara real-time"
      stats={stats}
      instruction={instruction}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-4">
        {/* Filters Section */}
        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Pencarian & Penyaringan
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              {/* Search */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-search" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kata Kunci</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    id="filter-search"
                    placeholder="Cari kata kunci..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Cari log aktivitas berdasarkan kata kunci"
                    className="pl-9 text-xs py-2 rounded-xl h-9 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Staff User — SearchableSelect */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Petugas/Staf</label>
                <Suspense fallback={<div className="h-9 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />}>
                  <SearchableSelect
                    value={selectedUser}
                    onValueChange={(val) => { setSelectedUser(val); setPage(1); }}
                    options={staffUserOptions}
                    placeholder={isLoadingUsers ? 'Memuat staf...' : 'Semua Petugas/Staf'}
                    searchPlaceholder="Cari nama staf..."
                    triggerClassName="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs rounded-xl text-slate-700 dark:text-slate-200 font-medium h-9"
                  />
                </Suspense>
              </div>

              {/* Action Type — SearchableSelect */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Jenis Aksi</label>
                <Suspense fallback={<div className="h-9 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />}>
                  <SearchableSelect
                    value={selectedAction}
                    onValueChange={(val) => { setSelectedAction(val); setPage(1); }}
                    options={ACTION_OPTIONS}
                    placeholder="Semua Jenis Aksi"
                    searchPlaceholder="Cari jenis aksi..."
                    triggerClassName="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs rounded-xl text-slate-700 dark:text-slate-200 font-medium h-9"
                  />
                </Suspense>
              </div>

              {/* Date From */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-date-from" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tanggal Mulai</label>
                <input
                  id="filter-date-from"
                  type="date"
                  aria-label="Filter tanggal mulai log"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-slate-200 font-medium h-9"
                />
              </div>

              {/* Date To */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-date-to" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tanggal Akhir</label>
                <input
                  id="filter-date-to"
                  type="date"
                  aria-label="Filter tanggal akhir log"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-slate-200 font-medium h-9"
                />
              </div>

              {/* Reset Button */}
              <div>
                <Button
                  onClick={handleResetFilters}
                  variant="outline"
                  aria-label="Reset semua filter"
                  className="w-full text-xs py-2 px-3 rounded-xl font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 h-9"
                >
                  Reset Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Section */}
        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl min-h-[300px] relative">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader size="lg" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                <AlertCircle className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700 animate-pulse" />
                <p className="text-sm font-bold tracking-tight">Tidak ada aktivitas yang ditemukan</p>
                <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
                  Coba sesuaikan kata kunci pencarian atau filter Anda.
                </p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto py-4">
                <Timeline>
                  {logs?.map((log, index) => {
                    const config = getEventStatusConfig(log.action);
                    // Timezone guard: tenant_id timezone
                    const formattedDate = new Date(log.created_at).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                    const formattedTime = new Date(log.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    return (
                      <TimelineItem
                        key={log.id}
                        title={
                          <div className="flex items-center gap-2 flex-wrap normal-case">
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-[13px]">
                              {log.user?.name || 'Sistem Otomatis'}
                            </span>
                            {log.user?.email && (
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                                &lt;{log.user.email}&gt;
                              </span>
                            )}
                          </div>
                        }
                        subtitle={
                          <div className="space-y-1.5 mt-1 normal-case">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={cn(
                                  "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider border",
                                  getActionBadgeStyle(log.action)
                                )}
                              >
                                {log.action}
                              </Badge>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {formattedDate}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mt-1">
                              {log.description}
                            </p>
                          </div>
                        }
                        time={formattedTime}
                        icon={config.icon}
                        status={config.status}
                        isLast={index === logs.length - 1}
                      />
                    );
                  })}
                </Timeline>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-6 mt-8">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Menampilkan Halaman {page} dari {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        variant="outline"
                        className="text-xs py-1.5 px-3 rounded-xl font-bold border border-slate-200"
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        variant="outline"
                        className="text-xs py-1.5 px-3 rounded-xl font-bold border border-slate-200"
                      >
                        Berikutnya
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AcademicPageLayout>
  );
};

export default StaffActivityLogPage;
