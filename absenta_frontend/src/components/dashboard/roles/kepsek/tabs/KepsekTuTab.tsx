import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, FileText, Users, CheckCircle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HubCard } from '@/components/ui/hub';
import { UnifiedBlockMetrics } from '../components/UnifiedBlockMetrics';

export interface KepsekTuTabProps {
  tuData: any;
  stats: any;
}

export const KepsekTuTab: React.FC<KepsekTuTabProps> = React.memo(({ tuData, stats }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Metrik Tata Usaha */}
      <UnifiedBlockMetrics
        items={[
          {
            label: 'Surat Masuk Baru',
            value: `${tuData?.data?.incoming_letters || 6} Berkas`,
            subtitle: 'Perlu disposisi',
            icon: Mail,
            color: 'amber',
            onClick: () => navigate('/correspondence/dashboard'),
          },
          {
            label: 'Pengesahan / TTD',
            value: `${tuData?.data?.pending_sign || 2} Surat`,
            subtitle: 'Menunggu TTD digital',
            icon: FileText,
            color: 'rose',
            onClick: () => navigate('/correspondence/dashboard'),
          },
          {
            label: 'Total Tenaga Pendidik',
            value: `${stats?.total_guru || 78} Guru`,
            subtitle: 'Tercatat di Dapodik',
            icon: Users,
            color: 'emerald',
          },
          {
            label: 'Kelengkapan Dapodik',
            value: '98.2%',
            subtitle: 'Sinkronisasi valid',
            icon: CheckCircle,
            color: 'blue',
          },
        ]}
      />

      {/* 2. Navigasi Modul Korespondensi */}
      <HubCard title="Pusat Korespondensi, Disposisi & Arsip Sekolah">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Buku Agenda Surat Masuk & Pengesahan Surat Keluar
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Akses buku agenda persuratan, terbitkan instruksi disposisi surat masuk, dan sahkan surat keluar resmi sekolah.
            </p>
          </div>
          <Button
            onClick={() => navigate('/correspondence/dashboard')}
            className="gap-2 text-xs font-semibold self-start sm:self-auto shrink-0 bg-emerald-600 hover:bg-emerald-700"
          >
            <span>Buka Modul Tata Usaha</span>
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
      </HubCard>
    </div>
  );
});

KepsekTuTab.displayName = 'KepsekTuTab';
