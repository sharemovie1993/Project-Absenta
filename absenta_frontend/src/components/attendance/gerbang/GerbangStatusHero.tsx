import React from 'react';
import { Clock, RefreshCw, ShieldAlert } from 'lucide-react';
import { Switch } from '../../ui';

interface TenantConfig {
  jamMasuk: string;
  jamPulang: string;
  toleransi: number;
}

interface TimeStatus {
  status: 'TERLAMBAT' | 'TEPAT_WAKTU';
  lateMinutes: number;
}

interface GerbangStatusHeroProps {
  currentTime: Date;
  tenantConfig: TenantConfig | null;
  inputDirection: 'GERBANG_DATANG' | 'GERBANG_PULANG';
  timeStatus: TimeStatus | null;
  isBypassMode: boolean;
  setIsBypassMode: (val: boolean) => void;
  onRefreshConfig: () => void;
  loadingConfig: boolean;
}

const GerbangStatusHeroComponent: React.FC<GerbangStatusHeroProps> = ({
  currentTime,
  tenantConfig,
  inputDirection,
  timeStatus,
  isBypassMode,
  setIsBypassMode,
  onRefreshConfig,
  loadingConfig,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden relative">
      {/* Status Indicator Background Stripe */}
      <div
        className={`h-1.5 w-full ${
          timeStatus?.status === 'TERLAMBAT' ? 'bg-red-500' : 'bg-green-500'
        }`}
      />

      <div className="p-3 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
        {/* Clock & Status */}
        <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto justify-between md:justify-start">
          <div className="text-left">
            <div className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white font-mono">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              <span className="text-sm md:text-lg text-gray-400 ml-1 font-normal">
                {currentTime.toLocaleTimeString('id-ID', { second: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs md:text-sm text-gray-500">
              {tenantConfig ? (
                <>
                  {inputDirection === 'GERBANG_DATANG' ? (
                    <>
                      <span>
                        Masuk: <strong>{tenantConfig.jamMasuk}</strong>
                      </span>
                      <span className="text-gray-300">•</span>
                      <span>
                        Tol: <strong>{tenantConfig.toleransi}m</strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Pulang: <strong>{tenantConfig.jamPulang}</strong>
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="flex items-center gap-1 animate-pulse">
                  <RefreshCw size={12} className={loadingConfig ? 'animate-spin' : ''} /> Memuat
                  konfigurasi...
                </span>
              )}
            </div>
          </div>

          {/* Large Status Badge */}
          {timeStatus && (
            <div
              className={`px-3 py-1.5 md:px-5 md:py-2 rounded-lg border-l-4 flex flex-col items-end md:items-start justify-center ${
                timeStatus.status === 'TERLAMBAT'
                  ? 'bg-red-55 border-red-500 text-red-700 dark:bg-red-900/20'
                  : 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20'
              }`}
            >
              <span className="text-[10px] md:text-xs font-bold opacity-70 uppercase tracking-wide">
                Status Absensi
              </span>
              <div className="flex items-center md:items-baseline gap-1.5 md:gap-2">
                <span className="text-base md:text-lg font-black tracking-tight">
                  {timeStatus.status === 'TERLAMBAT' ? 'TERLAMBAT' : 'TEPAT WAKTU'}
                </span>
                {timeStatus.status === 'TERLAMBAT' && (
                  <span className="text-xs md:text-sm font-bold bg-red-200 dark:bg-red-800 px-1 rounded text-red-800 dark:text-red-200">
                    +{timeStatus.lateMinutes}m
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start border-t md:border-t-0 md:border-l pt-3 md:pt-0 pl-0 md:pl-6 border-gray-100 dark:border-gray-700">
          <div className="flex flex-col items-end gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Mode Bypass
            </label>
            <Switch
              checked={isBypassMode}
              onCheckedChange={setIsBypassMode}
              className={isBypassMode ? 'bg-amber-500' : ''}
            />
          </div>
          <button
            onClick={onRefreshConfig}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 transition-colors"
            title="Refresh Config"
            type="button"
          >
            <RefreshCw size={18} className={loadingConfig ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Bypass Active Banner */}
      {isBypassMode && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-t border-amber-200 dark:border-amber-800 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 animate-in slide-in-from-top-2">
          <ShieldAlert size={14} />
          MODE BYPASS AKTIF: Semua scan akan dicatat sebagai HADIR (Tepat Waktu) secara manual.
        </div>
      )}
    </div>
  );
};

GerbangStatusHeroComponent.displayName = 'GerbangStatusHero';
export const GerbangStatusHero = React.memo(GerbangStatusHeroComponent);
