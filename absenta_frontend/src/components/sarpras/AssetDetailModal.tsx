import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { Table } from '../ui/Table';
import type { Column } from '../ui/Table';
import { sarprasApi } from '../../api/sarpras.api';
import { Package, Calendar, User, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string | null;
}

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'PENDING': return 'bg-amber-100 text-amber-700';
    case 'APPROVED': return 'bg-blue-100 text-blue-700';
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
    case 'RETURNED': return 'bg-slate-100 text-slate-600';
    case 'REJECTED': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getKondisiColor = (cond: string) => {
  switch (cond) {
    case 'BAIK': return 'bg-green-100 text-green-700';
    case 'RUSAK': return 'bg-red-100 text-red-700';
    case 'PERBAIKAN': return 'bg-orange-100 text-orange-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

import { useAuthStore } from '../../store/authStore';

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ isOpen, onClose, assetId }) => {
  const { subscription } = useAuthStore();

  // Gating Logic
  const isLocked = subscription?.plan?.name === 'CORE_PLATFORM' || subscription?.Plan?.name === 'CORE_PLATFORM';
  const isEnabled = subscription !== undefined && !isLocked;

  // 1. Fetch Asset Detail
  const { data: assetData, isLoading: loadingAsset } = useQuery({
    queryKey: ['sarpras-asset-detail', assetId],
    queryFn: () => sarprasApi.getAssetById(assetId!),
    enabled: !!assetId && isOpen && isEnabled
  });

  // 2. Fetch Loans specifically for this asset
  const { data: loansData, isLoading: loadingLoans } = useQuery({
    queryKey: ['sarpras-asset-loans', assetId],
    queryFn: () => sarprasApi.getLoans({ asset_id: assetId, limit: 20 }),
    enabled: !!assetId && isOpen && isEnabled
  });

  // 3. Fetch Repairs specifically for this asset
  const { data: repairsData, isLoading: loadingRepairs } = useQuery({
    queryKey: ['sarpras-asset-repairs', assetId],
    queryFn: () => sarprasApi.getRepairs({ asset_id: assetId, limit: 20 }),
    enabled: !!assetId && isOpen && isEnabled
  });

  const asset = assetData?.data;
  const loans = loansData?.data?.list || [];
  const repairs = repairsData?.data?.list || [];

  const loanColumns: Column[] = useMemo(() => [
    {
      key: 'tanggal',
      label: 'Tanggal',
      render: (_, row: unknown) => {
        const r = row as { created_at: string };
        return new Date(r.created_at).toLocaleDateString();
      }
    },
    {
      key: 'peminjam',
      label: 'Peminjam',
      render: (_, row: unknown) => {
        const r = row as { Peminjam?: { full_name?: string } };
        return r.Peminjam?.full_name || '-';
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (status: unknown) => (
        <Badge className={getStatusBadgeColor(String(status))}>{String(status)}</Badge>
      )
    },
    {
      key: 'catatan',
      label: 'Catatan Rtn',
      render: (_, row: unknown) => {
        const r = row as { return_catatan?: string };
        return (
          <span className="text-xs text-slate-500 max-w-[150px] truncate block" title={r.return_catatan}>
            {r.return_catatan || '-'}
          </span>
        );
      }
    }
  ], []);

  const repairColumns: Column[] = useMemo(() => [
    {
      key: 'tanggal',
      label: 'Dilaporkan',
      render: (_, row: unknown) => {
        const r = row as { tanggal_mulai: string };
        return new Date(r.tanggal_mulai).toLocaleDateString();
      }
    },
    {
      key: 'teknisi',
      label: 'Penanggung Jawab',
      render: (val: unknown) => (val as string) || '-'
    },
    {
      key: 'status',
      label: 'Status',
      render: (status: unknown) => (
        <Badge className={String(status) === 'SELESAI' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
          {String(status)}
        </Badge>
      )
    },
    {
      key: 'deskripsi',
      label: 'Keluhan / Solusi',
      render: (val: unknown) => {
        const strVal = val as string;
        return (
          <span className="text-xs text-slate-500 max-w-[150px] truncate block" title={strVal}>
            {strVal || '-'}
          </span>
        );
      }
    }
  ], []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail & Riwayat Aset" size="lg">
      {!asset ? (
        <div className="py-12 flex justify-center">{loadingAsset ? 'Memuat data...' : 'Aset tidak ditemukan'}</div>
      ) : (
        <div className="space-y-6">
          
          {/* Header Info Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-start gap-4 border border-slate-100 dark:border-slate-700">
            <div className="h-14 w-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 flex-shrink-0">
               <Package size={28} />
            </div>
            <div className="flex-1">
               <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{asset.nama}</h3>
               <p className="text-sm text-slate-500 font-mono mb-2">S/N: {asset.serial_number || 'Tidak Ada SN'} | Kode: {asset.kode}</p>
               <div className="flex gap-2 flex-wrap text-sm">
                  <Badge variant="outline" className="text-indigo-600 bg-indigo-50 border-indigo-200">{asset.Category?.nama || 'Tanpa Kategori'}</Badge>
                  <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-200">{asset.Location?.nama || 'Tanpa Lokasi'}</Badge>
                  <Badge className={getKondisiColor(asset.kondisi)}>{asset.kondisi}</Badge>
               </div>
            </div>
          </div>

          <Tabs defaultValue="info">
            <TabsList className="mb-4">
              <TabsTrigger value="info">Informasi Umum</TabsTrigger>
              <TabsTrigger value="loans">Riwayat Peminjaman</TabsTrigger>
              <TabsTrigger value="repairs">Riwayat Perbaikan</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <div className="grid grid-cols-2 gap-4 text-sm bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                 <div>
                    <p className="text-slate-500 mb-1">Merek / Brand</p>
                    <p className="font-semibold">{asset.brand || '-'}</p>
                 </div>
                 <div>
                    <p className="text-slate-500 mb-1">Tanggal Pembelian</p>
                    <p className="font-semibold">{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '-'}</p>
                 </div>
                 <div>
                    <p className="text-slate-500 mb-1">Total Unit (Jumlah)</p>
                    <p className="font-semibold">{asset.jumlah} Item</p>
                 </div>
                 <div>
                    <p className="text-slate-500 mb-1">Ketersediaan Sisa Tersedia</p>
                    {/* Approximation: jumlah minus loaned active */}
                    <p className="font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={14} /> Tersedia
                    </p>
                 </div>
                 <div className="col-span-2 mt-2">
                    <p className="text-slate-500 mb-1">Deskripsi Tambahan</p>
                    <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded text-slate-700 dark:text-slate-300">
                      {asset.deskripsi || 'Tidak ada deskripsi.'}
                    </p>
                 </div>
              </div>
            </TabsContent>

            <TabsContent value="loans">
              <Table 
                 columns={loanColumns} 
                 data={loans} 
                 loading={loadingLoans}
                 emptyMessage="Belum ada riwayat peminjaman untuk aset ini."
                 className="text-sm"
              />
            </TabsContent>

            <TabsContent value="repairs">
              <Table 
                 columns={repairColumns} 
                 data={repairs} 
                 loading={loadingRepairs}
                 emptyMessage="Belum ada riwayat kerusakan/perbaikan."
                 className="text-sm"
              />
            </TabsContent>

          </Tabs>
        </div>
      )}
    </Modal>
  );
};
