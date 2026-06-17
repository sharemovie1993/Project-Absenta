import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useParentAuthStore } from '../../../store/parentAuthStore';
import { ParentSocketContext } from '../hooks/useParentSocket';

export const ParentSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token } = useParentAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Determine URL logic copied from SocketService
    const baseRaw = (import.meta as any).env?.VITE_SOCKET_URL || (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';
    const base = String(baseRaw).replace(/\/$/, '');
    const useApiPath = /\/api$/.test(base);
    const socketUrl = useApiPath ? base.slice(0, -4) : base;
    const path = '/socket.io';

    const newSocket = io(socketUrl, {
      path,
      auth: {
        token: token 
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[ParentSocket] Connected', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[ParentSocket] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[ParentSocket] Connection error:', err.message);
      if (err.message.includes('Unauthorized') || err.message.includes('token')) {
        console.warn('[ParentSocket] Auth failed, stopping reconnection');
        newSocket.disconnect();
      }
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <ParentSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </ParentSocketContext.Provider>
  );
};
