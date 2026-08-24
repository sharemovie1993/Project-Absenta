import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { easyTunnelApi, type Tunnel, type SystemInfo, type CustomDomainStatus } from '../../api/easyTunnel.api';
import {
  Wifi,
  WifiOff,
  Plus,
  RefreshCw,
  Server,
  Shield,
  Layers,
  Key,
  Globe,
  ShoppingCart,
  Loader2,
  ExternalLink,
  Activity
} from 'lucide-react';
import useConfirm from '../../hooks/useConfirm';
import toast from 'react-hot-toast';
import { Button, Card, SectionCard, Badge } from '../../components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';

// Lazy Loaded Subcomponents (Pilar 13)
const EasyTunnelCard = lazy(() => import('./components/EasyTunnelCard'));
const EasyTunnelCloudLicensesSection = lazy(() => import('./components/EasyTunnelCloudLicensesSection'));
const EasyTunnelCustomDomainSection = lazy(() => import('./components/EasyTunnelCustomDomainSection'));
const EasyTunnelSetupModal = lazy(() => import('./components/EasyTunnelSetupModal'));
const EasyTunnelEditModal = lazy(() => import('./components/EasyTunnelEditModal'));
const EasyTunnelOrderModal = lazy(() => import('./components/EasyTunnelOrderModal'));

// Zod Schema Validation Guards (Pilar 25)
const setupSchema = z.object({
  license_key: z.string().min(6, 'Kunci lisensi wajib diisi'),
  subdomain_slug: z.string().min(2, 'Subdomain slug minimal 2 karakter'),
  local_port: z.number().min(1).max(65535),
  app_name: z.string().min(2, 'Nama instansi minimal 2 karakter'),
});

const orderSchema = z.object({
  school_name: z.string().min(2, 'Nama sekolah wajib diisi'),
  package_id: z.string().min(1, 'Paket terowongan wajib dipilih'),
  payment_channel: z.string().min(1, 'Metode pembayaran wajib dipilih'),
  subdomain: z.string().min(2, 'Subdomain minimal 2 karakter'),
  local_port: z.number().min(1).max(65535),
});

interface PackageItem {
  id: string;
  title: string;
  duration: string;
  price: string;
}

interface PaymentChannelItem {
  code: string;
  name: string;
  icon_url?: string;
  logo_url?: string;
  logo?: string;
}

interface CloudLicenseItem {
  id?: string;
  license_key: string;
  package_title?: string;
  package_name?: string;
  subdomain?: string;
  status?: string;
  is_expired?: boolean;
}

interface InvoiceItem {
  invoice_number: string;
  amount: number | string;
  amount_formatted?: string;
  qr_url?: string;
  pay_url?: string;
  pay_code?: string;
  payment_code?: string;
  payment_method?: string;
}

export const EasyTunnelPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Extract error message safely from Axios structure
  const getErrorMessage = (err: unknown): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const resp = (err as { response?: { data?: { message?: string } } }).response;
      return resp?.data?.message || 'Terjadi kesalahan sistem';
    }
    return err instanceof Error ? err.message : 'Terjadi kesalahan';
  };

  const devPort = useMemo(() => {
    if (typeof window !== 'undefined' && window.location && window.location.port) {
      const port = parseInt(window.location.port, 10);
      if (!isNaN(port) && port > 0) return port;
    }
    return 3003;
  }, []);

  // Modals state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Deployment mode state
  const [deploymentMode, setDeploymentMode] = useState<'on_premise' | 'local_windows' | 'public_vps'>('on_premise');

  // Setup form states
  const [licenseKey, setLicenseKey] = useState('');
  const [subdomainSlug, setSubdomainSlug] = useState('');
  const [localPort, setLocalPort] = useState(443);
  const [appName, setAppName] = useState('Portal Absenta Lokal');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Edit form states
  const [selectedTunnel, setSelectedTunnel] = useState<Tunnel | null>(null);
  const [editLocalPort, setEditLocalPort] = useState(443);
  const [editAppName, setEditAppName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Order wizard states
  const [schoolName, setSchoolName] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannelItem[]>([]);
  const [orderStep, setOrderStep] = useState(1);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [renewLicenseKey, setRenewLicenseKey] = useState<string>('');
  const [invoice, setInvoice] = useState<InvoiceItem | null>(null);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);

  // General loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Custom Domain state
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [customDomainLoading, setCustomDomainLoading] = useState(false);
  const [customDomainError, setCustomDomainError] = useState<string | null>(null);

  // 1. Fetch Tunnels via React Query (Pilar 31)
  const { data: tunnels = [], isLoading: loading, refetch } = useQuery<Tunnel[]>({
    queryKey: ['easy-tunnels'],
    queryFn: async () => {
      const res = await easyTunnelApi.list();
      return (res.data || []) as Tunnel[];
    }
  });

  // 2. Fetch System Info
  const { data: systemInfo } = useQuery<SystemInfo>({
    queryKey: ['easy-tunnel-system-info'],
    queryFn: async () => {
      const res = await easyTunnelApi.getSystemInfo();
      return (res.data || {}) as SystemInfo;
    }
  });

  // 3. Fetch Custom Domain Status
  const { data: customDomainData, refetch: refetchCustomDomain } = useQuery<CustomDomainStatus>({
    queryKey: ['easy-tunnel-custom-domain'],
    queryFn: async () => {
      const res = await easyTunnelApi.getCustomDomain();
      return (res.data || null) as CustomDomainStatus;
    }
  });

  // 4. Fetch Cloud Licenses
  const { data: cloudLicenses = [] } = useQuery<CloudLicenseItem[]>({
    queryKey: ['easy-tunnel-cloud-licenses'],
    queryFn: async () => {
      try {
        const res = await easyTunnelApi.getCloudLicenses();
        return (res.data || []) as CloudLicenseItem[];
      } catch {
        return [];
      }
    }
  });

  // Fetch Packages & Payment channels on mount
  useEffect(() => {
    easyTunnelApi.getPackages().then(res => {
      if (res.success) setPackages(res.data || []);
    }).catch(() => {});
    easyTunnelApi.getPaymentChannels().then(res => {
      if (res.success) setPaymentChannels(res.data || []);
    }).catch(() => {});
  }, []);

  const handleDeploymentModeChange = (mode: 'on_premise' | 'local_windows' | 'public_vps') => {
    setDeploymentMode(mode);
    if (mode === 'on_premise') setLocalPort(443);
    else if (mode === 'local_windows') setLocalPort(devPort);
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    const parsed = setupSchema.safeParse({
      license_key: licenseKey,
      subdomain_slug: subdomainSlug,
      local_port: localPort,
      app_name: appName,
    });
    if (!parsed.success) {
      setSetupError(parsed.error.errors[0]?.message || 'Data form tidak valid');
      return;
    }

    try {
      setSetupLoading(true);
      const res = await easyTunnelApi.setup(parsed.data);
      if (res.success) {
        toast.success('Tunnel berhasil dikonfigurasi!');
        setShowSetupModal(false);
        queryClient.invalidateQueries({ queryKey: ['easy-tunnels'] });
      } else {
        setSetupError(res.message || 'Gagal memasang kunci lisensi');
      }
    } catch (err: unknown) {
      setSetupError(getErrorMessage(err));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTunnel) return;
    setEditError(null);

    try {
      setEditLoading(true);
      const res = await easyTunnelApi.update(selectedTunnel.id, {
        local_port: editLocalPort,
        app_name: editAppName
      });
      if (res.success) {
        toast.success('Konfigurasi tunnel berhasil diperbarui!');
        setShowEditModal(false);
        queryClient.invalidateQueries({ queryKey: ['easy-tunnels'] });
      } else {
        setEditError(res.message || 'Gagal memperbarui tunnel');
      }
    } catch (err: unknown) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditLoading(false);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    const parsed = orderSchema.safeParse({
      school_name: schoolName,
      package_id: selectedPackage,
      payment_channel: selectedPayment,
      subdomain: subdomainSlug,
      local_port: localPort
    });
    if (!parsed.success) {
      setOrderError(parsed.error.errors[0]?.message || 'Data pesanan belum lengkap');
      return;
    }

    try {
      setOrderLoading(true);
      const res = await easyTunnelApi.orderLicense(parsed.data);
      if (res.success) {
        setInvoice(res.data);
        setOrderStep(2);
      } else {
        setOrderError(res.message || 'Gagal membuat invoice pesanan');
      }
    } catch (err: unknown) {
      setOrderError(getErrorMessage(err));
    } finally {
      setOrderLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      setActionLoading(`start-${id}`);
      const res = await easyTunnelApi.start(id);
      if (res.success) {
        toast.success('Tunnel terhubung online!');
        queryClient.invalidateQueries({ queryKey: ['easy-tunnels'] });
      } else {
        toast.error(res.message || 'Gagal menghubungkan tunnel');
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (id: string) => {
    try {
      setActionLoading(`stop-${id}`);
      const res = await easyTunnelApi.stop(id);
      if (res.success) {
        toast.success('Tunnel diputus.');
        queryClient.invalidateQueries({ queryKey: ['easy-tunnels'] });
      } else {
        toast.error(res.message || 'Gagal memutus tunnel');
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = async (id: string) => {
    try {
      setActionLoading(`restart-${id}`);
      const res = await easyTunnelApi.restart(id);
      if (res.success) {
        toast.success('Tunnel berhasil direstart!');
        queryClient.invalidateQueries({ queryKey: ['easy-tunnels'] });
      } else {
        toast.error(res.message || 'Gagal merestart tunnel');
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Hapus Konfigurasi Tunnel',
      description: `Hapus koneksi tunnel "${name}" dari server lokal ini?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      setActionLoading(`delete-${id}`);
      const res = await easyTunnelApi.delete(id);
      if (res.success) {
        toast.success('Konfigurasi tunnel dihapus.');
        queryClient.invalidateQueries({ queryKey: ['easy-tunnels'] });
      } else {
        toast.error(res.message || 'Gagal menghapus tunnel');
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDomainInput.trim()) return;
    setCustomDomainError(null);

    try {
      setCustomDomainLoading(true);
      const res = await easyTunnelApi.setCustomDomain(customDomainInput.trim());
      if (res.success) {
        toast.success('Custom domain berhasil disimpan!');
        refetchCustomDomain();
      } else {
        setCustomDomainError(res.message || 'Gagal memasang custom domain');
      }
    } catch (err: unknown) {
      setCustomDomainError(getErrorMessage(err));
    } finally {
      setCustomDomainLoading(false);
    }
  };

  const handleDeleteCustomDomain = async () => {
    const ok = await confirm({
      title: 'Hapus Custom Domain',
      description: 'Hapus custom domain aktif dan kembalikan ke subdomain default?',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      setCustomDomainLoading(true);
      const res = await easyTunnelApi.deleteCustomDomain();
      if (res.success) {
        toast.success('Custom domain dihapus.');
        refetchCustomDomain();
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setCustomDomainLoading(false);
    }
  };

  const activeTunnels = useMemo(() => {
    return (tunnels ?? []).filter(t => t.status === 'connected').length;
  }, [tunnels]);

  const headerStats = useMemo(() => [
    {
      title: "Tunnel Terpasang",
      value: tunnels.length,
      icon: <Server size={16} className="text-white" />,
      gradient: "from-indigo-600 to-indigo-800",
      subtitle: "Node server lokal"
    },
    {
      title: "Status Online",
      value: activeTunnels,
      icon: <Wifi size={16} className="text-white" />,
      gradient: "from-emerald-600 to-teal-800",
      subtitle: "Terhubung publik"
    },
    {
      title: "Base Domain",
      value: systemInfo?.tunnel_base_domain || 'absenta.id',
      icon: <Globe size={16} className="text-white" />,
      gradient: "from-purple-600 to-pink-800",
      subtitle: "Gateway VPN publik"
    }
  ], [tunnels, activeTunnels, systemInfo]);

  const breadcrumbs = useMemo(() => [
    { label: 'Infrastruktur Sistem' },
    { label: 'Easy Tunnel VPN' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Easy Tunnel Gateway',
    description: 'Layanan VPN reverse-proxy terowongan aman untuk mengonlinekan server lokal sekolah tanpa IP Publik statis.',
    items: [
      { text: 'Pastikan server lokal sekolah terhubung ke internet saat menghubungkan tunnel.' },
      { text: 'Gunakan custom domain sekolah agar URL portal mudah diingat oleh guru dan siswa.' },
      { text: 'Status koneksi dimonitor secara real-time dan sertifikat SSL terpasang otomatis.' }
    ]
  }), []);

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        hardeningModuleKey="system_easytunnel_page"
        title="Easy Tunnel Gateway &amp; VPN"
        description="Kelola gateway tunnel aman untuk menghubungkan server lokal sekolah ke internet publik secara instan."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        stats={headerStats}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Toolbar Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm w-full min-w-0 max-w-full">
              <div className="flex items-center gap-2">
                <Badge variant={activeTunnels > 0 ? 'success' : 'secondary'} className="font-bold text-[10px] px-3 py-1">
                  {activeTunnels > 0 ? `${activeTunnels} TUNNEL AKTIF` : 'OFFLINE'}
                </Badge>
                <span className="text-xs text-slate-400 font-medium">
                  Gateway: <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{systemInfo?.tunnel_base_domain || 'absenta.id'}</code>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={() => refetch()}
                  disabled={loading}
                  className="rounded-xl"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </Button>

                <Button
                  type="button"
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={() => {
                    setRenewLicenseKey('');
                    setOrderStep(1);
                    setShowOrderModal(true);
                  }}
                  className="rounded-xl font-bold"
                >
                  <ShoppingCart size={14} className="mr-1.5" /> Beli Lisensi
                </Button>

                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={() => setShowSetupModal(true)}
                  className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus size={14} className="mr-1.5" /> Pasang Kunci Lisensi
                </Button>
              </div>
            </div>

            {/* Cloud Licenses Section */}
            <Suspense fallback={null}>
              <EasyTunnelCloudLicensesSection
                cloudLicenses={cloudLicenses}
                tunnels={tunnels}
                onUseLicense={(key) => {
                  setLicenseKey(key);
                  setShowSetupModal(true);
                }}
              />
            </Suspense>

            {/* Tunnels List */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-xs text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Memuat status tunnel...
              </div>
            ) : tunnels.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3 rounded-2xl w-full min-w-0 max-w-full">
                <WifiOff size={48} className="text-slate-300 dark:text-slate-700" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Belum Ada Tunnel Terpasang</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Pasang lisensi Easy Tunnel untuk mengonlinekan aplikasi server lokal sekolah Anda ke domain publik.
                </p>
                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={() => setShowSetupModal(true)}
                  className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
                >
                  <Plus size={14} className="mr-1.5" /> Pasang Lisensi Sekarang
                </Button>
              </Card>
            ) : (
              <div className="space-y-4 w-full min-w-0 max-w-full">
                {(tunnels ?? [])?.map(tunnel => (
                  <Suspense key={tunnel.id} fallback={<div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
                    <EasyTunnelCard
                      tunnel={tunnel}
                      actionLoading={actionLoading}
                      onStart={handleStart}
                      onStop={handleStop}
                      onRestart={handleRestart}
                      onEdit={(t) => {
                        setSelectedTunnel(t);
                        setEditLocalPort(t.local_port);
                        setEditAppName(t.app_name || '');
                        setShowEditModal(true);
                      }}
                      onDelete={handleDelete}
                      onCheckPing={() => {}}
                    />
                  </Suspense>
                ))}
              </div>
            )}

            {/* Custom Domain Section */}
            <Suspense fallback={null}>
              <EasyTunnelCustomDomainSection
                customDomainData={customDomainData || null}
                customDomainInput={customDomainInput}
                setCustomDomainInput={setCustomDomainInput}
                customDomainLoading={customDomainLoading}
                customDomainError={customDomainError}
                onSetCustomDomain={handleSetCustomDomain}
                onDeleteCustomDomain={handleDeleteCustomDomain}
                onVerifyCustomDomain={refetchCustomDomain}
              />
            </Suspense>
          </div>
        </SectionCard>

        {/* Modals */}
        {showSetupModal && (
          <Suspense fallback={null}>
            <EasyTunnelSetupModal
              isOpen={showSetupModal}
              onClose={() => setShowSetupModal(false)}
              setupError={setupError}
              licenseKey={licenseKey}
              setLicenseKey={setLicenseKey}
              subdomainSlug={subdomainSlug}
              setSubdomainSlug={setSubdomainSlug}
              appName={appName}
              setAppName={setAppName}
              deploymentMode={deploymentMode}
              handleDeploymentModeChange={handleDeploymentModeChange}
              devPort={devPort}
              localPort={localPort}
              setLocalPort={setLocalPort}
              setupLoading={setupLoading}
              tunnelBaseDomain={systemInfo?.tunnel_base_domain || 'absenta.id'}
              onSubmit={handleSetupSubmit}
            />
          </Suspense>
        )}

        {showEditModal && selectedTunnel && (
          <Suspense fallback={null}>
            <EasyTunnelEditModal
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              selectedTunnel={selectedTunnel}
              editError={editError}
              editLocalPort={editLocalPort}
              setEditLocalPort={setEditLocalPort}
              editAppName={editAppName}
              setEditAppName={setEditAppName}
              editLoading={editLoading}
              onSubmit={handleEditSubmit}
            />
          </Suspense>
        )}

        {showOrderModal && (
          <Suspense fallback={null}>
            <EasyTunnelOrderModal
              isOpen={showOrderModal}
              onClose={() => setShowOrderModal(false)}
              orderError={orderError}
              renewLicenseKey={renewLicenseKey}
              setRenewLicenseKey={setRenewLicenseKey}
              subdomainSlug={subdomainSlug}
              setSubdomainSlug={setSubdomainSlug}
              orderLoading={orderLoading}
              orderStep={orderStep}
              schoolName={schoolName}
              setSchoolName={setSchoolName}
              packages={packages}
              selectedPackage={selectedPackage}
              setSelectedPackage={setSelectedPackage}
              paymentChannels={paymentChannels}
              selectedPayment={selectedPayment}
              setSelectedPayment={setSelectedPayment}
              showPaymentDropdown={showPaymentDropdown}
              setShowPaymentDropdown={setShowPaymentDropdown}
              deploymentMode={deploymentMode}
              handleDeploymentModeChange={handleDeploymentModeChange}
              devPort={devPort}
              localPort={localPort}
              setLocalPort={setLocalPort}
              handleOrderSubmit={handleOrderSubmit}
              invoice={invoice}
              onVerifyPayment={() => {}}
              onAutoInstall={() => {}}
              licenseKey={licenseKey}
            />
          </Suspense>
        )}
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default EasyTunnelPage;
