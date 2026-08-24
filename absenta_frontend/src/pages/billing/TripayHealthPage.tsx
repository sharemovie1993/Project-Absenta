import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Activity, RefreshCw, CheckCircle, AlertTriangle, Clock, Network, Zap, CheckCircle2 } from 'lucide-react';
import { getTripayChannels, getSupportedGateways, type TripayChannel } from '@/api/paymentGateway.api';
import { formatDate } from '@/utils/layoutUtils';
import { motion } from 'framer-motion';

const TripayHealthPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<TripayChannel[]>([]);
  const [supported, setSupported] = useState<string[]>([]);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);

  const isTripaySupported = useMemo(() => supported.includes('TRIPAY'), [supported]);
  const status = useMemo<'healthy' | 'degraded' | 'unhealthy'>(() => {
    if (!isTripaySupported) return 'degraded';
    if (channels.length > 0 && !error) return 'healthy';
    if (error) return 'unhealthy';
    return 'degraded';
  }, [isTripaySupported, channels.length, error]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastCheck('');
    setResponseTimeMs(null);
    try {
      const t0 = Date.now();
      const [channelsRes, gwRes] = await Promise.all([
        getTripayChannels().catch((e) => { throw e; }),
        getSupportedGateways().catch((e) => { throw e; })
      ]);
      const t1 = Date.now();
      setResponseTimeMs(t1 - t0);
      const ch = Array.isArray(channelsRes?.data) ? channelsRes.data : [];
      setChannels(ch);
      const gw = Array.isArray(gwRes?.data?.gateways) ? gwRes.data.gateways : [];
      setSupported(gw?.map((x) => String(x)) || []);
      setLastCheck(new Date().toISOString());
    } catch (e: unknown) {
      const errObj = e as { message?: string };
      const msg = typeof errObj?.message === 'string' ? errObj.message : 'Gagal memuat data Tripay';
      setError(msg);
      setChannels([]);
      setSupported([]);
      setLastCheck(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Stats terstandar untuk layout
  const healthStats = useMemo(() => {
    const statusLabel = status === 'healthy' ? 'Sehat (Online)' : status === 'degraded' ? 'Terganggu' : 'Kritis (Offline)';
    return [
      {
        title: "Waktu Respon Tripay",
        value: responseTimeMs !== null ? `${responseTimeMs} ms` : '-',
        icon: <Clock className="h-4 w-4 text-white" />,
        gradient: "from-blue-500 to-indigo-600",
        subtitle: "Latensi respon API Tripay"
      },
      {
        title: "Kondisi API Gateway",
        value: statusLabel,
        icon: <Activity className="h-4 w-4 text-white" />,
        gradient: status === 'healthy' ? "from-emerald-500 to-teal-600" : "from-rose-500 to-pink-600",
        subtitle: "Keadaan operasional API"
      },
      {
        title: "Channel Terdaftar",
        value: channels.length,
        icon: <Network className="h-4 w-4 text-white" />,
        gradient: "from-purple-500 to-fuchsia-600",
        subtitle: "Metode pembayaran aktif"
      },
      {
        title: "Tripay Supported",
        value: isTripaySupported ? 'Aktif' : 'Non-aktif',
        icon: <CheckCircle2 className="h-4 w-4 text-white" />,
        gradient: "from-orange-500 to-amber-600",
        subtitle: "Dukungan gateway platform"
      }
    ];
  }, [status, responseTimeMs, channels.length, isTripaySupported]);

  // Toolbar slot dengan tombol refresh
  const toolbarSlot = useMemo(() => (
    <Button
      variant="toolbarOutline"
      size="toolbar"
      className="rounded-xl shrink-0 font-bold text-xs tracking-wider flex items-center gap-2"
      onClick={refresh}
      disabled={loading}
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      Pengecekan Ulang
    </Button>
  ), [loading, refresh]);

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        title="Kesehatan Sistem Tripay (Tripay Health)"
        description="Pantau latensi respon, validasi integritas saluran pembayaran merchant, serta daftarkan status integrasi API Tripay di Absenta.id."
        hardeningModuleKey="tripay_health"
      breadcrumbs={[
        { label: 'System Utilities' },
        { label: 'Kesehatan Tripay' }
      ]}
      instruction={{
        title: 'Pemantauan Kesehatan Tripay',
        items: [
          { text: 'Halaman ini digunakan untuk memantau kesehatan integrasi dan konektivitas API Tripay.' },
          { text: 'Gunakan tombol Pengecekan Ulang untuk melakukan tes latensi respon secara real-time.' }
        ]
      }}
      stats={healthStats}
      isLoading={loading && channels.length === 0}
      toolbar={toolbarSlot}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Ringkasan Kondisi */}
        <Card className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
          <CardHeader className="bg-gradient-to-r from-slate-50/50 to-indigo-50/10 dark:from-slate-900/60 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity size={16} className="text-indigo-500" /> Ringkasan Integrasi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Konektivitas API Tripay diuji secara langsung dengan meminta daftar channel merchant. 
              Jika daftar channel berhasil dimuat dan berisi data, status dinilai sehat.
            </p>
            {lastCheck && (
              <div className="flex justify-between items-center py-2 border-t border-slate-50 dark:border-slate-900 text-xs">
                <span className="font-semibold text-slate-400">Pengecekan Terakhir</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{formatDate(lastCheck)}</span>
              </div>
            )}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-xs text-rose-600 font-medium">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Supported Gateways */}
        <Card className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
          <CardHeader className="bg-gradient-to-r from-slate-50/50 to-indigo-50/10 dark:from-slate-900/60 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap size={16} className="text-indigo-500" /> Provider Didukung
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2">
              {supported.length === 0 ? (
                <div className="text-xs text-slate-400 font-medium">Tidak ada data gateway didukung.</div>
              ) : supported?.map((g) => {
                const isTripay = g === 'TRIPAY';
                return (
                  <Badge 
                    key={g} 
                    variant={isTripay ? 'success' : 'secondary'} 
                    className="rounded-full px-3 py-1 font-bold text-xs uppercase tracking-wide"
                  >
                    {g}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Edukasi Tripay */}
        <Card className="rounded-xl border border-none shadow-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <Activity size={150} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md shrink-0">
                <Network size={20} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest">SLA Transaksi</div>
                <div className="text-sm font-bold">Tripay Gateway</div>
              </div>
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed font-medium">
              Tripay adalah layanan payment gateway Indonesia yang melayani metode pembayaran Virtual Account, QRIS, e-Wallet, dan retail outlet secara real-time.
            </p>
          </div>
        </Card>
      </div>

      {/* Panel Daftar Channel Aktif */}
      <div className="mt-8 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Network size={16} className="text-indigo-500" /> Daftar Saluran Pembayaran (Channels) Merchant
        </h3>

        {channels.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-400 text-xs font-semibold">
            Belum ada saluran pembayaran aktif terdeteksi atau pemuatan data gagal.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels?.map((ch, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                key={ch.code} 
                className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{ch.name}</div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-1">{ch.code}</div>
                  {ch.group && (
                    <div className="text-[10px] text-slate-500 font-semibold bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded w-max mt-2">
                      {ch.group}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-900">
                  <Badge variant={ch.active ? 'success' : 'warning'} className="text-[9px] font-bold tracking-wide uppercase px-2 py-0.5">
                    {ch.active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SuperAdminPageLayout>
  </InfraErrorBoundary>
);
};

export default TripayHealthPage;
