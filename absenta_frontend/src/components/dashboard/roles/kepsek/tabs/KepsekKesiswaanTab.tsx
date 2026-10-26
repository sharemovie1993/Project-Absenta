import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Scale, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CompactSectionCard } from '../../shared/CompactSectionCard';
import { CareSpotlightSection, type CareStudentItem, type LeaderboardItem } from '@/components/kesiswaan/monitoring/CareSpotlightSection';
import { UnifiedBlockMetrics } from '../components/UnifiedBlockMetrics';

export interface KepsekKesiswaanTabProps {
  violationData: any;
  pelanggaranData: any;
  escalations: any[];
  careStudents: CareStudentItem[];
  studentLeaderboard: LeaderboardItem[];
  isLoadingStudentLb: boolean;
}

export const KepsekKesiswaanTab: React.FC<KepsekKesiswaanTabProps> = React.memo(({
  violationData,
  pelanggaranData,
  escalations,
  careStudents,
  studentLeaderboard,
  isLoadingStudentLb,
}) => {
  const navigate = useNavigate();
  const [spotlightTab, setSpotlightTab] = useState<'violations' | 'achievements'>('violations');

  const pelanggaranCount = Array.isArray(pelanggaranData?.data)
    ? pelanggaranData.data.length
    : pelanggaranData?.data?.list?.length || 0;

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Metrik Kesiswaan */}
      <UnifiedBlockMetrics
        columns={3}
        items={[
          {
            label: 'Pelanggaran Hari Ini',
            value: `${violationData?.data?.total_today || 0} Kasus`,
            subtitle: `Akumulasi: ${violationData?.data?.points_today || 0} Poin`,
            icon: ShieldAlert,
            color: 'rose',
          },
          {
            label: 'Catatan Tata Tertib',
            value: `${pelanggaranCount} Kasus`,
            subtitle: 'Rekapitulasi aktif',
            icon: Scale,
            color: 'amber',
          },
          {
            label: 'Eskalasi Prioritas',
            value: `${escalations.length} Kasus`,
            subtitle: 'Butuh tindakan lanjut',
            icon: AlertTriangle,
            color: 'indigo',
          },
        ]}
      />

      {/* 2. Care Spotlight & Apresiasi Prestasi Siswa */}
      <CareSpotlightSection
        spotlightTab={spotlightTab}
        setSpotlightTab={setSpotlightTab}
        careStudents={careStudents}
        leaderboardData={studentLeaderboard}
        isLoading={false}
        isLoadingLeaderboard={isLoadingStudentLb}
        onNavigateToPelanggaran={() => navigate('/kesiswaan/pelanggaran')}
      />

      {/* 3. Daftar Eskalasi Kasus Kesiswaan Mendesak */}
      <CompactSectionCard title="Daftar Eskalasi Kasus Kesiswaan Mendesak" icon={ShieldAlert} iconColor="rose">
        <div className="space-y-2.5">
          {escalations.length > 0 ? (
            escalations.map((item: any) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {item.source} • {item.date || 'Hari ini'}
                  </p>
                </div>
                <Badge
                  variant={item.priority === 'High' ? 'destructive' : 'warning'}
                  className="text-[9px] uppercase font-bold"
                >
                  {item.priority}
                </Badge>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs font-medium italic">
              Tidak ada eskalasi kasus kesiswaan mendesak hari ini. Seluruh tata tertib terkendali.
            </div>
          )}
        </div>
      </CompactSectionCard>
    </div>
  );
});

KepsekKesiswaanTab.displayName = 'KepsekKesiswaanTab';
