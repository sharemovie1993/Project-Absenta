import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Ticket, Shield, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore, type User as AuthUser } from '../../../store/authStore';
import { SuperAdminPageLayout } from '../../../components/layout/SuperAdminPageLayout';
import { Loader, SectionCard } from '@/components/ui';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  supportTicketApi, 
  type SupportTicket, 
  type SupportTicketMessage, 
  type SupportTicketCategory, 
  type SupportTicketPriority,
  type SupportTicketStatus,
  type SupportQuickReply,
  type SupportKnowledgeBase,
  type SupportAnalytics
} from '../../../api/support-ticket.api';

// Lazy load complex panels
const SupportAnalyticsPanel = lazy(() => import('../../../components/support/SupportAnalyticsPanel'));
const SupportSettingsPanel = lazy(() => import('../../../components/support/SupportSettingsPanel'));
const SupportChatPanel = lazy(() => import('../../../components/support/SupportChatPanel'));
const SupportQueuePanel = lazy(() => import('../../../components/support/SupportQueuePanel'));
const SupportSidebarDiagnostic = lazy(() => import('../../../components/support/SupportSidebarDiagnostic'));
const SupportFocusModeModal = lazy(() => import('../../../components/support/SupportFocusModeModal'));
const SupportSlaBanner = lazy(() => import('../../../components/support/SupportSlaBanner'));

// 🔌 Custom Hooks Modular
import { useAssistLogin } from '../../../hooks/support/useAssistLogin';
import { useSupportWebSocket } from '../../../hooks/support/useSupportWebSocket';

export default function AdminSupportTicketPage() {
  const { user: currentAgent } = useAuthStore();
  
  // =========================================================================
  // 💾 STATE MANAGEMENT
  // =========================================================================
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Filter & Search
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Input Chat & Focus Mode
  const [replyMessage, setReplyMessage] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activePageTab, setActivePageTab] = useState<'QUEUE' | 'ANALYTICS' | 'SETTINGS'>('QUEUE');

  // Scroll Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const focusChatEndRef = useRef<HTMLDivElement>(null);
  const unreadMessageRef = useRef<HTMLDivElement>(null);
  
  const [isScrollAtBottom, setIsScrollAtBottom] = useState(true);
  const [justOpenedTicket, setJustOpenedTicket] = useState(false);
  const [activeUnreadCount, setActiveUnreadCount] = useState(0);

  const isScrollAtBottomRef = useRef(true);
  useEffect(() => {
    isScrollAtBottomRef.current = isScrollAtBottom;
  }, [isScrollAtBottom]);

  // Enterprise CSModules State
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(false);
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [rightPanelTab, setRightPanelTab] = useState<'DIAGNOSTIC' | 'KNOWLEDGE_BASE'>('DIAGNOSTIC');

  // =========================================================================
  // 🔌 INTEGRASI React Custom Hooks
  // =========================================================================
  const { handleAssistLogin } = useAssistLogin();

  const {
    unreadTicketCounts,
    newMessageIds,
    liveUnreadCount,
    setLiveUnreadCount,
    clearUnreadCount
  } = useSupportWebSocket({
    selectedTicket,
    tickets,
    fetchTickets: () => fetchTickets(),
    fetchTicketDetail: (ticketId) => fetchTicketDetail(ticketId),
    setTickets: () => {},
    setMessages,
    isScrollAtBottomRef
  });

  // Admin Tickets Query
  const adminTicketsQuery = useQuery({
    queryKey: ['admin-support-tickets', filterPriority, filterCategory, searchQuery],
    queryFn: async () => {
      const filters: Record<string, unknown> = {};
      if (filterPriority !== 'ALL') filters.priority = filterPriority as SupportTicketPriority;
      if (filterCategory !== 'ALL') filters.category = filterCategory as SupportTicketCategory;
      if (searchQuery.trim() !== '') filters.search = searchQuery;
      const res = await supportTicketApi.getAdminTickets(filters);
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const tickets = adminTicketsQuery.data || [];
  const isLoading = adminTicketsQuery.isLoading;

  const fetchTickets = useCallback(async () => {
    await adminTicketsQuery.refetch();
  }, [adminTicketsQuery]);

  // Quick Replies Query
  const quickRepliesQuery = useQuery({
    queryKey: ['support-quick-replies'],
    queryFn: async () => {
      const res = await supportTicketApi.getQuickReplies();
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const quickReplies = quickRepliesQuery.data || [];
  const fetchQuickReplies = useCallback(async () => {
    await quickRepliesQuery.refetch();
  }, [quickRepliesQuery]);

  // Knowledge Base Query
  const kbQuery = useQuery({
    queryKey: ['support-knowledge-base', kbSearchQuery],
    queryFn: async () => {
      const res = await supportTicketApi.getKnowledgeBase(kbSearchQuery);
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const knowledgeBase = kbQuery.data || [];
  const fetchKnowledgeBase = useCallback(async () => {
    await kbQuery.refetch();
  }, [kbQuery]);

  // Analytics Query
  const analyticsQuery = useQuery({
    queryKey: ['support-analytics-admin'],
    queryFn: async () => {
      const res = await supportTicketApi.getSupportAnalytics();
      return res.data || null;
    },
    enabled: activePageTab === 'ANALYTICS',
    staleTime: 5 * 60 * 1000,
  });

  const analytics = analyticsQuery.data || null;
  const isAnalyticsLoading = analyticsQuery.isLoading;

  const fetchAnalytics = useCallback(async () => {
    await analyticsQuery.refetch();
  }, [analyticsQuery]);

  const fetchTicketDetail = useCallback(async (ticketId: string) => {
    setIsDetailLoading(true);
    const unreadCount = unreadTicketCounts[ticketId] || 0;
    setActiveUnreadCount(unreadCount);
    setLiveUnreadCount(0);
    setJustOpenedTicket(true);
    clearUnreadCount(ticketId);

    try {
      const res = await supportTicketApi.getAdminTicketDetail(ticketId);
      if (res.success && res.data) {
        setSelectedTicket(res.data);
        setMessages(res.data.Messages || []);
      } else {
        toast.error(res.message || 'Gagal memuat detail tiket.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal terhubung ke server.';
      toast.error(msg);
    } finally {
      setIsDetailLoading(false);
    }
  }, [unreadTicketCounts, setLiveUnreadCount, clearUnreadCount]);

  useEffect(() => {
    fetchQuickReplies();
    fetchKnowledgeBase();
    fetchAnalytics();

    const params = new URLSearchParams(window.location.search);
    const ticketIdParam = params.get('ticketId');
    if (ticketIdParam) fetchTicketDetail(ticketIdParam);

    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const tid = p.get('ticketId');
      if (tid) fetchTicketDetail(tid);
      else setSelectedTicket(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [fetchQuickReplies, fetchKnowledgeBase, fetchAnalytics, fetchTicketDetail]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleClaimTicket = async () => {
    if (!selectedTicket || !currentAgent) return;
    setIsActionLoading(true);
    try {
      const res = await supportTicketApi.assignTicket(selectedTicket.id, currentAgent.id);
      if (res.success && res.data) {
        toast.success('Tiket berhasil Anda klaim untuk ditangani.');
        await fetchTicketDetail(selectedTicket.id);
        fetchTickets();
      } else {
        toast.error(res.message || 'Gagal mengklaim tiket.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah penugasan tiket.';
      toast.error(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateStatus = async (status: SupportTicketStatus) => {
    if (!selectedTicket) return;
    setIsActionLoading(true);
    try {
      const res = await supportTicketApi.updateTicketStatusAndPriority(selectedTicket.id, { status });
      if (res.success && res.data) {
        toast.success(`Status tiket diubah menjadi: ${status}`);
        await fetchTicketDetail(selectedTicket.id);
        fetchTickets();
      } else {
        toast.error(res.message || 'Gagal memperbarui status.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status.';
      toast.error(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdatePriority = async (priority: SupportTicketPriority) => {
    if (!selectedTicket) return;
    setIsActionLoading(true);
    try {
      const res = await supportTicketApi.updateTicketStatusAndPriority(selectedTicket.id, { priority });
      if (res.success && res.data) {
        toast.success(`Urgensi tiket diubah menjadi: ${priority}`);
        await fetchTicketDetail(selectedTicket.id);
        fetchTickets();
      } else {
        toast.error(res.message || 'Gagal memperbarui urgensi.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah urgensi.';
      toast.error(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReplyMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    setIsSubmittingMessage(true);
    try {
      const res = await supportTicketApi.replyAdminTicket(selectedTicket.id, replyMessage, [], isInternalNote);
      if (res.success && res.data) {
        setReplyMessage('');
        setIsInternalNote(false);
        
        const detailRes = await supportTicketApi.getAdminTicketDetail(selectedTicket.id);
        if (detailRes.success && detailRes.data) {
          setSelectedTicket(detailRes.data);
          setMessages(detailRes.data.Messages || []);
        }
        fetchTickets();
        fetchAnalytics();
      } else {
        toast.error(res.message || 'Gagal mengirim pesan.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim jawaban.';
      toast.error(msg);
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  // Scroll Actions Effect
  useEffect(() => {
    if (justOpenedTicket) {
      setJustOpenedTicket(false);
      if (activeUnreadCount > 0 && unreadMessageRef.current) {
        unreadMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      setIsScrollAtBottom(true);
    } else {
      if (isScrollAtBottom) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (isFocusMode) {
          setTimeout(() => {
            focusChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 80);
        }
      }
    }
  }, [messages, isFocusMode, justOpenedTicket]);

  // =========================================================================
  // 🔄 COMPUTATIONS (React.useMemo)
  // =========================================================================
  const { countAll, countOpen, countHandling, countWaiting, countResolved, countClosed } = React.useMemo(() => {
    return {
      countAll: tickets.length,
      countOpen: tickets.filter(t => t.status === 'OPEN').length,
      countHandling: tickets.filter(t => t.status === 'IN_PROGRESS').length,
      countWaiting: tickets.filter(t => t.status === 'PENDING_CUSTOMER').length,
      countResolved: tickets.filter(t => t.status === 'RESOLVED').length,
      countClosed: tickets.filter(t => t.status === 'CLOSED').length
    };
  }, [tickets]);

  const filteredTickets = React.useMemo(() => {
    return (tickets ?? [])?.filter(t => {
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
      return t.status === filterStatus;
    });
  }, [tickets, filterStatus]);

  // Layout configs
  const breadcrumbsList = useMemo(() => [
    { label: 'Superadmin Console', path: '/menu/system' },
    { label: 'Helpdesk & Support' }
  ], []);

  const statsList = useMemo(() => [
    {
      title: 'Antrean Nasional',
      value: `${tickets.length} Tiket`,
      icon: <Ticket size={14} />,
      gradient: 'from-rose-500 to-red-600',
      subtitle: 'Total aduan aktif masuk'
    },
    {
      title: 'Ditangani Saya',
      value: `${tickets.filter(t => t.assigned_to_id === currentAgent?.id).length} Tiket`,
      icon: <Shield size={14} />,
      gradient: 'from-emerald-500 to-teal-600',
      subtitle: 'Klaim penanganan aktif'
    },
    {
      title: 'Status OPEN',
      value: `${tickets.filter(t => t.status === 'OPEN').length} Tiket`,
      icon: <Clock size={14} />,
      gradient: 'from-blue-500 to-indigo-600',
      subtitle: 'Belum disentuh agen'
    },
    {
      title: 'Menunggu Klien',
      value: `${tickets.filter(t => t.status === 'PENDING_CUSTOMER').length} Tiket`,
      icon: <AlertCircle size={14} />,
      gradient: 'from-amber-500 to-orange-600',
      subtitle: 'Menanti respons sekolah'
    }
  ], [tickets, currentAgent?.id]);

  const handleExportCsatReport = useCallback(async () => {
    const loadToast = toast.loading('Menyiapkan Laporan CSAT Sekolah...');
    try {
      // Ambil seluruh tiket CLOSED
      const res = await supportTicketApi.getAdminTickets({ status: 'CLOSED' });
      if (!res.success || !res.data) {
        toast.dismiss(loadToast);
        toast.error('Gagal mengambil data laporan.');
        return;
      }

      // Filter tiket yang memiliki rating CSAT
      const ratedTickets = res.data.filter(t => t.rating !== null && t.rating !== undefined);
      if (ratedTickets.length === 0) {
        toast.dismiss(loadToast);
        toast.error('Belum ada tiket ter-rating yang selesai (CLOSED).');
        return;
      }

      // Format data untuk Excel
      const excelRows = (ratedTickets ?? [])?.map((t) => ({
        'No Tiket': t.ticket_number,
        'Sekolah (Tenant)': t.Tenant?.name || 'Sekolah',
        'Topik Keluhan': t.title,
        'Kategori': t.category,
        'Prioritas': t.priority,
        'Skor Kepuasan (CSAT)': `⭐ ${t.rating} / 5`,
        'Masukan Sekolah (Ulasan)': t.rating_comment || 'Tidak ada ulasan tertulis',
        'Tanggal Selesai': t.rated_at ? new Date(t.rated_at).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan CSAT');

      const colWidths = [15, 25, 30, 15, 12, 12, 40, 25];
      worksheet['!cols'] = (colWidths ?? [])?.map(w => ({ wch: w }));

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

      saveAs(dataBlob, `Laporan_CSAT_Absenta_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.dismiss(loadToast);
      toast.success('Laporan CSAT sukses diunduh!');
    } catch (err: unknown) {
      toast.dismiss(loadToast);
      const msg = err instanceof Error ? err.message : 'Gagal memproses ekspor Excel.';
      toast.error(msg);
    }
  }, [tickets]);

  const toolbarContent = (
    <div className="flex items-center gap-2.5">
      <button
        onClick={handleExportCsatReport}
        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-500 active:scale-95 transition-all duration-200 text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
      >
        <span>📥 Unduh Laporan CSAT</span>
      </button>
      <button
        onClick={() => fetchTickets(true)}
        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold hover:text-white border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all duration-200 text-xs cursor-pointer"
      >
        <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
        <span>Refresh Antrean</span>
      </button>
    </div>
  );

  const instruction = React.useMemo(() => ({
    title: 'Panduan Admin Support',
    description: 'Pusat bantuan pelanggan untuk menangani tiket dukungan, keluhan teknis, dan bantuan operasional sekolah.',
    items: [
      { text: 'Gunakan tab "Antrean Tiket" untuk membalas pesan masuk dari admin sekolah secara real-time.' },
      { text: 'Fitur "Focus Mode" memungkinkan Anda berkonsentrasi pada satu tiket tanpa gangguan notifikasi lain.' },
      { text: 'Manfaatkan "Quick Replies" untuk membalas pertanyaan umum dengan cepat dan konsisten.' },
      { text: 'Tab "Analitik" memberikan metrik performa agen dan waktu respon rata-rata (SLA).' }
    ]
  }), []);

  return (
    <SuperAdminPageLayout
      title="Pusat Bantuan & Tiket"
      description="Manajemen layanan pelanggan, resolusi tiket dukungan, dan monitoring SLA bantuan teknis."
      stats={statsList}
      hardeningModuleKey="adminsupportticketpage"
      instruction={instruction}
      breadcrumbs={[
        { label: 'Customer Support' },
        { label: 'Helpdesk' }
      ]}
    >
      <div className="flex flex-col h-[calc(100vh-14rem)] overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 animate-in fade-in duration-500">
        <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-t-2xl" />}>
          <SupportSlaBanner analytics={analytics} />
        </Suspense>

      {/* 🚀 Tab Switcher Menu Utama Dasbor Helpdesk */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 max-w-lg mb-6 shadow-sm">
        <button
          onClick={() => setActivePageTab('QUEUE')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
            activePageTab === 'QUEUE'
              ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-750 dark:text-slate-400'
          }`}
        >
          🎫 Antrean ({tickets.length})
        </button>
        <button
          onClick={() => setActivePageTab('ANALYTICS')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
            activePageTab === 'ANALYTICS'
              ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-750 dark:text-slate-400'
          }`}
        >
          📊 Analitik & SLA
        </button>
        <button
          onClick={() => setActivePageTab('SETTINGS')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
            activePageTab === 'SETTINGS'
              ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-750 dark:text-slate-400'
          }`}
        >
          ⚙️ FAQ & Pintasan CS
        </button>
      </div>

      {activePageTab === 'QUEUE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
          <Suspense fallback={<Loader />}>
            <SupportQueuePanel
              tickets={tickets}
              selectedTicket={selectedTicket}
              isLoading={isLoading}
              unreadTicketCounts={unreadTicketCounts}
              currentAgent={currentAgent as any}
              fetchTicketDetail={fetchTicketDetail}
              fetchTickets={() => fetchTickets(false)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterPriority={filterPriority}
              setFilterPriority={setFilterPriority}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              countAll={countAll}
              countOpen={countOpen}
              countHandling={countHandling}
              countWaiting={countWaiting}
              countResolved={countResolved}
              countClosed={countClosed}
              filteredTickets={filteredTickets}
              onExportReport={handleExportCsatReport}
            />
          </Suspense>

          {/* PANEL 2: INTERACTIVE CHAT PANEL */}
          {!selectedTicket ? (
            <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700/60 overflow-hidden flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="text-xs font-semibold">Pilih keluhan sekolah dari panel sebelah kiri untuk membaca thread chat aduan.</span>
            </div>
          ) : (
            <Suspense fallback={<Loader />}>
              <SupportChatPanel
                selectedTicket={selectedTicket}
                messages={messages}
                newMessageIds={newMessageIds}
                currentAgent={currentAgent as any}
                liveUnreadCount={liveUnreadCount}
                setLiveUnreadCount={setLiveUnreadCount}
                isScrollAtBottom={isScrollAtBottom}
                setIsScrollAtBottom={setIsScrollAtBottom}
                activeUnreadCount={activeUnreadCount}
                replyMessage={replyMessage}
                setReplyMessage={setReplyMessage}
                isInternalNote={isInternalNote}
                setIsInternalNote={setIsInternalNote}
                isSubmittingMessage={isSubmittingMessage}
                handleReplyMessage={handleReplyMessage}
                quickReplies={quickReplies}
                isQuickRepliesOpen={isQuickRepliesOpen}
                setIsQuickRepliesOpen={setIsQuickRepliesOpen}
                isActionLoading={isActionLoading}
                handleClaimTicket={handleClaimTicket}
                handleUpdateStatus={handleUpdateStatus}
                handleUpdatePriority={handleUpdatePriority}
                setIsFocusMode={setIsFocusMode}
                chatContainerRef={chatContainerRef}
                chatEndRef={chatEndRef}
                unreadMessageRef={unreadMessageRef}
              />
            </Suspense>
          )}

          {/* PANEL 3: LIVE TENANT DIAGNOSTIC PANEL */}
          <Suspense fallback={<Loader />}>
            <SupportSidebarDiagnostic
              selectedTicket={selectedTicket}
              rightPanelTab={rightPanelTab}
              setRightPanelTab={setRightPanelTab}
              kbSearchQuery={kbSearchQuery}
              setKbSearchQuery={setKbSearchQuery}
              fetchKnowledgeBase={fetchKnowledgeBase}
              knowledgeBase={knowledgeBase}
              handleAssistLogin={handleAssistLogin}
            />
          </Suspense>
        </div>
      )}

      {activePageTab === 'ANALYTICS' && (
        <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-xl p-6 shadow-sm">
          <Suspense fallback={<Loader />}>
            <SupportAnalyticsPanel />
          </Suspense>
        </div>
      )}

      {activePageTab === 'SETTINGS' && (
        <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-xl p-6 shadow-sm">
          <Suspense fallback={<Loader />}>
            <SupportSettingsPanel />
          </Suspense>
        </div>
      )}

      {/* FOCUS MODE: EXPANDED DIALOG MELAYANG (Leap-UX) */}
      {selectedTicket && (
        <Suspense fallback={null}>
          <SupportFocusModeModal
            isOpen={isFocusMode}
            onClose={() => setIsFocusMode(false)}
            selectedTicket={selectedTicket}
            messages={messages}
            newMessageIds={newMessageIds}
            currentAgent={currentAgent as any}
            liveUnreadCount={liveUnreadCount}
            setLiveUnreadCount={setLiveUnreadCount}
            isScrollAtBottom={isScrollAtBottom}
            setIsScrollAtBottom={setIsScrollAtBottom}
            activeUnreadCount={activeUnreadCount}
            replyMessage={replyMessage}
            setReplyMessage={setReplyMessage}
            isInternalNote={isInternalNote}
            setIsInternalNote={setIsInternalNote}
            isSubmittingMessage={isSubmittingMessage}
            handleReplyMessage={handleReplyMessage}
            quickReplies={quickReplies}
            isQuickRepliesOpen={isQuickRepliesOpen}
            setIsQuickRepliesOpen={setIsQuickRepliesOpen}
            isActionLoading={isActionLoading}
            handleClaimTicket={handleClaimTicket}
            handleUpdateStatus={handleUpdateStatus}
            handleUpdatePriority={handleUpdatePriority}
            handleAssistLogin={handleAssistLogin}
          />
        </Suspense>
      )}

      </div>
    </SuperAdminPageLayout>
  );
}
