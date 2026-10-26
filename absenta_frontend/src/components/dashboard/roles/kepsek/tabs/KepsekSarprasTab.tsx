import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Wrench, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HubCard } from '@/components/ui/hub';
import { UnifiedBlockMetrics } from '../components/UnifiedBlockMetrics';

export interface KepsekSarprasTabProps {
  sarprasData: any;
}

export const KepsekSarprasTab: React.FC<KepsekSarprasTabProps> = React.memo(({ sarprasData }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Metrik Sarpras */}
      <UnifiedBlockMetrics
        items={[
          {
            label: 'Total Aset KIB',
            value: `${sarprasData?.data?.total_assets || sarprasData?.total_assets || 0} Unit`,
            subtitle: 'Buku Induk KIB',
            icon: Building,
            color: 'emerald',
            onClick: () => navigate('/sarpras/inventory'),
          },
          {
            label: 'Ruangan & Lab',
            value: `${sarprasData?.data?.total_rooms || 32} Ruang`,
            subtitle: 'Siap pakai & baik',
            icon: Building,
            color: 'indigo',
          },
          {
            label: 'Peminjaman Aktif',
            value: `${sarprasData?.data?.active_loans || 0} Transaksi`,
            subtitle: 'Alat praktik lab',
            icon: Wrench,
            color: 'amber',
          },
          {
            label: 'Usulan Perbaikan',
            value: `${sarprasData?.data?.pending_repairs || 0} Usulan`,
            subtitle: 'Butuh persetujuan',
            icon: AlertTriangle,
            color: 'rose',
          },
        ]}
      />

      {/* 2. Navigasi Modul Sarpras */}
      <HubCard title="Inventarisasi & Manajemen Aset Sekolah">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Buku Induk Kartu Inventaris Barang (KIB A, B, C, D, E)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pantau laporan pengadaan aset, mutasi inventaris, dan verifikasi kondisi fisik sarana prasarana sekolah.
            </p>
          </div>
          <Button
            onClick={() => navigate('/sarpras/inventory')}
            className="gap-2 text-xs font-semibold self-start sm:self-auto shrink-0 bg-emerald-600 hover:bg-emerald-700"
          >
            <span>Buka Modul Sarpras</span>
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
      </HubCard>
    </div>
  );
});

KepsekSarprasTab.displayName = 'KepsekSarprasTab';
