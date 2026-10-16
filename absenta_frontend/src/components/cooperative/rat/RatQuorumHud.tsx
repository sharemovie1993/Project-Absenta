import React from 'react';
import SectionCard from '../../ui/SectionCard';
import Button from '../../ui/Button';
import { AnalyticsCardBase } from '../../ui/AnalyticsCard';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  Coins,
  Gavel,
  RefreshCw,
} from 'lucide-react';
import type { CoopMeetingItem } from '../../../pages/cooperative/RatMeetingPage';

export interface RatQuorumHudProps {
  currentMeeting: CoopMeetingItem;
  quorumData: {
    totalEligibleMembers: number;
    quorumTarget: number;
    actualAttendance: number;
    percentage: number;
    isQuorumReached: boolean;
  } | null;
  isLoading: boolean;
  myAttendance?: { hasAttended: boolean } | null;
  canManage: boolean;
  onSelfCheckIn?: () => void;
  isCheckingIn?: boolean;
  onLifecycleAdvance: (newStatus: string, actionLabel: string) => void;
  isAdvancingLifecycle: boolean;
  onOpenClosureWizard?: () => void;
  onResyncQuorum?: () => void;
  isResyncingQuorum?: boolean;
}

export const RatQuorumHud: React.FC<RatQuorumHudProps> = ({
  currentMeeting,
  quorumData,
  isLoading,
  canManage,
  onLifecycleAdvance,
  isAdvancingLifecycle,
  onOpenClosureWizard,
  onResyncQuorum,
  isResyncingQuorum,
}) => {
  const managerLifecycleActions = canManage ? (
    <div className="flex flex-wrap items-center gap-2">
      {(currentMeeting.status === 'DRAFT' || currentMeeting.status === 'SCHEDULED' || !currentMeeting.status) && (
        <Button
          type="button"
          size="toolbar"
          variant="toolbarPrimary"
          onClick={() =>
            onLifecycleAdvance(
              'REGISTRATION_OPEN',
              'Buka Registrasi'
            )
          }
          isLoading={isAdvancingLifecycle}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
        >
          <Play className="w-3.5 h-3.5 mr-1" />
          Buka Registrasi
        </Button>
      )}
      {(currentMeeting.status === 'REGISTRATION_OPEN' || currentMeeting.status === 'QUORUM_REACHED') && (
        <Button
          type="button"
          size="toolbar"
          variant="toolbarPrimary"
          onClick={() =>
            onLifecycleAdvance('IN_SESSION', 'Mulai Sidang')
          }
          isLoading={isAdvancingLifecycle}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
        >
          <Play className="w-3.5 h-3.5 mr-1" />
          Mulai Sidang
        </Button>
      )}
      {currentMeeting.status === 'IN_SESSION' && (
        <Button
          type="button"
          size="toolbar"
          variant="toolbarDanger"
          onClick={() =>
            onOpenClosureWizard
              ? onOpenClosureWizard()
              : onLifecycleAdvance('CLOSED', 'Tutup Sidang')
          }
          isLoading={isAdvancingLifecycle}
        >
          <Gavel className="w-3.5 h-3.5 mr-1" />
          Tutup Sidang
        </Button>
      )}
      {currentMeeting.status === 'CLOSED' && onOpenClosureWizard && (
        <Button
          type="button"
          size="toolbar"
          variant="toolbarPrimary"
          onClick={onOpenClosureWizard}
        >
          <Coins className="w-3.5 h-3.5 mr-1" />
          Distribusi SHU
        </Button>
      )}
      {onResyncQuorum && currentMeeting.status !== 'CLOSED' && currentMeeting.status !== 'RATIFIED' && (
        <Button
          type="button"
          size="toolbar"
          variant="toolbarGhost"
          onClick={onResyncQuorum}
          isLoading={isResyncingQuorum}
          title="Sinkronkan ulang basis kuorum dengan jumlah anggota aktif terkini di database"
          className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Sinkron Kuorum
        </Button>
      )}
    </div>
  ) : null;

  return (
    <SectionCard
      title="Kuorum Sidang"
      actions={managerLifecycleActions}
      fullWidth={true}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCardBase
          title="Total Anggota"
          value={
            quorumData
              ? `${quorumData.totalEligibleMembers} Orang`
              : `${currentMeeting.totalEligibleMembers} Orang`
          }
          icon={<Users className="w-5 h-5 text-white/90" />}
          gradient="from-blue-600 to-indigo-700"
          variant="compact-premium"
          isLoading={isLoading}
        />
        <AnalyticsCardBase
          title="Target Kuorum"
          value={
            quorumData
              ? `${quorumData.quorumTarget} Orang`
              : `${currentMeeting.quorumTarget} Orang`
          }
          icon={<ShieldCheck className="w-5 h-5 text-white/90" />}
          gradient="from-amber-500 to-orange-600"
          variant="compact-premium"
          isLoading={isLoading}
        />
        <AnalyticsCardBase
          title="Kehadiran"
          value={
            quorumData
              ? `${quorumData.actualAttendance} Orang (${quorumData.percentage}%)`
              : `${currentMeeting.actualAttendance} Orang`
          }
          icon={<CheckCircle2 className="w-5 h-5 text-white/90" />}
          subtitle={
            quorumData?.isQuorumReached
              ? 'Kuorum Sah'
              : 'Belum Kuorum'
          }
          gradient={
            quorumData?.isQuorumReached
              ? 'from-emerald-600 to-teal-700'
              : 'from-amber-600 to-orange-700'
          }
          variant="compact-premium"
          isLoading={isLoading}
        />
        <AnalyticsCardBase
          title="Status Sidang"
          value={
            currentMeeting.status === 'IN_SESSION'
              ? 'Sedang Bersidang'
              : currentMeeting.status === 'REGISTRATION_OPEN'
              ? 'Registrasi Dibuka'
              : currentMeeting.status === 'CLOSED'
              ? 'Sidang Selesai'
              : 'Draf Persiapan'
          }
          icon={<Clock className="w-5 h-5 text-white/90" />}
          gradient="from-purple-600 to-violet-800"
          variant="compact-premium"
          isLoading={isLoading}
        />
      </div>
    </SectionCard>
  );
};
export default RatQuorumHud;
