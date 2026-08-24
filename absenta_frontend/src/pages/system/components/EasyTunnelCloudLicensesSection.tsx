import React from 'react';
import { Badge, Button } from '@/components/ui';
import { Key } from 'lucide-react';

interface Props {
  cloudLicenses: any[];
  tunnels: any[];
  onUseLicense: (licenseKey: string) => void;
}

export const EasyTunnelCloudLicensesSection: React.FC<Props> = React.memo(({
  cloudLicenses,
  tunnels,
  onUseLicense
}) => {
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

          return (
            <div
              key={lic.license_key || lic.id}
              className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between space-y-2"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {lic.package_title || lic.package_name || 'Easy Tunnel'}
                  </span>
                  <Badge variant={isExpired ? 'destructive' : isInstalled ? 'success' : 'info'} className="text-[9px] font-bold">
                    {isExpired ? 'Kedaluwarsa' : isInstalled ? 'Terpasang' : 'Tersedia'}
                  </Badge>
                </div>
                <p className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                  {lic.license_key}
                </p>
                {lic.subdomain && (
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                    {lic.subdomain}.absenta.id
                  </p>
                )}
              </div>

              {!isInstalled && !isExpired && (
                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={() => onUseLicense(lic.license_key)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Gunakan Lisensi Ini
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default EasyTunnelCloudLicensesSection;
