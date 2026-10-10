import React from 'react';
import { Badge, Button } from '@/components/ui';
import { Key, Sparkles, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  cloudLicenses: any[];
  tunnels: any[];
  onUseLicense: (licenseKey: string, subdomain?: string, appName?: string) => void;
  onRenewLicense?: (licenseKey: string, subdomain?: string) => void;
  hasCompleteBundleActive?: boolean;
}

export const EasyTunnelCloudLicensesSection: React.FC<Props> = React.memo(({
  cloudLicenses,
  tunnels,
  onUseLicense,
  onRenewLicense,
  hasCompleteBundleActive
}) => {
  const navigate = useNavigate();
  if (!cloudLicenses || cloudLicenses.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-5 shadow-xs w-full min-w-0 max-w-full space-y-3">
      <div className="flex items-center gap-2">
        <Key size={16} className="text-indigo-600 dark:text-indigo-400" />
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Lisensi Easy Tunnel dari Cloud ({cloudLicenses.length})
        </h4>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Lisensi yang terdaftar di akun cloud Anda. Klik tombol pasang untuk mengaktifkannya di server ini.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {(cloudLicenses ?? [])?.map(lic => {
          const isInstalled = (tunnels ?? []).some(t => t.license_key === lic.license_key);
          const isExpired = lic.status === 'expired' || lic.is_expired;
          const isBundled = Boolean(lic.is_bundled) || 
            (typeof lic.package_title === 'string' && lic.package_title.toLowerCase().includes('bundle')) ||
            hasCompleteBundleActive;

          return (
            <div
              key={lic.license_key || lic.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 transition-all ${
                isBundled 
                  ? 'border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-br from-indigo-50/40 to-violet-50/20 dark:from-indigo-950/20 dark:to-violet-950/10' 
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {lic.package_title || lic.package_name || 'Easy Tunnel'}
                    </span>
                    {isBundled && (
                      <Badge variant="secondary" className="text-[9px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                        ⭐ BUNDLE PAKET LENGKAP
                      </Badge>
                    )}
                  </div>
                  <Badge variant={isExpired ? 'destructive' : isInstalled ? 'success' : 'info'} className="text-[9px] font-bold">
                    {isExpired ? 'Kedaluwarsa' : isInstalled ? 'Terpasang' : 'Tersedia'}
                  </Badge>
                </div>
                <p className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                  {lic.license_key}
                </p>
                {(lic.subdomain || lic.requested_slug) && (
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                    {lic.subdomain || lic.requested_slug}.absenta.id
                  </p>
                )}
                {lic.expires_at && (
                  <p className="text-[9.5px] text-slate-400">
                    Masa aktif s.d: <strong className="text-slate-600 dark:text-slate-300 font-medium">{new Date(lic.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {!isInstalled && !isExpired && (
                  <Button
                    type="button"
                    variant="toolbarPrimary"
                    size="toolbar"
                    onClick={() => onUseLicense(lic.license_key, lic.subdomain || lic.requested_slug, lic.school_name || lic.app_name)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    Gunakan
                  </Button>
                )}
                {isBundled ? (
                  <Button
                    type="button"
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={() => navigate('/service-center')}
                    className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/30 font-bold text-xs"
                    title="Perpanjangan lisensi ini otomatis mengikuti siklus langganan Paket Lengkap Anda di Service Center"
                  >
                    <ExternalLink size={12} className="mr-1 text-indigo-500" /> Service Center
                  </Button>
                ) : (
                  onRenewLicense && (
                    <Button
                      type="button"
                      variant="toolbarOutline"
                      size="toolbar"
                      onClick={() => onRenewLicense(lic.license_key, lic.subdomain)}
                      className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30 font-bold text-xs"
                    >
                      <Sparkles size={12} className="mr-1 text-amber-500" /> Perpanjang
                    </Button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default EasyTunnelCloudLicensesSection;
