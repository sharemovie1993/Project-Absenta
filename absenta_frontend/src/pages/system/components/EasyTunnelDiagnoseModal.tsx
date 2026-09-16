import React from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Terminal, Server } from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import type { Tunnel } from '../../../api/easyTunnel.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tunnel: Tunnel | null;
  tunnelBaseDomain?: string;
  loading: boolean;
  result: { success: boolean; message: string; details: string[] } | null;
  error: string | null;
  onReDiagnose: (id: string) => void;
}

export const EasyTunnelDiagnoseModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  tunnel,
  tunnelBaseDomain,
  loading,
  result,
  error,
  onReDiagnose
}) => {
  if (!tunnel) return null;

  const baseDomain = tunnelBaseDomain || 'absenta.id';
  const slug = tunnel.slug || '';
  const domainDisplay = slug ? (slug.includes('.') ? slug : `${slug}.${baseDomain}`) : '-';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Diagnosa Koneksi & Jaringan Tunnel"
      size="lg"
    >
      <div className="space-y-4 py-2 text-xs">
        {/* Node Overview Header */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Server size={14} className="text-indigo-600 dark:text-indigo-400" />
              <strong className="text-slate-900 dark:text-white font-bold text-xs">{tunnel.app_name || 'Easy Tunnel Node'}</strong>
              <Badge variant={tunnel.status === 'connected' ? 'success' : 'secondary'} className="text-[9px] font-bold">
                {tunnel.status.toUpperCase()}
              </Badge>
            </div>
            <p className="font-mono text-[11px] text-slate-400">
              Domain: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{domainDisplay}</span> • Port: 127.0.0.1:{tunnel.local_port}
            </p>
          </div>

          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => onReDiagnose(tunnel.id)}
            disabled={loading}
            className="rounded-xl font-bold self-end sm:self-center"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin mr-1 text-indigo-600' : 'mr-1 text-indigo-600'} />
            {loading ? 'Mendiagnosa...' : 'Uji Ulang'}
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 animate-pulse">
              <Activity size={20} className="animate-spin" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Menjalankan Uji Diagnostik Sistem...</p>
              <p className="text-xs text-slate-400 mt-0.5">Memeriksa kernel WireGuard, verifikasi handshake gateway, dan latensi jaringan.</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <XCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-xs">Gagal Mendiagnosa:</strong>
              <p className="text-[11px] mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Result summary banner */}
        {!loading && result && (() => {
          const hasError = result.details?.some(d => d.includes('❌')) || result.success === false;
          const hasWarning = !hasError && result.details?.some(d => d.includes('⚠️'));

          return (
            <div className={`p-4 rounded-xl border flex items-start gap-2.5 ${
              hasError
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                : hasWarning
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            }`}>
              {hasError ? (
                <XCircle size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              ) : hasWarning ? (
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <div className="space-y-0.5 flex-1">
                <strong className="block font-bold text-xs">
                  {hasError
                    ? 'Terdeteksi Kendala pada Jalur Tunnel'
                    : hasWarning
                    ? 'Koneksi Berfungsi dengan Catatan'
                    : 'Koneksi Tunnel Sehat & Berfungsi Normal'}
                </strong>
                <p className="text-[11px] opacity-90">
                  {hasError
                    ? 'Terdapat pemeriksaan yang gagal (❌). Periksa log diagnostik di bawah untuk melihat rincian dan solusinya.'
                    : result.message}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Console Log Diagnostic Details */}
        {!loading && result?.details && result.details.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
              <Terminal size={12} />
              <span>Log Pemeriksaan Menyeluruh:</span>
            </div>
            <div className="bg-slate-900 dark:bg-slate-950 p-4 rounded-2xl border border-slate-800 text-slate-200 font-mono text-[11px] max-h-72 overflow-y-auto space-y-1.5">
              {(result.details ?? [])?.map((line, idx) => {
                const isSectionHeader = /^[1-9]️⃣/.test(line);
                const isSuccess = line.includes('✅');
                const isError = line.includes('❌');
                const isWarning = line.includes('⚠️');

                let textColor = 'text-slate-300';
                if (isSectionHeader) textColor = 'text-indigo-400 font-bold border-b border-slate-800 pb-1 pt-1.5 first:pt-0';
                else if (isSuccess) textColor = 'text-emerald-400 font-medium';
                else if (isError) textColor = 'text-rose-400 font-semibold';
                else if (isWarning) textColor = 'text-amber-400 font-medium';

                return (
                  <div key={idx} className={`${textColor} leading-relaxed whitespace-pre-wrap break-all`}>
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onClose}
            className="rounded-xl font-bold"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default EasyTunnelDiagnoseModal;
