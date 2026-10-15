import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/axiosInstance';
import { Button, SearchableSelect } from '../../components/ui';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { NonMemberBanner } from '../../components/cooperative/shared/NonMemberBanner';
import { 
  Users, 
  Vote, 
  FileCheck2, 
  Plus, 
  Calendar,
  Tv,
  Eye,
  Settings,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import useConfirm from '../../hooks/useConfirm';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { useSocket } from '../../hooks/useSocket';
import { COOP_QUERY_KEYS, invalidateRatCaches } from '../../lib/coopQueryKeys';
import { useIsMobile } from '../../hooks/useIsMobile';
import { RatAgendaSection } from '../../components/cooperative/rat/RatAgendaSection';
import { RatVotingSection } from '../../components/cooperative/rat/RatVotingSection';
import { RatMinuteTimeline } from '../../components/cooperative/rat/RatMinuteTimeline';
import { RatQuorumHud } from '../../components/cooperative/rat/RatQuorumHud';
import { RatAttendanceSection } from '../../components/cooperative/rat/RatAttendanceSection';
import { RatLiveVotingBanner } from '../../components/cooperative/rat/RatLiveVotingBanner';
import { RatMemberPortal } from '../../components/cooperative/rat/RatMemberPortal';

const hardeningModuleKey = 'coop_rat';

// ─── LAZY LOADED HEAVY COMPONENTS ──────────────────────────────────────────
const CreateMeetingModal = lazy(() =>
  import('../../components/cooperative/rat/CreateMeetingModal').then(m => ({ default: m.CreateMeetingModal }))
);

const CastVoteModal = lazy(() =>
  import('../../components/cooperative/rat/CastVoteModal').then(m => ({ default: m.CastVoteModal }))
);

const CreateVotingSessionModal = lazy(() =>
  import('../../components/cooperative/rat/CreateVotingSessionModal').then(m => ({ default: m.CreateVotingSessionModal }))
);

const AddResolutionModal = lazy(() =>
  import('../../components/cooperative/rat/AddResolutionModal').then(m => ({ default: m.AddResolutionModal }))
);

const AgendaFormModal = lazy(() =>
  import('../../components/cooperative/rat/AgendaFormModal').then(m => ({ default: m.AgendaFormModal }))
);

const RatTvDisplayModal = lazy(() =>
  import('../../components/cooperative/rat/RatTvDisplayModal').then(m => ({ default: m.RatTvDisplayModal }))
);

const EditRulesModal = lazy(() =>
  import('../../components/cooperative/rat/EditRulesModal').then(m => ({ default: m.EditRulesModal }))
);

const MinuteFormModal = lazy(() =>
  import('../../components/cooperative/rat/MinuteFormModal').then(m => ({ default: m.MinuteFormModal }))
);

const RatProceedingsPrintModal = lazy(() =>
  import('../../components/cooperative/rat/RatProceedingsPrintModal').then(m => ({ default: m.RatProceedingsPrintModal }))
);

const RatClosureWizardModal = lazy(() =>
  import('../../components/cooperative/rat/RatClosureWizardModal').then(m => ({ default: m.RatClosureWizardModal }))
);

// ─── TYPES ─────────────────────────────────────────────────────────────────
export interface CoopMeetingMinuteItem {
  id: string;
  meetingId: string;
  agendaId?: string | null;
  authorId?: string | null;
  timeRecord?: string | null;
  speakerName?: string | null;
  speakerRole?: string | null;
  category: 'OPENING' | 'DISCUSSION' | 'SUGGESTION' | 'OBJECTION' | 'CONCLUSION' | 'ANNOUNCEMENT';
  topic: string;
  content: string;
  actionItem?: string | null;
  isPublic: boolean;
  orderIndex: number;
  createdAt: string;
  agenda?: {
    id: string;
    title: string;
    order: number;
  } | null;
}
export interface CoopMeetingItem {
  id: string;
  title: string;
  year: number;
  meetingDate: string;
  status: 'DRAFT' | 'REGISTRATION_OPEN' | 'IN_SESSION' | 'CLOSED';
  quorumTarget: number;
  totalEligibleMembers: number;
  actualAttendance: number;
  isQuorumReached: boolean;
  description?: string;
  agendas: CoopAgendaItem[];
  resolutions: CoopResolutionItem[];
  votingSessions: CoopVotingSessionItem[];
  attendances: CoopAttendanceItem[];
}

export interface CoopAgendaItem {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  durationMinutes?: number | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface CoopResolutionItem {
  id: string;
  resolutionNo: string;
  subject: string;
  summary: string;
  status: 'PASSED' | 'REJECTED' | 'AMENDED';
  documentUrl?: string | null;
}

export interface CoopVotingOptionItem {
  id: string;
  title: string;
  description?: string | null;
  voteCount: number;
}

export interface CoopVotingSessionItem {
  id: string;
  meetingId: string;
  title: string;
  description?: string | null;
  votingType: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'TALLIED';
  options: CoopVotingOptionItem[];
  ballotsCount?: number;
}

export interface CoopAttendanceItem {
  id: string;
  memberId: string;
  checkInTime: string;
  method: 'ONLINE' | 'RFID' | 'MANUAL';
  isQuorumCounted: boolean;
  Member?: {
    name: string;
    memberNo: string;
  };
}

const RatMeetingPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { subscription } = useAuthStore();
  const confirm = useConfirm();
  const isMobile = useIsMobile();
  const { can, isAdmin, isKoperasiHead, isKoperasiSecretary } = useCapabilities();

  const canManage = useMemo(() => 
    Boolean(isAdmin || isKoperasiHead || isKoperasiSecretary || can('cooperative.rat.manage')),
    [isAdmin, isKoperasiHead, isKoperasiSecretary, can]
  );
  const canVote = useMemo(() => Boolean(can('cooperative.rat.vote') || canManage), [can, canManage]);

  // URL state
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'agenda';

  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');

  // View mode switcher: allow operators to toggle between administrative console and member live stage portal
  const [operatorViewOverride, setOperatorViewOverride] = useState<'OPERATOR' | 'MEMBER' | null>(null);
  const effectiveViewMode = operatorViewOverride ?? (canManage ? 'OPERATOR' : 'MEMBER');

  // Modal states
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);
  const [isCastVoteOpen, setIsCastVoteOpen] = useState(false);
  const [isCreateVotingSessionOpen, setIsCreateVotingSessionOpen] = useState(false);
  const [isAddResolutionOpen, setIsAddResolutionOpen] = useState(false);
  const [isAddAgendaOpen, setIsAddAgendaOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<CoopAgendaItem | null>(null);
  const [editingResolution, setEditingResolution] = useState<CoopResolutionItem | null>(null);
  const [isTvDisplayOpen, setIsTvDisplayOpen] = useState(false);
  const [isEditRulesOpen, setIsEditRulesOpen] = useState(false);
  const [activeVotingSession, setActiveVotingSession] = useState<CoopVotingSessionItem | null>(null);
  const [votingAgendaContext, setVotingAgendaContext] = useState<CoopAgendaItem | null>(null);
  const [isAddMinuteOpen, setIsAddMinuteOpen] = useState(false);
  const [editingMinute, setEditingMinute] = useState<CoopMeetingMinuteItem | null>(null);
  const [minuteAgendaContext, setMinuteAgendaContext] = useState<string | null>(null);
  const [isPrintProceedingsOpen, setIsPrintProceedingsOpen] = useState(false);
  const [isClosureWizardOpen, setIsClosureWizardOpen] = useState(false);

  // Sync tab with URL search params
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Real-time socket sync with spike throttling (1500ms debounce)
  const lastSyncRef = useRef<number>(0);
  const { subscribe, unsubscribe } = useSocket();
  useEffect(() => {
    const handleSyncUpdate = () => {
      const now = Date.now();
      if (now - lastSyncRef.current < 1500) return;
      lastSyncRef.current = now;
      invalidateRatCaches(queryClient, selectedMeetingId);
    };
    subscribe('coop_rat_update', handleSyncUpdate);
    return () => {
      unsubscribe('coop_rat_update', handleSyncUpdate);
    };
  }, [subscribe, unsubscribe, queryClient, selectedMeetingId]);

  // Member status check
  const memberStatusQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.memberStatusMe,
    queryFn: async () => {
      const res = await api.get('/cooperative/members/status/me');
      return res.data?.data as { isMember: boolean } | undefined;
    },
    staleTime: 60_000,
  });
  const isMember = memberStatusQuery.data?.isMember ?? true;

  // Query RAT Meetings
  const meetingsQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.ratMeetings(),
    queryFn: async () => {
      const res = await api.get('/cooperative/rat');
      return (res.data.data ?? []) as CoopMeetingItem[];
    },
    enabled: subscription !== undefined,
    staleTime: 15_000,
  });

  const meetings = useMemo(() => meetingsQuery.data || [], [meetingsQuery.data]);

  const meetingOptions = useMemo(() => {
    return (meetings || []).map(m => {
      const statusLabel = m.status === 'IN_SESSION' ? '🔴 Sedang Berlangsung' : m.status === 'REGISTRATION_OPEN' ? '🟢 Registrasi Dibuka' : m.status === 'CLOSED' ? '⚪ Ditutup' : '🟡 Draft';
      return { value: m.id, label: `${m.title} (${m.year}) — ${statusLabel}` };
    });
  }, [meetings]);

  // Auto-select latest active meeting or first meeting
  useEffect(() => {
    if ((meetings || []).length > 0 && !selectedMeetingId) {
      const active = (meetings || []).find(m => m.status === 'IN_SESSION' || m.status === 'REGISTRATION_OPEN') || meetings[0];
      if (active) setSelectedMeetingId(active.id);
    }
  }, [meetings, selectedMeetingId]);

  // Detail query for active meeting
  const meetingDetailQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.ratMeetingDetail(selectedMeetingId),
    queryFn: async () => {
      if (!selectedMeetingId) return null;
      const res = await api.get(`/cooperative/rat/${selectedMeetingId}`);
      return (res.data.data ?? null) as CoopMeetingItem | null;
    },
    enabled: Boolean(selectedMeetingId),
    staleTime: 10_000,
  });

  // Quorum query
  const quorumQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.ratQuorum(selectedMeetingId),
    queryFn: async () => {
      if (!selectedMeetingId) return null;
      const res = await api.get(`/cooperative/rat/${selectedMeetingId}/quorum`);
      return res.data.data as {
        meetingId: string;
        title: string;
        status: string;
        totalEligibleMembers: number;
        quorumTarget: number;
        actualAttendance: number;
        isQuorumReached: boolean;
        percentage: number;
      };
    },
    enabled: Boolean(selectedMeetingId),
    staleTime: 5_000,
  });

  // Current user's attendance status
  const myAttendanceQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.ratMyAttendance(selectedMeetingId),
    queryFn: async () => {
      if (!selectedMeetingId) return null;
      const res = await api.get(`/cooperative/rat/${selectedMeetingId}/attendance/me`);
      return res.data.data as { hasAttended: boolean; attendance: CoopAttendanceItem | null };
    },
    enabled: Boolean(selectedMeetingId),
    staleTime: 10_000,
  });

  const currentMeeting = meetingDetailQuery.data || (meetings || []).find(m => m.id === selectedMeetingId);
  const quorumData = quorumQuery.data;
  const myAttendance = myAttendanceQuery.data;

  // Mutation: Self check-in
  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMeetingId) throw new Error('Pilih rapat terlebih dahulu');
      const res = await api.post(`/cooperative/rat/${selectedMeetingId}/attendance`, {
        method: 'ONLINE'
      });
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, selectedMeetingId);
      toast.success('Presensi Anda pada Sidang RAT berhasil diverifikasi!');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal melakukan presensi';
      toast.error(errorMsg);
    }
  });

  const handleSelfCheckIn = useCallback(() => {
    checkInMutation.mutate();
  }, [checkInMutation]);

  // Mutation: Update Meeting Lifecycle
  const lifecycleMutation = useMutation({
    mutationFn: async (newStatus: 'REGISTRATION_OPEN' | 'IN_SESSION' | 'CLOSED') => {
      if (!selectedMeetingId) throw new Error('Pilih rapat');
      const res = await api.put(`/cooperative/rat/${selectedMeetingId}/status`, {
        status: newStatus
      });
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, selectedMeetingId);
      toast.success('Status pelaksanaan sidang RAT berhasil diperbarui!');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengubah status sidang';
      toast.error(errorMsg);
    }
  });

  const handleLifecycleAdvance = useCallback(async (newStatus: 'REGISTRATION_OPEN' | 'IN_SESSION' | 'CLOSED', label: string) => {
    let confirmTitle = `Konfirmasi: ${label}`;
    let confirmMessage = `Apakah Anda yakin ingin memajukan status sidang RAT ini menjadi "${label}"? Tindakan ini akan dicatat dalam risalah resmi persidangan.`;
    let confirmStyle: 'primary' | 'warning' | 'info' = 'primary';

    if (newStatus === 'REGISTRATION_OPEN') {
      confirmTitle = 'Buka Registrasi Peserta RAT';
      confirmMessage = 'Buka registrasi? Snapshot anggota aktif akan dikunci sebagai basis penentuan kuorum sah rapat (50% + 1). Lanjutkan?';
      confirmStyle = 'info';
    } else if (newStatus === 'IN_SESSION') {
      confirmTitle = 'Mulai Sidang Paripurna RAT';
      confirmMessage = 'Mulai sidang paripurna? Anggota yang hadir dapat mengikuti pembahasan agenda dan pemungutan suara.';
      confirmStyle = 'primary';
    } else if (newStatus === 'CLOSED') {
      confirmTitle = 'Tutup & Akhiri Sidang RAT';
      confirmMessage = 'Tutup dan akhiri sidang RAT? Presensi dan pemungutan suara e-Voting tidak dapat diubah kembali.';
      confirmStyle = 'warning';
    }

    const isConfirmed = await confirm({
      title: confirmTitle,
      message: confirmMessage,
      confirmText: 'Lanjutkan',
      cancelText: 'Batal',
      style: confirmStyle,
    });
    if (isConfirmed) {
      lifecycleMutation.mutate(newStatus);
    }
  }, [confirm, lifecycleMutation]);

  // Mutation: Update Voting Session Status (e.g. TALLIED)
  const votingStatusMutation = useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: 'ACTIVE' | 'CLOSED' | 'TALLIED' }) => {
      const res = await api.put(`/cooperative/rat/voting-sessions/${sessionId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, selectedMeetingId);
      toast.success('Status sesi pemungutan suara berhasil diperbarui!');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal memperbarui sesi voting';
      toast.error(errorMsg);
    }
  });

  const handleVotingStatusChange = useCallback((sessionId: string, status: 'ACTIVE' | 'CLOSED' | 'TALLIED') => {
    votingStatusMutation.mutate({ sessionId, status });
  }, [votingStatusMutation]);

  // Tab definitions
  const tabOptions: TabOption[] = useMemo(() => [
    { id: 'agenda', label: 'Agenda & Ketetapan Sidang', icon: FileCheck2 },
    { id: 'attendance', label: 'Daftar Presensi Peserta', icon: Users },
    { id: 'voting', label: 'e-Voting (One Member One Vote)', icon: Vote },
    { id: 'minutes', label: 'Risalah & Notulensi Sidang', icon: BookOpen },
  ], []);

  const handleSelectVoteSession = useCallback((session: CoopVotingSessionItem) => {
    setActiveVotingSession(session);
    setIsCastVoteOpen(true);
  }, []);

  const isLoading = meetingsQuery.isLoading || meetingDetailQuery.isLoading;

  return (
    <AcademicPageLayout
      title="Rapat Anggota Tahunan (RAT) & e-Voting"
      description="Pelaksanaan musyawarah kekuasaan tertinggi koperasi berlandaskan asas One Member One Vote dan pemantauan kuorum sah real-time."
      hardeningModuleKey={hardeningModuleKey}
      instruction={{
        title: 'Panduan Sidang Rapat Anggota Tahunan (RAT)',
        items: [
          'Setiap Anggota Koperasi memiliki hak bicara dan 1 hak suara sah (One Member One Vote) yang dijamin oleh UU Perkoperasian.',
          'Sidang dinyatakan SAH secara hukum jika jumlah kehadiran telah mencapai kuorum minimal (50% + 1 dari basis anggota aktif).',
          'Presensi mandiri secara digital dapat dikonfirmasi oleh anggota aktif selama periode registrasi sidang dibuka.',
          'Pemungutan suara e-Voting dilindungi enkripsi kriptografis satu arah (HMAC-SHA256) untuk menjamin kerahasiaan pilihan (Luber & Jurdil).'
        ]
      }}
    >
      <PremiumFeatureGate featureName="RAT & e-Voting Koperasi">
        <div className="space-y-6 max-w-full min-w-0">
          {/* Non-Member Statutory Notice */}
          {!isMember && !canManage && (
            <NonMemberBanner
              title="Hak Suara Terbatas (Bukan Anggota Koperasi)"
              description="Sesuai UU Perkoperasian No. 25/1992, hak bicara dan hak suara e-Voting (One Member One Vote) pada Sidang RAT hanya sah diberikan oleh Anggota Terdaftar."
            />
          )}

          {/* Header Controls & Meeting Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <label htmlFor="select-rat-meeting" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Sidang RAT:
                </label>
              </div>

              {(meetings || []).length > 0 ? (
                <div className="w-[300px] sm:w-[400px] max-w-full">
                  <SearchableSelect
                    id="select-rat-meeting"
                    value={selectedMeetingId || ''}
                    onValueChange={(val) => setSelectedMeetingId(val)}
                    options={meetingOptions}
                    placeholder="Pilih Sidang RAT..."
                    searchPlaceholder="Cari agenda sidang..."
                    emptyMessage="Tidak ada agenda sidang ditemukan"
                  />
                </div>
              ) : (
                <span className="text-xs text-slate-400">Belum ada agenda rapat yang dibuat</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <Button
                  type="button"
                  size="toolbar"
                  variant={effectiveViewMode === 'MEMBER' ? 'toolbarPrimary' : 'toolbarOutline'}
                  onClick={() => setOperatorViewOverride(effectiveViewMode === 'MEMBER' ? 'OPERATOR' : 'MEMBER')}
                  className="gap-1.5"
                >
                  {effectiveViewMode === 'MEMBER' ? (
                    <>
                      <Settings className="w-4 h-4" />
                      <span>Konsol Pengurus</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 text-amber-500" />
                      <span>Pratinjau Anggota</span>
                    </>
                  )}
                </Button>
              )}

              {currentMeeting && (
                <Button
                  type="button"
                  size="toolbar"
                  variant="toolbarOutline"
                  onClick={() => setIsTvDisplayOpen(true)}
                  className="gap-1.5"
                >
                  <Tv className="w-4 h-4 text-indigo-500" />
                  Layar Proyektor Aula
                </Button>
              )}

              {canManage && (
                <Button
                  type="button"
                  size="toolbar"
                  variant="toolbarPrimary"
                  onClick={() => setIsCreateMeetingOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Agendakan Sidang Baru
                </Button>
              )}
            </div>
          </div>

          {/* CONDITIONAL CONTEXT VIEW: MEMBER LIVE STAGE vs OPERATOR MANAGEMENT CONSOLE */}
          {effectiveViewMode === 'MEMBER' ? (
            currentMeeting && (
              <RatMemberPortal
                meeting={currentMeeting}
                quorumStats={quorumData}
                myAttendance={myAttendance}
                onSelfCheckIn={handleSelfCheckIn}
                isCheckingIn={checkInMutation.isPending}
                onOpenCastVote={handleSelectVoteSession}
                isMember={isMember}
                canManage={canManage}
                onSwitchToOperatorView={() => setOperatorViewOverride('OPERATOR')}
              />
            )
          ) : (
            <>
              {/* QUORUM HUD & STATUS CARDS */}
              {currentMeeting && (
                <RatQuorumHud
                  currentMeeting={currentMeeting}
                  quorumData={quorumData}
                  isLoading={isLoading}
                  myAttendance={myAttendance}
                  canManage={canManage}
                  onSelfCheckIn={handleSelfCheckIn}
                  isCheckingIn={checkInMutation.isPending}
                  onLifecycleAdvance={handleLifecycleAdvance}
                  isAdvancingLifecycle={lifecycleMutation.isPending}
                  onOpenClosureWizard={() => setIsClosureWizardOpen(true)}
                />
              )}

              {/* LIVE VOTING BANNER FOR MEMBERS */}
              {currentMeeting?.votingSessions?.some(s => s.status === 'ACTIVE') && (
                <RatLiveVotingBanner
                  session={currentMeeting.votingSessions.find(s => s.status === 'ACTIVE') || null}
                  canVote={canVote}
                  onCastVote={(session) => {
                    setActiveVotingSession(session);
                    setIsCastVoteOpen(true);
                  }}
                  onViewVotingTab={() => handleTabChange('voting')}
                />
              )}

              {/* TABS NAVIGATION */}
              <TabSwitcher
                options={tabOptions}
                value={activeTab}
                onChange={handleTabChange}
              />

              {/* TAB 1: AGENDA & RESOLUTIONS */}
              {activeTab === 'agenda' && (
                <RatAgendaSection
                  meetingId={selectedMeetingId}
                  agendas={currentMeeting?.agendas || []}
                  resolutions={currentMeeting?.resolutions || []}
                  votingSessions={currentMeeting?.votingSessions || []}
                  canManage={canManage}
                  meetingDescription={currentMeeting?.description}
                  onOpenAddAgenda={() => { setEditingAgenda(null); setIsAddAgendaOpen(true); }}
                  onEditAgenda={(agenda) => { setEditingAgenda(agenda); setIsAddAgendaOpen(true); }}
                  onOpenAddResolution={() => { setEditingResolution(null); setIsAddResolutionOpen(true); }}
                  onEditResolution={(res) => { setEditingResolution(res); setIsAddResolutionOpen(true); }}
                  onOpenEditRules={() => setIsEditRulesOpen(true)}
                  onOpenCreateVoting={(agenda) => { setVotingAgendaContext(agenda); setIsCreateVotingSessionOpen(true); }}
                  onOpenCastVote={(session) => { setActiveVotingSession(session); setIsCastVoteOpen(true); }}
                  onOpenAddMinute={(agendaId) => {
                    setEditingMinute(null);
                    setMinuteAgendaContext(agendaId || null);
                    setIsAddMinuteOpen(true);
                  }}
                  meetingLocation={(currentMeeting as any)?.location}
                  meetingDate={(currentMeeting as any)?.meetingDate || (currentMeeting as any)?.date}
                />
              )}

              {/* TAB 2: ATTENDANCE */}
              {activeTab === 'attendance' && (
                <RatAttendanceSection
                  meetingId={selectedMeetingId}
                  meetingStatus={currentMeeting?.status || 'DRAFT'}
                  attendances={currentMeeting?.attendances || []}
                  quorumStats={quorumData}
                  canManage={canManage}
                  onAttendanceRecorded={() => {
                    invalidateRatCaches(queryClient, selectedMeetingId);
                  }}
                />
              )}

              {/* TAB 3: E-VOTING */}
              {activeTab === 'voting' && (
                <RatVotingSection
                  votingSessions={currentMeeting?.votingSessions || []}
                  canManage={canManage}
                  canVote={canVote}
                  totalPresentMembers={quorumData?.attended ?? (currentMeeting?.attendances?.length || 0)}
                  totalEligibleMembers={quorumData?.total ?? (currentMeeting?.totalActiveMembers || 0)}
                  onOpenCreateSession={() => setIsCreateVotingSessionOpen(true)}
                  onSelectVoteSession={handleSelectVoteSession}
                  onUpdateSessionStatus={handleVotingStatusChange}
                  onOpenTvDisplay={() => setIsTvDisplayOpen(true)}
                  isUpdatingStatus={votingStatusMutation.isPending}
                />
              )}

              {/* TAB 4: RISALAH & NOTULENSI SIDANG */}
              {activeTab === 'minutes' && (
                <RatMinuteTimeline
                  meetingId={selectedMeetingId}
                  agendas={currentMeeting?.agendas || []}
                  canManage={canManage}
                  onOpenAddMinute={(agendaId) => {
                    setEditingMinute(null);
                    setMinuteAgendaContext(agendaId || null);
                    setIsAddMinuteOpen(true);
                  }}
                  onEditMinute={(minute) => {
                    setEditingMinute(minute);
                    setMinuteAgendaContext(minute.agendaId || null);
                    setIsAddMinuteOpen(true);
                  }}
                  onOpenPrintProceedings={() => setIsPrintProceedingsOpen(true)}
                />
              )}
            </>
          )}
        </div>

        {/* MODAL SUSPENSE CONTAINERS */}
        <Suspense fallback={null}>
          {isCreateMeetingOpen && (
            <CreateMeetingModal
              isOpen={isCreateMeetingOpen}
              onClose={() => setIsCreateMeetingOpen(false)}
            />
          )}

          {isCastVoteOpen && activeVotingSession && (
            <CastVoteModal
              isOpen={isCastVoteOpen}
              onClose={() => {
                setIsCastVoteOpen(false);
                setActiveVotingSession(null);
              }}
              session={activeVotingSession}
            />
          )}

          {isCreateVotingSessionOpen && selectedMeetingId && (
            <CreateVotingSessionModal
              isOpen={isCreateVotingSessionOpen}
              onClose={() => {
                setIsCreateVotingSessionOpen(false);
                setVotingAgendaContext(null);
              }}
              meetingId={selectedMeetingId}
              initialAgendaId={votingAgendaContext?.id}
              initialTitle={votingAgendaContext ? `Pengesahan: ${votingAgendaContext.title}` : undefined}
              initialCategory={votingAgendaContext?.title && /pemilihan|pengurus|pengawas|formatur|suksesi/i.test(votingAgendaContext.title) ? 'ELECTION' : 'RESOLUTION'}
            />
          )}

          {isAddAgendaOpen && selectedMeetingId && (
            <AgendaFormModal
              isOpen={isAddAgendaOpen}
              onClose={() => {
                setIsAddAgendaOpen(false);
                setEditingAgenda(null);
              }}
              meetingId={selectedMeetingId}
              initialData={editingAgenda}
            />
          )}

          {isAddResolutionOpen && selectedMeetingId && (
            <AddResolutionModal
              isOpen={isAddResolutionOpen}
              onClose={() => {
                setIsAddResolutionOpen(false);
                setEditingResolution(null);
              }}
              meetingId={selectedMeetingId}
              initialData={editingResolution}
            />
          )}

          {isTvDisplayOpen && currentMeeting && (
            <RatTvDisplayModal
              isOpen={isTvDisplayOpen}
              onClose={() => setIsTvDisplayOpen(false)}
              meeting={currentMeeting}
              quorumStats={quorumData}
            />
          )}

          {isEditRulesOpen && selectedMeetingId && (
            <EditRulesModal
              isOpen={isEditRulesOpen}
              onClose={() => setIsEditRulesOpen(false)}
              meetingId={selectedMeetingId}
              initialRules={currentMeeting?.description}
            />
          )}

          {isAddMinuteOpen && selectedMeetingId && (
            <MinuteFormModal
              isOpen={isAddMinuteOpen}
              onClose={() => {
                setIsAddMinuteOpen(false);
                setEditingMinute(null);
                setMinuteAgendaContext(null);
              }}
              meetingId={selectedMeetingId}
              agendas={currentMeeting?.agendas || []}
              initialAgendaId={minuteAgendaContext}
              editingMinute={editingMinute}
            />
          )}

          {isPrintProceedingsOpen && selectedMeetingId && (
            <RatProceedingsPrintModal
              isOpen={isPrintProceedingsOpen}
              onClose={() => setIsPrintProceedingsOpen(false)}
              meetingId={selectedMeetingId}
              coopName={currentMeeting?.title}
              meetingLocation={(currentMeeting as any)?.location}
              meetingDate={currentMeeting?.meetingDate}
            />
          )}

          {isClosureWizardOpen && currentMeeting && (
            <RatClosureWizardModal
              isOpen={isClosureWizardOpen}
              onClose={() => setIsClosureWizardOpen(false)}
              meeting={currentMeeting}
              canManage={canManage}
              onOpenPrintModal={() => setIsPrintProceedingsOpen(true)}
            />
          )}
        </Suspense>
      </PremiumFeatureGate>
    </AcademicPageLayout>
  );
});

RatMeetingPage.displayName = 'RatMeetingPage';

export default RatMeetingPage;
