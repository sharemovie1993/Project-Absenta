import React from 'react';
import { Cpu, TrendingUp, Clock, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { cn } from '@/lib/utils';

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'RFID' | 'CAMERA';
  status: 'ONLINE' | 'OFFLINE';
  lastPing: string;
  location: string;
}

export interface FeedItem {
  title: string;
  status: string;
  guru?: string;
  message?: string;
  counts?: {
    HADIR?: number;
    TERLAMBAT?: number;
    IZIN?: number;
    ALPA?: number;
  };
}

export interface SectorItem {
  name: string;
  percentage: number;
}

// Custom Divider
export const Divider: React.FC<{ title: string }> = ({ title }) => (
  <div className="relative py-4 shrink-0 select-none">
    <div className="absolute inset-0 flex items-center" aria-hidden="true">
      <div className="w-full border-t border-slate-200 dark:border-slate-800" />
    </div>
    <div className="relative flex justify-center">
      <span className="bg-white dark:bg-slate-900 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
        {title}
      </span>
    </div>
  </div>
);

// Sektor Kehadiran List (Jurusan/Tingkat)
export const SektorKehadiranList: React.FC<{
  statsBySector: SectorItem[];
  sectorName: string;
}> = ({ statsBySector, sectorName }) => {
  return (
    <SectionCard
      title={
        <div className="flex flex-col">
          <span>Tingkat Kehadiran per {sectorName}</span>
          <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Agregasi persentase partisipasi sekolah</span>
        </div>
      }
      icon={TrendingUp}
      className="lg:col-span-1"
      fullWidth
    >
      <div className="h-80 overflow-y-auto space-y-3.5 pr-1 pt-2">
        {statsBySector.length > 0 ? (
          statsBySector?.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400 shrink-0">
                  {idx + 1}
                </div>
                <span className="text-xs font-black truncate uppercase tracking-tight text-slate-800 dark:text-white">{s.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">Rate:</span>
                <span className={cn("text-xs font-black shrink-0", s.percentage >= 90 ? "text-emerald-500" : s.percentage >= 75 ? "text-amber-500" : "text-rose-500")}>
                  {s.percentage}%
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-10">
            <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold">Belum ada statistik sektoral</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
};

// KBM Feed List
export const KbmFeedPanel: React.FC<{ feed: FeedItem[] }> = ({ feed }) => {
  return (
    <SectionCard
      title={
        <div className="flex flex-col">
          <span>Feed Aktivitas Kelas KBM</span>
          <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Status sesi absensi kelas hari ini</span>
        </div>
      }
      icon={Clock}
      fullWidth
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-96 overflow-y-auto pr-1">
        {feed.length > 0 ? (
          feed?.slice(0, 12)?.map((item, idx) => (
            <div key={idx} className="flex flex-col p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:shadow-sm transition-all duration-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                  {item.title}
                </span>
                <Badge variant={item.status === 'BERLANGSUNG' ? 'warning' : item.status === 'SELESAI' ? 'success' : 'info'}>
                  {item.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Guru: {item.guru || 'Umum'}</span>
                <span>{item.message?.split('|')[1]?.trim() || ''}</span>
              </div>
              {item.counts && (
                <div className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/55 text-[9px] font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">H: {item.counts.HADIR || 0}</span>
                  <span className="text-amber-500">T: {item.counts.TERLAMBAT || 0}</span>
                  <span className="text-blue-500">I: {item.counts.IZIN || 0}</span>
                  <span className="text-rose-500">A: {item.counts.ALPA || 0}</span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-slate-500 flex flex-col items-center justify-center">
            <Clock className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold">Tidak ada sesi KBM berlangsung hari ini</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
};

// Terminal Devices Panel
export const TerminalDevicesPanel: React.FC<{ terminalDevices: DeviceInfo[] }> = ({ terminalDevices }) => {
  return (
    <SectionCard
      title={
        <div className="flex flex-col">
          <span>Status Koneksi Terminal Perangkat</span>
          <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Konektivitas hardware RFID & camera biometrik</span>
        </div>
      }
      icon={Cpu}
      fullWidth
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {terminalDevices?.map((device) => (
          <div key={device.id} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", device.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600')}>
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{device.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{device.location} • Ping: {device.lastPing}</p>
              </div>
            </div>
            <Badge variant={device.status === 'ONLINE' ? 'success' : 'destructive'}>
              {device.status}
            </Badge>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};
