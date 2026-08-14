import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

type SocketEventCallback = (data: any) => void;

export class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private listeners: Map<string, SocketEventCallback[]> = new Map();
  private token: string | null = null;
  private tenantId: string | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(token: string, tenantId?: string): Socket | null {
    if (this.socket && this.token === token) {
        if (!this.socket.connected && !this.socket.active) {
            this.socket.connect();
        }
        return this.socket;
    }

    this.token = token;
    this.tenantId = tenantId || null;

    const baseRaw = (import.meta as any).env?.VITE_SOCKET_URL || (import.meta as any).env?.VITE_API_BASE_URL;
    let base = baseRaw ? String(baseRaw).replace(/\/$/, '') : '';
    
    // Fallback to window.location.origin if URL is relative or empty
    if (!base || (!base.startsWith('http://') && !base.startsWith('https://'))) {
      base = window.location.origin;
    }

    const useApiPath = /\/api$/.test(base) || base.includes('/api/');
    let socketUrl = useApiPath ? base.split('/api')[0] : base;

    const isHttps = window.location.protocol === 'https:';
    if (isHttps && socketUrl.startsWith('http://')) {
      socketUrl = socketUrl.replace('http://', 'https://');
    }

    const path = '/socket.io';

    console.log(`[SocketService] Connecting to ${socketUrl} with path ${path}`);

    this.socket = io(socketUrl, {
      auth: (cb) => {
        // Ambil token terbaru dari localStorage, fallback ke token inisialisasi awal
        const freshToken = localStorage.getItem('access_token') || token;
        cb({ token: freshToken });
      },
      path,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity, // Coba menghubungkan ulang tanpa batas!
      reconnectionDelay: 1000, // Mulai dari 1 detik agar gegas
      reconnectionDelayMax: 5000, // Maksimal jeda 5 detik agar respons cepat
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected');
      if (this.tenantId) {
          // Ideally backend handles this via token, but we can emit join if needed
          // this.socket?.emit('join_tenant', this.tenantId);
      }
      this.rebindListeners();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected:', reason);
    });
    
    this.socket.on('connect_error', async (err) => {
      console.error('[SocketService] Connect Error:', err.message);
      
      // Jika error autentikasi (Unauthorized / token expired), coba lakukan auto-refresh token proaktif!
      if (err.message.includes('Unauthorized') || err.message.includes('token') || err.message.includes('auth')) {
        console.warn('[SocketService] Auth failed, attempting to refresh token in background...');
        try {
          // Panggil fungsi refresh token dari authStore secara asinkron
          await useAuthStore.getState().refresh();
          const newToken = localStorage.getItem('access_token');
          
          if (newToken) {
            console.log('[SocketService] Token successfully refreshed, reconnecting WebSocket...');
            // Panggil connect() kembali. Callback auth di atas akan mengambil token baru secara otomatis dari localStorage!
            this.socket?.connect();
          } else {
            console.warn('[SocketService] Refresh failed, no new token found. Disconnecting socket.');
            this.socket?.disconnect();
          }
        } catch (refreshErr) {
          console.error('[SocketService] Failed to refresh token during socket reconnection:', refreshErr);
          this.socket?.disconnect();
        }
      }
    });

    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public subscribe(event: string, callback: SocketEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const callbacks = this.listeners.get(event);
    if (callbacks && !callbacks.includes(callback)) {
      callbacks.push(callback);
    }

    // Bind to actual socket if connected
    if (this.socket) {
        // Hapus dulu untuk berjaga-jaga dari duplicate binding
        this.socket.off(event, callback as any);
        this.socket.on(event, callback as any);
    }
  }

  public unsubscribe(event: string, callback: SocketEventCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
      if (this.socket) {
          this.socket.off(event, callback as any);
      }
    }
  }

  public emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  private rebindListeners() {
      if (!this.socket) return;
      
      this.listeners.forEach((callbacks, event) => {
          callbacks.forEach(cb => {
              // Hapus dulu dari socket jika sudah terikat untuk menghindari leak duplikasi
              this.socket?.off(event, cb as any);
              this.socket?.on(event, cb as any);
          });
      });
  }
}

export const socketService = SocketService.getInstance();
