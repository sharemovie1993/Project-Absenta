import React from 'react';
import {
  Activity,
  Play,
  Square,
  RefreshCw,
  Edit2,
  Trash2,
  ExternalLink,
  Wifi,
  WifiOff,
  Copy,
  Server,
  Zap
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import type { Tunnel } from '../../../api/easyTunnel.api';
import toast from 'react-hot-toast';

interface Props {
  tunnel: Tunnel;
  actionLoading: string | null;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onEdit: (t: Tunnel) => void;
  onDelete: (id: string, name: string) => void;
  onCheckPing: (id: string) => void;
}

export const EasyTunnelCard: React.FC<Props> = React.memo(({
  tunnel,
  actionLoading,
  onStart,
  onStop,
  onRestart,
  onEdit,
  onDelete,
  onCheckPing
}) => {
  const isConnected = tunnel.status === 'connected';
  const publicUrl = `https://${tunnel.subdomain}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('URL tunnel publik disalin!');
  };

  return (
    <Card className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 space-y-5 w-full min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-50 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isConnected ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
          }`}>
            {isConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tunnel.app_name || 'Easy Tunnel Node'}
              </h3>
              <Badge variant={isConnected ? 'success' : 'destructive'} className="text-[9px] font-bold">
                {isConnected ? 'TERHUBUNG (ONLINE)' : 'TERPUTUS (OFFLINE)'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Port Lokal: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">127.0.0.1:{tunnel.local_port}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          {isConnected ? (
            <Button
              type="button"
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => onStop(tunnel.id)}
              disabled={Boolean(actionLoading)}
              className="rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <Square size={12} className="mr-1" /> Putus
            </Button>
          ) : (
            <Button
              type="button"
              variant="toolbarPrimary"
              size="toolbar"
              onClick={() => onStart(tunnel.id)}
              disabled={Boolean(actionLoading)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Play size={12} className="mr-1" /> Hubungkan
            </Button>
          )}

          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => onRestart(tunnel.id)}
            disabled={Boolean(actionLoading)}
            className="rounded-xl"
          >
            <RefreshCw size={12} className={actionLoading === `restart-${tunnel.id}` ? 'animate-spin' : ''} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(tunnel)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 rounded-lg"
          >
            <Edit2 size={13} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(tunnel.id, tunnel.app_name || tunnel.subdomain)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* URL Tunnel Box */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Alamat Publik Terowongan:</span>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
          >
            {publicUrl}
          </a>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copyUrl}
            className="h-7 px-2.5 text-xs text-slate-500 hover:text-indigo-600 rounded-lg"
          >
            <Copy size={12} className="mr-1" /> Salin
          </Button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </Card>
  );
});

export default EasyTunnelCard;
