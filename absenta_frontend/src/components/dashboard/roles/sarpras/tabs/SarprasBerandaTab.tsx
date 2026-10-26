import React, { useMemo, useState, lazy, Suspense } from 'react';
import {
  Package,
  CheckCircle2,
  AlertCircle,
  History,
  Layers,
  ArrowLeftRight,
  Wrench,
  Printer,
  Plus,
  ScanLine,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HubCard,
  HubBentoGrid,
  HubActionGrid,
  type HubBentoCell,
  type HubActionItem,
} from '@/components/ui/hub';
import { Modal } from '@/components/ui/Modal';
import {
  RecentTransactionsList,
  UnreturnedLoansList,
  MaintenanceAlertsList,
  type LoanRecord,
  type RepairRecord,
} from '@/components/sarpras/dashboard/SarprasDashboardComponents';
import type { SarprasStats, SarprasTabId } from '../types';

// Lazy load modals for zero TBT
const QuickScanLoanModal = lazy(() =>
  import('@/components/sarpras/QuickScanLoanModal').then((m) => ({ default: m.QuickScanLoanModal }))
);
const AssetForm = lazy(() => import('@/components/sarpras/AssetForm'));

export interface SarprasBerandaTabProps {
  stats: SarprasStats | null;
  loans: LoanRecord[];
  repairs: RepairRecord[];
  loading: boolean;
  onTabSelect: (tabId: SarprasTabId) => void;
}

export const SarprasBerandaTab: React.FC<SarprasBerandaTabProps> = React.memo(({
  stats,
  loans,
  repairs,
  loading,
  onTabSelect,
}) => {
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);

  // 1. Bento Grid 2x2 Metrik Utama (Shopee-Grade Hairline Dividers)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'total',
        title: 'Total Barang',
        value: `${stats?.total ?? 0} Item`,
        subtext: 'Seluruh Aset Terdaftar',
        icon: Package,
        iconColorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
        onClick: () => onTabSelect('inventaris'),
      },
      {
        id: 'available',
        title: 'Aset Tersedia',
        value: `${stats?.available ?? 0} Siap`,
        subtext: 'Bebas Dipinjam / Pakai',
        icon: CheckCircle2,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => onTabSelect('inventaris'),
      },
      {
        id: 'borrowed',
        title: 'Sedang Dipinjam',
        value: `${stats?.borrowed ?? 0} Aktif`,
        subtext: 'Dalam Penggunaan',
        icon: History,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        badge: (stats?.borrowed ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
            {stats?.borrowed}
          </span>
        ) : undefined,
        onClick: () => onTabSelect('peminjaman'),
      },
      {
        id: 'repair',
        title: 'Kondisi Rusak',
        value: `${stats?.repair ?? 0} Unit`,
        subtext: 'Perlu Perbaikan / Servis',
        icon: AlertCircle,
        iconColorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
        badge: (stats?.repair ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
            {stats?.repair}
          </span>
        ) : undefined,
        onClick: () => onTabSelect('perbaikan'),
      },
    ],
    [stats, onTabSelect]
  );

  // 2. Pintasan Aksi Operasional (Shopee-Grade Headerless Quick Action Slider)
  const actionItems: HubActionItem[] = useMemo(
    () => [
      {
        id: 'inventaris',
        label: 'Inventaris',
        icon: Layers,
        iconColorClass: 'text-teal-600 dark:text-teal-400',
        onClick: () => onTabSelect('inventaris'),
      },
      {
        id: 'peminjaman',
        label: 'Peminjaman',
        icon: ArrowLeftRight,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        badge: (stats?.borrowed ?? 0) > 0 ? stats?.borrowed : undefined,
        onClick: () => onTabSelect('peminjaman'),
      },
      {
        id: 'perbaikan',
        label: 'Servis & Servis',
        icon: Wrench,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        badge: (stats?.repair ?? 0) > 0 ? stats?.repair : undefined,
        onClick: () => onTabSelect('perbaikan'),
      },
      {
        id: 'katalog',
        label: 'Katalog Aset',
        icon: Package,
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        onClick: () => onTabSelect('katalog'),
      },
      {
        id: 'rekap',
        label: 'Cetak DIR / Berkas',
        icon: Printer,
        iconColorClass: 'text-purple-600 dark:text-purple-400',
        onClick: () => onTabSelect('rekap'),
      },
      {
        id: 'scan_pinjam',
        label: 'Scan Pinjam',
        icon: ScanLine,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => setScanModalOpen(true),
      },
      {
        id: 'tambah_aset',
        label: 'Tambah Aset',
        icon: Plus,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        onClick: () => setAssetModalOpen(true),
      },
    ],
    [stats?.borrowed, stats?.repair, onTabSelect]
  );

  return (
    <div className="space-y-4">
      {/* === ZONE 1: METRIK UTAMA (BENTO GRID 2x2) === */}
      <HubCard noPadding>
        <HubBentoGrid cells={bentoCells} columns={4} />
      </HubCard>

      {/* === ZONE 2: SHOPEE-GRADE QUICK ACTION SLIDER === */}
      <HubCard bodyClassName="py-2.5 sm:py-3 px-2 sm:px-3">
        <HubActionGrid
          items={actionItems}
          columns={4}
          variant="slider"
          iconSize="md"
          labelSize="xs"
        />
      </HubCard>

      {/* === ZONE 3: TRANSAKSI PEMINJAMAN TERKINI & BELUM KEMBALI === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <RecentTransactionsList loans={loans} />
        <UnreturnedLoansList loans={loans} />
      </div>

      {/* === ZONE 4: PERINGATAN PEMELIHARAAN & STATUS SISTEM === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2">
          <MaintenanceAlertsList repairs={repairs} />
        </div>
        <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Sistem Gudang Online</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Pencatatan sirkulasi inventaris dan barcode scanner aktif secara real-time.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="font-semibold block text-slate-700 dark:text-slate-300 mb-0.5">Yurisdiksi Unit:</span>
            <span>{stats?.jurisdiction?.name || 'Unit Utama Sarana Prasarana Sekolah'}</span>
          </div>

          <button
            type="button"
            onClick={() => onTabSelect('inventaris')}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer text-center"
          >
            Buka Gudang Inventaris →
          </button>
        </div>
      </div>

      {/* Modal Quick Scan Peminjaman */}
      <Suspense fallback={null}>
        <QuickScanLoanModal
          isOpen={scanModalOpen}
          onClose={() => setScanModalOpen(false)}
        />
      </Suspense>

      {/* Modal Tambah Aset Baru */}
      <Suspense fallback={null}>
        <Modal
          isOpen={assetModalOpen}
          onClose={() => setAssetModalOpen(false)}
          title="Tambah Aset Baru"
          className="!max-w-4xl"
        >
          <AssetForm
            onSuccess={() => setAssetModalOpen(false)}
            onCancel={() => setAssetModalOpen(false)}
          />
        </Modal>
      </Suspense>
    </div>
  );
});
