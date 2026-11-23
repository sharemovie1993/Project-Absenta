import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { 
  internalCommunicationApi, 
  communicationKeys, 
  InternalThreadItem 
} from '@/api/internal-communication.api';
import { 
  XMarkIcon, 
  PaperAirplaneIcon, 
  ArrowTopRightOnSquareIcon,
  MegaphoneIcon,
  PlusIcon,
  MinusIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, isToday, isYesterday } from 'date-fns';
import { playNotificationSound } from '@/utils/audioUtils';
import { NewConversationModal } from '@/components/communication/NewConversationModal';
import {
  ChatAvatar,
  ThreadProfileModal,
  MemberQuickActionSheet,
  UserProfileModal,
  type QuickActionMember
} from '@/components/communication/ThreadProfileModal';
import { useWebRTCCall } from '@/hooks/communication/useWebRTCCall';
import { IncomingCallModal } from '@/components/communication/calling/IncomingCallModal';
import { ActiveCallOverlay } from '@/components/communication/calling/ActiveCallOverlay';
import toast from 'react-hot-toast';

export default function FloatingMessenger() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState<'ALL' | 'UNREAD' | 'GROUP' | 'KELAS_BINAAN' | 'BROADCAST'>('ALL');
  const [replyText, setReplyText] = useState('');
  const [incomingBanner, setIncomingBanner] = useState<{
    threadId: string;
    title: string;
    senderName: string;
    content: string;
    isBroadcast?: boolean;
  } | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newModalTab, setNewModalTab] = useState<'DIRECT' | 'DISPOSISI' | 'BROADCAST'>('BROADCAST');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [actionMember, setActionMember] = useState<QuickActionMember | null>(null);
  const [infoUserId, setInfoUserId] = useState<string | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('absenta_chat_muted') === '1';
    } catch {
      return false;
    }
  });
  const isSoundMutedRef = useRef(isSoundMuted);
  useEffect(() => {
    isSoundMutedRef.current = isSoundMuted;
  }, [isSoundMuted]);

  const toggleSoundMute = () => {
    setIsSoundMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('absenta_chat_muted', next ? '1' : '0');
      } catch {}
      if (!next) {
        try {
          playNotificationSound();
        } catch {}
      }
      return next;
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messengerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      if (isNewModalOpen || isProfileOpen || actionMember || infoUserId) return;
      const target = event.target as Node | null;
      if (messengerContainerRef.current && target && !messengerContainerRef.current.contains(target)) {
        setIsOpen(false);
        setIncomingBanner(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [isOpen, isNewModalOpen, isProfileOpen, actionMember, infoUserId]);

  const isCommunicationPage = location.pathname.startsWith('/komunikasi');

  const userRoleName = useMemo(() => {
    const raw = (user as any)?.role;
    if (!raw) return String((user as any)?.roleName || '');
    if (typeof raw === 'object') return String(raw.name || '');
    return String(raw);
  }, [user]);

  const {
    callState,
    incomingCall,
    remoteUser,
    isMuted: isCallMuted,
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
    toggleScreenShare,
  } = useWebRTCCall({
    socket,
    currentUserId: user?.id,
    currentUserName: user?.full_name || 'Pengguna',
    currentUserRole: userRoleName || 'GURU',
  });

  const handleMessageMember = async (member: QuickActionMember) => {
    if (!member?.user_id || member.user_id === user?.id) return;
    try {
      const dmThread = await internalCommunicationApi.createThread({
        type: 'DIRECT',
        targetUserIds: [member.user_id],
        category: 'UMUM',
      });
      if (dmThread?.id) {
        await queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
        setSelectedThreadId(dmThread.id);
        setIsOpen(true);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Tidak dapat membuka obrolan pribadi dengan anggota ini');
    }
  };

  const canBroadcast = useMemo(() => {
    const r = userRoleName.toUpperCase();
    if (['SUPERADMIN', 'ADMIN', 'KEPALA_SEKOLAH', 'TU'].includes(r)) return true;
    const jabatanList: string[] = Array.isArray((user as any)?.jabatan_list)
      ? (user as any).jabatan_list
      : Array.isArray((user as any)?.guru_profile?.jabatan_list)
      ? (user as any).guru_profile.jabatan_list
      : [];
    const structuralTokens = ['KEPALA', 'WAKA', 'KURIKULUM', 'KESISWAAN', 'HUMAS', 'SARPRAS', 'KAPROG', 'KOORDINATOR'];
    return jabatanList.some((j) =>
      structuralTokens.some((tok) => String(j || '').toUpperCase().includes(tok))
    );
  }, [userRoleName, user]);

  // ── 1. Unread Counter Query ───────────────────────────────────────────────
  const { data: unreadCount = 0 } = useQuery({
    queryKey: communicationKeys.unreadCount(),
    queryFn: () => internalCommunicationApi.getUnreadCount(),
    enabled: !!user?.id,
    staleTime: 15 * 1000,
    refetchInterval: 25 * 1000
  });

  // ── 2. Threads Query ──────────────────────────────────────────────────────
  const { data: threadsData = [] } = useQuery({
    queryKey: communicationKeys.threads(),
    queryFn: () => internalCommunicationApi.getThreads(),
    enabled: !!user?.id && isOpen,
    staleTime: 10 * 1000
  });

  const threads: InternalThreadItem[] = useMemo(() => {
    if (Array.isArray(threadsData)) return threadsData;
    return ((threadsData as any)?.data || []) as InternalThreadItem[];
  }, [threadsData]);

  // ── 3. Active Thread Messages Query ───────────────────────────────────────
  const { data: activeThreadDetail, isLoading: isLoadingMessages } = useQuery({
    queryKey: communicationKeys.messages(selectedThreadId || ''),
    queryFn: () => internalCommunicationApi.getThreadMessages(selectedThreadId!),
    enabled: !!selectedThreadId && isOpen,
    staleTime: 5 * 1000
  });

  // Auto scroll ke pesan paling bawah saat berada di dalam ruang chat
  useEffect(() => {
    if (isOpen && selectedThreadId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      queryClient.invalidateQueries({ queryKey: communicationKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
    }
  }, [activeThreadDetail?.messages, isOpen, selectedThreadId, queryClient]);

  // Filter daftar percakapan vertikal ala WhatsApp
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      const isBc =
        Boolean((t as any)?.context_ref?.isBroadcast) ||
        String(t.title || '').startsWith('📢');
      const isGrp =
        t.type === 'GROUP' ||
        Boolean((t as any)?.context_ref?.isAutoGroup);
      const isKelasBinaan =
        t.type === 'GROUP' &&
        (t as any)?.context_ref?.groupScope === 'KELAS';
      if (listFilter === 'UNREAD' && !t.isUnread) return false;
      if (listFilter === 'GROUP' && !isGrp) return false;
      if (listFilter === 'KELAS_BINAAN' && !isKelasBinaan) return false;
      if (listFilter === 'BROADCAST' && !isBc) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = String(t.title || '').toLowerCase().includes(q);
        const lastMsgMatch = String((t as any).last_message || t.lastMessage?.content || '')
          .toLowerCase()
          .includes(q);
        return titleMatch || lastMsgMatch;
      }
      return true;
    });
  }, [threads, listFilter, searchQuery]);

  const formatRowTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isToday(d)) return format(d, 'HH:mm');
      if (isYesterday(d)) return 'Kemarin';
      return format(d, 'dd/MM/yy');
    } catch {
      return '';
    }
  };

  // ── 4. Send Message Mutation ──────────────────────────────────────────────
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      internalCommunicationApi.sendMessage(selectedThreadId!, { content }),
    onSuccess: (newMessage) => {
      setReplyText('');
      queryClient.setQueryData(
        communicationKeys.messages(selectedThreadId!),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...(old.messages || []), { ...newMessage, is_me: true }]
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
    }
  });

  // ── 5. Real-time Socket Listener (Auto Pop-up Messenger on Broadcast / Incoming Chat) ──
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleIncomingBroadcast = (data: any) => {
      const tid = data?.threadId || data?.message?.thread_id;
      const senderId = data?.senderId || data?.message?.sender_id;
      queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
      queryClient.invalidateQueries({ queryKey: communicationKeys.unreadCount() });
      if (tid) {
        queryClient.invalidateQueries({ queryKey: communicationKeys.messages(tid) });
      }

      if (senderId && senderId !== user.id) {
        if (!isSoundMutedRef.current) {
          try {
            playNotificationSound();
          } catch {}
        }
        setIncomingBanner({
          threadId: tid,
          title: data?.title || '📢 Siaran Pengumuman Sekolah',
          senderName: data?.senderName || data?.message?.sender_name || 'Administrator',
          content: data?.message?.content || '',
          isBroadcast: true,
        });
      }
    };

    const handleNewMsg = (data: any) => {
      const tid = data?.threadId || data?.message?.thread_id;
      const senderId = data?.senderId || data?.message?.sender_id;

      if (tid) {
        queryClient.invalidateQueries({ queryKey: communicationKeys.messages(tid) });
      }
      queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
      queryClient.invalidateQueries({ queryKey: communicationKeys.unreadCount() });

      if (senderId && senderId !== user.id) {
        if (!isSoundMutedRef.current) {
          try {
            playNotificationSound();
          } catch {}
        }
        setIncomingBanner({
          threadId: tid,
          title: data?.title || data?.message?.sender_name || 'Pesan Baru Masuk',
          senderName: data?.message?.sender_name || 'Pengguna',
          content: data?.message?.content || '',
          isBroadcast: Boolean(data?.audienceLabel),
        });
      }
    };

    socket.on('internal_comm:broadcast', handleIncomingBroadcast);
    socket.on('internal_comm:new_message', handleNewMsg);
    socket.on('internal_comm:new_thread', () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
      queryClient.invalidateQueries({ queryKey: communicationKeys.unreadCount() });
    });

    return () => {
      socket.off('internal_comm:broadcast', handleIncomingBroadcast);
      socket.off('internal_comm:new_message', handleNewMsg);
    };
  }, [socket, selectedThreadId, queryClient, user?.id]);

  // Jangan render floating widget jika sudah berada di halaman Pusat Komunikasi
  if (isCommunicationPage || !user?.id) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThreadId || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(replyText.trim());
  };

  const activeThread = threads.find((t: InternalThreadItem) => t.id === selectedThreadId);
  const isBroadcastThread =
    Boolean((activeThread as any)?.context_ref?.isBroadcast) ||
    Boolean((activeThreadDetail?.thread as any)?.context_ref?.isBroadcast) ||
    String(activeThread?.title || activeThreadDetail?.thread?.title || '').startsWith('📢');

  const broadcastSenderId =
    (activeThreadDetail?.thread as any)?.created_by ||
    (activeThread as any)?.created_by ||
    activeThreadDetail?.messages?.[0]?.sender_id ||
    '';

  const canPostInBroadcast = useMemo(() => {
    if (!isBroadcastThread) return true;
    const r = userRoleName.toUpperCase();
    if (['SUPERADMIN', 'ADMIN', 'KEPALA_SEKOLAH'].includes(r)) return true;
    return Boolean(user?.id && broadcastSenderId && user.id === broadcastSenderId);
  }, [isBroadcastThread, userRoleName, user?.id, broadcastSenderId]);

  const handleReplyPrivatelyToSender = async () => {
    if (!broadcastSenderId || broadcastSenderId === user?.id) return;
    try {
      const dmThread = await internalCommunicationApi.createThread({
        type: 'DIRECT',
        targetUserIds: [broadcastSenderId],
        category: 'UMUM',
      });
      if (dmThread?.id) {
        await queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
        setSelectedThreadId(dmThread.id);
      }
    } catch {
      navigate('/komunikasi');
    }
  };

  return (
    <>
      {/* Backdrop Blur saat Floating Messenger dibuka agar fokus ke jendela chat */}
      {isOpen && (
        <div
          onClick={() => {
            setIsOpen(false);
            setIncomingBanner(null);
          }}
          className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-xs transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      <div ref={messengerContainerRef} className="fixed bottom-20 right-4 lg:bottom-4 lg:right-6 z-50 flex flex-col items-end">
        {/* ── POPUP MESSENGER WINDOW (Full-Page di HP, Floating Blur Backdrop di Desktop) ── */}
        {isOpen && (
          <div className="fixed inset-0 sm:static sm:mb-2.5 w-full h-full sm:w-[390px] sm:h-[520px] bg-white dark:bg-[#111b21] rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in sm:slide-in-from-bottom-4 duration-200 z-50">
            {/* Messenger Top Header Bar */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#075e54] to-[#008069] dark:from-[#202c33] dark:to-[#111b21] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                {selectedThreadId ? (
                  <button
                    type="button"
                    onClick={() => setSelectedThreadId(null)}
                    title="Kembali ke Daftar Chat"
                    className="p-1.5 -ml-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                  >
                    <ArrowLeftIcon className="w-4 h-4 stroke-[2.5]" />
                  </button>
                ) : null}

                <div
                  onClick={() => {
                    if (selectedThreadId) setIsProfileOpen(true);
                  }}
                  className={`flex items-center gap-2 min-w-0 ${
                    selectedThreadId ? 'cursor-pointer hover:opacity-90' : ''
                  }`}
                  title={selectedThreadId ? 'Klik untuk melihat info & anggota profil' : undefined}
                >
                  {selectedThreadId ? (
                    <ChatAvatar
                      src={(activeThread as any)?.avatar || (activeThread as any)?.otherUser?.avatar}
                      name={activeThread?.title || activeThreadDetail?.thread?.title || 'CH'}
                      size="sm"
                      isBroadcast={isBroadcastThread}
                      isGroup={activeThread?.type === 'GROUP'}
                      className="border-white/30"
                    />
                  ) : (
                    <div className="relative w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-xs">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                      </svg>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#25d366] border-2 border-[#075e54]" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="font-bold text-xs truncate">
                      {selectedThreadId
                        ? activeThread?.title || activeThreadDetail?.thread?.title || 'Percakapan'
                        : 'Messenger Sekolah'}
                    </h4>
                    <p className="text-[10px] text-emerald-100 dark:text-[#8696a0] truncate">
                      {selectedThreadId
                        ? isBroadcastThread
                          ? 'Siaran Pengumuman Resmi'
                          : activeThread?.type === 'GROUP'
                          ? 'Klik untuk lihat anggota & info grup'
                          : 'Klik untuk lihat profil'
                        : `${threads.length} Percakapan${unreadCount > 0 ? ` • ${unreadCount} Belum Dibaca` : ''}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {selectedThreadId && (
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    title="Lihat Profil / Anggota Grup"
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <InformationCircleIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleSoundMute}
                  title={isSoundMuted ? 'Aktifkan Suara Notifikasi' : 'Bisukan Suara Notifikasi'}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  {isSoundMuted ? (
                    <SpeakerXMarkIcon className="w-4 h-4 text-rose-200" />
                  ) : (
                    <SpeakerWaveIcon className="w-4 h-4" />
                  )}
                </button>
                {canBroadcast && !selectedThreadId && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewModalTab('BROADCAST');
                      setIsNewModalOpen(true);
                    }}
                    title="Kirim Broadcast ke Seluruh Pengguna"
                    className="px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer mr-0.5"
                  >
                    <MegaphoneIcon className="w-3.5 h-3.5" />
                    <span>Broadcast</span>
                  </button>
                )}
                {!selectedThreadId && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewModalTab('DIRECT');
                      setIsNewModalOpen(true);
                    }}
                    title="Mulai Chat Baru"
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/komunikasi');
                  }}
                  title="Buka Pusat Komunikasi Layar Penuh"
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIncomingBanner(null);
                  }}
                  title="Kecilkan Messenger"
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Incoming Broadcast / Message Alert Banner (Clickable to open that conversation) */}
            {incomingBanner && (
              <div
                onClick={() => {
                  if (incomingBanner.threadId) {
                    setSelectedThreadId(incomingBanner.threadId);
                  }
                  setIncomingBanner(null);
                }}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2 text-[11px] cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <span className="font-extrabold text-amber-800 dark:text-amber-300 block truncate">
                    {incomingBanner.isBroadcast ? '📢 Siaran Baru: ' : '💬 Pesan Baru: '}
                    {incomingBanner.title}
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 truncate block">
                    Dari: {incomingBanner.senderName} • Klik untuk membaca
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIncomingBanner(null);
                  }}
                  className="text-amber-600 hover:text-amber-800 p-0.5 cursor-pointer shrink-0"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ── SCREEN 1: WHATSAPP VERTICAL CONVERSATION LIST (1 Row ke Bawah) ── */}
            {!selectedThreadId ? (
              <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#111b21]">
                {/* Search & Filter Bar ala WhatsApp */}
                <div className="p-2.5 border-b border-slate-100 dark:border-[#202c33] space-y-2 shrink-0 bg-slate-50/50 dark:bg-[#111b21]">
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari kontak atau isi obrolan..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#202c33] border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-[#00a884]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'ALL' as const, label: 'Semua' },
                      { id: 'UNREAD' as const, label: `Belum Dibaca${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
                      { id: 'GROUP' as const, label: '👥 Grup' },
                      ...(String((user as any)?.role?.name || user?.role || '').toUpperCase() !== 'SISWA'
                        ? [{ id: 'KELAS_BINAAN' as const, label: '🏫 Kelas Binaan' }]
                        : []),
                      { id: 'BROADCAST' as const, label: '📢 Siaran' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setListFilter(f.id)}
                        className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          listFilter === f.id
                            ? 'bg-[#d9fdd3] text-[#008069] dark:bg-[#00a884]/25 dark:text-[#00a884]'
                            : 'bg-slate-100 dark:bg-[#202c33] text-slate-500 dark:text-[#8696a0] hover:bg-slate-200/70'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vertical Conversation Rows (1 Row per Conversation) */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#202c33]">
                  {filteredThreads.length === 0 ? (
                    <div className="text-center text-[#667781] dark:text-[#8696a0] py-14 px-4 space-y-2.5">
                      <p className="text-xs font-semibold">
                        {searchQuery ? 'Tidak ada obrolan yang cocok' : 'Belum ada riwayat percakapan'}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        {canBroadcast && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewModalTab('BROADCAST');
                              setIsNewModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 cursor-pointer"
                          >
                            📢 Buat Broadcast
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setNewModalTab('DIRECT');
                            setIsNewModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#202c33] text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-200 cursor-pointer"
                        >
                          + Mulai Chat Baru
                        </button>
                      </div>
                    </div>
                  ) : (
                    filteredThreads.map((t: any) => {
                      const isBc =
                        Boolean(t?.context_ref?.isBroadcast) ||
                        String(t.title || '').startsWith('📢');
                      const isGrp =
                        t.type === 'GROUP' ||
                        Boolean(t?.context_ref?.isAutoGroup);
                      const grpScope = t?.context_ref?.groupScope;
                      const memberCount = t?.context_ref?.memberCount || t?.participants?.length || 0;
                      const lastPreview =
                        t.last_message ||
                        t.lastMessage?.content ||
                        'Klik untuk membuka percakapan';
                      const lastTime = formatRowTime(
                        t.last_message_at || t.lastMessage?.created_at || t.updated_at
                      );
                      const roleBadge = isBc
                        ? 'SIARAN'
                        : isGrp
                        ? grpScope === 'KELAS'
                          ? `KELAS${memberCount ? ` • ${memberCount}` : ''}`
                          : `DIVISI${memberCount ? ` • ${memberCount}` : ''}`
                        : t.otherUser?.role || t.otherUser?.role_label || '';

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedThreadId(t.id)}
                          className={`px-3.5 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                            t.isUnread
                              ? 'bg-emerald-50/40 dark:bg-[#202c33]/70 hover:bg-emerald-50/80 dark:hover:bg-[#202c33]'
                              : 'hover:bg-slate-50 dark:hover:bg-[#202c33]/50'
                          }`}
                        >
                          {/* Avatar Bulat di Kiri (Foto Profil layaknya WhatsApp) */}
                          {isBc || isGrp ? (
                            <div
                              className={`relative w-11 h-11 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 shadow-2xs ${
                                isBc
                                  ? 'bg-amber-500 text-white'
                                  : grpScope === 'KELAS'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-teal-600 text-white'
                              }`}
                            >
                              {isBc ? (
                                <span className="text-base">📢</span>
                              ) : (
                                <span className="text-base">{grpScope === 'KELAS' ? '🏫' : '👥'}</span>
                              )}
                            </div>
                          ) : (
                            <ChatAvatar
                              src={t.avatar || t.otherUser?.avatar}
                              name={t.title}
                              size="lg"
                            />
                          )}

                          {/* Nama, Waktu, & Preview Pesan Terakhir (1 Row ke Bawah ala WhatsApp) */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`text-[13px] truncate ${
                                    t.isUnread
                                      ? 'font-extrabold text-slate-900 dark:text-white'
                                      : 'font-bold text-slate-800 dark:text-[#e9edef]'
                                  }`}
                                >
                                  {t.title}
                                </span>
                                {roleBadge && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold shrink-0 ${
                                      isBc
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                  >
                                    {typeof roleBadge === 'object' ? (roleBadge as any)?.name : roleBadge}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[10.5px] shrink-0 ${
                                  t.isUnread
                                    ? 'font-bold text-[#00a884]'
                                    : 'text-slate-400 dark:text-[#8696a0]'
                                }`}
                              >
                                {lastTime}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p
                                className={`text-[11.5px] truncate ${
                                  t.isUnread
                                    ? 'font-semibold text-slate-800 dark:text-slate-200'
                                    : 'text-slate-500 dark:text-[#8696a0]'
                                }`}
                              >
                                {t.lastMessage?.sender_name && isBc
                                  ? `${t.lastMessage.sender_name}: ${lastPreview}`
                                  : lastPreview}
                              </p>
                              {t.isUnread && (
                                <span className="w-2.5 h-2.5 rounded-full bg-[#25d366] shrink-0 shadow-2xs" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* ── SCREEN 2: ACTIVE CHAT ROOM (Dibuka Saat Salah Satu Baris Diklik) ── */
              <>
                <div 
                  className="flex-1 overflow-y-auto p-3 space-y-2 text-xs bg-[#efeae2] dark:bg-[#0b141a]"
                  style={{
                    backgroundImage: `radial-gradient(#00a88410 1px, transparent 1px)`,
                    backgroundSize: '16px 16px'
                  }}
                >
                  {isLoadingMessages ? (
                    <div className="text-center text-[#667781] dark:text-[#8696a0] py-8">Memuat obrolan...</div>
                  ) : !activeThreadDetail?.messages || activeThreadDetail.messages.length === 0 ? (
                    <div className="text-center text-[#667781] dark:text-[#8696a0] py-12">
                      <p className="font-semibold">Belum ada pesan dalam obrolan ini</p>
                    </div>
                  ) : (
                    activeThreadDetail.messages.map((m: any) => {
                      const isMe = m.is_me;
                      const roleStr =
                        typeof m.sender_role === 'object'
                          ? (m.sender_role as any)?.name
                          : m.sender_role;
                      const openMemberAction = () => {
                        if (!m.sender_id) return;
                        setActionMember({
                          user_id: m.sender_id,
                          name: m.sender_name || 'Pengguna',
                          role: roleStr,
                          avatar: m.sender_avatar,
                        });
                      };
                      return (
                        <div key={m.id} className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {!isMe && (
                            <button
                              type="button"
                              onClick={openMemberAction}
                              className="cursor-pointer hover:opacity-85 transition-opacity shrink-0 mb-0.5"
                              title={`Klik untuk opsi ${m.sender_name || 'anggota'}`}
                            >
                              <ChatAvatar
                                src={m.sender_avatar}
                                name={m.sender_name}
                                size="xs"
                              />
                            </button>
                          )}
                          <div
                            className={`max-w-[82%] rounded-xl px-3 py-2 text-xs shadow-2xs ${
                              isMe
                                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
                                : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none border border-slate-200/60 dark:border-slate-700'
                            }`}
                          >
                            {!isMe && m.sender_name && (
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span
                                  onClick={openMemberAction}
                                  className="text-[10.5px] font-extrabold text-[#008069] dark:text-[#00a884] cursor-pointer hover:underline"
                                >
                                  {m.sender_name}
                                </span>
                                {roleStr && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold">
                                    {roleStr}
                                  </span>
                                )}
                              </div>
                            )}
                            <p className="leading-relaxed whitespace-pre-wrap break-words text-[12px]">
                              {m.content}
                            </p>
                            <span className="block text-[9px] text-right mt-1 text-[#667781] dark:text-[#8696a0]">
                              {m.created_at ? format(new Date(m.created_at), 'HH:mm') : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Footer (One-Way Read-Only Lock for Broadcast Recipients vs Reply Input) */}
                {isBroadcastThread && !canPostInBroadcast ? (
                  <div className="p-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#2a3942] flex items-center justify-between gap-2 shrink-0">
                    <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                      🔒 Saluran Siaran Resmi Satu Arah
                    </span>
                    {broadcastSenderId && broadcastSenderId !== user?.id && (
                      <button
                        type="button"
                        onClick={handleReplyPrivatelyToSender}
                        className="px-2.5 py-1.5 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white text-[10.5px] font-bold shadow-xs transition-all shrink-0 cursor-pointer"
                      >
                        💬 Balas Pribadi
                      </button>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="p-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#2a3942] flex items-center gap-1.5 shrink-0">
                    <input
                      type="text"
                      placeholder={
                        isBroadcastThread
                          ? 'Kirim pengumuman susulan ke siaran ini...'
                          : 'Ketik pesan...'
                      }
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] outline-hidden shadow-2xs"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || sendMessageMutation.isPending}
                      className="p-2 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 text-white rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                      title="Kirim Balasan"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}

        {/* ── DOCKED MESSENGER TRIGGER BAR / PILL (Bottom-Right Messenger Style) ── */}
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className={`relative ${isOpen ? 'hidden sm:flex' : 'flex'} items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-[#008069] to-[#25d366] hover:from-[#075e54] hover:to-[#20bd5a] text-white shadow-xl hover:shadow-2xl hover:scale-[1.03] active:scale-95 transition-all cursor-pointer border border-white/20`}
          title="Buka Messenger Sekolah"
        >
          <span className="relative flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.912 1.447 5.51 3.713 7.206V22l3.398-1.868c.91.252 1.88.39 2.889.39 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.07 12.44l-2.548-2.718-4.97 2.718 5.468-5.805 2.612 2.718 4.906-2.718-5.468 5.805z" />
            </svg>
          </span>
          <span className="text-xs font-extrabold tracking-tight hidden sm:inline">
            Messenger
          </span>

          {/* Unread Counter Badge */}
          {unreadCount > 0 && (
            <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 bg-rose-600 text-white text-[10.5px] font-black rounded-full border-2 border-white dark:border-slate-900 shadow-xs animate-bounce">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Modal Profil Kontak / Anggota Grup & Wali Kelas */}
      {isProfileOpen && selectedThreadId && (
        <ThreadProfileModal
          threadId={selectedThreadId}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onSelectMember={(m) => setActionMember(m)}
        />
      )}

      {/* Slide-Up Bottom Sheet ala WhatsApp Group (Kirim Pesan, Telepon, Video, Info) */}
      <MemberQuickActionSheet
        member={actionMember}
        isOpen={Boolean(actionMember)}
        onClose={() => setActionMember(null)}
        onMessage={handleMessageMember}
        onAudioCall={(m) =>
          initiateCall({ recipientId: m.user_id, recipientName: m.name, callType: 'audio' })
        }
        onVideoCall={(m) =>
          initiateCall({ recipientId: m.user_id, recipientName: m.name, callType: 'video' })
        }
        onViewInfo={(m) => setInfoUserId(m.user_id)}
      />

      {/* Modal Info Profil Lengkap Anggota */}
      <UserProfileModal
        userId={infoUserId}
        isOpen={Boolean(infoUserId)}
        onClose={() => setInfoUserId(null)}
        onMessage={handleMessageMember}
        onAudioCall={(m) =>
          initiateCall({ recipientId: m.user_id, recipientName: m.name, callType: 'audio' })
        }
        onVideoCall={(m) =>
          initiateCall({ recipientId: m.user_id, recipientName: m.name, callType: 'video' })
        }
      />

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
          isMuted={isCallMuted}
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

      {/* Modal Broadcast / Percakapan Baru langsung dari Floating Messenger */}
      {isNewModalOpen && (
        <NewConversationModal
          isOpen={isNewModalOpen}
          initialTab={newModalTab}
          onClose={() => setIsNewModalOpen(false)}
          onCreated={(threadId) => {
            setIsNewModalOpen(false);
            setSelectedThreadId(threadId);
            setIsOpen(true);
            queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
          }}
        />
      )}
    </>
  );
}
