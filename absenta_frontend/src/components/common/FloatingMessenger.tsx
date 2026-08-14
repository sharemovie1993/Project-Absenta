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
  ArrowTopRightOnSquareIcon,
  PlusIcon
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
      socket.off('internal_comm:new_thread');
    };
  }, [socket, selectedThreadId, queryClient]);

  // Sembunyikan widget floating jika sedang berada di halaman utama komunikasi
  if (isCommunicationPage || !user?.id) {
    return null;
  }

  const activeThread = threads.find((t: InternalThreadItem) => t.id === selectedThreadId) || activeThreadDetail?.thread;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendMessageMutation.isPending || !selectedThreadId) return;
    sendMessageMutation.mutate(replyText.trim());
  };

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 font-sans">
      {/* ── POPUP WINDOW CHAT ────────────────────────────────────────── */}
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[480px] animate-in slide-in-from-bottom-4 duration-200">
          {/* Header Widget */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-white/20">
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold truncate">Pusat Komunikasi Cepat</h3>
                <p className="text-[10px] text-blue-100 truncate">
                  {activeThread?.title || 'Obrolan Sekolah'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/komunikasi');
                }}
                title="Buka Halaman Penuh"
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Thread Selector Tabs (Jika > 1 obrolan) */}
          {threads.length > 1 && (
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 flex gap-1.5 overflow-x-auto scrollbar-none">
              {threads.slice(0, 5).map((t: InternalThreadItem) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedThreadId(t.id)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md whitespace-nowrap transition-all ${
                    selectedThreadId === t.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50 dark:bg-slate-950 text-xs">
            {isLoadingMessages ? (
              <div className="text-center text-slate-400 py-8">Memuat obrolan...</div>
            ) : !activeThreadDetail?.messages || activeThreadDetail.messages.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                <p className="font-medium">Belum ada pesan</p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/komunikasi');
                  }}
                  className="mt-2 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
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
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-xs shadow-2xs ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-xs'
                      }`}
                    >
                      {!isMe && m.sender_name && (
                        <p className="text-[10px] font-bold text-blue-500 mb-0.5">{m.sender_name}</p>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                      <span className={`block text-[9px] text-right mt-0.5 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
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
          <form onSubmit={handleSend} className="p-2 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Tulis balasan cepat..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-hidden"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || sendMessageMutation.isPending || !selectedThreadId}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all shrink-0"
            >
              <PaperAirplaneIcon className="w-4 h-4 -rotate-45" />
            </button>
          </form>
        </div>
      )}

      {/* ── FLOATING TRIGGER BUTTON ──────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="relative flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all group"
        title="Buka Pesan Masuk Cepat"
      >
        <ChatBubbleLeftRightIcon className="w-6 h-6" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-[11px] font-bold rounded-full border-2 border-white dark:border-slate-900 shadow-xs animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
