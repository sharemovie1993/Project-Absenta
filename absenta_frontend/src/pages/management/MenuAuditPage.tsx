import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, TableCell, Alert, AlertTitle, AlertDescription, SearchableSelect, Label, SectionCard } from '@/components/ui';
import type { MenuAuditItem, MenuAuditStatus } from '@/api/menu.api';
import { getMenuAudit } from '@/api/menu.api';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { isSystemSuperAdmin, extractRoleAndTenant } from '@/utils/rbac';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { formatDate } from '../../utils/layoutUtils';
import { Activity, ShieldAlert, CheckCircle, AlertTriangle, Info } from 'lucide-react';
const Loader = lazy(() => import('@/components/ui/Loader').then(m => ({
  default: m.Loader
})));
const menuAuditSearchSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
  order: z.string().optional()
});
export default function MenuAuditPage() {
  const {
    user
  } = useAuthStore();
  const {
    isAdmin
  } = useCapabilities();
  const navigate = useNavigate();
  const location = useLocation();
  const statusOptions = useMemo((): {
    value: '' | MenuAuditStatus | 'all';
    label: string;
  }[] => [{
    value: 'all',
    label: 'Semua Status'
  }, {
    value: 'valid_action_id',
    label: 'Valid (Action ID)'
  }, {
    value: 'legacy_mappable',
    label: 'Legacy Mappable'
  }, {
    value: 'unknown_string',
    label: 'Unknown String'
  }, {
    value: 'empty',
    label: 'Kosong (tanpa Action ID)'
  }], []);
  const sortOptions = useMemo(() => [{
    value: 'name',
    label: 'Nama Menu'
  }, {
    value: 'status',
    label: 'Status Audit'
  }, {
    value: 'path',
    label: 'Rute Path'
  }, {
    value: 'order',
    label: 'Urutan menu (default)'
  }, {
    value: 'required_capability',
    label: 'Required capability'
  }], []);
  const statusVariant = useCallback((status: MenuAuditStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'valid_action_id':
        return 'default';
      case 'legacy_mappable':
        return 'secondary';
      case 'unknown_string':
        return 'destructive';
      case 'empty':
        return 'outline';
      default:
        return 'default';
    }
  }, []);
  const statusLabel = useCallback((status: MenuAuditStatus): string => {
    switch (status) {
      case 'valid_action_id':
        return 'Valid';
      case 'legacy_mappable':
        return 'Legacy';
      case 'unknown_string':
        return 'Unknown';
      case 'empty':
        return 'Kosong';
      default:
        return status;
    }
  }, []);
  const [statusFilter, setStatusFilter] = useState<'all' | MenuAuditStatus | ''>(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('status');
    if (raw === 'all' || raw === 'legacy_mappable' || raw === 'unknown_string' || raw === 'empty' || raw === 'valid_action_id') {
      return raw as 'all' | MenuAuditStatus;
    }
    return 'legacy_mappable';
  });
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('q') ?? '';
  });
  const [sort, setSort] = useState(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('sort') || 'status';
    const allowed = ['order', 'status', 'name', 'path', 'required_capability'];
    return allowed.includes(raw) ? raw : 'status';
  });
  const [order, setOrder] = useState<'asc' | 'desc'>(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('order');
    return raw === 'desc' ? 'desc' : 'asc';
  });
  const isSuperadmin = useMemo(() => {
    if (!user) return false;
    const {
      role,
      tenantId
    } = extractRoleAndTenant(user);
    return isSystemSuperAdmin(role, tenantId);
  }, [user]);
  const queryParams = useMemo(() => {
    return {
      status: statusFilter || undefined,
      q: search.trim() || undefined,
      sort: sort || undefined,
      order
    };
  }, [statusFilter, search, sort, order]);
  const auditQuery = useQuery({
    queryKey: ['menu', 'audit', queryParams],
    queryFn: async () => {
      const res = await getMenuAudit(queryParams);
      return res.data as MenuAuditItem[];
    },
    enabled: isSuperadmin
  });
  useEffect(() => {
    menuAuditSearchSchema.safeParse({
      search,
      status: statusFilter,
      sort,
      order
    });
    const params = new URLSearchParams();
    if (statusFilter) {
      params.set('status', statusFilter);
    }
    if (search.trim()) {
      params.set('q', search.trim());
    }
    if (sort) {
      params.set('sort', sort);
    }
    if (order === 'desc') {
      params.set('order', 'desc');
    }
    const searchString = params.toString();
    navigate({
      pathname: location.pathname,
      search: searchString ? `?${searchString}` : ''
    }, {
      replace: true
    });
  }, [statusFilter, search, sort, order, navigate, location.pathname]);
  const statsList = useMemo(() => [{
    title: "Total Menu Diaudit",
    value: `${items.length} Menu`,
    icon: <Activity className="h-4 w-4 text-white" />,
    gradient: "from-blue-500 to-indigo-600",
    subtitle: "Cakupan menu sistem"
  }, {
    title: "Masalah Terdeteksi",
    value: `${problemCount} Isu`,
    icon: <AlertTriangle className="h-4 w-4 text-white" />,
    gradient: "from-red-500 to-orange-600",
    subtitle: "Perlu migrasi Action ID"
  }, {
    title: "Status Sehat",
    value: `${items.length - problemCount} Valid`,
    icon: <CheckCircle className="h-4 w-4 text-white" />,
    gradient: "from-emerald-500 to-teal-600",
    subtitle: "Sudah menggunakan Action ID"
  }], [items.length, problemCount]);
  if (!isSuperadmin) {
    return <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Akses dibatasi</AlertTitle>
          <AlertDescription>
            Halaman ini khusus untuk System Superadmin platform Absenta.
          </AlertDescription>
        </Alert>
      </div>;
  }
  const items = auditQuery.data || [];
  const isLoading = auditQuery.isLoading;
  const isError = auditQuery.isError;
  const problemCount = items.filter(i => i.status === 'legacy_mappable' || i.status === 'unknown_string').length;
  return <InfraErrorBoundary>
      <SuperAdminPageLayout title="Audit Capability Menu" description="Analisis kepatuhan rute menu terhadap sistem Capability Action ID terpusat." stats={statsList} hardeningModuleKey="menuauditpage" breadcrumbs={breadcrumbs} instruction={{
      title: 'Panduan Audit Menu',
      description: 'Gunakan halaman ini untuk memantau transisi menu dari sistem string legacy ke sistem Action ID yang lebih aman.',
      items: [{
        text: 'Status "Legacy" berarti menu masih bisa dipetakan namun disarankan migrasi.'
      }, {
        text: 'Status "Unknown String" menunjukkan capability yang tidak terdaftar di katalog.'
      }, {
        text: 'Gunakan "Suggested Action ID" sebagai referensi penggantian di database.'
      }]
    }}>
      <div className="space-y-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-500" />
              Filter & Parameter Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status Kepatuhan</Label>
                <SearchableSelect id="status-filter" value={statusFilter} onValueChange={v => setStatusFilter(v as MenuAuditStatus || 'all')} options={statusOptions} placeholder="Pilih status" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-input">Cari Spesifik</Label>
                <Input id="search-input" placeholder="Cari nama, path, atau capability..." value={search} onChange={e => setSearch(e.target.value)} className="rounded-xl h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort-select">Urutkan Data</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchableSelect id="sort-select" value={sort} onValueChange={v => setSort(v || 'status')} options={sortOptions} placeholder="Pilih kolom sort" />
                  </div>
                  <Button type="button" variant="outline" onClick={() => setOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="whitespace-nowrap rounded-xl px-4 font-bold border-slate-200">
                    {order === 'asc' ? 'A → Z' : 'Z → A'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <Info className="w-3.5 h-3.5" />
                Informasi Teknis
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Endpoint: <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-indigo-600 dark:text-indigo-400">GET /api/menu/audit</code>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
                Halaman ini bersifat <span className="text-amber-600 font-bold italic">Read-Only</span>. 
                Gunakan data Suggested Action ID untuk memperbarui kolom <code className="font-mono">required_capability</code> pada tabel <code className="font-mono">menus</code> di database.
              </p>
            </div>
          </CardContent>
        </Card>

        <SectionCard noPadding>
          {isLoading && <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader size="lg" />
              <p className="text-sm text-slate-500 font-medium animate-pulse">Menganalisis integritas menu...</p>
            </div>}

          {isError && <div className="p-8">
              <Alert variant="destructive" className="rounded-xl">
                <AlertTitle className="font-bold">Gagal memuat data audit</AlertTitle>
                <AlertDescription>
                  Terjadi kesalahan saat berkomunikasi dengan server. Pastikan sesi Anda masih aktif.
                </AlertDescription>
              </Alert>
            </div>}

          {!isLoading && !isError && items.length === 0 && <div className="flex flex-col items-center justify-center py-20 space-y-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-300">
                <ShieldAlert size={48} />
              </div>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Data Tidak Ditemukan</p>
              <p className="text-xs text-slate-400">Tidak ada menu yang sesuai dengan filter audit saat ini.</p>
            </div>}

          {!isLoading && !isError && items.length > 0 && <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Identitas Menu</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Rute Navigasi</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Capability Saat Ini</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Status Audit</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Saran Action ID</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                  {(items ?? [])?.map(item => <tr key={item.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors group">
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-500 transition-colors">
                            {item.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <code className="text-[11px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400 font-mono">
                          {item.path || '-'}
                        </code>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 font-mono">
                          {item.required_capability || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant={statusVariant(item.status)} className="text-[10px] font-black tracking-widest uppercase">
                          {statusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {item.suggested_action_id ? <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg border border-indigo-100/30 dark:border-indigo-800/30">
                            {item.suggested_action_id}
                          </span> : <span className="text-[10px] text-slate-300 font-bold italic">Otomatis Terpetakan</span>}
                      </TableCell>
                      <td className="px-6 py-4 text-right">
                        <Button type="button" size="sm" variant="ghost" onClick={() => navigate(`/management/menus?menuId=${encodeURIComponent(item.id)}`)} className="rounded-xl h-8 px-4 font-bold text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                          Detail Menu
                        </Button>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>}
        </SectionCard>
      </div>
    </SuperAdminPageLayout>
  </InfraErrorBoundary>;
}