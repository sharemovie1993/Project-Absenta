import React, { useState, useEffect, useRef } from 'react';
import { Activity, Wifi, Globe, RefreshCw } from 'lucide-react';
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
  const [telemetry, setTelemetry] = useState<any>(initialTelemetry || null);
  const [points, setPoints] = useState<TrafficPoint[]>(() => {
    // Bangkitkan 6 titik awal mundur agar kurva langsung terbentang mulus saat halaman dimuat
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

  // 1. Polling Aktif Terpercaya (Interval 2.5 Detik - Persis Cara Kerja Asli Mikhmon RouterOS)
  useEffect(() => {
    if (!tunnelId) return;

    let isMounted = true;

    const fetchTelemetry = async () => {
      try {
        const res = await easyTunnelApi.getTelemetry(tunnelId);
        if (!isMounted) return;

        if (res.success && res.data) {
          setTelemetry(res.data);
          const rawLan = Number(res.data?.local?.avg_response_time_ms);
          const rawVpn = Number(res.data?.public?.avg_response_time_ms);

          const curLan = !isNaN(rawLan) && rawLan > 0 ? rawLan : latestLanRef.current;
          const curVpn = !isNaN(rawVpn) && rawVpn > 0 ? rawVpn : latestVpnRef.current;

          latestLanRef.current = curLan;
          latestVpnRef.current = curVpn;

          const now = new Date();
          const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          setPoints(prev => {
            const next = [...prev, { time: timeStr, lanMs: curLan, vpnMs: curVpn }];
            // Batasi 8 titik sliding window ala Mikhmon
            return next.length > 8 ? next.slice(next.length - 8) : next;
          });
        }
      } catch (err) {
        if (!isMounted) return;
        // Fallback ticker agar jam sumbu X tetap mengalir walau jaringan sempat hening
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setPoints(prev => {
          const next = [...prev, { time: timeStr, lanMs: latestLanRef.current, vpnMs: latestVpnRef.current }];
          return next.length > 8 ? next.slice(next.length - 8) : next;
        });
      }
    };

    // Ambil data pertama seketika
    fetchTelemetry();

    // Jalankan timer polling tiap 2.5 detik
    const interval = setInterval(fetchTelemetry, 2500);

    // Saat tab dibuka kembali setelah ditinggal lama (tab visibility recovery)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTelemetry();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [tunnelId]);

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
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[9px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Monitor (2.5s)
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
