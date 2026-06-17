import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { 
  Ticket, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  Plus, 
  FileText, 
  RefreshCw,
  Shield,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  supportTicketApi, 
  type SupportTicket, 
  type SupportTicketMessage, 
  type SupportTicketCategory, 
  type SupportTicketPriority,
  type SupportTicketStatus,
  getCategoryLabel
} from '../../api/support-ticket.api';
import { useSocket } from '../../hooks/useSocket';
import SupportStatusBadge from '../../components/support/SupportStatusBadge';
import SupportChatBubble from '../../components/support/SupportChatBubble';
import SupportScrollToBottomButton from '../../components/support/SupportScrollToBottomButton';
import { playNotificationSound } from '../../utils/audioUtils';
import { useConfirm } from '../../providers/ConfirmProvider';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card, Loader } from '@/components/ui';

const SupportCsatModal = lazy(() => import('../../components/support/SupportCsatModal'));
const SupportCreateTicketModal = lazy(() => import('../../components/support/SupportCreateTicketModal').then(m => ({ default: m.SupportCreateTicketModal })));
const SupportTicketSidebar = lazy(() => import('../../components/support/SupportTicketSidebar').then(m => ({ default: m.SupportTicketSidebar })));

export default function SupportTicketPage() {
  const { confirm } = useConfirm();
  const { subscribe, unsubscribe } = useSocket();



  // =========================================================================
  // 💾 STATE MANAGEMENT
  // =========================================================================
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [isCsatOpen, setIsCsatOpen] = useState(false);

  // Scroll to bottom / Unread indicators WhatsApp-style
  const [activeUnreadCount, setActiveUnreadCount] = useState(0);
  const [liveUnreadCount, setLiveUnreadCount] = useState(0);
  const [isScrollAtBottom, setIsScrollAtBottom] = useState(true);
  const [justOpenedTicket, setJustOpenedTicket] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const unreadMessageRef = useRef<HTMLDivElement>(null);
  const isScrollAtBottomRef = useRef(true);

  useEffect(() => {
    isScrollAtBottomRef.current = isScrollAtBottom;
  }, [isScrollAtBottom]);

  // State pelacakan unread tickets and new message IDs
  const [unreadTicketIds, setUnreadTicketIds] = useState<Set<string>>(new Set());
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());

  // Ref untuk mengunci selectedTicket di dalam listener WebSocket agar terhindar dari re-binding churn
  const selectedTicketRef = React.useRef<SupportTicket | null>(null);
  React.useEffect(() => {
    selectedTicketRef.current = selectedTicket;
  }, [selectedTicket]);

  // Filter & Search
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Buat Tiket Baru
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Chat input
  const [replyMessage, setReplyMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // =========================================================================
  // 📡 API CALLS
  // =========================================================================
  
  // Mengambil daftar tiket milik sekolah ini
  const fetchTickets = useCallback(async (showToast = false) => {
    setIsLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (filterStatus !== 'ALL') filters.status = filterStatus as SupportTicketStatus;
      if (filterCategory !== 'ALL') filters.category = filterCategory as SupportTicketCategory;
      
      const res = await supportTicketApi.getSchoolTickets(filters);
      if (res.success && res.data) {
        setTickets(res.data);

        // Sinkronisasikan unread status awal dari database ke state local
        setUnreadTicketIds(prev => {
          const next = new Set(prev);
          res.data.forEach((t: SupportTicket) => {
            if (t.unread_count && t.unread_count > 0) {
              next.add(t.id);
            } else if (t.unread_count === 0) {
              next.delete(t.id);
            }
          });
          return next;
        });

        if (showToast) toast.success('Daftar tiket diperbarui.');
      } else {
        toast.error(res.message || 'Gagal memuat daftar tiket.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterCategory]);

  // Mengambil detail tiket terpilih (termasuk percakapan pesan)
  const fetchTicketDetail = useCallback(async (ticketId: string) => {
    setIsDetailLoading(true);

    const targetTicket = tickets.find(t => t.id === ticketId);
    const unreadCount = targetTicket?.unread_count || (unreadTicketIds.has(ticketId) ? 1 : 0);
    setActiveUnreadCount(unreadCount);
    setLiveUnreadCount(0); // Reset live unread count saat ganti tiket
    setJustOpenedTicket(true);

    // Bersihkan penanda belum dibaca secara instan saat tiket dibuka
    setUnreadTicketIds(prev => {
      const next = new Set(prev);
      next.delete(ticketId);
      return next;
    });

    try {
      const res = await supportTicketApi.getSchoolTicketDetail(ticketId);
      if (res.success && res.data) {
        setSelectedTicket(res.data);
        setMessages(res.data.Messages || []);
      } else {
        toast.error(res.message || 'Gagal memuat detail tiket.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal terhubung ke server.');
    } finally {
      setIsDetailLoading(false);
    }
  }, [tickets, unreadTicketIds]);


  // Membalas pesan aduan
  const handleReplyMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    setIsSubmittingMessage(true);
    try {
      const res = await supportTicketApi.replySchoolTicket(selectedTicket.id, replyMessage);
      if (res.success && res.data) {
        setReplyMessage('');
        
        // Refresh detail tiket untuk mendapatkan status terbaru (karena otomatis berubah status)
        const detailRes = await supportTicketApi.getSchoolTicketDetail(selectedTicket.id);
        if (detailRes.success && detailRes.data) {
          setSelectedTicket(detailRes.data);
        }
      } else {
        toast.error(res.message || 'Gagal mengirim pesan.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal membalas tiket.');
    } finally {
      setIsSubmittingMessage(false);
    }
  }, [replyMessage, selectedTicket]);

  // Menandai tiket teratasi / selesai (Resolve)
  const handleResolveTicket = useCallback(async () => {
    if (!selectedTicket) return;
    
    const ok = await confirm({
      title: 'Selesaikan Aduan?',
      description: 'Apakah Anda yakin permasalahan aduan ini telah selesai diatasi dengan baik?',
      style: 'success',
      confirmText: 'Ya, Selesaikan'
    });
    if (!ok) return;

    try {
      const res = await supportTicketApi.resolveSchoolTicket(selectedTicket.id);
      if (res.success && res.data) {
        toast.success('Tiket berhasil ditandai selesai.');
        // Sinkronisasi status lokal
        setSelectedTicket(res.data);
        fetchTickets();
        // Otomatis luncurkan modal rating CSAT
        setTimeout(() => {
          setIsCsatOpen(true);
        }, 400);
      } else {
        toast.error(res.message || 'Gagal memperbarui status tiket.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memproses tindakan.');
    }
  }, [selectedTicket, confirm, fetchTickets]);

  // Submit CSAT Rating & Feedback
  const handleSubmitCsat = useCallback(async (rating: number, comment: string) => {
    if (!selectedTicket) return;
    try {
      const res = await supportTicketApi.rateSchoolTicket(selectedTicket.id, rating, comment);
      if (res.success && res.data) {
        toast.success('Terima kasih! Penilaian Anda telah kami terima.');
        setSelectedTicket(res.data);
        fetchTickets();
      } else {
        throw new Error(res.message || 'Gagal mengirimkan penilaian.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirimkan penilaian.';
      toast.error(msg);
      throw err;
    }
  }, [selectedTicket, fetchTickets]);

  // Submit Pembuatan Tiket Baru
  const handleSubmitTicket = useCallback(async (data: {
    title: string;
    description: string;
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
  }) => {
    setIsCreating(true);
    try {
      const res = await supportTicketApi.createSchoolTicket(data);
      if (res.success && res.data) {
        toast.success('Tiket aduan berhasil diajukan.');
        setIsModalOpen(false);
        fetchTickets();
      } else {
        toast.error(res.message || 'Gagal mengirim aduan.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim aduan.');
    } finally {
      setIsCreating(false);
    }
  }, [fetchTickets]);

  // =========================================================================
  // 🔄 EFFECTS & UTILS
  // =========================================================================
  
  // Pemicu awal pemuatan tiket
  useEffect(() => {
    fetchTickets();

    // Baca ticketId dari query parameter jika halaman dibuka lewat notifikasi luar halaman support
    const params = new URLSearchParams(window.location.search);
    const ticketIdParam = params.get('ticketId');
    if (ticketIdParam) {
      fetchTicketDetail(ticketIdParam);
    }
  }, [filterStatus, filterCategory]);

  // Langganan obrolan real-time via WebSocket
  useEffect(() => {
    const handleNewMessage = (msg: SupportTicketMessage) => {
      if (!msg) return;

      // 1. Putar suara notifikasi jika pesan dikirim oleh support agent
      if (msg.sender_type === 'SUPPORT') {
        playNotificationSound();
      }

      const activeTicket = selectedTicketRef.current;

      // 2. Tampilkan toast kustom jika pengguna tidak sedang membuka chat tiket tersebut
      if (msg.sender_type === 'SUPPORT' && (!activeTicket || activeTicket.id !== msg.ticket_id)) {
        const senderName = msg.Sender?.full_name || 'Official CS Absenta';
        
        toast.custom((t) => (
          <div className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 border-2 border-emerald-400 shadow-[0_10px_35px_rgba(16,185,129,0.4)] text-white rounded-xl pointer-events-auto flex p-4.5 transition-all duration-300 transform hover:scale-[1.02]`}>
            <div className="flex-1 w-0 text-left">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-11 w-11 rounded-full bg-white text-emerald-600 flex items-center justify-center font-black text-lg animate-bounce shadow-xl shadow-black/10">
                    💬
                  </div>
                </div>
                <div className="ml-3.5 flex-1 space-y-0.5">
                  <p className="text-[10px] font-black tracking-widest text-emerald-100 uppercase bg-black/25 px-2.5 py-0.5 rounded-full inline-block border border-white/10">
                    BALASAN CS BARU
                  </p>
                  <h4 className="text-xs font-black text-white line-clamp-1 mt-0.5">
                    {senderName}
                  </h4>
                  <p className="text-[10px] text-slate-100 font-extrabold line-clamp-2 bg-black/20 p-2 rounded-xl border border-white/10 mt-1 italic leading-relaxed">
                    "{msg.message}"
                  </p>
                </div>
              </div>
            </div>
            <div className="ml-4 flex-shrink-0 flex items-center border-l border-white/20 pl-3">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  fetchTicketDetail(msg.ticket_id);
                }}
                className="px-4 py-2.5 bg-white text-emerald-900 rounded-xl text-xs font-black hover:bg-slate-100 active:scale-95 transition-all duration-150 shadow-lg shadow-black/20"
              >
                BUKA CHAT
              </button>
            </div>
          </div>
        ), {
          id: `msg-${msg.id}`,
          duration: 8000,
          position: 'top-right'
        });
      }

      // 3. Jika pesan adalah untuk tiket yang sedang dibuka
      if (activeTicket && msg.ticket_id === activeTicket.id) {
        setMessages(prev => {
          const exist = prev.some(m => m.id === msg.id);
          if (exist) return prev;

          const isDuplicateContent = prev.some(m => 
            m.sender_id === msg.sender_id && 
            m.message === msg.message &&
            Math.abs(new Date(m.created_at).getTime() - new Date(msg.created_at).getTime()) < 5000
          );
          if (isDuplicateContent) return prev;

          // Catat ID pesan baru untuk visual highlight amber di thread chat bubble
          setNewMessageIds(prevIds => new Set([...prevIds, msg.id]));
          return [...prev, msg];
        });

        // 🔄 REAL-TIME SYNC: Jika posisi scroll sedang TIDAK di paling bawah, tambahkan live unread count!
        if (!isScrollAtBottomRef.current) {
          setLiveUnreadCount(prev => prev + 1);
        }
      } else {
        // 4. Jika pesan untuk tiket lain yang tidak aktif dibuka, tandai sebagai belum dibaca
        setUnreadTicketIds(prevIds => new Set([...prevIds, msg.ticket_id]));
      }
    };

    subscribe('support:message', handleNewMessage);

    return () => {
      unsubscribe('support:message', handleNewMessage);
    };
  }, [subscribe, unsubscribe]);

  // Scroll handling WhatsApp-style
  useEffect(() => {
    if (justOpenedTicket) {
      setJustOpenedTicket(false);
      
      // Jika ada unread messages, lakukan scroll to unreadMessageRef
      if (activeUnreadCount > 0 && unreadMessageRef.current) {
        unreadMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      setIsScrollAtBottom(true);
    } else {
      if (isScrollAtBottom) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, justOpenedTicket]);

  // Pencarian lokal di daftar tiket
  const filteredTickets = useMemo(() => tickets.filter(t => 
    t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  ), [tickets, searchQuery]);





  const breadcrumbs = useMemo(() => [
    { label: 'Bantuan', path: '/support' }
  ], []);

  return (
    <AcademicPageLayout 
      hardeningModuleKey="supportpage"
      breadcrumbs={breadcrumbs}
      instruction={{
        title: "Pusat Bantuan & Pengaduan",
        description: "Kelola tiket aduan Anda dengan tim Support kami.",
        items: [
          { text: "Pilih tiket untuk melihat detail balasan." },
          { text: "Gunakan filter status dan kategori untuk mempermudah pencarian." }
        ]
      }}
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* =========================================================================
          🔥 HEADER & STATS SUMMARY CARD
          ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-xl p-6 text-white shadow-2xl relative overflow-hidden border border-slate-700">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-indigo-500/25 rounded-xl border border-indigo-500/30">
                <Ticket size={24} className="text-indigo-400" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Portal Bantuan Sekolah</h1>
            </div>
            <p className="text-slate-300 text-xs md:text-sm">
              Ajukan kendala teknis, mesin gerbang sensor, request fitur, atau billing secara langsung ke Admin CS Absenta.id
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchTickets(true)}
              className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all duration-200"
              title="Refresh Tiket"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/30 hover:scale-[1.03] active:scale-95 transition-all duration-200 border border-indigo-400/30"
            >
              <Plus size={18} />
              <span>Ajukan Bantuan</span>
            </button>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Tiket</span>
            <span className="text-xl font-extrabold">{tickets.length}</span>
          </div>
          <div className="bg-emerald-950/20 rounded-xl p-3 border border-emerald-900/30">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">Tiket Open</span>
            <span className="text-xl font-extrabold text-emerald-400">
              {tickets.filter(t => t.status === 'OPEN').length}
            </span>
          </div>
          <div className="bg-blue-950/20 rounded-xl p-3 border border-blue-900/30">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block">Proses Investigasi</span>
            <span className="text-xl font-extrabold text-blue-400">
              {tickets.filter(t => t.status === 'IN_PROGRESS').length}
            </span>
          </div>
          <div className="bg-teal-950/20 rounded-xl p-3 border border-teal-900/30">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 block">Tuntas Diselesaikan</span>
            <span className="text-xl font-extrabold text-teal-400">
              {tickets.filter(t => t.status === 'RESOLVED').length}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          🔥 MAIN GRID INTERFACE
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
        
        {/* 📚 LEFT PANEL: LIST OF TICKETS (4 Columns) */}
        <Suspense fallback={<div className="lg:col-span-5 flex items-center justify-center p-8 bg-white rounded-xl border border-slate-200 dark:border-slate-800 min-h-[400px]"><Loader size="lg" /></div>}>
          <SupportTicketSidebar
            filteredTickets={filteredTickets}
            selectedTicket={selectedTicket}
            unreadTicketIds={unreadTicketIds}
            isLoading={isLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            onSelectTicket={fetchTicketDetail}
          />
        </Suspense>

        {/* 💬 RIGHT PANEL: CHAT & TICKET DETAILS (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <Card className="flex flex-col h-full relative overflow-hidden">
          {isDetailLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 space-y-2">
              <RefreshCw size={32} className="animate-spin text-indigo-500" />
              <span className="text-xs font-bold text-slate-500">Membuka detail aduan...</span>
            </div>
          ) : !selectedTicket ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-slate-400 space-y-4">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <MessageSquare size={36} className="text-indigo-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-700">Pilih Tiket Aduan</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Klik salah satu tiket bantuan di panel sebelah kiri untuk membaca respons admin CS, membalas chat solusi, atau menandai tiket teratasi.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header Detail Tiket */}
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="space-y-1 flex-1 pr-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-950 px-2 py-0.5 rounded border border-indigo-900">{selectedTicket.ticket_number}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs text-slate-300 font-bold">{getCategoryLabel(selectedTicket.category)}</span>
                  </div>
                  <h2 className="text-xs md:text-sm font-extrabold line-clamp-1">{selectedTicket.title}</h2>
                </div>

                <div className="flex items-center space-x-1.5">
                  {/* Tombol Tandai Selesai (Hanya jika status belum RESOLVED / CLOSED) */}
                  {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                    <button
                      onClick={handleResolveTicket}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all duration-200"
                    >
                      <CheckCircle size={14} />
                      <span className="hidden sm:inline">Tandai Selesai</span>
                    </button>
                  )}
                  <SupportStatusBadge status={selectedTicket.status} />
                </div>
              </div>

              {/* Box Deskripsi Keluhan Awal */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-start space-x-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl mt-0.5">
                  <FileText size={16} />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>DESKRIPSI ADUAN AWAL</span>
                    <span>{new Date(selectedTicket.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{selectedTicket.description}</p>
                  
                  {/* Assigned to agent indicator */}
                  <div className="pt-2 flex items-center space-x-2 text-[10px] text-slate-400 font-bold">
                    <Shield size={12} className="text-slate-400" />
                    <span>DITUGASKAN KEPADA:</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {selectedTicket.Assignee ? selectedTicket.Assignee.full_name : 'Menunggu Klaim Agen CS'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wrapper Relatif untuk Obrolan & Tombol Melayang */}
              <div className="relative flex-1 flex flex-col min-h-0">
                {/* Area Obrolan Chat Thread */}
                <div 
                  ref={chatContainerRef}
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 120;
                    setIsScrollAtBottom(isAtBottom);
                    if (isAtBottom) {
                      setLiveUnreadCount(0);
                    }
                  }}
                  className="flex-1 p-5 overflow-y-auto bg-slate-50/50 space-y-4 max-h-[350px] min-h-[250px]"
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs">
                      <MessageSquare size={20} className="mb-1 text-slate-300" />
                      <span>Belum ada respons di thread aduan ini.</span>
                    </div>
                  ) : (
                    messages?.map((msg, index) => {
                      const isFirstUnread = activeUnreadCount > 0 && index === messages.length - activeUnreadCount;
                      return (
                        <React.Fragment key={msg.id}>
                          {isFirstUnread && (
                            <div ref={unreadMessageRef} className="flex items-center justify-center my-6 select-none">
                              <div className="flex-1 border-t-2 border-red-300/60"></div>
                              <span className="mx-4 px-4 py-1.5 bg-red-50 text-red-650 text-[10px] font-black rounded-full uppercase tracking-widest border border-red-200 shadow-md animate-pulse flex items-center space-x-1">
                                <span className="h-2 w-2 rounded-full bg-red-650 inline-block animate-ping"></span>
                                <span>🔴 Pesan Belum Dibaca</span>
                              </span>
                              <div className="flex-1 border-t-2 border-red-300/60"></div>
                            </div>
                          )}
                          <SupportChatBubble 
                            key={msg.id}
                            message={msg} 
                            isNew={newMessageIds.has(msg.id)} 
                            isOutgoing={msg.sender_type === 'CUSTOMER'} 
                          />
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Tombol Panah Bawah Melayang ala WhatsApp */}
                <SupportScrollToBottomButton
                  show={!isScrollAtBottom}
                  unreadCount={liveUnreadCount}
                  onClick={() => {
                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    setLiveUnreadCount(0);
                    setIsScrollAtBottom(true);
                  }}
                />
              </div>

              {/* Form Input Balasan Chat */}
              <div className="p-4 border-t border-slate-100 bg-white">
                {selectedTicket.status === 'RESOLVED' && !selectedTicket.rating ? (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 text-amber-900 text-xs font-bold w-full">
                    <div className="flex items-center space-x-2.5">
                      <Star className="text-amber-500 fill-amber-500 w-5 h-5 animate-bounce" />
                      <div className="text-left">
                        <p className="font-extrabold text-amber-950">Aduan Telah Ditandai Selesai!</p>
                        <p className="text-[10px] text-amber-700 font-medium">Bantu kami meningkatkan pelayanan dengan memberikan penilaian Anda.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsCsatOpen(true)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform"
                    >
                      Beri Penilaian (CSAT)
                    </button>
                  </div>
                ) : selectedTicket.status === 'CLOSED' || selectedTicket.status === 'RESOLVED' ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-2 text-center text-slate-500 text-xs font-bold w-full">
                    <div className="flex items-center space-x-2">
                      <AlertCircle size={16} className="text-slate-400" />
                      <span>Tiket aduan ini telah ditutup & selesai.</span>
                    </div>
                    {selectedTicket.rating && (
                      <div className="flex flex-col items-center space-y-1 bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5]?.map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= (selectedTicket.rating || 0)
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        {selectedTicket.rating_comment && (
                          <p className="text-[10px] text-slate-600 italic font-medium max-w-md line-clamp-2">
                            "{selectedTicket.rating_comment}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleReplyMessage} className="p-4 bg-white border-t border-slate-100 flex items-center space-x-3 rounded-b-xl">
                    <label htmlFor="reply_message" className="sr-only">Pesan Balasan</label>
                    <input
                      id="reply_message"
                      type="text"
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                      placeholder="Ketik respons atau pesan jawaban Anda ke tim CS..."
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-50 text-xs font-semibold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all duration-200"
                      disabled={isSubmittingMessage}
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingMessage || !replyMessage.trim()}
                      className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:scale-100 transition-all duration-200"
                    >
                      {isSubmittingMessage ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
          </Card>
        </div>

      </div>

      {/* =========================================================================
          🔥 CREATION TICKET NEW MODAL (Framer Motion)
          ========================================================================= */}
      <Suspense fallback={null}>
        <SupportCreateTicketModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitTicket}
          isCreating={isCreating}
        />
      </Suspense>

      {selectedTicket && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"><Loader size="lg" /></div>}>
          <SupportCsatModal
            isOpen={isCsatOpen}
            ticketNumber={selectedTicket.ticket_number}
            onClose={() => setIsCsatOpen(false)}
            onSubmit={handleSubmitCsat}
          />
        </Suspense>
      )}

    </div>
    </AcademicPageLayout>
  );
}
