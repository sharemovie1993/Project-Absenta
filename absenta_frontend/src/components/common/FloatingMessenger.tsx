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
  MinusIcon
} from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { playNotificationSound } from '@/utils/audioUtils';
import { NewConversationModal } from '@/components/communication/NewConversationModal';

export default function FloatingMessenger() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isCommunicationPage = location.pathname.startsWith('/komunikasi');

  const userRoleName = useMemo(() => {
    const raw = (user as any)?.role;
    if (!raw) return String((user as any)?.roleName || '');
    if (typeof raw === 'object') return String(raw.name || '');
    return String(raw);
  }, [user]);

  const canBroadcast = useMemo(() => {
    const r = userRoleName.toUpperCase();
    return ['SUPERADMIN', 'ADMIN', 'KEPALA_SEKOLAH', 'TU', 'GURU'].includes(r);
  }, [userRoleName]);

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

  // Auto-pilih thread pertama jika belum ada yang dipilih
  useEffect(() => {
    if (isOpen && threads.length > 0 && !selectedThreadId) {
      setSelectedThreadId(threads[0].id);
    }
  }, [isOpen, threads, selectedThreadId]);

  // Auto scroll ke pesan paling bawah
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      queryClient.invalidateQueries({ queryKey: communicationKeys.unreadCount() });
    }
  }, [activeThreadDetail?.messages, isOpen, queryClient]);

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
        setSelectedThreadId(tid);
      }

      if (senderId && senderId !== user.id) {
        try {
          playNotificationSound();
        } catch {}
        setIncomingBanner({
          threadId: tid,
          title: data?.title || '📢 Siaran Pengumuman Sekolah',
          senderName: data?.senderName || data?.message?.sender_name || 'Administrator',
          content: data?.message?.content || '',
          isBroadcast: true,
        });
        // Auto-open Messenger window at bottom-right so recipient immediately sees the broadcast!
        setIsOpen(true);
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
        try {
          playNotificationSound();
        } catch {}
        if (tid) {
          setSelectedThreadId(tid);
        }
        setIncomingBanner({
          threadId: tid,
          title: data?.title || data?.message?.sender_name || 'Pesan Baru Masuk',
          senderName: data?.message?.sender_name || 'Pengguna',
          content: data?.message?.content || '',
          isBroadcast: Boolean(data?.audienceLabel),
        });
        // Auto-open Messenger dock when a new message arrives
        setIsOpen(true);
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
    String(activeThread?.title || '').startsWith('📢');

  return (
    <>
      <div className="fixed bottom-20 right-4 lg:bottom-4 lg:right-6 z-50 flex flex-col items-end">
        {/* ── POPUP MESSENGER WINDOW (Docked Bottom-Right Messenger Style) ── */}
        {isOpen && (
          <div className="mb-2.5 w-[335px] sm:w-[375px] h-[480px] bg-[#efeae2] dark:bg-[#0b141a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Messenger Top Header Bar */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#075e54] to-[#008069] dark:from-[#1f2c34] dark:to-[#111b21] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-xs">
                  {isBroadcastThread ? (
                    <span>📢</span>
                  ) : (
                    activeThread?.title ? activeThread.title.slice(0, 2).toUpperCase() : 'MS'
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#25d366] border-2 border-[#075e54]" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs truncate">
                    {activeThread?.title || 'Messenger Sekolah'}
                  </h4>
                  <p className="text-[10px] text-emerald-100 dark:text-[#8696a0] truncate">
                    {isBroadcastThread
                      ? 'Siaran Pengumuman Resmi'
                      : activeThread?.type === 'DISPOSISI'
                      ? 'Disposisi & Koordinasi'
                      : 'Messenger Aktif'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {canBroadcast && (
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
                <button
                  type="button"
                  onClick={() => {
                    setNewModalTab('DIRECT');
                    setIsNewModalOpen(true);
                  }}
                  title="Chat Baru"
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
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

            {/* Incoming Broadcast Alert Banner inside Messenger */}
            {incomingBanner && (
              <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2 text-[11px]">
                <div className="min-w-0">
                  <span className="font-extrabold text-amber-800 dark:text-amber-300 block truncate">
                    {incomingBanner.isBroadcast ? '📢 Siaran Baru: ' : '💬 Pesan Baru: '}
                    {incomingBanner.title}
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 truncate block">
                    Dari: {incomingBanner.senderName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIncomingBanner(null)}
                  className="text-amber-600 hover:text-amber-800 p-0.5 cursor-pointer shrink-0"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Thread Selector Tabs */}
            {threads.length > 0 && (
              <div className="px-2.5 py-1.5 bg-[#f0f2f5] dark:bg-[#111b21] border-b border-[#e9edef] dark:border-[#202c33] flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {threads.slice(0, 8).map((t: InternalThreadItem) => {
                  const active = selectedThreadId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedThreadId(t.id)}
                      className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                        active
                          ? 'bg-[#00a884] text-white shadow-2xs'
                          : 'bg-white dark:bg-[#202c33] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#00a884]'
                      }`}
                    >
                      <span className="max-w-[120px] truncate">{t.title}</span>
                      {t.isUnread && !active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Messages Area */}
            <div 
              className="flex-1 overflow-y-auto p-3 space-y-2 text-xs"
              style={{
                backgroundImage: `radial-gradient(#00a88410 1px, transparent 1px)`,
                backgroundSize: '16px 16px'
              }}
            >
              {isLoadingMessages ? (
                <div className="text-center text-[#667781] dark:text-[#8696a0] py-8">Memuat obrolan...</div>
              ) : !activeThreadDetail?.messages || activeThreadDetail.messages.length === 0 ? (
                <div className="text-center text-[#667781] dark:text-[#8696a0] py-12 space-y-2">
                  <p className="font-semibold">Belum ada percakapan aktif</p>
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
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      + Chat Baru
                    </button>
                  </div>
                </div>
              ) : (
                activeThreadDetail.messages.map((m: any) => {
                  const isMe = m.is_me;
                  const roleStr =
                    typeof m.sender_role === 'object'
                      ? (m.sender_role as any)?.name
                      : m.sender_role;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[86%] rounded-xl px-3 py-2 text-xs shadow-2xs ${
                          isMe
                            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
                            : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none border border-slate-200/60 dark:border-slate-700'
                        }`}
                      >
                        {!isMe && m.sender_name && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10.5px] font-extrabold text-[#008069] dark:text-[#00a884]">
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

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#2a3942] flex items-center gap-1.5 shrink-0">
              <input
                type="text"
                placeholder={selectedThreadId ? 'Balas pesan di Messenger...' : 'Pilih percakapan...'}
                value={replyText}
                disabled={!selectedThreadId}
                onChange={e => setReplyText(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] outline-hidden shadow-2xs"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sendMessageMutation.isPending || !selectedThreadId}
                className="p-2 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 text-white rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                title="Kirim Balasan"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ── DOCKED MESSENGER TRIGGER BAR / PILL (Bottom-Right Messenger Style) ── */}
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-[#008069] to-[#25d366] hover:from-[#075e54] hover:to-[#20bd5a] text-white shadow-xl hover:shadow-2xl hover:scale-[1.03] active:scale-95 transition-all cursor-pointer border border-white/20"
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
