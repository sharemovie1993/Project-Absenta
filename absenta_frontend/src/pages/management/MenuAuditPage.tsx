import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, TableCell, Loader, Alert, AlertTitle, AlertDescription, SearchableSelect, Label } from '@/components/ui';
import type { MenuAuditItem, MenuAuditStatus } from '@/api/menu.api';
import { getMenuAudit } from '@/api/menu.api';
import { useAuthStore } from '@/store/authStore';
import { isSystemSuperAdmin, extractRoleAndTenant } from '@/utils/rbac';

const statusOptions: { value: '' | MenuAuditStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'legacy_mappable', label: 'Legacy bisa dimapping' },
  { value: 'unknown_string', label: 'String tidak dikenal' },
  { value: 'empty', label: 'Kosong (tanpa Action ID)' },
  { value: 'valid_action_id', label: 'Sudah Action ID valid' }
];

const sortOptions = [
  { value: 'order', label: 'Urutan menu (default)' },
  { value: 'status', label: 'Status audit' },
  { value: 'name', label: 'Nama menu' },
  { value: 'path', label: 'Path' },
  { value: 'required_capability', label: 'Required capability' }
];

function statusVariant(status: MenuAuditStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'legacy_mappable') return 'secondary';
  if (status === 'unknown_string') return 'destructive';
  if (status === 'empty') return 'outline';
  return 'default';
}

function statusLabel(status: MenuAuditStatus): string {
  if (status === 'legacy_mappable') return 'Legacy bisa dimapping';
  if (status === 'unknown_string') return 'String tidak dikenal';
  if (status === 'empty') return 'Kosong';
  return 'Valid';
}

export default function MenuAuditPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [statusFilter, setStatusFilter] = useState<'all' | MenuAuditStatus | ''>(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('status');
    if (
      raw === 'all' ||
      raw === 'legacy_mappable' ||
      raw === 'unknown_string' ||
      raw === 'empty' ||
      raw === 'valid_action_id'
    ) {
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
    const { role, tenantId } = extractRoleAndTenant(user);
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
    navigate(
      {
        pathname: location.pathname,
        search: searchString ? `?${searchString}` : ''
      },
      { replace: true }
    );
  }, [statusFilter, search, sort, order, navigate, location.pathname]);

  if (!isSuperadmin) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Akses dibatasi</AlertTitle>
          <AlertDescription>
            Halaman ini hanya dapat diakses oleh SUPERADMIN sistem.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const items = auditQuery.data || [];
  const isLoading = auditQuery.isLoading;
  const isError = auditQuery.isError;

  const problemCount = items.filter((i) => i.status === 'legacy_mappable' || i.status === 'unknown_string').length;

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Audit Menu & Required Capability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <SearchableSelect
                value={statusFilter}
                onValueChange={(v) => setStatusFilter((v as any) || 'all')}
                options={statusOptions}
                placeholder="Pilih status"
              />
            </div>
            <div className="space-y-1">
              <Label>Cari</Label>
              <Input
                placeholder="Cari nama, path, atau capability..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Urutkan</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  value={sort}
                  onValueChange={(v) => setSort(v || 'status')}
                  options={sortOptions}
                  placeholder="Pilih kolom sort"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="whitespace-nowrap"
                >
                  {order === 'asc' ? 'A → Z' : 'Z → A'}
                </Button>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>
              Endpoint backend: <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px]">GET /api/menu/audit</code>
            </p>
            <p>
              Data hanya read-only. Gunakan hasil ini untuk memutuskan mana yang perlu dimigrasi ke Action ID
              atau dibersihkan secara manual.
            </p>
            {problemCount > 0 && (
              <p>
                Ditemukan <span className="font-semibold">{problemCount}</span> menu dengan status{' '}
                <span className="font-semibold">legacy_mappable</span> atau{' '}
                <span className="font-semibold">unknown_string</span>.
              </p>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader />
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertTitle>Gagal memuat data</AlertTitle>
              <AlertDescription>
                Terjadi kesalahan saat memuat data audit menu. Coba muat ulang halaman.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="text-sm text-gray-500">
              Tidak ada data audit yang ditemukan untuk filter saat ini.
            </div>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Nama</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Path</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Required Capability</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Suggested Action ID</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-200">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800 text-sm">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-[11px] text-gray-500">
                            {item.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-700 dark:text-gray-200">
                          {item.path || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-gray-800 dark:text-gray-100">
                          {item.required_capability || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)}>
                          {statusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.suggested_action_id ? (
                          <span className="text-xs font-mono text-gray-800 dark:text-gray-100">
                            {item.suggested_action_id}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/management/menus?menuId=${encodeURIComponent(item.id)}`)}
                        >
                          Kelola
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
