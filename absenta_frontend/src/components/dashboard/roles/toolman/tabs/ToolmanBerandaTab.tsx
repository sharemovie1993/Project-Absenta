import React, { useMemo } from 'react';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  Plus,
  Clock,
  ScanLine,
  Printer,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import {
  HubCard,
  HubBentoGrid,
  HubActionGrid,
  type HubBentoCell,
  type HubActionItem,
} from '@/components/ui/hub';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ToolmanTabId, ToolmanStats } from '../types';

export interface ToolmanBerandaTabProps {
  stats: ToolmanStats | null;
  loading: boolean;
  onTabSelect: (tabId: ToolmanTabId) => void;
  onOpenQuickScan?: () => void;
}

export const ToolmanBerandaTab: React.FC<ToolmanBerandaTabProps> = React.memo(({
  stats,
  loading,
  onTabSelect,
  onOpenQuickScan,
}) => {
  // 1. Bento Grid Cells (Executive KPI 2x2 or 4x1)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'toolsBorrowed',
        title: 'Alat Dipinjam',
        value: `${stats?.tools_borrowed ?? 0} Unit`,
        subtext: 'Sedang Di Luar Lab',
        icon: Wrench,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        badge: (stats?.tools_borrowed ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
            Keluar
          </span>
        ) : undefined,
        onClick: () => onTabSelect('pinjam'),
      },
      {
        id: 'toolsAvailable',
        title: 'Siap Digunakan',
        value: `${stats?.tools_available ?? 0} Unit`,
        subtext: 'Tersedia di Rak Lab',
        icon: CheckCircle2,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => onTabSelect('alat'),
      },
      {
        id: 'damagedReports',
        title: 'Laporan Kerusakan',
        value: `${stats?.damaged_reports ?? 0} Laporan`,
        subtext: (stats?.damaged_reports ?? 0) > 0 ? 'Butuh Servis/Ganti' : 'Semua Berfungsi Baik',
        icon: AlertTriangle,
        iconColorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
        badge: (stats?.damaged_reports ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
            Rusak
          </span>
        ) : undefined,
        onClick: () => onTabSelect('servis'),
      },
      {
        id: 'totalTools',
        title: 'Total Perkakas',
        value: `${stats?.total_tools ?? 0} Item`,
        subtext: 'Katalog Alat Bengkel',
        icon: Layers,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        onClick: () => onTabSelect('alat'),
      },
    ],
    [stats, onTabSelect]
  );

  // 2. Shopee Quick Action Slider
  const actionItems: HubActionItem[] = useMemo(
    () => [
      {
        id: 'pinjam',
        label: 'Peminjaman Alat',
        icon: Wrench,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        onClick: () => onTabSelect('pinjam'),
      },
      {
        id: 'servis',
        label: 'Servis & Perbaikan',
        icon: AlertTriangle,
        iconColorClass: 'text-rose-600 dark:text-rose-400',
        onClick: () => onTabSelect('servis'),
      },
      {
        id: 'alat',
        label: 'Inventaris Lab',
        icon: Layers,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => onTabSelect('alat'),
      },
      {
        id: 'rekap',
        label: 'Cetak Dokumen',
        icon: Printer,
        iconColorClass: 'text-slate-600 dark:text-slate-400',
        onClick: () => onTabSelect('rekap'),
      },
      ...(onOpenQuickScan
        ? [
            {
              id: 'scan',
              label: 'Scan Barcode',
              icon: ScanLine,
              iconColorClass: 'text-indigo-600 dark:text-indigo-400',
              onClick: onOpenQuickScan,
            },
          ]
        : []),
    ],
    [onTabSelect, onOpenQuickScan]
  );

  const activeLoans = stats?.active_loans || [];
  const pendingMaintenance = stats?.pending_maintenance || [];

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Bento Grid Executive KPI */}
      <HubBentoGrid cells={bentoCells} columns={4} />

      {/* 2. Shopee Quick Action Slider */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3 px-2 shadow-xs">
        <HubActionGrid items={actionItems} variant="slider" />
      </div>

      {/* 3. Feeds: Peminjaman Aktif & Status Perawatan Mesin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Peminjaman Alat Aktif */}
        <HubCard
          title="Peminjaman Alat Praktik Aktif"
          headerAction={
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => onTabSelect('pinjam')}
              className="text-xs font-semibold"
            >
              Semua Peminjaman
              <ChevronRight size={14} className="ml-1" />
            </Button>
          }
        >
          <div className="space-y-2.5">
            {activeLoans.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-500 mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Seluruh Alat di Laboratorium
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tidak ada sirkulasi peminjaman perkakas yang sedang aktif saat ini.
                </p>
              </div>
            ) : (
              activeLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {loan.nama_alat}
                      </h4>
                      {loan.kode_alat && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          [{loan.kode_alat}]
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                      Peminjam: {loan.nama_peminjam}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      Waktu Pinjam: {loan.tanggal_pinjam ? new Date(loan.tanggal_pinjam).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase font-bold shrink-0">
                    {loan.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </HubCard>

        {/* Status Pemeliharaan & Kerusakan Alat */}
        <HubCard
          title="Status Servis & Perawatan Mesin"
          headerAction={
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => onTabSelect('servis')}
              className="text-xs font-semibold"
            >
              Semua Servis
              <ChevronRight size={14} className="ml-1" />
            </Button>
          }
        >
          <div className="space-y-2.5">
            {pendingMaintenance.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-500 mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mesin & Perkakas Siap Operasional
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Seluruh alat laboratorium dalam kondisi prima dan terawat dengan baik.
                </p>
              </div>
            ) : (
              pendingMaintenance.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {m.nama_alat}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                      Teknisi: {m.teknisi || 'Dalam Penanganan Toolman'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      Mulai: {m.tanggal_mulai ? new Date(m.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                  <Badge variant="warning" className="text-[9px] uppercase font-bold shrink-0">
                    {m.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </HubCard>
      </div>
    </div>
  );
});

ToolmanBerandaTab.displayName = 'ToolmanBerandaTab';
