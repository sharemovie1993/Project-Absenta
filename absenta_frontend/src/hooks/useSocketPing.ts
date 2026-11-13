import { useEffect, useRef, useState } from 'react';
import { socketService } from '@/services/socket.service';

export type SignalLevel = 0 | 1 | 2 | 3 | 4; // 0 = disconnected, 4 = full

export interface PingState {
  latencyMs: number | null;  // null = belum diukur / disconnected
  signalLevel: SignalLevel;  // 0–4 bar
  isConnected: boolean;
}

/** Mapping latensi → jumlah bar sinyal (seperti ML) */
function latencyToSignal(ms: number | null, connected: boolean): SignalLevel {
  if (!connected || ms === null) return 0;
  if (ms < 50)  return 4; // Excellent  < 50ms
  if (ms < 100) return 3; // Good       50–100ms
  if (ms < 200) return 2; // Fair       100–200ms
  if (ms < 500) return 1; // Poor       200–500ms
  return 1;               // Very poor  > 500ms (tetap 1 bar, tidak 0)
}

/**
 * Hook pengukur latensi real-time via Socket.IO ping/pong.
 *
 * Strategi dual:
 *  - PRIMARY  : ack callback `socket.emit('c:ping', t0, cb)` — RTT tepat
 *  - FALLBACK : listener `s:pong` biasa — aman untuk setup proxy/nginx yang
 *               kadang strip ack (mis. sticky-session off, atau Vite HTTPS proxy)
 *
 * Listener connect/disconnect langsung update state tanpa tunggu interval.
 */
export function useSocketPing(intervalMs = 2000): PingState {
  const [state, setState] = useState<PingState>({
    latencyMs: null,
    signalLevel: 0,
    isConnected: false,
  });

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef  = useRef<boolean>(false);
  const t0Ref       = useRef<number>(0);
  const ackDoneRef  = useRef<boolean>(false); // flag: ack sudah diterima, jangan proses s:pong lagi

  useEffect(() => {
    const handleConnected = () => {
      // Segera ukur saat socket baru connect (tanpa tunggu interval)
      pendingRef.current = false;
      measure();
    };

    const handleDisconnected = () => {
      pendingRef.current = false;
      ackDoneRef.current = false;
      setState({ latencyMs: null, signalLevel: 0, isConnected: false });
    };

    // Fallback: server mengemit 's:pong' biasa tanpa ack
    const handlePong = (echoedT0: number) => {
      if (ackDoneRef.current) return; // ack sudah lebih dulu — abaikan
      clearPendingTimeout();
      pendingRef.current = false;
      const ms = Date.now() - (echoedT0 || t0Ref.current);
      setState({
        latencyMs: ms,
        signalLevel: latencyToSignal(ms, true),
        isConnected: true,
      });
    };

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const clearPendingTimeout = () => {
      if (timeoutHandle) { clearTimeout(timeoutHandle); timeoutHandle = null; }
    };

    const measure = () => {
      const socket = socketService.getSocket();
      if (!socket?.connected) {
        setState({ latencyMs: null, signalLevel: 0, isConnected: false });
        return;
      }
      if (pendingRef.current) return;
      pendingRef.current = true;
      ackDoneRef.current = false;

      t0Ref.current = Date.now();
      const t0 = t0Ref.current;

      timeoutHandle = setTimeout(() => {
        pendingRef.current = false;
        ackDoneRef.current = false;
        setState({ latencyMs: null, signalLevel: 0, isConnected: false });
      }, 4000); // 4 detik — lebih longgar dari sebelumnya (3 detik)

      // PRIMARY: ack callback
      socket.emit('c:ping', t0, (_echoedT0: number) => {
        if (ackDoneRef.current) return;
        ackDoneRef.current = true;
        clearPendingTimeout();
        pendingRef.current = false;
        const ms = Date.now() - t0;
        setState({
          latencyMs: ms,
          signalLevel: latencyToSignal(ms, true),
          isConnected: true,
        });
      });
    };

    // Bind lifecycle events
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('connect',    handleConnected);
      socket.on('disconnect', handleDisconnected);
      socket.on('s:pong',     handlePong);
    }

    // Ukur segera saat mount
    measure();
    timerRef.current = setInterval(measure, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearPendingTimeout();
      const s = socketService.getSocket();
      if (s) {
        s.off('connect',    handleConnected);
        s.off('disconnect', handleDisconnected);
        s.off('s:pong',     handlePong);
      }
    };
  }, [intervalMs]);

  return state;
}
