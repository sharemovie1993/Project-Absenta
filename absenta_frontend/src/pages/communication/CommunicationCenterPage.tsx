import React, { useState, useEffect, useMemo } from 'react';
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
  InternalThreadItem,
  InternalThreadCategory,
  InternalThreadPriority,
  InternalThreadType,
  InternalThreadStatus 
} from '@/api/internal-communication.api';
import { ChatConversationPanel } from '@/components/communication/ChatConversationPanel';
import { NewConversationModal } from '@/components/communication/NewConversationModal';
import { IncomingCallModal } from '@/components/communication/calling/IncomingCallModal';
import { ActiveCallOverlay } from '@/components/communication/calling/ActiveCallOverlay';
import { VirtualMeetingModal } from '@/components/communication/meeting/VirtualMeetingModal';
import { useWebRTCCall } from '@/hooks/communication/useWebRTCCall';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';
import { format, isToday, isYesterday } from 'date-fns';

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
  const [activeMeetings, setActiveMeetings] = useState<Array<{
    roomId: string;
    roomTitle: string;
    hostName: string;
    hostRole?: string;
    startedAt: string;
    participantCount: number;
    participants: any[];
  }>>([]);

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

    const handleActiveMeetings = (list: any[]) => {
      setActiveMeetings(list || []);
    };

    socket.on('meeting:active_list_update', handleActiveMeetings);

    return () => {
      socket.off('meeting:active_list_update', handleActiveMeetings);
    };
  }, [socket]);

  // ── WebRTC Calling Hook ───────────────────────────────────────────────────
  const {
    callState,
    callType,
    targetUser: activeTargetUser,
    incomingCall,
    isAudioMuted,
    isVideoDisabled,
    isScreenSharing,
    isMinimized,
    callDuration,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMuteAudio,
    toggleDisableVideo,
    toggleScreenShare,
    setIsMinimized
  } = useWebRTCCall();

  // ── 1. Query: Ambil Daftar Thread Percakapan (TanStack Query v5) ─────────────
  const { 
    data: threads = [], 
    isLoading: isLoadingThreads,
    refetch: refetchThreads
  } = useQuery({
    queryKey: communicationKeys.threads({ filter: activeFilter, search: searchQuery }),
    queryFn: () => internalCommunicationApi.getThreads({
      type: activeFilter === 'DIRECT' ? 'DIRECT' : activeFilter === 'DISPOSISI' ? 'DISPOSISI' : undefined,
      search: searchQuery.trim() || undefined
    }),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000
  });

  // ── 2. Query: Ambil Riwayat Pesan Thread Aktif ──────────────────────────────
  const {
    data: activeThreadDetail,
    isLoading: isLoadingMessages
  } = useQuery({
    queryKey: communicationKeys.messages(selectedThreadId || ''),
    queryFn: () => internalCommunicationApi.getThreadMessages(selectedThreadId!),
    enabled: Boolean(selectedThreadId),
    staleTime: 5 * 1000
  });

  // ── 3. Query: Kontak Sah Terpandu Relasi Akademik ───────────────────────────
  const {
    data: contacts = [],
    isLoading: isLoadingContacts
  } = useQuery({
    queryKey: communicationKeys.contacts(),
    queryFn: () => internalCommunicationApi.getContacts(),
    staleTime: 60 * 1000
  });

  // ── 4. Mutation: Kirim Pesan Baru (Optimistic Updates) ──────────────────────
  const sendMessageMutation = useMutation({
    mutationFn: (payload: { content: string; attachments?: any[] }) =>
      internalCommunicationApi.sendMessage(selectedThreadId!, payload),
    onSuccess: (newMessage) => {
      queryClient.setQueryData(
        communicationKeys.messages(selectedThreadId!),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...old.messages, { ...newMessage, is_me: true }]
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
    }
  });

  // ── 5. Mutation: Buat Thread Baru ───────────────────────────────────────────
  const createThreadMutation = useMutation({
    mutationFn: (payload: {
      type: InternalThreadType;
      title?: string;
      category?: InternalThreadCategory;
      priority?: InternalThreadPriority;
      targetUserIds: string[];
      initialMessage?: string;
      isConfidential?: boolean;
    }) => internalCommunicationApi.createThread(payload),
    onSuccess: (newThread) => {
      setIsNewModalOpen(false);
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
      if (newThread?.id) {
        setSelectedThreadId(newThread.id);
      }
    }
  });

  // ── 6. Mutation: Update Status Disposisi ─────────────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: ({ threadId, status }: { threadId: string; status: InternalThreadStatus }) =>
      internalCommunicationApi.updateStatus(threadId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.messages(selectedThreadId!) });
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
    }
  });

  // ── 7. Socket.io Real-Time Synchronization Bridge ───────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { threadId: string; message: any }) => {
      if (data.threadId === selectedThreadId) {
        queryClient.invalidateQueries({ queryKey: communicationKeys.messages(data.threadId) });
      }
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
      queryClient.invalidateQueries({ queryKey: communicationKeys.unreadCount() });
    };

    const handleNewThread = () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
    };

    socket.on('internal_comm:new_message', handleNewMessage);
    socket.on('internal_comm:new_thread', handleNewThread);
    socket.on('internal_comm:status_updated', () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
      if (selectedThreadId) {
        queryClient.invalidateQueries({ queryKey: communicationKeys.messages(selectedThreadId) });
      }
    });

    return () => {
      socket.off('internal_comm:new_message', handleNewMessage);
      socket.off('internal_comm:new_thread', handleNewThread);
      socket.off('internal_comm:status_updated');
    };
  }, [socket, selectedThreadId, queryClient]);

  // Thread aktif yang sedang dipilih
  const activeThread = useMemo(() => {
    return threads.find((t: InternalThreadItem) => t.id === selectedThreadId) || activeThreadDetail?.thread;
  }, [threads, selectedThreadId, activeThreadDetail]);

  // Target Lawan Bicara untuk Panggilan WebRTC
  const interlocutorUser = useMemo(() => {
    if (!activeThread?.participants) return null;
    const other = activeThread.participants.find(p => p.user_id !== user?.id) || activeThread.participants[0];
    if (!other) return null;
    return {
      id: other.user_id,
      name: other.name || activeThread.title || 'Kontak',
      role: other.role_label || other.role,
      avatar: other.avatar
    };
  }, [activeThread, user]);

  // Filter threads client-side jika memilih unread
  const filteredThreads = useMemo(() => {
    if (activeFilter === 'UNREAD') {
      return threads.filter((t: InternalThreadItem) => t.isUnread);
    }
    return threads;
  }, [threads, activeFilter]);

  const formatThreadTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isToday(d)) return format(d, 'HH:mm');
      if (isYesterday(d)) return 'Kemarin';
      return format(d, 'dd/MM/yy');
    } catch {
      return '';
    }
  };

  return (
    <div className="h-[calc(100vh-4.2rem)] flex bg-[#f0f2f5] dark:bg-[#111b21] overflow-hidden font-sans border-t border-slate-200/50 dark:border-slate-800 relative">
      {/* ── WHATSAPP LEFT PANEL (CONVERSATION LIST) ───────────────────────── */}
      <aside
        className={`w-full md:w-96 lg:w-[420px] bg-[#ffffff] dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#202c33] flex flex-col shrink-0 ${
          selectedThreadId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Panel Header */}
        <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between shrink-0 border-b border-[#e9edef] dark:border-[#2a3942]">
          <div className="flex items-center gap-3">
            {/* User Profile Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
              {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div>
              <p className="text-xs font-bold text-[#111b21] dark:text-[#e9edef] truncate max-w-[130px]">
                {user?.full_name || 'Pengguna'}
              </p>
              <p className="text-[10px] text-[#667781] dark:text-[#8696a0] truncate">
                {user?.role?.name || 'GTK'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[#54656f] dark:text-[#aebac1]">
            {/* Ruang Rapat Virtual Button */}
            <button
              onClick={() => setIsMeetingModalOpen(true)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-indigo-600 dark:text-indigo-400"
              title="Mulai Ruang Rapat Virtual"
            >
              <VideoCameraIcon className="w-5 h-5 stroke-[2]" />
            </button>
            <button
              onClick={() => refetchThreads()}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Perbarui Obrolan"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoadingThreads ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-[#00a884]"
              title="Mulai Percakapan Baru"
            >
              <PlusIcon className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* WhatsApp Search Bar & Filter Chips */}
        <div className="p-2.5 border-b border-[#e9edef] dark:border-[#202c33] bg-[#ffffff] dark:bg-[#111b21] space-y-2">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-[#54656f] dark:text-[#8696a0]" />
            <input
              type="text"
              placeholder="Cari atau mulai chat baru"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#f0f2f5] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] outline-hidden focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold no-scrollbar">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-[#e7fce3] text-[#008069] dark:bg-[#005c4b] dark:text-[#d9fdd3]'
                  : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setActiveFilter('UNREAD')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeFilter === 'UNREAD'
                  ? 'bg-[#e7fce3] text-[#008069] dark:bg-[#005c4b] dark:text-[#d9fdd3]'
                  : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-slate-200'
              }`}
            >
              Belum Dibaca
            </button>
            <button
              onClick={() => setActiveFilter('DIRECT')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeFilter === 'DIRECT'
                  ? 'bg-[#e7fce3] text-[#008069] dark:bg-[#005c4b] dark:text-[#d9fdd3]'
                  : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-slate-200'
              }`}
            >
              Chat 1-on-1
            </button>
            <button
              onClick={() => setActiveFilter('DISPOSISI')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeFilter === 'DISPOSISI'
                  ? 'bg-[#e7fce3] text-[#008069] dark:bg-[#005c4b] dark:text-[#d9fdd3]'
                  : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-slate-200'
              }`}
            >
              Disposisi Tugas
            </button>
            {activeMeetings.length > 0 && (
              <button
                onClick={() => {
                  if (activeMeetings[0]) {
                    setMeetingRoomId(activeMeetings[0].roomId);
                    setIsMeetingModalOpen(true);
                  }
                }}
                className="px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer animate-pulse"
              >
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                <span>Rapat Aktif ({activeMeetings.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* ── LIVE ONGOING MEETING ALERT BANNER ────────────────────────────── */}
        {activeMeetings.length > 0 && (
          <div className="p-2.5 bg-gradient-to-r from-red-950/30 via-slate-900/50 to-indigo-950/30 border-b border-red-500/20 space-y-2">
            {activeMeetings.map((m) => (
              <div
                key={m.roomId}
                className="p-3 bg-[#1e2329]/95 border border-red-500/40 rounded-2xl flex items-center justify-between shadow-lg"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="relative">
                    <span className="w-3 h-3 bg-red-500 rounded-full absolute -top-1 -right-1 animate-ping" />
                    <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400">
                      <VideoCameraIcon className="w-5 h-5 stroke-[2]" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 font-bold text-[9px] rounded uppercase tracking-wider">
                        Sedang Berlangsung
                      </span>
                      <h4 className="text-xs font-bold text-slate-100 truncate">{m.roomTitle}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      Host: <span className="text-slate-200 font-semibold">{m.hostName}</span> • <span className="text-emerald-400 font-bold">{m.participantCount} Peserta Hadir</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMeetingRoomId(m.roomId);
                    setIsMeetingModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#0E71EB] hover:bg-[#0060d6] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0 ml-2"
                >
                  Masuk Rapat
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5] dark:divide-[#202c33]">
          {isLoadingThreads ? (
            <div className="p-8 text-center text-xs text-[#667781] dark:text-[#8696a0]">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#00a884] border-t-transparent mx-auto mb-2" />
              <p>Memuat percakapan sekolah...</p>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#667781] dark:text-[#8696a0]">
              <ChatBubbleLeftRightIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada obrolan</p>
              <p className="mt-1 text-[11px]">Klik ikon '+' di atas untuk memulai chat dengan guru / staf.</p>
            </div>
          ) : (
            filteredThreads.map((t: InternalThreadItem) => {
              const isSelected = t.id === selectedThreadId;
              const other = t.participants?.find(p => p.user_id !== t.created_by) || t.participants?.[0];
              const titleDisplay = t.title || other?.name || 'Obrolan Internal';

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedThreadId(t.id)}
                  className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors relative ${
                    isSelected
                      ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
                      : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative w-12 h-12 rounded-full bg-[#00a884] text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs overflow-hidden">
                    {other?.avatar ? (
                      <img src={other.avatar} alt={titleDisplay} className="w-full h-full object-cover" />
                    ) : (
                      titleDisplay.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`text-[14px] truncate font-semibold ${
                        t.isUnread ? 'text-[#111b21] dark:text-[#e9edef] font-bold' : 'text-[#111b21] dark:text-[#e9edef]'
                      }`}>
                        {titleDisplay}
                      </h3>
                      <span className={`text-[11px] shrink-0 ${
                        t.isUnread ? 'text-[#25d366] font-bold' : 'text-[#667781] dark:text-[#8696a0]'
                      }`}>
                        {t.lastMessage?.created_at ? formatThreadTime(t.lastMessage.created_at) : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[12.5px] text-[#667781] dark:text-[#8696a0] truncate max-w-[200px] lg:max-w-[240px]">
                        {t.lastMessage?.content || 'Mulai percakapan baru...'}
                      </p>

                      {/* WhatsApp Green Unread Badge */}
                      {t.isUnread && (
                        <span className="w-5 h-5 rounded-full bg-[#25d366] text-white text-[10px] font-extrabold flex items-center justify-center shrink-0 shadow-xs">
                          1
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── WHATSAPP RIGHT PANEL (MAIN CHAT AREA) ────────────────────────── */}
      <main className="flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] overflow-hidden">
        {activeThread ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Mobile Back Button */}
            <div className="md:hidden px-3 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#2a3942] flex items-center gap-2 shrink-0">
              <button
                onClick={() => setSelectedThreadId(null)}
                className="p-1 rounded-lg text-[#54656f] dark:text-[#aebac1] hover:bg-black/5"
              >
                <ChevronLeftIcon className="w-5 h-5 stroke-[2.5]" />
              </button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Kembali ke Daftar Chat
              </span>
            </div>

            <ChatConversationPanel
              thread={activeThread}
              messages={activeThreadDetail?.messages || []}
              isLoadingMessages={isLoadingMessages}
              onSendMessage={(payload) => sendMessageMutation.mutate(payload)}
              isSendingMessage={sendMessageMutation.isPending}
              onUpdateStatus={(status) => updateStatusMutation.mutate({ threadId: activeThread.id, status })}
              isUpdatingStatus={updateStatusMutation.isPending}
              onStartCall={(type) => {
                if (interlocutorUser) {
                  startCall(interlocutorUser, type, activeThread.id);
                }
              }}
            />
          </div>
        ) : (
          /* WhatsApp Web Empty Screen */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#54656f] dark:text-[#8696a0] bg-[#f0f2f5] dark:bg-[#222e35] select-none">
            <div className="w-24 h-24 rounded-full bg-white dark:bg-[#111b21] text-[#00a884] flex items-center justify-center mb-6 shadow-md border border-slate-200/50 dark:border-slate-800">
              <ChatBubbleLeftRightIcon className="w-12 h-12 stroke-[1.8]" />
            </div>
            <h2 className="text-xl font-bold text-[#111b21] dark:text-[#e9edef]">
              Pusat Komunikasi Absenta Sekolah
            </h2>
            <p className="text-xs text-[#667781] dark:text-[#8696a0] max-w-md mt-2 leading-relaxed">
              Kirim dan terima pesan dari guru piket, wali kelas, guru mapel, dan bimbingan konseling serta lakukan panggilan suara / video berstandar WebRTC.
            </p>
            <div className="mt-8 flex items-center gap-4 text-[11px] text-[#667781] dark:text-[#8696a0]">
              <span>🔒 Terenkripsi & Terisolasi Multi-Tenant</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => setIsMeetingModalOpen(true)}
                className="text-[#00a884] font-bold hover:underline"
              >
                📹 Buka Ruang Rapat Virtual
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL PERCAKAPAN BARU ───────────────────────────────────────── */}
      <NewConversationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        contacts={contacts}
        isLoadingContacts={isLoadingContacts}
        onSubmit={(payload) => createThreadMutation.mutate(payload)}
        isSubmitting={createThreadMutation.isPending}
      />

      {/* ── WEBRTC CALLING OVERLAYS & MODALS ────────────────────────────── */}
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={acceptCall}
        onReject={rejectCall}
      />

      <ActiveCallOverlay
        callState={callState}
        callType={callType}
        targetUser={activeTargetUser}
        callDuration={callDuration}
        isAudioMuted={isAudioMuted}
        isVideoDisabled={isVideoDisabled}
        isScreenSharing={isScreenSharing}
        isMinimized={isMinimized}
        localStream={localStream}
        remoteStream={remoteStream}
        onEndCall={endCall}
        onToggleMuteAudio={toggleMuteAudio}
        onToggleDisableVideo={toggleDisableVideo}
        onToggleScreenShare={toggleScreenShare}
        onSetMinimized={setIsMinimized}
      />

      {/* ── RUANG RAPAT VIRTUAL MODAL ────────────────────────────────────── */}
      <VirtualMeetingModal
        isOpen={isMeetingModalOpen}
        roomId={meetingRoomId}
        onClose={() => {
          setIsMeetingModalOpen(false);
          if (window.location.search.includes('meeting=')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    </div>
  );
}
