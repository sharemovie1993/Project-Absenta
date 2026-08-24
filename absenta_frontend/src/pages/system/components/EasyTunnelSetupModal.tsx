import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  setupError: string | null;
  licenseKey: string;
  setLicenseKey: (v: string) => void;
  subdomainSlug: string;
  setSubdomainSlug: (v: string) => void;
  appName: string;
  setAppName: (v: string) => void;
  deploymentMode: 'on_premise' | 'local_windows' | 'public_vps';
  handleDeploymentModeChange: (mode: 'on_premise' | 'local_windows' | 'public_vps') => void;
  devPort: number;
  localPort: number;
  setLocalPort: (v: number) => void;
  setupLoading: boolean;
  tunnelBaseDomain: string;
  onSubmit: (e: React.FormEvent) => void;
}

export const EasyTunnelSetupModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  setupError,
  licenseKey,
  setLicenseKey,
  subdomainSlug,
  setSubdomainSlug,
  appName,
  setAppName,
  deploymentMode,
  handleDeploymentModeChange,
  devPort,
  localPort,
  setLocalPort,
  setupLoading,
  tunnelBaseDomain,
  onSubmit
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Setup Kunci Lisensi Easy Tunnel"
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4 py-2 text-xs">
        {setupError && (
          <div className="bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 p-3 rounded-xl text-xs border border-red-200 dark:border-red-900">
            ⚠️ {setupError}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="setup-license-key" className="font-bold text-slate-700 dark:text-slate-300">
            Kunci Lisensi (License Key) <span className="text-rose-500">*</span>
          </label>
          <Input
            id="setup-license-key"
            aria-label="Kunci Lisensi"
            required
            placeholder="Format: ET-XXXXX-XXXXX..."
            value={licenseKey}
            onChange={e => setLicenseKey(e.target.value)}
            className="rounded-xl font-mono"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="setup-subdomain-slug" className="font-bold text-slate-700 dark:text-slate-300">
            Subdomain Yang Diinginkan <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <Input
              id="setup-subdomain-slug"
              aria-label="Subdomain slug"
              required
              placeholder="nama-sekolah"
              className="border-none rounded-none text-xs"
              value={subdomainSlug}
              onChange={e => setSubdomainSlug(e.target.value)}
            />
            <span className="px-3 bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 font-mono">
              .{tunnelBaseDomain}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="setup-app-name" className="font-bold text-slate-700 dark:text-slate-300">
            Nama Instansi / Aplikasi <span className="text-rose-500">*</span>
          </label>
          <Input
            id="setup-app-name"
            aria-label="Nama Instansi atau Aplikasi"
            required
            className="rounded-xl"
            value={appName}
            onChange={e => setAppName(e.target.value)}
          />
        </div>

        <div className="space-y-2 border-t pt-3 border-slate-100 dark:border-slate-800">
          <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[10px]">
            Lokasi / Tipe Instalasi Server:
          </label>
          <div className="grid grid-cols-1 gap-2">
            <label className={`border rounded-xl p-2.5 flex items-start gap-3 cursor-pointer transition ${
              deploymentMode === 'on_premise'
                ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="radio"
                name="deploy_mode"
                aria-label="Mode server sekolah on premise"
                className="mt-1"
                checked={deploymentMode === 'on_premise'}
                onChange={() => handleDeploymentModeChange('on_premise')}
              />
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white block">Server Sekolah - On-Premise (Linux / Windows)</span>
                <span className="text-[10px] text-slate-500 leading-normal block">Aplikasi berjalan di server lokal sekolah menggunakan reverse-proxy Caddy (Port 443).</span>
              </div>
            </label>

            <label className={`border rounded-xl p-2.5 flex items-start gap-3 cursor-pointer transition ${
              deploymentMode === 'local_windows'
                ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="radio"
                name="deploy_mode"
                aria-label="Mode uji coba pengembang"
                className="mt-1"
                checked={deploymentMode === 'local_windows'}
                onChange={() => handleDeploymentModeChange('local_windows')}
              />
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white block">Uji Coba Pengembang - Developer Mode</span>
                <span className="text-[10px] text-slate-500 leading-normal block">Testing lokal langsung pada PC tanpa web server Caddy (Port ${devPort}).</span>
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="setup-local-port" className="font-bold text-slate-700 dark:text-slate-300">
            Port Lokal Portal:
          </label>
          <Input
            id="setup-local-port"
            aria-label="Port lokal portal"
            type="number"
            required
            disabled={deploymentMode === 'on_premise'}
            className="rounded-xl"
            value={localPort}
            onChange={e => setLocalPort(parseInt(e.target.value))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="toolbarOutline" size="toolbar" onClick={onClose} disabled={setupLoading}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            size="toolbar"
            disabled={setupLoading || deploymentMode === 'public_vps'}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            {setupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Pasang Kunci Lisensi
          </Button>
        </div>
      </form>
    </Modal>
  );
});

export default EasyTunnelSetupModal;
