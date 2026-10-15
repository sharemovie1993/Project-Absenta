import React from 'react';
import SectionCard from '../../ui/SectionCard';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import AnalyticsCardBase from '../../ui/analytics/AnalyticsCardBase';
import { formatDate } from '../../../utils/dateUtils';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Check,
  Play,
  Lock,
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
  myAttendance: { hasAttended: boolean } | null;
  canManage: boolean;
  onSelfCheckIn: () => void;
  isCheckingIn: boolean;
  onLifecycleAdvance: (newStatus: string, actionLabel: string) => void;
  isAdvancingLifecycle: boolean;
}

export const RatQuorumHud: React.FC<RatQuorumHudProps> = ({
  currentMeeting,
  quorumData,
  isLoading,
  myAttendance,
  canManage,
  onSelfCheckIn,
  isCheckingIn,
  onLifecycleAdvance,
  isAdvancingLifecycle,
}) => {
  return (
    <SectionCard title="Pemantauan Kuorum Sah Rapat Anggota" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCardBase
          title="Total Anggota Aktif"
          value={
            quorumData
              ? `${quorumData.totalEligibleMembers} Orang`
              : `${currentMeeting.totalEligibleMembers} Orang`
          }
          icon={<Users className="w-5 h-5 text-blue-500" />}
          subtitle="Basis penentu kuorum"
          variant="compact-premium"
          mobileCompact={true}
          isLoading={isLoading}
        />
        <AnalyticsCardBase
          title="Target Kuorum Sah"
          value={
            quorumData
              ? `${quorumData.quorumTarget} Orang`
              : `${currentMeeting.quorumTarget} Orang`
          }
          icon={<ShieldCheck className="w-5 h-5 text-amber-500" />}
          subtitle="Minimal 50% + 1 anggota"
          variant="compact-premium"
          mobileCompact={true}
          isLoading={isLoading}
        />
        <AnalyticsCardBase
          title="Kehadiran Saat Ini"
          value={
            quorumData
              ? `${quorumData.actualAttendance} Orang (${quorumData.percentage}%)`
              : `${currentMeeting.actualAttendance} Orang`
          }
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          subtitle={
            quorumData?.isQuorumReached
              ? 'Kuorum Terpenuhi (Sah)'
              : 'Belum Memenuhi Kuorum'
          }
          variant="compact-premium"
          mobileCompact={true}
          isLoading={isLoading}
        />
        <AnalyticsCardBase
          title="Status Pelaksanaan"
          value={
            currentMeeting.status === 'IN_SESSION'
              ? 'Sedang Bersidang'
              : currentMeeting.status === 'REGISTRATION_OPEN'
              ? 'Registrasi Dibuka'
              : currentMeeting.status === 'CLOSED'
              ? 'Sidang Selesai'
              : 'Draft Persiapan'
          }
          icon={<Clock className="w-5 h-5 text-purple-500" />}
          subtitle={formatDate(currentMeeting.meetingDate, 'dd MMMM yyyy HH:mm')}
          variant="compact-premium"
          mobileCompact={true}
          isLoading={isLoading}
        />
      </div>

      {/* Progress Bar & Sah Indicator */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tingkat Kehadiran Sidang:
            </span>
            <Badge variant={quorumData?.isQuorumReached ? 'success' : 'warning'}>
              {quorumData?.isQuorumReached
                ? 'KUORUM TERCAPAI (KEPUTUSAN SAH HUKUM)'
                : 'MENUNGGU MEMENUHI KUORUM'}
            </Badge>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {quorumData
              ? `${quorumData.actualAttendance} / ${quorumData.quorumTarget} target suara`
              : ''}
          </span>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              quorumData?.isQuorumReached ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, quorumData?.percentage || 0)}%` }}
          />
        </div>

        {/* Member Check-In CTA & Manager Progression Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div>
            {myAttendance?.hasAttended ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Anda telah melakukan presensi resmi pada sidang ini.
              </div>
            ) : currentMeeting.status === 'REGISTRATION_OPEN' ||
              currentMeeting.status === 'IN_SESSION' ? (
              <Button
                type="button"
                size="toolbar"
                variant="toolbarPrimary"
                onClick={onSelfCheckIn}
                isLoading={isCheckingIn}
              >
                <Check className="w-4 h-4 mr-1.5" />
                Konfirmasi Kehadiran Saya di Sidang RAT
              </Button>
            ) : (
              <span className="text-xs text-slate-400">
                Presensi hanya dapat dilakukan saat registrasi dibuka oleh pengurus.
              </span>
            )}
          </div>

          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              {currentMeeting.status === 'DRAFT' && (
                <Button
                  type="button"
                  size="toolbar"
                  variant="toolbarOutline"
                  onClick={() =>
                    onLifecycleAdvance(
                      'REGISTRATION_OPEN',
                      'Buka Registrasi Peserta'
                    )
                  }
                  isLoading={isAdvancingLifecycle}
                >
                  <Play className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Buka Registrasi (Kunci Snapshot Kuorum)
                </Button>
              )}
              {currentMeeting.status === 'REGISTRATION_OPEN' && (
                <Button
                  type="button"
                  size="toolbar"
                  variant="toolbarPrimary"
                  onClick={() =>
                    onLifecycleAdvance('IN_SESSION', 'Mulai Sidang Paripurna')
                  }
                  isLoading={isAdvancingLifecycle}
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  Mulai Sidang Paripurna
                </Button>
              )}
              {currentMeeting.status === 'IN_SESSION' && (
                <Button
                  type="button"
                  size="toolbar"
                  variant="toolbarDanger"
                  onClick={() =>
                    onLifecycleAdvance('CLOSED', 'Tutup & Selesaikan Sidang')
                  }
                  isLoading={isAdvancingLifecycle}
                >
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  Tutup Sidang Resmi
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
};
export default RatQuorumHud;
