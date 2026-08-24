import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChatBubbleLeftRightIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ArrowPathIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { 
  internalCommunicationApi, 
  communicationKeys, 
  type InternalThreadItem,
  type InternalThreadCategory,
  type InternalThreadPriority,
  type InternalThreadType,
  type InternalThreadStatus 
} from '@/api/internal-communication.api';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { ChatConversationPanel } from '@/components/communication/ChatConversationPanel';
import { NewConversationModal } from '@/components/communication/NewConversationModal';
import { IncomingCallModal } from '@/components/communication/calling/IncomingCallModal';
import { ActiveCallOverlay } from '@/components/communication/calling/ActiveCallOverlay';
import { VirtualMeetingModal } from '@/components/communication/meeting/VirtualMeetingModal';
import { useWebRTCCall } from '@/hooks/communication/useWebRTCCall';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/utils/layoutUtils';
import { Button, SectionCard } from '@/components/ui';
import toast from 'react-hot-toast';

const searchFilterSchema = z.object({
  query: z.string().optional(),
});

interface ActiveMeetingItem {
  roomId: string;
  roomTitle: string;
  hostName: string;
  hostRole?: string;
  startedAt: string;
  participantCount: number;
  participants: unknown[];
}

export default function CommunicationCenterPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { user } = useAuthStore();

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'DISPOSISI' | 'DIRECT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState<boolean>(false);

  const defaultRoom = user?.tenant_id ? `kbm-${user.tenant_id.slice(0, 8)}` : 'kbm-sekolah-2026';
  const [meetingRoomId, setMeetingRoomId] = useState<string>(defaultRoom);
  const [activeMeetings, setActiveMeetings] = useState<ActiveMeetingItem[]>([]);

  // Check URL query parameters for ?meeting=xyz
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const meetingParam = params.get('meeting');
    if (meetingParam) {
      setMeetingRoomId(meetingParam);
      setIsMeetingModalOpen(true);
    }
  }, []);

  // Listen for Live Ongoing Meetings in School Tenant
  useEffect(() => {
    if (!socket) return;
    socket.emit('meeting:get_active_list');

    const handleActiveMeetings = (list: unknown[]) => {
      setActiveMeetings((list || []) as ActiveMeetingItem[]);
    };

    socket.on('meeting:active_list_update', handleActiveMeetings);

    return () => {
      socket.off('meeting:active_list_update', handleActiveMeetings);
    };
  }, [socket]);

  // ── WebRTC Calling Hook ───────────────────────────────────────────────────
  const {
    callState,
    incomingCall,
    remoteUser,
    isMuted,
    isVideoOff,
    isScreenSharing,
    localVideoRef,
    remoteVideoRef,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare
  } = useWebRTCCall({
    socket,
    currentUserId: user?.id,
    currentUserName: user?.full_name || 'Guru/Staff',
    currentUserRole: user?.role
  });

  // ── React Query: Threads List (Pilar 31) ──────────────────────────────────
  const { 
    data: threadsData, 
    isLoading: isLoadingThreads, 
    refetch: refetchThreads, 
    isFetching 
  } = useQuery({
    queryKey: communicationKeys.threadList({ 
      category: activeFilter === 'DISPOSISI' ? 'DISPOSISI' : undefined,
      type: activeFilter === 'DIRECT' ? 'DIRECT' : undefined,
      is_unread: activeFilter === 'UNREAD' ? true : undefined,
      search: searchQuery || undefined
    }),
    queryFn: () => internalCommunicationApi.getThreads({
      category: activeFilter === 'DISPOSISI' ? 'DISPOSISI' : undefined,
      type: activeFilter === 'DIRECT' ? 'DIRECT' : undefined,
      is_unread: activeFilter === 'UNREAD' ? true : undefined,
      search: searchQuery || undefined
    }),
    staleTime: 1000 * 15,
  });

  const threads = useMemo(() => {
    return (threadsData?.data || []) as InternalThreadItem[];
  }, [threadsData]);

  // ── Socket realtime thread update ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleThreadUpdate = (data: { thread_id: string; message: unknown }) => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
    };

    socket.on('communication:thread_updated', handleThreadUpdate);
    socket.on('communication:new_message', handleThreadUpdate);

    return () => {
      socket.off('communication:thread_updated', handleThreadUpdate);
      socket.off('communication:new_message', handleThreadUpdate);
    };
  }, [socket, queryClient]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: (threadId: string) => internalCommunicationApi.markThreadAsRead(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
    }
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ threadId, status }: { threadId: string; status: InternalThreadStatus }) => 
      internalCommunicationApi.updateThreadStatus(threadId, status),
    onSuccess: () => {
      toast.success('Status thread berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
    }
  });

  const handleSelectThread = useCallback((thread: InternalThreadItem) => {
    setSelectedThreadId(thread.id);
    if (thread.isUnread) {
      markReadMutation.mutate(thread.id);
    }
  }, [markReadMutation]);

  const handleStartDirectCall = useCallback((recipientId: string, recipientName: string, callType: 'audio' | 'video' = 'audio') => {
    initiateCall({
      recipientId,
      recipientName,
      callType
    });
  }, [initiateCall]);

  const handleJoinSchoolMeeting = useCallback((roomIdToJoin?: string) => {
    if (roomIdToJoin) {
      setMeetingRoomId(roomIdToJoin);
    } else {
      setMeetingRoomId(defaultRoom);
    }
    setIsMeetingModalOpen(true);
  }, [defaultRoom]);

  const formatThreadDate = useCallback((dateStr?: string | null) => {
    if (!dateStr) return '';
    return formatDate(dateStr, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }, []);

  const breadcrumbs = useMemo(() => [
    { label: 'Pusat Komunikasi', path: '/communication' }
  ], []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pusat Komunikasi Guru & Staf"
        description="Ruang kolaborasi instan, pesan koordinasi internal, disposisi, dan video conference sekolah."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="communication_center"
        instruction={{
          title: "Panduan Pusat Komunikasi",
          description: "Gunakan fitur ini untuk komunikasi real-time, disposisi surat dinas, dan panggilan video antar guru/staf.",
          items: [
            { text: "Pilih thread percakapan di kolom kiri untuk membuka ruang obrolan." },
            { text: "Gunakan tombol Ruang Rapat Virtual untuk bergabung ke conference sekolah." },
            { text: "Filter pesan berdasarkan Belum Dibaca, Disposisi, atau Obrolan Langsung." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="h-[750px] flex bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans border border-slate-200 dark:border-slate-800 rounded-3xl relative shadow-sm">
            {/* ── LEFT PANEL: THREAD LIST ────────────────────────────────────────── */}
            <aside 
              className={`w-full md:w-96 lg:w-[400px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 ${
                selectedThreadId ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Header Bar */}
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                    {user?.full_name?.substring(0, 2).toUpperCase() || 'ST'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[130px]">
                      {user?.full_name || 'Staff User'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {user?.role || 'Staff'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Button
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={() => handleJoinSchoolMeeting()}
                    className="flex items-center gap-1 text-emerald-600 font-bold rounded-xl"
                    title="Buka Ruang Rapat Virtual"
                  >
                    <VideoCameraIcon className="w-4 h-4" />
                    Rapat
                  </Button>
                  <Button
                    variant="toolbarPrimary"
                    size="toolbar"
                    onClick={() => setIsNewModalOpen(true)}
                    className="flex items-center gap-1 font-bold rounded-xl shadow-sm"
                    title="Obrolan Baru"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Baru
                  </Button>
                </div>
              </div>

              {/* Search & Filter Chips */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    id="comm-search-input"
                    aria-label="Cari percakapan"
                    type="text"
                    placeholder="Cari obrolan..."
                    value={searchQuery}
                    onChange={(e) => {
                      const parsed = searchFilterSchema.safeParse({ query: e.target.value });
                      if (parsed.success) {
                        setSearchQuery(e.target.value);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {(['ALL', 'UNREAD', 'DISPOSISI', 'DIRECT'] as const)?.map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setActiveFilter(filterKey)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        activeFilter === filterKey
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {filterKey === 'ALL' && 'Semua'}
                      {filterKey === 'UNREAD' && 'Belum Dibaca'}
                      {filterKey === 'DISPOSISI' && 'Disposisi'}
                      {filterKey === 'DIRECT' && 'Langsung'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thread list items */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {isLoadingThreads ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mx-auto mb-2" />
                    Memuat percakapan...
                  </div>
                ) : threads.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tidak ada percakapan ditemukan.
                  </div>
                ) : (
                  threads?.map((t) => {
                    const isSelected = t.id === selectedThreadId;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectThread(t)}
                        className={`px-3.5 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-slate-100 dark:bg-slate-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                          {t.title?.substring(0, 2).toUpperCase() || 'CH'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                              {t.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatThreadDate(t.last_message_at || t.updated_at)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {t.last_message || 'Belum ada pesan'}
                          </p>
                        </div>
                        {t.isUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </aside>

            {/* ── RIGHT MAIN CHAT CONVERSATION PANEL ───────────────────────────── */}
            <main className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
              {selectedThreadId ? (
                <>
                  <div className="md:hidden px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedThreadId(null)}
                      className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Kembali ke Daftar</span>
                  </div>

                  <ChatConversationPanel
                    threadId={selectedThreadId}
                    onStartAudioCall={(recId, recName) => handleStartDirectCall(recId, recName, 'audio')}
                    onStartVideoCall={(recId, recName) => handleStartDirectCall(recId, recName, 'video')}
                    onJoinVirtualMeeting={() => handleJoinSchoolMeeting()}
                  />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-900 text-emerald-500 flex items-center justify-center mb-4 shadow-sm border border-slate-200 dark:border-slate-800">
                    <ChatBubbleLeftRightIcon className="w-10 h-10" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Pusat Komunikasi Absenta
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Pilih salah satu percakapan di kolom sebelah kiri atau buat obrolan baru untuk memulai koordinasi.
                  </p>
                </div>
              )}
            </main>
          </div>
        </SectionCard>
      </AcademicPageLayout>

      {/* Modals & Overlays */}
      {isNewModalOpen && (
        <NewConversationModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onCreated={(threadId) => {
            setIsNewModalOpen(false);
            setSelectedThreadId(threadId);
            queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
          }}
        />
      )}

      {isMeetingModalOpen && (
        <VirtualMeetingModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          roomId={meetingRoomId}
          userId={user?.id || 'guest-staff'}
          userName={user?.full_name || 'Staff User'}
          userRole={user?.role || 'Staff'}
        />
      )}

      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {callState !== 'IDLE' && callState !== 'RINGING_INCOMING' && (
        <ActiveCallOverlay
          callState={callState}
          remoteUserName={remoteUser?.name}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onEndCall={endCall}
        />
      )}
    </InfraErrorBoundary>
  );
}
