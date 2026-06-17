import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Ticket, Shield, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { SuperAdminPageLayout } from '../../../components/layout/SuperAdminPageLayout';
import SupportAnalyticsPanel from '../../../components/support/SupportAnalyticsPanel';
import SupportSettingsPanel from '../../../components/support/SupportSettingsPanel';
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
import SupportStatusBadge from '../../../components/support/SupportStatusBadge';
import SupportPriorityBadge from '../../../components/support/SupportPriorityBadge';
import SupportSlaBanner from '../../../components/support/SupportSlaBanner';
import SupportSidebarDiagnostic from '../../../components/support/SupportSidebarDiagnostic';
import SupportFocusModeModal from '../../../components/support/SupportFocusModeModal';
import SupportChatPanel from '../../../components/support/SupportChatPanel';
import SupportQueuePanel from '../../../components/support/SupportQueuePanel';

// 🔌 Custom Hooks Modular
import { useAssistLogin } from '../../../hooks/support/useAssistLogin';
import { useSupportWebSocket } from '../../../hooks/support/useSupportWebSocket';

export default function AdminSupportTicketPage() {
  const { user: currentAgent } = useAuthStore();
  
  // =========================================================================
  // 💾 STATE MANAGEMENT
  // =========================================================================
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
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
  const [quickReplies, setQuickReplies] = useState<SupportQuickReply[]>([]);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<SupportKnowledgeBase[]>([]);
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState<SupportAnalytics | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
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
    fetchTickets: () => fetchTickets(false),
    fetchTicketDetail: (ticketId) => fetchTicketDetail(ticketId),
    setTickets,
    setMessages,
    isScrollAtBottomRef
  });

  // =========================================================================
  // 📡 API CALLS
  // =========================================================================
  const fetchTickets = async (showToast = false) => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (filterPriority !== 'ALL') filters.priority = filterPriority as SupportTicketPriority;
      if (filterCategory !== 'ALL') filters.category = filterCategory as SupportTicketCategory;
      if (searchQuery.trim() !== '') filters.search = searchQuery;
      
      const res = await supportTicketApi.getAdminTickets(filters);
      if (res.success && res.data) {
        setTickets(res.data);
        if (showToast) toast.success('Antrean tiket diperbarui.');
      } else {
        toast.error(res.message || 'Gagal memuat antrean tiket.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const res = await supportTicketApi.getQuickReplies();
      if (res.success && res.data) setQuickReplies(res.data);
    } catch (err: any) {
      console.error('Gagal memuat Quick Replies:', err.message);
    }
  };

  const fetchKnowledgeBase = async (search = '') => {
    try {
      const res = await supportTicketApi.getKnowledgeBase(search);
      if (res.success && res.data) setKnowledgeBase(res.data);
    } catch (err: any) {
      console.error('Gagal memuat Knowledge Base:', err.message);
    }
  };

  const fetchAnalytics = async () => {
    setIsAnalyticsLoading(true);
    try {
      const res = await supportTicketApi.getSupportAnalytics();
      if (res.success && res.data) setAnalytics(res.data);
    } catch (err: any) {
      console.error('Gagal memuat analitik SLA:', err.message);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuickReplies();
    fetchKnowledgeBase();
    fetchAnalytics();

    const params = new URLSearchParams(window.location.search);
    const ticketIdParam = params.get('ticketId');
    if (ticketIdParam) fetchTicketDetail(ticketIdParam);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filterPriority, filterCategory]);

  const fetchTicketDetail = async (ticketId: string) => {
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
    } catch (err: any) {
      toast.error(err.message || 'Gagal terhubung ke server.');
    } finally {
      setIsDetailLoading(false);
    }
  };

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
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah penugasan tiket.');
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
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah status.');
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
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah urgensi.');
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
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim jawaban.');
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
    return tickets.filter(t => {
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
      return t.status === filterStatus;
    });
  }, [tickets, filterStatus]);

  // Layout configs
  const breadcrumbsList = [
    { label: 'Superadmin Console', path: '/superadmin' },
    { label: 'Helpdesk & Support', path: '/superadmin/support' }
  ];

  const statsList = [
    {
      title: 'Antrean Nasional',
      value: `${tickets.length} Tiket`,
      icon: <Ticket size={18} />,
      gradient: 'from-rose-500 to-red-600',
      subtitle: 'Total aduan aktif masuk'
    },
    {
      title: 'Ditangani Saya',
      value: `${tickets.filter(t => t.assigned_to_id === currentAgent?.id).length} Tiket`,
      icon: <Shield size={18} />,
      gradient: 'from-emerald-500 to-teal-600',
      subtitle: 'Klaim penanganan aktif'
    },
    {
      title: 'Status OPEN',
      value: `${tickets.filter(t => t.status === 'OPEN').length} Tiket`,
      icon: <Clock size={18} />,
      gradient: 'from-blue-500 to-indigo-600',
      subtitle: 'Belum disentuh agen'
    },
    {
      title: 'Menunggu Klien',
      value: `${tickets.filter(t => t.status === 'PENDING_CUSTOMER').length} Tiket`,
      icon: <AlertCircle size={18} />,
      gradient: 'from-amber-500 to-orange-600',
      subtitle: 'Menanti respons sekolah'
    }
  ];

  const handleExportCsatReport = async () => {
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
      const excelRows = ratedTickets.map((t) => ({
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

      // Proses dengan XLSX secara DRY
      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan CSAT');

      // Autofit lebar kolom
      const colWidths = [15, 25, 30, 15, 12, 12, 40, 25];
      worksheet['!cols'] = colWidths.map(w => ({ wch: w }));

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

      // Save file
      saveAs(dataBlob, `Laporan_CSAT_Absenta_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.dismiss(loadToast);
      toast.success('Laporan CSAT sukses diunduh!');
    } catch (err: any) {
      toast.dismiss(loadToast);
      toast.error('Gagal memproses ekspor Excel.');
    }
  };

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

  return (
    <SuperAdminPageLayout
      title="National Support Helpdesk"
      description="Dashboard Tim Customer Support & Relations Absenta.id untuk menyelesaikan aduan operasional sekolah se-Indonesia"
      breadcrumbs={breadcrumbsList}
      stats={statsList}
      toolbar={toolbarContent}
    >
      <SupportSlaBanner analytics={analytics} />

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
          <SupportQueuePanel
            tickets={tickets}
            selectedTicket={selectedTicket}
            isLoading={isLoading}
            unreadTicketCounts={unreadTicketCounts}
            currentAgent={currentAgent}
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
          />

          {/* PANEL 2: INTERACTIVE CHAT PANEL */}
          {!selectedTicket ? (
            <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700/60 overflow-hidden flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="text-xs font-semibold">Pilih keluhan sekolah dari panel sebelah kiri untuk membaca thread chat aduan.</span>
            </div>
          ) : (
            <SupportChatPanel
              selectedTicket={selectedTicket}
              messages={messages}
              newMessageIds={newMessageIds}
              currentAgent={currentAgent}
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
          )}

          {/* PANEL 3: LIVE TENANT DIAGNOSTIC PANEL */}
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
        </div>
      )}

      {activePageTab === 'ANALYTICS' && (
        <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-xl p-6 shadow-sm">
          <SupportAnalyticsPanel />
        </div>
      )}

      {activePageTab === 'SETTINGS' && (
        <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-xl p-6 shadow-sm">
          <SupportSettingsPanel />
        </div>
      )}

      {/* FOCUS MODE: EXPANDED DIALOG MELAYANG (Leap-UX) */}
      {selectedTicket && (
        <SupportFocusModeModal
          isOpen={isFocusMode}
          onClose={() => setIsFocusMode(false)}
          selectedTicket={selectedTicket}
          messages={messages}
          newMessageIds={newMessageIds}
          currentAgent={currentAgent}
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
      )}

    </SuperAdminPageLayout>
  );
}
