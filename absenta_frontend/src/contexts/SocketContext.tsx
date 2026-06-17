import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket.service';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../hooks/useTenant';
import { SocketContext } from '../hooks/useSocket';
import { toast } from 'react-hot-toast';
import { playNotificationSound } from '../utils/audioUtils';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isTokenValid, user } = useAuth();
  const { tenantId } = useTenant();
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const processedMessageIdsRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only attempt connection if we have a token
    if (token) {
      // Check validity inside effect, don't use as dependency
      if (isTokenValid()) {
        const s = socketService.connect(token, tenantId || undefined);
        setSocket(s);

        const onConnect = () => {
          setIsConnected(true);
          if (user?.id) {
             s?.emit('join_self');
          }
        };
        const onDisconnect = () => setIsConnected(false);

        s?.on('connect', onConnect);
        s?.on('disconnect', onDisconnect);

        if (s?.connected) {
          setIsConnected(true);
          if (user?.id) {
             s?.emit('join_self');
          }
        }

        return () => {
          s?.off('connect', onConnect);
          s?.off('disconnect', onDisconnect);
          // Do not disconnect service to allow shared usage
        };
      }
    } else {
        socketService.disconnect();
        setSocket(null);
        setIsConnected(false);
    }
  }, [token, tenantId, user?.id]); // Added user.id to dependencies

  // Langganan obrolan real-time global untuk Toast Notifikasi Pesan Masuk
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleGlobalMessage = (msg: any) => {
      if (!msg || !msg.id) return;

      // 🛑 1. Duplicate Message Guard: Cegah toast duplikat jika ID pesan ini sudah pernah diproses
      if (processedMessageIdsRef.current.has(msg.id)) {
        console.log('[SocketContext] Duplicate message toast suppressed:', msg.id);
        return;
      }

      // Tambahkan ke daftar pesan yang sudah diproses, batasi memori Set
      processedMessageIdsRef.current.add(msg.id);
      if (processedMessageIdsRef.current.size > 100) {
        const firstValue = processedMessageIdsRef.current.values().next().value;
        if (firstValue) processedMessageIdsRef.current.delete(firstValue);
      }

      // Filter: Hanya tampilkan jika pesan berasal dari lawan bicara
      // - Superadmin CS hanya menerima notifikasi dari Klien Sekolah (CUSTOMER)
      // - Klien Sekolah hanya menerima notifikasi dari Support Agent CS (SUPPORT)
      const isCSUser = user.role?.name === 'SUPERADMIN' || user.role?.name === 'PLATFORM_SUPPORT';
      const isFromOpponent = 
        (isCSUser && msg.sender_type === 'CUSTOMER') ||
        (!isCSUser && msg.sender_type === 'SUPPORT');

      if (!isFromOpponent) return;

      // 🛑 2. Active Floating Messenger Guard: Jangan tampilkan toast jika user aktif chatting di FloatingMessenger
      const activeFloatingTicketId = (window as any).__ACTIVE_FLOATING_TICKET_ID__;
      if (activeFloatingTicketId && activeFloatingTicketId === msg.ticket_id) {
         console.log('[SocketContext] Suppressing toast, user is actively chatting in FloatingMessenger');
         return;
      }

      // Jangan tampilkan toast jika pengguna sudah berada di halaman obrolan yang bersangkutan
      const isSupportPage = window.location.pathname.includes('/support');
      if (isSupportPage) {
        // Nada bel notifikasi dimainkan oleh halaman support itu sendiri jika tidak aktif dibuka,
        // jadi kita lewati pemutaran suara dan toast di global agar tidak bentrok/double.
        return;
      }

      // 1. Bunyikan bel chime notifikasi premium
      playNotificationSound();

      // 2. Tampilkan gelembung notifikasi toast kustom yang sangat cantik ala WhatsApp/SaaS premium
      const senderName = msg.Sender?.full_name || (msg.sender_type === 'SUPPORT' ? 'Official CS' : 'Sekolah');
      
      toast.custom((t) => (
        <div
          onClick={() => {
            toast.dismiss(t.id);
            if (isCSUser) {
              // Jika operator CS/Superadmin mengklik, langsung redirect ke halaman support dengan membawa parameter ticketId!
              window.location.href = `/superadmin/support?ticketId=${msg.ticket_id}`;
            } else {
              // Jika client sekolah, biarkan membuka Messenger Widget melayang
              const event = new CustomEvent('open-floating-messenger', { 
                detail: { ticketId: msg.ticket_id } 
              });
              window.dispatchEvent(event);
            }
          }}
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-gradient-to-r ${
            isCSUser 
              ? 'from-rose-600 via-purple-600 to-indigo-600 border-pink-400 shadow-[0_10px_35px_rgba(236,72,153,0.5)]' 
              : 'from-emerald-600 via-teal-600 to-cyan-600 border-emerald-400 shadow-[0_10px_35px_rgba(16,185,129,0.4)]'
          } border-2 text-white rounded-xl pointer-events-auto flex p-4.5 transition-all duration-300 transform hover:scale-[1.02] cursor-pointer`}
        >
          <div className="flex-1 w-0 text-left">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-11 w-11 rounded-full bg-white text-rose-650 flex items-center justify-center font-black text-lg animate-bounce shadow-xl shadow-black/20">
                  {isCSUser ? '🔔' : '💬'}
                </div>
              </div>
              <div className="ml-3.5 flex-1 space-y-0.5">
                <p className="text-[10px] font-black tracking-widest text-pink-100 uppercase bg-black/25 px-2.5 py-0.5 rounded-full inline-block border border-white/10">
                  {isCSUser ? 'CHAT ADUAN MASUK' : 'BALASAN CS MASUK'}
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
            <span className="px-3.5 py-2 bg-white text-indigo-900 rounded-xl text-[10px] font-black shadow-lg shadow-black/20">
              BUKA
            </span>
          </div>
        </div>
      ), {
        duration: 8000,
        position: 'top-right'
      });
    };

    socket.on('support:message', handleGlobalMessage);

    return () => {
      socket.off('support:message', handleGlobalMessage);
    };
  }, [socket, user?.id, user?.role?.name]);

  const subscribe = React.useCallback((event: string, cb: (data: any) => void) => {
    socketService.subscribe(event, cb);
  }, []);

  const unsubscribe = React.useCallback((event: string, cb: (data: any) => void) => {
    socketService.unsubscribe(event, cb);
  }, []);

  const emit = React.useCallback((event: string, data: unknown) => {
    socketService.emit(event, data);
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, subscribe, unsubscribe, emit }}>
      {children}
    </SocketContext.Provider>
  );
};
