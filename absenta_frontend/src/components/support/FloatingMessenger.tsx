import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { supportTicketApi, type SupportTicket, type SupportTicketMessage } from '@/api/support-ticket.api';
import { MessageCircle, X, Send, Shield, User, Loader2, MessageSquare, ExternalLink } from 'lucide-react';
import { playNotificationSound } from '@/utils/audioUtils';

export default function FloatingMessenger() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCS = user?.role?.name === 'SUPERADMIN' || user?.role?.name === 'PLATFORM_SUPPORT';
  const isSupportPage = window.location.pathname.includes('/support');
  const hasSupportAccess = 
    user?.role?.name === 'SUPERADMIN' || 
    user?.role?.name === 'ADMIN' || 
    user?.role?.name === 'PLATFORM_SUPPORT' ||
    (user?.capabilities && user.capabilities.includes('support.tickets.view'));

  // Active Ticket Query via useQuery
  const activeTicketQuery = useQuery({
    queryKey: ['floating-messenger-active-ticket', isCS, user?.id],
    queryFn: async () => {
      if (isCS) {
        const res = await supportTicketApi.getAdminTickets({ status: 'OPEN' });
        if (res.success && res.data && res.data.length > 0) {
          const latestTicket = res.data[0];
          const detailRes = await supportTicketApi.getAdminTicketDetail(latestTicket.id);
          return detailRes.data || null;
        }
      } else {
        const res = await supportTicketApi.getSchoolTickets();
        if (res.success && res.data && res.data.length > 0) {
          const activeTickets = res.data.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED');
          const targetTicket = activeTickets.length > 0 ? activeTickets[0] : res.data[0];
          const detailRes = await supportTicketApi.getSchoolTicketDetail(targetTicket.id);
          return detailRes.data || null;
        }
      }
      return null;
    },
    enabled: !!hasSupportAccess && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const ticket = activeTicketQuery.data || null;
  const messages = ticket?.Messages || [];
  const loading = activeTicketQuery.isLoading;

  const loadActiveTicket = async () => {
    await activeTicketQuery.refetch();
  };

  // 🔔 Menangani WebSocket Real-Time untuk Pesan Baru
  useEffect(() => {
    if (!socket || !hasSupportAccess) return;

    const handleIncomingMessage = (msg: SupportTicketMessage) => {
      if (!msg) return;

      const isFromOpponent = 
        (isCS && msg.sender_type === 'CUSTOMER') ||
        (!isCS && msg.sender_type === 'SUPPORT');

      if (!isFromOpponent) return;

      // Kasus A: Pesan untuk tiket yang sedang aktif dibuka di panel melayang
      if (ticket && msg.ticket_id === ticket.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        playNotificationSound();
        setIsOpen(true);
        setUnreadCount(0);
      } 
      // Kasus B: Belum ada tiket aktif di-load OR pesan untuk tiket lain
      else {
        playNotificationSound();
        setIsOpen(true);
        setUnreadCount(0);
        // Muat detail tiket dari pesan baru tersebut secara instan!
        loadActiveTicket(msg.ticket_id);
      }
    };

    socket.on('support:message', handleIncomingMessage);

    return () => {
      socket.off('support:message', handleIncomingMessage);
    };
  }, [socket, ticket?.id, isOpen, isCS]);

  // 📡 Bagikan status tiket aktif melayang ke lingkup global window untuk meredam toast duplikat
  useEffect(() => {
    if (isOpen && ticket?.id) {
      (window as any).__ACTIVE_FLOATING_TICKET_ID__ = ticket.id;
    } else {
      (window as any).__ACTIVE_FLOATING_TICKET_ID__ = null;
    }
    return () => {
      (window as any).__ACTIVE_FLOATING_TICKET_ID__ = null;
    };
  }, [isOpen, ticket?.id]);

  // Scroll otomatis ke bawah & auto-focus input text
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      
      // Auto focus kursor ke input box setelah animasi selesai
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [messages, isOpen]);

  // 🔔 Dengarkan CustomEvent 'open-floating-messenger' dari klik Toast global
  useEffect(() => {
    if (!hasSupportAccess) return;
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const ticketId = customEvent.detail?.ticketId;
      
      setIsOpen(true);
      setUnreadCount(0); // Reset unread count
      loadActiveTicket(ticketId); // Refresh obrolan aktif terbaru
    };

    window.addEventListener('open-floating-messenger', handleOpenEvent);
    return () => {
      window.removeEventListener('open-floating-messenger', handleOpenEvent);
    };
  }, []);

  // ✉️ Mengirim Pesan Balasan Cepat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !ticket || sending) return;

    try {
      setSending(true);
      const textToSend = replyText.trim();
      setReplyText('');

      let res;
      if (isCS) {
        res = await supportTicketApi.replyAdminTicket(ticket.id, textToSend);
      } else {
        res = await supportTicketApi.replySchoolTicket(ticket.id, textToSend);
      }

      if (res.success && res.data) {
        const newMsg = res.data;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    } catch (err) {
      console.error('Failed to send messenger reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleOpenToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0); // Reset unread count
      loadActiveTicket(); // Refresh data tiket terbaru
    }
  };

  // Jangan tampilkan widget melayang jika pengguna sedang membuka halaman support penuh atau tidak memiliki akses
  if (isSupportPage || !user?.id || !hasSupportAccess) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      
      {/* 💬 Messenger Panel Window */}
      {isOpen && (
        <div className="mb-4 w-[360px] sm:w-[380px] h-[480px] bg-white dark:bg-slate-900 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col animate-spring-up transition-all duration-300">
          
          {/* Header Panel */}
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-sm">
                  {isCS ? '🎧' : '🏫'}
                </div>
                <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-indigo-600 ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black tracking-wide">
                  {isCS ? 'Layanan Bantuan Absenta' : 'CS Absenta.id'}
                </h4>
                <p className="text-[9px] text-indigo-100 font-bold flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                  Tim Dukungan Real-time
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1.5">
              <button 
                onClick={() => {
                  setIsOpen(false);
                  const ticketIdSuffix = ticket ? `?ticketId=${ticket.id}` : '';
                  window.location.href = isCS 
                    ? `/superadmin/support${ticketIdSuffix}` 
                    : `/support${ticketIdSuffix}`;
                }}
                title="Buka Halaman Penuh"
                className="p-1.5 rounded-full hover:bg-white/10 transition-all text-white/90 hover:text-white"
              >
                <ExternalLink size={15} />
              </button>
              <button 
                onClick={handleOpenToggle}
                className="p-1.5 rounded-full hover:bg-white/10 transition-all text-white/90 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 p-4 bg-slate-50/50 dark:bg-slate-950/40 overflow-y-auto space-y-3 flex flex-col">
            
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest">Memuat Obrolan...</span>
              </div>
            ) : !ticket ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <MessageSquare size={24} className="text-slate-400" />
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isCS ? 'Tidak Ada Tiket Aktif' : 'Ada Yang Bisa Kami Bantu?'}
                  </h5>
                  <p className="text-[10px] text-slate-400 max-w-[220px] leading-relaxed mx-auto">
                    {isCS 
                      ? 'Saat ini belum ada tiket aduan masuk dari sekolah yang perlu Anda respon.'
                      : 'Kirim keluhan, kendala, atau masukan Anda langsung kepada tim bantuan kami.'}
                  </p>
                </div>
                {!isCS && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = '/support';
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95"
                  >
                    Buat Aduan Baru
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Info Bar Keluhan */}
                <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl flex items-center justify-between text-[9px] font-bold text-indigo-700 dark:text-indigo-400">
                  <span>TIKET: {ticket.ticket_number}</span>
                  <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-black">
                    {ticket.status}
                  </span>
                </div>

                {/* Deskripsi Awal Aduan */}
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase">
                    <span>Masalah Awal</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                  <h6 className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1">{ticket.title}</h6>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{ticket.description}</p>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-800/80 my-2" />

                {/* Thread Chat Obrolan */}
                <div className="space-y-3 flex-1">
                  {messages.map((msg) => {
                    const isMsgCS = msg.sender_type === 'SUPPORT';
                    const isOutgoing = isCS ? isMsgCS : !isMsgCS;
                    
                    return (
                      <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start space-x-1.5 max-w-[85%] ${isOutgoing ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                          
                          {/* Mini Avatar */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black flex-shrink-0 ${isMsgCS ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                            {isMsgCS ? <Shield size={10} /> : <User size={10} />}
                          </div>

                          {/* Bubble text */}
                          <div className="space-y-0.5">
                            <div className={`p-2.5 rounded-xl text-[10px] font-bold leading-relaxed shadow-sm ${
                              isOutgoing 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-800'
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.message}</p>
                            </div>
                            <span className="text-[7px] text-slate-400 block px-1 text-right">
                              {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </>
            )}

          </div>

          {/* Form Footer Input */}
          {ticket && (ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') && (
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Tulis respons balasan cepat..."
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-200 placeholder-slate-400 border border-slate-100 dark:border-slate-700 rounded-full focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 font-bold transition-all duration-200"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sending}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all duration-200 disabled:opacity-50 disabled:scale-95 active:scale-95 shadow-md shadow-indigo-600/10"
              >
                {sending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              </button>
            </form>
          )}

        </div>
      )}

      {/* 🚀 Floating Circle Toggle Button */}
      <button
        onClick={handleOpenToggle}
        className={`relative p-4 rounded-full text-white shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 bg-gradient-to-tr ${
          isOpen
            ? 'from-rose-500 to-rose-600 rotate-90 hover:rotate-180'
            : 'from-indigo-600 to-indigo-700 hover:rotate-6'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}

        {/* 🔴 Unread Badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white ring-2 ring-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

    </div>
  );
}
