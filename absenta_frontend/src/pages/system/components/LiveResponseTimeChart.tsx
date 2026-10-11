import React, { useState, useEffect, useRef, useContext } from 'react';
import { Activity, Wifi, Globe, Zap } from 'lucide-react';
import { SocketContext } from '@/hooks/useSocket';
import { easyTunnelApi } from '../../../api/easyTunnel.api';

interface TrafficPoint {
  time: string;
  lanMs: number;
  vpnMs: number;
}

interface LiveResponseTimeChartProps {
  tunnelId: string;
  hostName: string;
  initialTelemetry?: any;
}

export const LiveResponseTimeChart: React.FC<LiveResponseTimeChartProps> = ({
  tunnelId,
  hostName,
  initialTelemetry
}) => {
  const socketCtx = useContext(SocketContext);
  const socket = socketCtx?.socket;
  const isSocketConnected = !!socketCtx?.isConnected;

  const [telemetry, setTelemetry] = useState<any>(initialTelemetry || null);
  const [points, setPoints] = useState<TrafficPoint[]>(() => {
    // 6 titik awal mundur agar kurva langsung terbentang mulus saat pertama dibuka
    const now = Date.now();
    const initialLan = initialTelemetry?.local?.avg_response_time_ms ?? 2.8;
    const initialVpn = initialTelemetry?.public?.avg_response_time_ms ?? 28.5;
    const initList: TrafficPoint[] = [];

    for (let i = 5; i >= 0; i--) {
      const t = new Date(now - i * 3000);
      const timeStr = t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const jitterLan = Math.max(1, parseFloat((initialLan + (Math.sin(i) * 0.4)).toFixed(1)));
      const jitterVpn = Math.max(5, parseFloat((initialVpn + (Math.cos(i) * 2.2)).toFixed(1)));
      initList.push({
        time: timeStr,
        lanMs: jitterLan,
        vpnMs: jitterVpn
      });
    }
    return initList;
  });

  const latestLanRef = useRef<number>(initialTelemetry?.local?.avg_response_time_ms ?? 2.8);
  const latestVpnRef = useRef<number>(initialTelemetry?.public?.avg_response_time_ms ?? 28.5);

  // 1. Initial Snapshot Fetch (hanya 1x saat pertama kali mount)
  useEffect(() => {
    if (!tunnelId) return;
    easyTunnelApi.getTelemetry(tunnelId)
      .then(res => {
        if (res.success && res.data) {
          setTelemetry(res.data);
          const rawLan = Number(res.data?.local?.avg_response_time_ms);
          const rawVpn = Number(res.data?.public?.avg_response_time_ms);
          if (!isNaN(rawLan) && rawLan > 0) latestLanRef.current = rawLan;
          if (!isNaN(rawVpn) && rawVpn > 0) latestVpnRef.current = rawVpn;
        }
      })
      .catch(() => {});
  }, [tunnelId]);

  // 2. Real-time WebSocket Push Stream via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const subscribeToTelemetry = () => {
      socket.emit('easytunnel:subscribe', { tunnelId, slug: hostName });
    };

    // Langganan awal & langganan ulang otomatis saat reconnect
    subscribeToTelemetry();
    socket.on('connect', subscribeToTelemetry);

    const handleTelemetryUpdate = (data: any) => {
      if (!data) return;

      const rawLan = Number(data.lanMs);
      const rawVpn = Number(data.vpnMs);

      const curLan = !isNaN(rawLan) && rawLan > 0 ? rawLan : latestLanRef.current;
      const curVpn = !isNaN(rawVpn) && rawVpn > 0 ? rawVpn : latestVpnRef.current;

      latestLanRef.current = curLan;
      latestVpnRef.current = curVpn;

      const timeStr = data.time || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setPoints(prev => {
        const next = [...prev, { time: timeStr, lanMs: curLan, vpnMs: curVpn }];
        // Batasi 8 titik sliding window ala Mikhmon
        return next.length > 8 ? next.slice(next.length - 8) : next;
      });

      if (data.localHits !== undefined || data.publicHits !== undefined) {
        setTelemetry((prev: any) => ({
          ...prev,
          local: {
            ...prev?.local,
            hits: data.localHits ?? prev?.local?.hits ?? 0,
            avg_response_time_ms: curLan
          },
          public: {
            ...prev?.public,
            hits: data.publicHits ?? prev?.public?.hits ?? 0,
            avg_response_time_ms: curVpn
          }
        }));
      }
    };

    socket.on('easytunnel:telemetry_update', handleTelemetryUpdate);

    return () => {
      socket.off('connect', subscribeToTelemetry);
      socket.emit('easytunnel:unsubscribe');
      socket.off('easytunnel:telemetry_update', handleTelemetryUpdate);
    };
  }, [socket, tunnelId, hostName]);

  // 3. Anti-Freeze Clock Ticker (menjaga waktu sumbu X selalu berjalan walau server idle / tidak ada klik)
  useEffect(() => {
    const ticker = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setPoints(prev => {
        const last = prev[prev.length - 1];
        if (last && last.time === timeStr) return prev;

        const next = [...prev, {
          time: timeStr,
          lanMs: latestLanRef.current,
          vpnMs: latestVpnRef.current
        }];
        return next.length > 8 ? next.slice(next.length - 8) : next;
      });
    }, 2000);

    return () => clearInterval(ticker);
  }, []);

  // 4. Tab Visibility Recovery (saat tab dibuka kembali setelah ditinggal lama / sleep)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const resynced: TrafficPoint[] = [];
        for (let i = 5; i >= 0; i--) {
          const t = new Date(now - i * 3000);
          resynced.push({
            time: t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            lanMs: latestLanRef.current,
            vpnMs: latestVpnRef.current
          });
        }
        setPoints(resynced);

        if (socket?.connected) {
          socket.emit('easytunnel:subscribe', { tunnelId, slug: hostName });
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [socket, tunnelId, hostName]);

  // Dimensi SVG Mikhmon Box
  const width = 640;
  const height = 210;
  const padding = { top: 38, right: 24, bottom: 35, left: 62 };
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;

  // Skala Y Dinamis
  const maxRecorded = Math.max(...points.map(p => Math.max(p.lanMs, p.vpnMs, 10)), 30);
  const yMax = Math.ceil((maxRecorded * 1.3) / 10) * 10;

  const getX = (idx: number) => {
    if (points.length <= 1) return padding.left + usableWidth / 2;
    return padding.left + (idx / (points.length - 1)) * usableWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(val, yMax));
    return padding.top + usableHeight - (clamped / yMax) * usableHeight;
  };

  // Garis Polyline & Area Path untuk VPN (Salmon/Merah Rx) dan LAN (Cyan Tx)
  const vpnPolylinePoints = points.map((p, idx) => `${getX(idx)},${getY(p.vpnMs)}`).join(' ');
  const lanPolylinePoints = points.map((p, idx) => `${getX(idx)},${getY(p.lanMs)}`).join(' ');

  const firstX = getX(0);
  const lastX = getX(points.length - 1);
  const bottomY = padding.top + usableHeight;
  const vpnAreaPoints = `${firstX},${bottomY} ${vpnPolylinePoints} ${lastX},${bottomY}`;

  // Nilai saat ini untuk headline
  const currentPoint = points[points.length - 1] || { lanMs: 2.8, vpnMs: 28.5 };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#161d2b] text-slate-100 overflow-hidden shadow-xl select-none">
      {/* Header Ala Mikhmon Traffic */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1b2434] border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-300" />
          <span className="font-bold text-xs text-white tracking-wide">Traffic &amp; Live Response Time</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[9px] font-semibold border ${
            isSocketConnected 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <Zap className={`w-3 h-3 ${isSocketConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            {isSocketConnected ? 'WebSocket Stream (1s)' : 'Menghubungkan Stream...'}
          </span>
        </div>
      </div>

      {/* Area Grafik SVG */}
      <div className="p-3">
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            {/* Judul Interface di Tengah Grafik */}
            <text 
              x={width / 2} 
              y={20} 
              textAnchor="middle" 
              fill="#cbd5e1" 
              fontSize="11.5" 
              fontWeight="bold" 
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              Interface {hostName || 'Split-DNS Tunnel'}
            </text>

            <defs>
              <linearGradient id="mikhmonVpnGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#f87171" stopOpacity="0.06" />
              </linearGradient>
            </defs>

            {/* Grid Horisontal Sumbu Y (0%, 25%, 50%, 75%, 100%) */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const yPos = padding.top + usableHeight * (1 - ratio);
              const labelVal = (yMax * ratio).toFixed(1);
              return (
                <g key={i}>
                  <line 
                    x1={padding.left} 
                    y1={yPos} 
                    x2={width - padding.right} 
                    y2={yPos} 
                    stroke="#273248" 
                    strokeWidth="1" 
                  />
                  <text 
                    x={padding.left - 8} 
                    y={yPos + 3.5} 
                    textAnchor="end" 
                    fill="#94a3b8" 
                    fontSize="9.5" 
                    fontFamily="monospace"
                  >
                    {ratio === 0 ? '0 ms' : `${labelVal} ms`}
                  </text>
                </g>
              );
            })}

            {/* Grid Vertikal Transparan */}
            {points.map((_, idx) => (
              <line 
                key={idx}
                x1={getX(idx)} 
                y1={padding.top} 
                x2={getX(idx)} 
                y2={padding.top + usableHeight} 
                stroke="#222b3e" 
                strokeWidth="1" 
              />
            ))}

            {/* 1. Kurva & Shading VPN Tunnel (Merah / Rx Style Mikhmon) */}
            <polygon points={vpnAreaPoints} fill="url(#mikhmonVpnGradient)" />
            <polyline 
              points={vpnPolylinePoints} 
              fill="none" 
              stroke="#f87171" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            {points.map((p, idx) => (
              <circle 
                key={`vpn-dot-${idx}`}
                cx={getX(idx)} 
                cy={getY(p.vpnMs)} 
                r="3.5" 
                fill="#f87171" 
                stroke="#161d2b" 
                strokeWidth="1.5" 
              />
            ))}

            {/* 2. Kurva LAN Lokal (Cyan / Tx Style Mikhmon) */}
            <polyline 
              points={lanPolylinePoints} 
              fill="none" 
              stroke="#38bdf8" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            {points.map((p, idx) => (
              <circle 
                key={`lan-dot-${idx}`}
                cx={getX(idx)} 
                cy={getY(p.lanMs)} 
                r="3.5" 
                fill="#38bdf8" 
                stroke="#161d2b" 
                strokeWidth="1.5" 
              />
            ))}

            {/* Sumbu X: Label Timestamp Jam:Menit:Detik */}
            {points.map((p, idx) => {
              const showLabel = idx === 0 || idx === Math.floor(points.length / 2) || idx === points.length - 1;
              if (!showLabel) return null;
              return (
                <text 
                  key={`time-${idx}`}
                  x={getX(idx)} 
                  y={height - 6} 
                  textAnchor={idx === 0 ? 'start' : (idx === points.length - 1 ? 'end' : 'middle')} 
                  fill="#94a3b8" 
                  fontSize="9.5" 
                  fontFamily="monospace"
                >
                  {p.time}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Legend di Bawah Grafik Ala Mikhmon */}
        <div className="flex items-center justify-center gap-6 mt-1.5 pb-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-xs" />
            <span className="text-slate-300 font-semibold text-[11px]">LAN (Lokal)</span>
            <span className="text-cyan-400 font-mono font-bold text-[11px]">[{currentPoint.lanMs} ms]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f87171] shadow-xs" />
            <span className="text-slate-300 font-semibold text-[11px]">VPN Tunnel</span>
            <span className="text-rose-400 font-mono font-bold text-[11px]">[{currentPoint.vpnMs} ms]</span>
          </div>
        </div>

        {/* Telemetry Breakdown Cards */}
        {telemetry && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-800/80 text-xs">
            {/* LAN Card */}
            <div className="p-2.5 bg-[#121824] rounded-lg border border-slate-800/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10.5px]">
                  <Wifi className="w-3 h-3 text-[#38bdf8]" />
                  <span>Jalur WiFi Sekolah (LAN)</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-[#38bdf8] font-mono">{telemetry.local?.avg_response_time_ms ?? currentPoint.lanMs} ms</span>
                  <span className="text-[10px] text-slate-500">{(telemetry.local?.hits ?? 0).toLocaleString()} req</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono font-bold text-[10px] rounded">
                {telemetry.local?.percentage ?? 0}%
              </span>
            </div>

            {/* VPN Card */}
            <div className="p-2.5 bg-[#121824] rounded-lg border border-slate-800/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10.5px]">
                  <Globe className="w-3 h-3 text-[#f87171]" />
                  <span>Jalur WireGuard (Internet)</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-[#f87171] font-mono">{telemetry.public?.avg_response_time_ms ?? currentPoint.vpnMs} ms</span>
                  <span className="text-[10px] text-slate-500">{(telemetry.public?.hits ?? 0).toLocaleString()} req</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono font-bold text-[10px] rounded">
                {telemetry.public?.percentage ?? 0}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveResponseTimeChart;
