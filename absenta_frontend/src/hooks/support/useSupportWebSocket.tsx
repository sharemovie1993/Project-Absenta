import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSocket } from '../useSocket';
import { playNotificationSound } from '../../utils/audioUtils';
import { type SupportTicket } from '../../api/support-ticket.api';

interface UseSupportWebSocketProps {
  selectedTicket: SupportTicket | null;
  tickets: SupportTicket[];
  fetchTickets: () => void;
  fetchTicketDetail: (ticketId: string) => void;
  setTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  isScrollAtBottomRef: React.RefObject<boolean>;
}

export function useSupportWebSocket({
  selectedTicket,
  tickets,
  fetchTickets,
  fetchTicketDetail,
  setTickets,
  setMessages,
  isScrollAtBottomRef
}: UseSupportWebSocketProps) {
  const { subscribe, unsubscribe } = useSocket();
  const [unreadTicketCounts, setUnreadTicketCounts] = useState<Record<string, number>>({});
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [liveUnreadCount, setLiveUnreadCount] = useState(0);

  // Refs untuk WebSocket listeners agar tidak re-bind saat state berubah
  const selectedTicketRef = useRef<SupportTicket | null>(null);
  const ticketsRef = useRef<SupportTicket[]>([]);

  useEffect(() => {
    selectedTicketRef.current = selectedTicket;
  }, [selectedTicket]);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  // Sync initial unread counts from loaded tickets
  useEffect(() => {
    if (tickets.length > 0) {
      setUnreadTicketCounts(prev => {
        const next = { ...prev };
        tickets.forEach((t) => {
          if (t.unread_count && t.unread_count > 0) {
            next[t.id] = t.unread_count;
          } else if (t.unread_count === 0) {
            delete next[t.id];
          }
        });
        return next;
      });
    }
  }, [tickets]);

  useEffect(() => {
    const handleNewMessage = (msg: any) => {
      if (!msg) return;

      // 1. Putar suara notifikasi jika pesan dikirim oleh customer (sekolah)
      if (msg.sender_type === 'CUSTOMER') {
        playNotificationSound();

        const activeTicket = selectedTicketRef.current;
        const isCurrentlyViewingChat = activeTicket && msg.ticket_id === activeTicket.id;

        // Picu notifikasi toast premium HANYA JIKA operator CS sedang tidak membuka obrolan aktif dari tiket tersebut!
        if (!isCurrentlyViewingChat) {
          const targetTicket = ticketsRef.current?.find((t) => t.id === msg.ticket_id);
          const senderName = targetTicket?.Tenant?.name || 'Sekolah';
          const ticketNum = targetTicket?.ticket_number || '';

          toast.custom((t) => (
            <div className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 border-2 border-pink-400 shadow-[0_10px_35px_rgba(236,72,153,0.5)] text-white rounded-xl pointer-events-auto flex p-4.5 transition-all duration-300 transform hover:scale-[1.02]`}>
              <div className="flex-1 w-0">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="h-11 w-11 rounded-full bg-white text-rose-600 flex items-center justify-center font-black text-lg animate-bounce shadow-xl shadow-rose-900/30">
                      🔔
                    </div>
                  </div>
                  <div className="ml-3.5 flex-1 space-y-0.5 text-left">
                    <p className="text-[10px] font-black tracking-widest text-pink-200 uppercase bg-rose-900/50 px-2 py-0.5 rounded-full inline-block border border-rose-700/50">
                      CHAT BARU MASUK {ticketNum ? `#${ticketNum}` : ''}
                    </p>
                    <h4 className="text-xs font-black text-white line-clamp-1">
                      {senderName}
                    </h4>
                    <p className="text-[10px] text-slate-100 font-extrabold line-clamp-2 bg-black/20 p-2 rounded-xl border border-white/10 mt-1 italic leading-relaxed">
                      "{msg.message}"
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 flex items-center">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    fetchTicketDetail(msg.ticket_id);
                  }}
                  className="px-4 py-2.5 bg-white text-indigo-900 rounded-xl text-xs font-black hover:bg-slate-100 active:scale-95 transition-all duration-150 shadow-lg shadow-black/20"
                >
                  BUKA CHAT
                </button>
              </div>
            </div>
          ), {
            id: `msg-${msg.id}`, // Cegah duplikasi toast untuk ID pesan yang sama
            duration: 8000
          });
        }
      }

      const activeTicket = selectedTicketRef.current;

      // 2. Jika pesan adalah untuk tiket yang sedang dibuka
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
        if (isScrollAtBottomRef && !isScrollAtBottomRef.current) {
          setLiveUnreadCount(prev => prev + 1);
        }

        // 🔄 REAL-TIME SYNC: Pemicu refresh antrean kiri agar urutan tiket melompat ke paling atas secara instan!
        fetchTickets();
      } else {
        // 3. Jika pesan untuk tiket lain yang tidak aktif dibuka, tambahkan jumlah pesan belum dibaca
        setUnreadTicketCounts(prev => ({
          ...prev,
          [msg.ticket_id]: (prev[msg.ticket_id] || 0) + 1
        }));

        // 🔄 REAL-TIME SYNC: Pemicu refresh antrean kiri agar tiket melompat ke paling atas antrean kiri secara instan!
        fetchTickets();
      }
    };

    const handleNewTicket = (newTicket: any) => {
      setTickets(prev => {
        if (prev.some(t => t.id === newTicket.id)) return prev;
        return [newTicket, ...prev];
      });
      // Notifikasi Toast premium aduan baru masuk
      toast.success(`Aduan Baru Masuk! #${newTicket.ticket_number} dari ${newTicket.Tenant?.name || 'Sekolah'}`, {
        icon: '🔔',
        duration: 5000
      });
    };

    const handleTicketRated = (data: {
      id: string;
      status: string;
      rating: number;
      rating_comment?: string;
      rated_at: string;
    }) => {
      if (!data) return;

      // 1. Perbarui status & rating di antrean list tiket lokal
      setTickets(prev =>
        prev.map(t =>
          t.id === data.id
            ? { ...t, status: data.status as any, rating: data.rating, rating_comment: data.rating_comment, rated_at: data.rated_at }
            : t
        )
      );

      // 2. Jika tiket yang di-rate sedang aktif dibuka oleh operator CS saat ini
      const activeTicket = selectedTicketRef.current;
      if (activeTicket && activeTicket.id === data.id) {
        fetchTicketDetail(data.id);
      }

      // 3. Tampilkan toast info premium CSAT rating baru masuk
      const targetTicket = ticketsRef.current?.find((t) => t.id === data.id);
      const schoolName = targetTicket?.Tenant?.name || 'Sekolah';
      toast.success(`${schoolName} memberikan penilaian ${data.rating} Bintang!`, {
        icon: '🌟',
        duration: 6000
      });
    };

    subscribe('support:message', handleNewMessage);
    subscribe('support:ticket_created', handleNewTicket);
    subscribe('support:ticket_rated', handleTicketRated);

    return () => {
      unsubscribe('support:message', handleNewMessage);
      unsubscribe('support:ticket_created', handleNewTicket);
      unsubscribe('support:ticket_rated', handleTicketRated);
    };
  }, [subscribe, unsubscribe, fetchTickets, fetchTicketDetail, setTickets, setMessages, isScrollAtBottomRef]);

  const clearUnreadCount = (ticketId: string) => {
    setUnreadTicketCounts(prev => {
      const next = { ...prev };
      delete next[ticketId];
      return next;
    });
  };

  return {
    unreadTicketCounts,
    setUnreadTicketCounts,
    newMessageIds,
    setNewMessageIds,
    liveUnreadCount,
    setLiveUnreadCount,
    clearUnreadCount
  };
}
