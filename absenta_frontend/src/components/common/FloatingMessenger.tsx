import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { 
  internalCommunicationApi, 
  communicationKeys, 
  InternalThreadItem 
} from '@/api/internal-communication.api';
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  PaperAirplaneIcon, 
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function FloatingMessenger() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isCommunicationPage = window.location.pathname.startsWith('/komunikasi');

  // ── 1. Unread Counter Query ───────────────────────────────────────────────
  const { data: unreadCount = 0 } = useQuery({
    queryKey: communicationKeys.unreadCount(),
    queryFn: () => internalCommunicationApi.getUnreadCount(),
    enabled: !!user?.id,
    staleTime: 15 * 1000,
    refetchInterval: 20 * 1000
  });

  // ── 2. Threads Query ──────────────────────────────────────────────────────
  const { data: threads = [] } = useQuery({
    queryKey: communicationKeys.threads(),
    queryFn: () => internalCommunicationApi.getThreads(),
    enabled: !!user?.id && isOpen,
    staleTime: 10 * 1000
  });

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

  // Auto scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThreadDetail?.messages, isOpen]);

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
            messages: [...old.messages, { ...newMessage, is_me: true }]
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
    }
  });

  // ── 5. Socket Listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewMsg = (data: { threadId: string }) => {
      if (data.threadId === selectedThreadId) {
        queryClient.invalidateQueries({ queryKey: communicationKeys.messages(data.threadId) });
      }
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
      queryClient.invalidateQueries({ queryKey: communicationKeys.unreadCount() });
    };

    socket.on('internal_comm:new_message', handleNewMsg);
    socket.on('internal_comm:new_thread', () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.threads() });
      queryClient.invalidateQueries({ queryKey: communicationKeys.unreadCount() });
    });

    return () => {
      socket.off('internal_comm:new_message', handleNewMsg);
    };
  }, [socket, selectedThreadId, queryClient]);

  // Jangan render floating button jika sudah berada di halaman Pusat Komunikasi
  if (isCommunicationPage) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThreadId || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(replyText.trim());
  };

  const activeThread = threads.find((t: InternalThreadItem) => t.id === selectedThreadId);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* ── POPUP CHAT WINDOW (WhatsApp Mini Persona) ────────────────── */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 h-[460px] bg-[#efeae2] dark:bg-[#0b141a] rounded-2xl shadow-2xl border border-[#e9edef] dark:border-[#202c33] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* WhatsApp Header */}
          <div className="px-4 py-3 bg-[#075e54] dark:bg-[#202c33] text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                {activeThread?.title ? activeThread.title.slice(0, 2).toUpperCase() : 'WA'}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs truncate">
                  {activeThread?.title || 'Pesan Sekolah'}
                </h4>
                <p className="text-[10px] text-emerald-100 dark:text-[#8696a0] truncate">
                  {activeThread?.type === 'DISPOSISI' ? 'Disposisi Tugas' : 'Online'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/komunikasi');
                }}
                title="Buka Layar Penuh"
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Thread Selector Tabs */}
          {threads.length > 1 && (
            <div className="px-3 py-1.5 bg-[#f0f2f5] dark:bg-[#111b21] border-b border-[#e9edef] dark:border-[#202c33] flex gap-1.5 overflow-x-auto no-scrollbar">
              {threads.slice(0, 5).map((t: InternalThreadItem) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedThreadId(t.id)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md whitespace-nowrap transition-all cursor-pointer ${
                    selectedThreadId === t.id
                      ? 'bg-[#00a884] text-white shadow-2xs'
                      : 'bg-white dark:bg-[#202c33] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {t.title}
                </button>
              ))}
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
              <div className="text-center text-[#667781] dark:text-[#8696a0] py-12">
                <p className="font-semibold">Belum ada pesan</p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/komunikasi');
                  }}
                  className="mt-2 text-[#00a884] font-bold hover:underline"
                >
                  Buka Menu Komunikasi Lengkap
                </button>
              </div>
            ) : (
              activeThreadDetail.messages.map((m: any) => {
                const isMe = m.is_me;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-1.5 text-xs shadow-2xs ${
                        isMe
                          ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
                          : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none border border-slate-200/50 dark:border-slate-700'
                      }`}
                    >
                      {!isMe && m.sender_name && (
                        <p className="text-[10px] font-bold text-[#008069] dark:text-[#00a884] mb-0.5">{m.sender_name}</p>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                      <span className="block text-[9px] text-right mt-0.5 text-[#667781] dark:text-[#8696a0]">
                        {format(new Date(m.created_at), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#2a3942] flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Ketik pesan..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] outline-hidden shadow-2xs"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || sendMessageMutation.isPending || !selectedThreadId}
              className="p-2 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 text-white rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── FLOATING TRIGGER BUTTON (WhatsApp Icon & Badge) ───────────── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="relative flex items-center justify-center w-12 h-12 rounded-full bg-[#25d366] hover:bg-[#20bd5a] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        title="Buka WhatsApp Internal Sekolah"
      >
        {/* WhatsApp Chat SVG Icon */}
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.06c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.15 8.15 0 0 1-1.25-4.29c0-4.51 3.67-8.18 8.19-8.18 2.19 0 4.25.85 5.8 2.4 1.55 1.55 2.4 3.61 2.4 5.8 0 4.51-3.68 8.18-8.2 8.18z" />
        </svg>

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-[11px] font-extrabold rounded-full border-2 border-white dark:border-slate-900 shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
