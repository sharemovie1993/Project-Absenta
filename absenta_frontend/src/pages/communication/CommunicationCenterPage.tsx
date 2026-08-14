import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChatBubbleLeftRightIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ClockIcon,
  DocumentTextIcon,
  FunnelIcon,
  ShieldCheckIcon
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
import { useSocket } from '@/hooks/useSocket';
import { format } from 'date-fns';

export default function CommunicationCenterPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);

  // ── 1. Query: Ambil Daftar Thread Percakapan (TanStack Query v5) ─────────────
  const { 
    data: threads = [], 
    isLoading: isLoadingThreads 
  } = useQuery({
    queryKey: communicationKeys.threads({ type: filterType, category: filterCategory, search: searchQuery }),
    queryFn: () => internalCommunicationApi.getThreads({
      type: filterType !== 'ALL' ? filterType : undefined,
      category: filterCategory !== 'ALL' ? filterCategory : undefined,
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

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans">
      {/* ── TOP ACTION BAR ──────────────────────────────────────────────── */}
      <header className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Pusat Komunikasi & Perpesanan Sekolah
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Koordinasi internal piket, wali kelas, guru mata pelajaran, konseling BK & disposisi tugas
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
        >
          <PlusIcon className="w-4 h-4 stroke-[2.5]" />
          <span>Percakapan Baru</span>
        </button>
      </header>

      {/* ── SPLIT VIEW CONTAINER ────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── SIDEBAR THREAD LIST ──────────────────────────────────────── */}
        <aside
          className={`w-full md:w-80 lg:w-96 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0 ${
            selectedThreadId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari obrolan, kontak, topik..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'DIRECT', label: 'Chat 1-on-1' },
              { id: 'DISPOSISI', label: 'Disposisi Tugas' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-all ${
                  filterType === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List Threads */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoadingThreads ? (
              <div className="p-6 text-center text-xs text-slate-400">Memuat percakapan...</div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <ChatBubbleLeftRightIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-medium">Belum ada percakapan</p>
                <p className="text-[11px] text-slate-400">Klik 'Percakapan Baru' untuk memulai</p>
              </div>
            ) : (
              threads.map((t: InternalThreadItem) => {
                const isSelected = t.id === selectedThreadId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThreadId(t.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Status Pill Indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />
                    )}

                    {/* Avatar Initials */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {t.title.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className={`text-xs font-semibold truncate ${
                          t.isUnread ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {t.title}
                        </h3>
                        {t.lastMessage && (
                          <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                            {format(new Date(t.lastMessage.created_at), 'HH:mm')}
                          </span>
                        )}
                      </div>

                      {/* Snippet Pesan Terakhir */}
                      <p className={`text-[11px] truncate ${
                        t.isUnread ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {t.lastMessage ? t.lastMessage.content : 'Belum ada pesan'}
                      </p>

                      {/* Tag Kategori & Prioritas */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {t.category}
                        </span>
                        {t.priority === 'URGENT' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-bold">
                            Mendesak
                          </span>
                        )}
                        {t.is_confidential && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold flex items-center gap-0.5">
                            <ShieldCheckIcon className="w-2.5 h-2.5" />
                            BK
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge Pesan Belum Dibaca */}
                    {t.isUnread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1.5 shadow-2xs" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── MAIN CHAT VIEW ────────────────────────────────────────────── */}
        <main className={`flex-1 flex flex-col ${!selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
          {selectedThreadId && activeThread ? (
            <div className="flex-1 flex flex-col h-full relative">
              {/* Tombol Kembali di Mobile */}
              <div className="md:hidden p-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center">
                <button
                  onClick={() => setSelectedThreadId(null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 p-1"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  <span>Daftar Obrolan</span>
                </button>
              </div>

              <ChatConversationPanel
                thread={activeThread}
                messages={activeThreadDetail?.messages || []}
                isLoadingMessages={isLoadingMessages}
                onSendMessage={(payload) => sendMessageMutation.mutate(payload)}
                isSendingMessage={sendMessageMutation.isPending}
                onUpdateStatus={(status) => updateStatusMutation.mutate({ threadId: activeThread.id, status })}
                isUpdatingStatus={updateStatusMutation.isPending}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 bg-slate-50/50 dark:bg-slate-950">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <ChatBubbleLeftRightIcon className="w-8 h-8" />
              </div>
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Pilih atau Mulai Obrolan
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Pilih percakapan dari panel sebelah kiri atau klik 'Percakapan Baru' untuk menghubungkan guru, wali kelas, piket, dan BK.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ── MODAL PERCAKAPAN BARU ───────────────────────────────────────── */}
      <NewConversationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        contacts={contacts}
        isLoadingContacts={isLoadingContacts}
        onSubmit={(payload) => createThreadMutation.mutate(payload)}
        isSubmitting={createThreadMutation.isPending}
      />
    </div>
  );
}
