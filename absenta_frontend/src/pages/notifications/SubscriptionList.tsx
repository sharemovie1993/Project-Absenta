import React, { useEffect, useState } from 'react';
import { Bell, Search, RefreshCw } from 'lucide-react';
import { Button, Card, SectionHeader, Input, Table, Loader } from '../../components/ui';
import { getSubscriptions } from '../../api/notifications.api';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useDebounce } from '../../hooks/useDebounce';

const SubscriptionList: React.FC = () => {
  const { isLoading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await getSubscriptions({ page, limit: 10, search: debouncedSearch });
      if (res.success) {
        setData(res.data);
        setMeta(res.meta);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [page, debouncedSearch]);

  const columns = [
    {
      key: 'OrangTua',
      label: 'Orang Tua',
      render: (_: any, row: any) => (
        <div>
            <div className="font-medium">{row.OrangTua?.nama || '-'}</div>
            <div className="text-xs text-gray-500">{row.OrangTua?.no_hp || '-'}</div>
        </div>
      )
    },
    {
      key: 'endpoint',
      label: 'Endpoint',
      render: (val: string) => (
        <div className="max-w-[200px] truncate text-xs" title={val}>{val}</div>
      )
    },
    {
      key: 'user_agent',
      label: 'Device',
      render: (val: string) => <div className="text-xs truncate max-w-[150px]" title={val}>{val || '-'}</div>
    },
    {
      key: 'updated_at',
      label: 'Last Active',
      render: (val: string) => <div className="text-xs">{formatDate(val)}</div>
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Push Subscriptions"
        subtitle="Daftar perangkat orang tua yang terdaftar untuk notifikasi push."
        icon={<Bell className="w-6 h-6" />}
      >
        <Button variant="outline" size="sm" onClick={fetchSubscriptions} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </SectionHeader>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="w-64">
            <Input
              placeholder="Cari nama atau endpoint..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>
          <div className="text-sm text-gray-500">Total: {meta.total}</div>
        </div>

        <Table columns={columns} data={data} loading={loading} emptyMessage="Belum ada data subscription." />

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SubscriptionList;
