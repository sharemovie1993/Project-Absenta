import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Card, Button, Input, SectionCard } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { formatDate } from '@/utils/date.utils';
import { DEFAULT_SUPPORT_PHONE, DEFAULT_LICENSE_SERVER_URL } from '@/config/env-config';
import { supportApi, type SupportTicketItem, type TicketMessageItem } from '@/api/support.api';
import { 
  Send, 
  Phone, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  MessageSquare, 
  PlusCircle, 
  Headphones, 
  CheckCheck, 
  Bot, 
  User as UserIcon, 
  Search, 
  ArrowLeft,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Zod Validation Schema for New Conversation Modal ────────────────────────
const newChatSchema = z.object({
  kategori: z.enum(['LISENSI', 'BUG', 'HARDWARE_RFID', 'KBM_ABSENSI', 'FITUR_BARU', 'LAINNYA']),
  prioritas: z.enum(['NORMAL', 'PENTING', 'URGENT']),
  judul: z.string().min(5, 'Subjek percakapan minimal 5 karakter').max(150, 'Maksimal 150 karakter'),
  pesan: z.string().min(10, 'Jelaskan kendala minimal 10 karakter'),
});

const CATEGORY_OPTIONS = [
  { value: 'LISENSI', label: '🔑 Aktivasi & Masa Aktif Lisensi' },
  { value: 'BUG', label: '🐛 Bug / Kendala Sistem Aplikasi' },
  { value: 'HARDWARE_RFID', label: '💳 Mesin Presensi & Kartu RFID' },
  { value: 'KBM_ABSENSI', label: '📖 Alur KBM & Jam Mengajar' },
  { value: 'FITUR_BARU', label: '✨ Permintaan Fitur / Kustomisasi' },
  { value: 'LAINNYA', label: '❓ Bantuan Umum & Konsultasi IT' },
];

const PRIORITY_OPTIONS = [
  { value: 'NORMAL', label: '🟢 Normal (Respon 1x24 Jam)' },
  { value: 'PENTING', label: '🟡 Penting (Respon < 6 Jam)' },
  { value: 'URGENT', label: '🔴 Mendesak / Gangguan Operasional' },
];

export const SupportHelpdeskPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [chatInputText, setChatInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  
  // Mobile View Navigation: 'list' (Daftar Obrolan) vs 'chat' (Ruang Obrolan)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // New Chat Form State
  const [newKategori, setNewKategori] = useState<string>('LISENSI');
  const [newPrioritas, setNewPrioritas] = useState<string>('NORMAL');
  const [newJudul, setNewJudul] = useState<string>('');
  const [newPesan, setNewPesan] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── TanStack Query: Live Ticket Threads (Auto-Pull every 10s) ─────────────
  const { 
    data: rawTickets = [], 
    isLoading: loadingTickets,
    isFetching: isSyncing,
    refetch: refetchTickets
  } = useQuery<SupportTicketItem[]>({
    queryKey: ['support-tickets-list'],
    queryFn: () => supportApi.getTickets(),
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000, // Live Chat Pull Sync
    refetchOnWindowFocus: true,
  });

  const tickets = useMemo(() => {
    return Array.isArray(rawTickets) ? rawTickets : [];
  }, [rawTickets]);

  // Set default selected ticket
  useEffect(() => {
    if (tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const activeTicket = useMemo(() => {
    return (tickets ?? []).find((t) => t.id === selectedTicketId) || tickets[0] || null;
  }, [tickets, selectedTicketId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (mobileView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket?.messages, selectedTicketId, mobileView]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tickets;
    return (tickets ?? []).filter(
      (t) =>
        t.judul.toLowerCase().includes(q) ||
        t.nomorTiket.toLowerCase().includes(q) ||
        t.kategori.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  const tenantName = user?.tenant_id ? 'SMKN 1 Plered' : 'Instansi Sekolah';
  const userDisplayName = user?.full_name || 'Administrator Sekolah';

  // ── TanStack Mutation: Send Chat Message ──────────────────────────────────
  const sendReplyMutation = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) =>
      supportApi.replyTicket(ticketId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets-list'] });
      setChatInputText('');
    },
    onError: () => {
      toast.error('Gagal mengirim pesan balasan.');
    }
  });

  // ── TanStack Mutation: Create New Ticket Thread ───────────────────────────
  const createTicketMutation = useMutation({
    mutationFn: supportApi.createTicket,
    onSuccess: (newTicket) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets-list'] });
      toast.success(`Percakapan ${newTicket.nomorTiket} berhasil dibuka!`);
      setSelectedTicketId(newTicket.id);
      setMobileView('chat');
      setShowNewChatModal(false);
      setNewJudul('');
      setNewPesan('');
    },
    onError: () => {
      toast.error('Gagal membuka percakapan baru.');
    }
  });

  const handleSendMessage = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim() || !activeTicket || sendReplyMutation.isPending) return;

    sendReplyMutation.mutate({
      ticketId: activeTicket.id,
      message: chatInputText.trim()
    });
  }, [chatInputText, activeTicket, sendReplyMutation]);

  const handleCreateNewChat = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const validationResult = newChatSchema.safeParse({
      kategori: newKategori,
      prioritas: newPrioritas,
      judul: newJudul.trim(),
      pesan: newPesan.trim(),
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      (validationResult.error.issues ?? [])?.forEach((issue) => {
        const fieldName = String(issue.path[0]);
        fieldErrors[fieldName] = issue.message;
      });
      setFormErrors(fieldErrors);
      return;
    }

    const selectedCategoryObj = (CATEGORY_OPTIONS ?? [])?.find(c => c.value === newKategori);

    createTicketMutation.mutate({
      kategori: selectedCategoryObj?.label || newKategori,
      prioritas: newPrioritas as 'NORMAL' | 'PENTING' | 'URGENT',
      judul: newJudul.trim(),
      pesan: newPesan.trim(),
      tenant_id: user?.tenant_id,
      tenant_name: tenantName,
      user_name: userDisplayName,
      user_email: user?.email,
    });
  }, [newKategori, newPrioritas, newJudul, newPesan, createTicketMutation, user, tenantName, userDisplayName]);

  // 1-Click WhatsApp Hotline
  const handleOpenWhatsappHotline = useCallback((topic?: string) => {
    const textMsg = `Halo Tim Support Server Lisensi Absenta (PT Baraya Teknologi Indonesia),\n\nSaya *${userDisplayName}* dari *${tenantName}*.\nSaya membutuhkan bantuan teknis mengenai: *${topic || 'Layanan Sistem Absenta'}*.\n\n_Mohon bantuannya, terima kasih!_`;
    const encoded = encodeURIComponent(textMsg);
    window.open(`https://wa.me/${DEFAULT_SUPPORT_PHONE}?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }, [userDisplayName, tenantName]);

  const breadcrumbs = useMemo(() => [
    { label: 'Pusat Bantuan' },
    { label: 'Live Chat Dukungan Lisensi' }
  ], []);

  // Compute all messages for active conversation
  const conversationMessages = useMemo(() => {
    if (!activeTicket) return [];
    const extraMessages = Array.isArray(activeTicket.messages) ? activeTicket.messages : [];
    if (extraMessages.length > 0) {
      return extraMessages;
    }
    return [{
      id: `initial-${activeTicket.id}`,
      sender: 'tenant' as const,
      senderName: userDisplayName,
      message: activeTicket.pesan,
      createdAt: activeTicket.createdAt,
    }];
  }, [activeTicket, userDisplayName]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pusat Bantuan & Live Chat Dukungan Teknis"
        description="Saluran percakapan interaktif dua arah yang terhubung langsung ke Tim Teknis Server Lisensi Pusat PT Baraya Teknologi Indonesia."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="support_helpdesk"
        instruction={{
          title: 'Panduan Live Support Chat Server Lisensi',
          description: 'Gunakan antarmuka Live Chat interaktif untuk berkomunikasi langsung dengan Tim Teknis Pusat.',
          items: [
            { text: 'Pilih percakapan dari daftar di sebelah kiri untuk melihat riwayat pesan.' },
            { text: 'Ketik pesan balasan pada bilah input bawah untuk mengirim pesan langsung.' },
            { text: 'Klik tombol Obrolan Baru untuk membuka topik kendala atau permohonan baru.' }
          ]
        }}
        toolbar={
          <Button
            type="button"
            variant="toolbarPrimary"
            size="toolbar"
            onClick={() => setShowNewChatModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <PlusCircle size={13} /> Obrolan Baru
          </Button>
        }
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0 pb-1 sm:pb-4">
          <div className="w-full min-w-0 max-w-full space-y-2.5 sm:space-y-3">

            {/* ── TOPBAR STATUS & WHATSAPP HOTLINE BANNER (COMPACT ON MOBILE) ── */}
            <Card className="p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-slate-900 text-white border border-indigo-500/20 shadow-md flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                  <Headphones className="w-4 h-4 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-black truncate">Live Support Lisensi</h3>
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" /> Online
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">
                    {tenantName} ↔ <span className="font-mono text-indigo-300">api.absenta.id</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={() => refetchTickets()}
                  disabled={isSyncing}
                  className="font-bold text-[11px] rounded-xl flex items-center gap-1 cursor-pointer bg-slate-800 text-white border-slate-700 h-7 sm:h-8 px-2 sm:px-3"
                  title="Sinkronkan Pesan Terbaru"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
                  <span className="hidden md:inline">Sinkronkan</span>
                </Button>
                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={() => handleOpenWhatsappHotline('Live Chat Hotline')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl flex items-center gap-1 cursor-pointer h-7 sm:h-8 px-2.5 sm:px-3"
                >
                  <Phone size={11} />
                  <span>WhatsApp</span>
                </Button>
              </div>
            </Card>

            {/* ── RESPONSIVE CHAT CONTAINER (WHATSAPP-STYLE ON MOBILE) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-3 h-[calc(100vh-210px)] min-h-[460px] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
              
              {/* ── LEFT PANEL: CONVERSATION LIST (COL 4 / FULL-SCREEN ON MOBILE LIST VIEW) ── */}
              <div className={`lg:col-span-4 flex flex-col h-full border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 ${
                mobileView === 'chat' ? 'hidden lg:flex' : 'flex'
              }`}>
                
                {/* List Header & New Chat Button */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      Daftar Percakapan ({(tickets ?? []).length})
                    </span>
                    <Button
                      type="button"
                      variant="toolbarPrimary"
                      size="toolbar"
                      onClick={() => setShowNewChatModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm cursor-pointer py-1 px-2.5 h-7"
                    >
                      <PlusCircle size={12} /> Obrolan Baru
                    </Button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Cari obrolan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-7 sm:h-8 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                {/* Scrollable Conversation List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
                  {loadingTickets ? (
                    <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>Memuat percakapan...</span>
                    </div>
                  ) : (filteredTickets ?? []).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                      <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                      <p>Belum ada percakapan tiket.</p>
                      <Button
                        type="button"
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={() => setShowNewChatModal(true)}
                        className="text-xs rounded-xl font-bold text-indigo-600 mx-auto"
                      >
                        + Buat Obrolan Baru
                      </Button>
                    </div>
                  ) : (
                    (filteredTickets ?? [])?.map((t) => {
                      const isSelected = activeTicket?.id === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTicketId(t.id);
                            setMobileView('chat'); // Switch to Chat Room on Mobile
                          }}
                          className={`w-full text-left p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-white dark:bg-slate-900/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800/40'
                          }`}
                        >
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                          }`}>
                            <Bot className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className={`font-mono text-[9px] sm:text-[10px] font-black truncate ${isSelected ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                {t.nomorTiket}
                              </span>
                              <span className={`text-[9px] shrink-0 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {formatDate(t.createdAt, 'dd MMM')}
                              </span>
                            </div>

                            <h5 className={`text-xs font-bold truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                              {t.judul}
                            </h5>

                            <p className={`text-[10px] sm:text-[11px] truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                              {t.pesan}
                            </p>

                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className={`px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-extrabold uppercase ${
                                isSelected 
                                  ? 'bg-white/20 text-white' 
                                  : t.status === 'RESOLVED' 
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {t.status === 'RESOLVED' ? '✓ SELESAI' : '⏳ AKTIF'}
                              </span>
                              <span className={`text-[8px] sm:text-[9px] truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {t.kategori}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── RIGHT PANEL: LIVE CHAT WINDOW (COL 8 / FULL-SCREEN ON MOBILE CHAT VIEW) ── */}
              <div className={`lg:col-span-8 flex flex-col h-full bg-slate-50/30 dark:bg-slate-950/20 ${
                mobileView === 'list' ? 'hidden lg:flex' : 'flex'
              }`}>
                {activeTicket ? (
                  <>
                    {/* Chat Header with Mobile Back Button */}
                    <div className="p-2.5 sm:p-3.5 px-3 sm:px-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        
                        {/* Mobile Back Button (< Kembali ke Daftar) */}
                        <button
                          type="button"
                          onClick={() => setMobileView('list')}
                          className="lg:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                          title="Kembali ke Daftar Percakapan"
                        >
                          <ArrowLeft size={18} />
                        </button>

                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-xs shrink-0">
                          <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                              {activeTicket.judul}
                            </h4>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                              {activeTicket.nomorTiket}
                            </span>
                          </div>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <span className="truncate">{activeTicket.kategori}</span>
                            <span>•</span>
                            <span className={`font-bold shrink-0 ${activeTicket.prioritas === 'URGENT' ? 'text-rose-500' : 'text-emerald-600'}`}>
                              {activeTicket.prioritas}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          activeTicket.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {activeTicket.status === 'RESOLVED' ? '✓ SELESAI' : '💬 AKTIF'}
                        </span>
                      </div>
                    </div>

                    {/* Chat Messages Body (Scrollable Bubbles) */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
                      {/* System Encryption Notice */}
                      <div className="p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-center text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto space-y-0.5">
                        <span className="font-black text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                          <ShieldCheck size={12} /> Dukungan Terenkripsi Server Lisensi
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Ditangani langsung oleh Tim Teknis PT Baraya Teknologi Indonesia.
                        </p>
                      </div>

                      {/* Render Messages */}
                      {(conversationMessages ?? [])?.map((msg) => {
                        const isMe = msg.sender === 'tenant';
                        return (
                          <div
                            key={msg.id}
                            className={`flex items-end gap-1.5 sm:gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            {!isMe && (
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mb-1">
                                <Bot size={12} />
                              </div>
                            )}

                            <div className={`max-w-[88%] sm:max-w-[72%] rounded-2xl p-2.5 sm:p-3.5 space-y-1 shadow-xs ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-br-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/70 dark:border-slate-800'
                            }`}>
                              <div className={`flex items-center justify-between gap-2 text-[9px] sm:text-[10px] font-bold ${
                                isMe ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'
                              }`}>
                                <span className="truncate">{msg.senderName}</span>
                                <span className="font-normal opacity-80 shrink-0">{formatDate(msg.createdAt, 'HH:mm')}</span>
                              </div>

                              <p className="text-xs whitespace-pre-line leading-relaxed">
                                {msg.message}
                              </p>

                              <div className={`flex items-center justify-end gap-1 text-[9px] ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                <CheckCheck size={11} className="text-emerald-300" />
                              </div>
                            </div>

                            {isMe && (
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-xs mb-1">
                                <UserIcon size={12} />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Bar (Glued to Bottom) */}
                    <div className="p-2 sm:p-3.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                      <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
                        <Input
                          placeholder="Ketik pesan balasan..."
                          value={chatInputText}
                          onChange={(e) => setChatInputText(e.target.value)}
                          className="flex-1 text-xs rounded-2xl bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-9 sm:h-10 px-3 sm:px-3.5"
                        />
                        <Button
                          type="submit"
                          variant="toolbarPrimary"
                          size="toolbar"
                          disabled={!chatInputText.trim() || sendReplyMutation.isPending}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center h-9 sm:h-10 px-3.5 sm:px-4 cursor-pointer shadow-md shrink-0"
                        >
                          {sendReplyMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send size={13} />}
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Pilih Obrolan untuk Memulai</h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Pilih salah satu percakapan di bilah kiri atau buat obrolan tiket bantuan baru ke Server Lisensi.
                    </p>
                    <Button
                      type="button"
                      variant="toolbarPrimary"
                      size="toolbar"
                      onClick={() => setShowNewChatModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
                    >
                      + Buat Obrolan Baru
                    </Button>
                  </div>
                )}
              </div>

            </div>

            {/* ── MODAL: BUAT OBROLAN / TIKET BARU ── */}
            {showNewChatModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                <Card className="w-full max-w-lg p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-indigo-600" /> Buka Obrolan / Tiket Baru
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowNewChatModal(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕ Tutup
                    </button>
                  </div>

                  <form onSubmit={handleCreateNewChat} className="space-y-3">
                    <div>
                      <label htmlFor="new-kategori-select" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Kategori Kendala:
                      </label>
                      <SearchableSelect
                        id="new-kategori-select"
                        value={newKategori}
                        onValueChange={(val) => setNewKategori(val)}
                        options={CATEGORY_OPTIONS}
                        placeholder="Pilih Kategori"
                      />
                    </div>

                    <div>
                      <label htmlFor="new-prioritas-select" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Tingkat Prioritas:
                      </label>
                      <SearchableSelect
                        id="new-prioritas-select"
                        value={newPrioritas}
                        onValueChange={(val) => setNewPrioritas(val)}
                        options={PRIORITY_OPTIONS}
                        placeholder="Pilih Prioritas"
                      />
                    </div>

                    <div>
                      <label htmlFor="new-judul-input" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Subjek / Topik Obrolan:
                      </label>
                      <Input
                        id="new-judul-input"
                        placeholder="Contoh: Sinkronisasi RFID di Gate A lambat"
                        value={newJudul}
                        onChange={(e) => setNewJudul(e.target.value)}
                        className="rounded-xl text-xs h-8"
                      />
                      {formErrors.judul && <p className="text-[10px] text-rose-500 mt-1">{formErrors.judul}</p>}
                    </div>

                    <div>
                      <label htmlFor="new-pesan-textarea" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Pesan Pembuka:
                      </label>
                      <textarea
                        id="new-pesan-textarea"
                        rows={3}
                        placeholder="Jelaskan detail kendala Anda..."
                        value={newPesan}
                        onChange={(e) => setNewPesan(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {formErrors.pesan && <p className="text-[10px] text-rose-500 mt-1">{formErrors.pesan}</p>}
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        type="button"
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={() => setShowNewChatModal(false)}
                        className="text-xs rounded-xl cursor-pointer"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        variant="toolbarPrimary"
                        size="toolbar"
                        disabled={createTicketMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        {createTicketMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send size={12} />}
                        {createTicketMutation.isPending ? 'Membuka...' : 'Buka Percakapan'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}

          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

SupportHelpdeskPage.displayName = 'SupportHelpdeskPage';
export default SupportHelpdeskPage;
