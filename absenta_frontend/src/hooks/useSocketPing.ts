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
 * Teknik: kirim event `c:ping` dengan timestamp, server echo balik,
 * ukur selisih Date.now(). Update setiap `intervalMs` (default 2 detik).
 * Nol request HTTP, nol DB query — murni WebSocket RTT.
 */
export function useSocketPing(intervalMs = 2000): PingState {
  const [state, setState] = useState<PingState>({
    latencyMs: null,
    signalLevel: 0,
    isConnected: false,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef<boolean>(false);

  useEffect(() => {
    const measure = () => {
      const socket = socketService.getSocket();
      if (!socket?.connected) {
        setState({ latencyMs: null, signalLevel: 0, isConnected: false });
        return;
      }

      // Hindari ping bertumpuk jika respons belum datang
      if (pendingRef.current) return;
      pendingRef.current = true;

      const t0 = Date.now();
      const timeout = setTimeout(() => {
        // Timeout 3 detik — anggap tidak responsif
        pendingRef.current = false;
        setState({ latencyMs: null, signalLevel: 0, isConnected: false });
      }, 3000);

      socket.emit('c:ping', t0, (_echoedT0: number) => {
        clearTimeout(timeout);
        pendingRef.current = false;
        const ms = Date.now() - t0;
        setState({
          latencyMs: ms,
          signalLevel: latencyToSignal(ms, true),
          isConnected: true,
        });
      });
    };

    // Ukur segera saat mount
    measure();

    timerRef.current = setInterval(measure, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalMs]);

  return state;
}
