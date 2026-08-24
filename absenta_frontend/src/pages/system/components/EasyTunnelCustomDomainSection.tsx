import React from 'react';
import { Globe, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, Button, Input, Badge } from '@/components/ui';
import type { CustomDomainStatus } from '../../../api/easyTunnel.api';

interface Props {
  customDomainData: CustomDomainStatus | null;
  customDomainInput: string;
  setCustomDomainInput: (v: string) => void;
  customDomainLoading: boolean;
  customDomainError: string | null;
  onSetCustomDomain: (e: React.FormEvent) => void;
  onDeleteCustomDomain: () => void;
  onVerifyCustomDomain: () => void;
}

export const EasyTunnelCustomDomainSection: React.FC<Props> = React.memo(({
  customDomainData,
  customDomainInput,
  setCustomDomainInput,
  customDomainLoading,
  customDomainError,
  onSetCustomDomain,
  onDeleteCustomDomain,
  onVerifyCustomDomain
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs w-full min-w-0 max-w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Custom Domain Sekolah
          </h3>
        </div>
        {customDomainData?.custom_domain && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDeleteCustomDomain}
            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
          >
            <Trash2 size={13} className="mr-1" /> Hapus Domain
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Gunakan domain resmi sekolah Anda sendiri (contoh: <code>absen.smkn1jakarta.sch.id</code>) untuk mengakses server lokal secara publik dengan sertifikat SSL otomatis.
      </p>

      {customDomainError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 p-3 rounded-xl text-xs border border-rose-200 dark:border-rose-900">
          ⚠️ {customDomainError}
        </div>
      )}

      {customDomainData?.custom_domain ? (
        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Domain Aktif:</span>
            <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
              https://{customDomainData.custom_domain}
            </span>
          </div>

          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onVerifyCustomDomain}
            disabled={customDomainLoading}
            className="rounded-xl font-bold"
          >
            {customDomainLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Cek Status DNS
          </Button>
        </div>
      ) : (
        <form onSubmit={onSetCustomDomain} className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="flex-1">
            <Input
              id="custom-domain-input"
              aria-label="Nama custom domain sekolah"
              placeholder="Contoh: absen.sekolahanda.sch.id"
              value={customDomainInput}
              onChange={e => setCustomDomainInput(e.target.value)}
              className="rounded-xl text-xs"
              required
            />
          </div>
          <Button
            type="submit"
            variant="toolbarPrimary"
            size="toolbar"
            disabled={customDomainLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
          >
            {customDomainLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Pasang Custom Domain
          </Button>
        </form>
      )}
    </div>
  );
});

export default EasyTunnelCustomDomainSection;
