import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Building, Award, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HubCard } from '@/components/ui/hub';
import { UnifiedBlockMetrics } from '../components/UnifiedBlockMetrics';

export interface KepsekHubinTabProps {
  hubinData: any;
  bkkData: any;
}

export const KepsekHubinTab: React.FC<KepsekHubinTabProps> = React.memo(({ hubinData, bkkData }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Metrik Hubin */}
      <UnifiedBlockMetrics
        items={[
          {
            label: 'Siswa PKL Aktif',
            value: `${hubinData?.data?.active_students || hubinData?.total_pkl || 0} Siswa`,
            subtitle: 'Magang di industri',
            icon: Briefcase,
            color: 'teal',
            onClick: () => navigate('/hubin/dashboard'),
          },
          {
            label: 'Mitra Industri (DUDI)',
            value: `${hubinData?.data?.total_mitra || 48} PT`,
            subtitle: 'MoU aktif berjalan',
            icon: Building,
            color: 'indigo',
          },
          {
            label: 'Lowongan Kerja BKK',
            value: `${bkkData?.data?.active_jobs || 12} Loker`,
            subtitle: 'Tersedia untuk alumni',
            icon: Award,
            color: 'cyan',
          },
          {
            label: 'Tracer Study',
            value: '84.5%',
            subtitle: 'Terserap kerja/usaha',
            icon: TrendingUp,
            color: 'purple',
          },
        ]}
      />

      {/* 2. Navigasi Modul Hubin */}
      <HubCard title="Portal Hubungan Industri & Praktik Kerja Lapangan">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Kemitraan Dunia Usaha & Dunia Industri (DU/DI)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Kelola nota kesepahaman MoU kemitraan, pantau monitoring pembimbing PKL, dan serapan lulusan sekolah.
            </p>
          </div>
          <Button
            onClick={() => navigate('/hubin/dashboard')}
            className="gap-2 text-xs font-semibold self-start sm:self-auto shrink-0 bg-emerald-600 hover:bg-emerald-700"
          >
            <span>Buka Modul Hubin</span>
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
      </HubCard>
    </div>
  );
});

KepsekHubinTab.displayName = 'KepsekHubinTab';
