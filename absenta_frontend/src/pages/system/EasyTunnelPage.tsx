import React, { useEffect, useState, useMemo } from 'react';
import { easyTunnelApi, Tunnel, SystemInfo } from '../../api/easyTunnel.api';
import { Copy } from 'lucide-react';
import { requestWithFallback } from '../../api/apiUtils';
import useConfirm from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';

type FilterStatus = 'all' | 'connected' | 'disconnected' | 'expired';

/**
 * Menentukan slug subdomain VPN secara cerdas dan fleksibel dari profil tenant
 */
const resolveSmartSlug = (tenant: any): string => {
  if (!tenant) return '';

  // 1. Subdomain langsung (paling presisi, e.g. "smkn1plered")
  if (tenant.subdomain && tenant.subdomain.trim() !== '') {
    return tenant.subdomain.trim().toLowerCase();
  }

  // 2. Custom Domain (e.g. "absen.smkn1plered.sch.id" -> ambil segment nama sekolah "smkn1plered")
  if (tenant.custom_domain && tenant.custom_domain.trim() !== '') {
    const clean = tenant.custom_domain.trim().toLowerCase().replace(/^www\./, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      // Jika formatnya subdomain.domain.com, ambil bagian tengah
      return parts[1];
    }
    return parts[0];
  }

  // 3. Domain Utama (e.g. "smkn1plered.absenta.id" -> "smkn1plered")
  if (tenant.domain && tenant.domain.trim() !== '') {
    const clean = tenant.domain.trim().toLowerCase().replace(/^www\./, '');
    const parts = clean.split('.');
    return parts[0];
  }

  // 4. Fallback: Slugify Nama Sekolah (e.g. "SMK Negeri 1 Plered" -> "smk-negeri-1-plered")
  if (tenant.name) {
    return tenant.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Hapus karakter non-alphanumeric
      .replace(/\s+/g, '-')         // Ganti spasi dengan -
      .replace(/-+/g, '-');         // Hindari tanda hubung ganda
  }

  return '';
};

export default function EasyTunnelPage() {
  const confirm = useConfirm();

  // Extract error message safely from Axios structure
  const getErrorMessage = (err: any): string => {
    return err.response?.data?.message || err.message || '';
  };

  // Mendeteksi port development secara cerdas dari URL window.location
  const devPort = useMemo(() => {
    if (typeof window !== 'undefined' && window.location && window.location.port) {
      const port = parseInt(window.location.port, 10);
      if (!isNaN(port) && port > 0) return port;
    }
    return 3003; // Fallback default
  }, []);
  const { toasts, error: showErrorToast, success: showSuccessToast, removeToast } = useToast();

  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  
  // Modals state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Prepopulate state

  // Deployment mode state
  const [deploymentMode, setDeploymentMode] = useState<'on_premise' | 'local_windows' | 'public_vps'>('on_premise');

  // Setup form states
  const [licenseKey, setLicenseKey] = useState('');
  const [subdomainSlug, setSubdomainSlug] = useState('');
  const [localPort, setLocalPort] = useState(443); // default port Caddy (HTTPS) on-premise
  const [appName, setAppName] = useState('Absenta Local Portal');
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
  const [packages, setPackages] = useState<any[]>([]);
  const [paymentChannels, setPaymentChannels] = useState<any[]>([]);
  const [orderStep, setOrderStep] = useState(1); // 1: Form, 2: Payment, 3: Success
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [invoiceStatusPolling, setInvoiceStatusPolling] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);

  // General loading states
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      setError(null);
      const res = await easyTunnelApi.list();
      if (res.success) {
        setTunnels(res.data);
      }
      
      const infoRes = await easyTunnelApi.info();
      if (infoRes.success) {
        setSystemInfo(infoRes.data);
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Gagal memuat data dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Pre-populate dari data tenant (sekolah) hanya sekali saat komponen pertama kali dirender
  useEffect(() => {
    const prepopulate = async () => {
      try {
        const tenantRes = await requestWithFallback<any>('get', '/api/me/tenant');
        if (tenantRes?.success && tenantRes.data) {
          const tenant = tenantRes.data;
          setSchoolName(tenant.name || '');
          setAppName(tenant.name || 'Absenta Local Portal');
          setSubdomainSlug(resolveSmartSlug(tenant));
        }
      } catch (err) {
        console.warn('Failed to pre-populate tenant data:', err);
      }
    };
    prepopulate();
  }, []);

  useEffect(() => {
    if (systemInfo?.platform) {
      if (systemInfo.platform === 'win32') {
        setDeploymentMode('local_windows');
        setLocalPort(devPort);
      } else {
        setDeploymentMode('on_premise');
        setLocalPort(443);
      }
    }
  }, [systemInfo?.platform, devPort]);

  // Polling status invoice setelah order dibuat secara otomatis (tiap 5 detik)
  useEffect(() => {
    let interval: any = null;
    if (orderStep === 2 && invoice?.invoice_number) {
      interval = setInterval(async () => {
        try {
          const statusRes = await easyTunnelApi.checkInvoiceStatus(invoice.invoice_number);
          const isPaid = statusRes?.success && (statusRes.data?.status === 'paid' || statusRes.data?.status === 'PAID' || statusRes.data?.paid || statusRes.paid);
          if (isPaid) {
            const key = statusRes.data?.license_key || statusRes.license_key || invoice?.license_key || licenseKey || '';
            showSuccessToast(`Pembayaran Sukses! Lisensi Anda: ${key}`);
            setLicenseKey(key);
            setOrderStep(3);
            if (interval) clearInterval(interval);
          }
        } catch (err) {
          console.warn('Polling status invoice failed:', err);
        }
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [orderStep, invoice, showSuccessToast]);

  const handleDeploymentModeChange = (mode: 'on_premise' | 'local_windows' | 'public_vps') => {
    setDeploymentMode(mode);
    if (mode === 'on_premise') {
      setLocalPort(443);
      setEditLocalPort(443);
    } else if (mode === 'local_windows') {
      setLocalPort(devPort);
      setEditLocalPort(devPort);
    }
  };

  const handleInstallWireguard = async () => {
    setActionLoading(prev => ({ ...prev, install: 'installing' }));
    try {
      const res = await easyTunnelApi.installWireguard();
      showSuccessToast(res.message || 'Proses instalasi selesai.');
      loadData();
    } catch (err: any) {
      showErrorToast('Gagal menginstal WireGuard: ' + getErrorMessage(err));
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next.install;
        return next;
      });
    }
  };

  const handleTunnelAction = async (id: string, action: 'start' | 'stop' | 'delete') => {
    if (action === 'delete') {
      const isConfirmed = await confirm({
        title: 'Hapus Tunnel',
        description: 'Apakah Anda yakin ingin menghapus tunnel ini secara permanen dari server lokal?',
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        style: 'danger'
      });
      if (!isConfirmed) return;
    }

    setActionLoading(prev => ({ ...prev, [id]: action }));
    try {
      if (action === 'start') {
        const res = await easyTunnelApi.start(id);
        showSuccessToast(res.message || 'Tunnel berhasil diaktifkan');
      } else if (action === 'stop') {
        const res = await easyTunnelApi.stop(id);
        showSuccessToast(res.message || 'Tunnel berhasil dinonaktifkan');
      } else {
        const res = await easyTunnelApi.remove(id);
        showSuccessToast(res.message || 'Tunnel berhasil dihapus');
      }
      loadData();
    } catch (err: any) {
      showErrorToast(`Gagal melakukan aksi ${action}: ${getErrorMessage(err)}`);
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleDiagnose = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: 'diagnose' }));
    try {
      const res = await easyTunnelApi.diagnose(id);
      if (res.success && res.data.details) {
        alert(`🔍 HASIL DIAGNOSA KONEKSI:\n\n${res.data.details.join('\n')}`);
      } else {
        showErrorToast('Gagal mendiagnosa koneksi.');
      }
    } catch (err: any) {
      showErrorToast('Gagal mendiagnosa koneksi: ' + getErrorMessage(err));
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    setSetupError(null);
    try {
      const res = await easyTunnelApi.setup({
        license_key: licenseKey,
        subdomain_slug: subdomainSlug,
        local_port: localPort,
        app_name: appName
      });
      if (res.success) {
        showSuccessToast(res.message || 'Tunnel berhasil dikonfigurasi!');
        setShowSetupModal(false);
        setLicenseKey('');
        setSubdomainSlug('');
        loadData();
      }
    } catch (err: any) {
      setSetupError(getErrorMessage(err) || 'Gagal memproses setup tunnel.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleEditClick = (t: Tunnel) => {
    setSelectedTunnel(t);
    setEditLocalPort(t.local_port);
    setEditAppName(t.app_name);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTunnel) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await easyTunnelApi.edit(selectedTunnel.id, {
        local_port: editLocalPort,
        app_name: editAppName
      });
      if (res.success) {
        showSuccessToast(res.message || 'Konfigurasi berhasil diperbarui!');
        setShowEditModal(false);
        loadData();
      }
    } catch (err: any) {
      setEditError(getErrorMessage(err) || 'Gagal memperbarui konfigurasi.');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Order wizard
  const handleOpenOrder = async () => {
    setShowOrderModal(true);
    setOrderStep(1);
    setOrderLoading(true);
    setOrderError(null);
    try {
      const pkgRes = await easyTunnelApi.getPackages();
      if (pkgRes.success) setPackages(pkgRes.data);
      
      const payRes = await easyTunnelApi.getPaymentChannels();
      if (payRes.success) setPaymentChannels(payRes.data);
    } catch (err: any) {
      setOrderError('Gagal memuat paket atau metode pembayaran.');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderLoading(true);
    setOrderError(null);
    try {
      const res = await easyTunnelApi.newOrder({
        school_name: schoolName,
        plan_id: selectedPackage,
        payment_method: selectedPayment,
        subdomain_slug: subdomainSlug,
        local_port: localPort,
        app_name: appName
      });
      if (res.success) {
        setInvoice(res.data);
        if (res.data?.license_key) {
          setLicenseKey(res.data.license_key);
        }
        setOrderStep(2);
      }
    } catch (err: any) {
      setOrderError(getErrorMessage(err) || 'Gagal mengajukan transaksi baru.');
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Akses Online (Easy Tunnel)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Hubungkan server portal sekolah Absenta ke internet luring menggunakan WireGuard VPN.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition" onClick={handleOpenOrder}>
            🛒 Beli Lisensi
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition" onClick={() => setShowSetupModal(true)}>
            🔑 Konfigurasi Lisensi
          </button>
        </div>
      </div>

      {/* OS & WireGuard System Banner */}
      {systemInfo && (
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Status Lingkungan Server</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Host: <span className="font-semibold">{systemInfo.hostname}</span> | OS: <span className="font-semibold">{systemInfo.platform} ({systemInfo.arch})</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {systemInfo.wg_installed ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold rounded-full">
                ✓ WireGuard Terpasang
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-semibold rounded-full">
                  ⚠️ WireGuard Belum Terpasang
                </span>
                {systemInfo.platform === 'win32' && (
                  <button
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                    onClick={handleInstallWireguard}
                    disabled={actionLoading.install === 'installing'}
                  >
                    {actionLoading.install === 'installing' ? 'Mengunduh...' : 'Install Otomatis'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 p-4 rounded-xl text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Tunnels Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3">Memuat data terowongan...</p>
        </div>
      ) : tunnels.length === 0 ? (
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
          <span className="text-4xl">🌐</span>
          <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Belum Ada Terowongan</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2">
            Server ini belum memiliki konfigurasi terowongan VPN. Daftarkan kunci lisensi Easy Tunnel Anda untuk memulainya.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition" onClick={handleOpenOrder}>
              🛒 Beli Lisensi
            </button>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition" onClick={() => setShowSetupModal(true)}>
              🔑 Hubungkan Lisensi
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tunnels.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{t.app_name}</h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{t.slug}.{systemInfo?.tunnel_base_domain || 'absenta.id'}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  t.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {t.status === 'active' ? '● Aktif' : '○ Nonaktif'}
                </span>
              </div>

              <div className="text-xs space-y-1.5 text-gray-500 dark:text-gray-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span>Port Lokal:</span>
                  <span className="font-mono text-gray-900 dark:text-white">{t.local_port}</span>
                </div>
                {t.wg_status?.wg_ip && (
                  <div className="flex justify-between">
                    <span>IP VPN:</span>
                    <span className="font-mono text-gray-900 dark:text-white">{t.wg_status.wg_ip}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Status WireGuard:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{t.wg_status?.status || 'tidak diketahui'}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {t.status === 'active' ? (
                  <button
                    className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 focus:outline-none"
                    onClick={() => handleTunnelAction(t.id, 'stop')}
                    disabled={actionLoading[t.id] !== undefined}
                  >
                    {actionLoading[t.id] === 'stop' ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Mematikan...
                      </>
                    ) : (
                      'Nonaktifkan'
                    )}
                  </button>
                ) : (
                  <button
                    className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 focus:outline-none"
                    onClick={() => handleTunnelAction(t.id, 'start')}
                    disabled={actionLoading[t.id] !== undefined}
                  >
                    {actionLoading[t.id] === 'start' ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Mengaktifkan...
                      </>
                    ) : (
                      'Aktifkan'
                    )}
                  </button>
                )}
                <button
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 focus:outline-none"
                  onClick={() => handleDiagnose(t.id)}
                  disabled={actionLoading[t.id] !== undefined}
                >
                  {actionLoading[t.id] === 'diagnose' ? (
                    <>
                      <span className="w-3 h-3 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin"></span>
                      Proses...
                    </>
                  ) : (
                    '🔍 Diagnosa'
                  )}
                </button>
                <button
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition focus:outline-none"
                  onClick={() => handleEditClick(t)}
                  disabled={actionLoading[t.id] !== undefined}
                >
                  ✏️ Edit
                </button>
                <button
                  className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:hover:bg-red-900 dark:text-red-300 rounded-lg text-xs font-semibold transition flex items-center justify-center focus:outline-none"
                  onClick={() => handleTunnelAction(t.id, 'delete')}
                  disabled={actionLoading[t.id] !== undefined}
                  title="Hapus Permanen"
                >
                  {actionLoading[t.id] === 'delete' ? (
                    <span className="w-3.5 h-3.5 border-2 border-red-500/30 border-t-red-700 rounded-full animate-spin"></span>
                  ) : (
                    '🗑️'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: SETUP LISENSI */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Setup Kunci Lisensi</h3>
              <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl" onClick={() => setShowSetupModal(false)}>×</button>
            </div>
            
            {setupError && (
              <div className="bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 p-3 rounded-lg text-xs">
                ⚠️ {setupError}
              </div>
            )}

            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Kunci Lisensi (License Key):</label>
                <input
                  type="text"
                  required
                  placeholder="Format: ET-XXXXX-XXXXX..."
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800"
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Subdomain Yang Diinginkan:</label>
                <div className="flex items-center border rounded-lg overflow-hidden dark:bg-slate-800">
                  <input
                    type="text"
                    required
                    placeholder="nama-sekolah"
                    className="flex-1 px-3 py-2 text-sm border-none bg-transparent"
                    value={subdomainSlug}
                    onChange={e => setSubdomainSlug(e.target.value)}
                  />
                  <span className="px-3 bg-slate-100 dark:bg-slate-800 text-xs text-gray-500 font-mono">.{systemInfo?.tunnel_base_domain || 'absenta.id'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Nama Instansi / Aplikasi:</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800"
                  value={appName}
                  onChange={e => setAppName(e.target.value)}
                />
              </div>

              <div className="space-y-2 border-t pt-3 border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">
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
                      className="mt-1"
                      checked={deploymentMode === 'on_premise'}
                      onChange={() => handleDeploymentModeChange('on_premise')}
                    />
                    <div>
                      <span className="font-bold text-xs text-gray-900 dark:text-white block">Server Sekolah - On-Premise (Linux / Windows)</span>
                      <span className="text-[10px] text-gray-500 leading-normal block">Aplikasi berjalan di server lokal sekolah (Linux/Windows) menggunakan reverse-proxy Caddy. (Port 443)</span>
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
                      className="mt-1"
                      checked={deploymentMode === 'local_windows'}
                      onChange={() => handleDeploymentModeChange('local_windows')}
                    />
                    <div>
                      <span className="font-bold text-xs text-gray-900 dark:text-white block">Uji Coba Pengembang - Developer Mode (Tanpa Caddy)</span>
                      <span className="text-[10px] text-gray-500 leading-normal block">Untuk keperluan testing lokal langsung pada PC Windows/Linux tanpa web server Caddy. (Port {devPort})</span>
                    </div>
                  </label>

                  <label className={`border rounded-xl p-2.5 flex items-start gap-3 cursor-pointer transition ${
                    deploymentMode === 'public_vps'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="deploy_mode"
                      className="mt-1"
                      checked={deploymentMode === 'public_vps'}
                      onChange={() => handleDeploymentModeChange('public_vps')}
                    />
                    <div>
                      <span className="font-bold text-xs text-gray-900 dark:text-white block">VPS Cloud Publik (Hosting Online)</span>
                      <span className="text-[10px] text-gray-500 leading-normal block">Server Anda sudah dideploy di VPS awan publik (sudah memiliki IP Publik).</span>
                    </div>
                  </label>
                </div>
              </div>

              {deploymentMode === 'public_vps' ? (
                <div className="bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 p-3 rounded-lg text-xs leading-relaxed border border-amber-200 dark:border-amber-900">
                  ⚠️ <strong>Informasi:</strong> Server VPS Cloud Publik sudah terhubung langsung ke Internet dan memiliki IP Publik/Domain tersendiri. Anda tidak membutuhkan terowongan VPN (Easy Tunnel) untuk mengonlinekannya.
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Port Lokal Portal Absenta:</label>
                  <input
                    type="number"
                    required
                    disabled={deploymentMode === 'on_premise'}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 bg-slate-50 dark:disabled:bg-slate-900 disabled:text-gray-500"
                    value={localPort}
                    onChange={e => setLocalPort(parseInt(e.target.value))}
                  />
                  {deploymentMode === 'on_premise' && (
                    <p className="text-[10px] text-gray-400">Terkunci pada port 443 karena server on-premise Anda (Linux/Windows) menggunakan Caddy lokal.</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                disabled={setupLoading || deploymentMode === 'public_vps'}
              >
                {setupLoading ? 'Memproses Tunnel...' : '✓ Pasang Kunci Lisensi'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT TUNNEL */}
      {showEditModal && selectedTunnel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Konfigurasi Tunnel</h3>
              <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl" onClick={() => setShowEditModal(false)}>×</button>
            </div>

            {editError && (
              <div className="bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 p-3 rounded-lg text-xs">
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Nama Instansi / Aplikasi:</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800"
                  value={editAppName}
                  onChange={e => setEditAppName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Port Lokal Portal Absenta:</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800"
                  value={editLocalPort}
                  onChange={e => setEditLocalPort(parseInt(e.target.value))}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
                disabled={editLoading}
              >
                {editLoading ? 'Menyimpan...' : '✓ Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: WIZARD BELI LISENSI */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Beli Lisensi Easy Tunnel</h3>
              <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl" onClick={() => setShowOrderModal(false)}>×</button>
            </div>

            {orderError && (
              <div className="bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 p-3 rounded-lg text-xs">
                ⚠️ {orderError}
              </div>
            )}

            {orderLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-3 text-sm text-gray-500">Memproses pesanan...</p>
              </div>
            ) : orderStep === 1 ? (
              <form onSubmit={handleOrderSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Nama Sekolah / Instansi:</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SMK Negeri 1 Jakarta"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Pilih Paket Terowongan:</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {packages.map(p => (
                      <label key={p.id} className={`border rounded-xl p-3 flex flex-col cursor-pointer transition ${
                        selectedPackage === p.id 
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20' 
                          : 'border-slate-200 dark:border-slate-800'
                      }`}>
                        <input
                          type="radio"
                          name="package"
                          required
                          className="sr-only"
                          value={p.id}
                          onChange={() => setSelectedPackage(p.id)}
                        />
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{p.title}</span>
                        <span className="text-xs text-gray-500">{p.duration}</span>
                        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-2">{p.price}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Pilih Metode Pembayaran:</label>
                  
                  {/* Dropdown Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 flex items-center justify-between bg-white dark:border-slate-700 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
                    >
                      {selectedPayment ? (
                        (() => {
                          const ch = paymentChannels.find(c => c.code === selectedPayment);
                          if (ch) {
                            return (
                              <div className="flex items-center gap-2">
                                {ch.icon_url || ch.logo_url || ch.logo ? (
                                  <img src={ch.icon_url || ch.logo_url || ch.logo} alt={ch.name} className="h-5 object-contain max-w-full" />
                                ) : (
                                  <span>💳</span>
                                )}
                                <span className="font-semibold text-gray-900 dark:text-white">{ch.name}</span>
                              </div>
                            );
                          }
                          return <span className="text-gray-500">Pilih Metode</span>;
                        })()
                      ) : (
                        <span className="text-gray-500">-- Pilih Metode Pembayaran --</span>
                      )}
                      <span className="text-gray-400 text-xs">▼</span>
                    </button>

                    {/* Floating Dropdown List */}
                    {showPaymentDropdown && (
                      <div className="absolute left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-1 space-y-0.5">
                          {paymentChannels.length === 0 ? (
                            <div className="p-2 text-xs text-gray-500 text-center">Memuat metode pembayaran...</div>
                          ) : (
                            paymentChannels.map(ch => (
                              <button
                                key={ch.code}
                                type="button"
                                className={`w-full px-3 py-2 text-left text-sm rounded-md flex items-center gap-3 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                  selectedPayment === ch.code ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-700 dark:text-gray-300'
                                }`}
                                onClick={() => {
                                  setSelectedPayment(ch.code);
                                  setShowPaymentDropdown(false);
                                }}
                              >
                                {ch.icon_url || ch.logo_url || ch.logo ? (
                                  <img src={ch.icon_url || ch.logo_url || ch.logo} alt={ch.name} className="h-5 w-12 object-contain shrink-0" />
                                ) : (
                                  <span className="w-12 text-center text-lg shrink-0">💳</span>
                                )}
                                <span>{ch.name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3 border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">
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
                        name="deploy_mode_order"
                        className="mt-1"
                        checked={deploymentMode === 'on_premise'}
                        onChange={() => handleDeploymentModeChange('on_premise')}
                      />
                      <div>
                        <span className="font-bold text-xs text-gray-900 dark:text-white block">Server Sekolah - On-Premise (Linux / Windows)</span>
                        <span className="text-[10px] text-gray-500 leading-normal block">Aplikasi berjalan di server lokal sekolah (Linux/Windows) menggunakan reverse-proxy Caddy. (Port 443)</span>
                      </div>
                    </label>

                    <label className={`border rounded-xl p-2.5 flex items-start gap-3 cursor-pointer transition ${
                      deploymentMode === 'local_windows'
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}>
                      <input
                        type="radio"
                        name="deploy_mode_order"
                        className="mt-1"
                        checked={deploymentMode === 'local_windows'}
                        onChange={() => handleDeploymentModeChange('local_windows')}
                      />
                      <div>
                        <span className="font-bold text-xs text-gray-900 dark:text-white block">Uji Coba Pengembang - Developer Mode (Tanpa Caddy)</span>
                        <span className="text-[10px] text-gray-500 leading-normal block">Untuk keperluan testing lokal langsung pada PC Windows/Linux tanpa web server Caddy. (Port {devPort})</span>
                      </div>
                    </label>

                    <label className={`border rounded-xl p-2.5 flex items-start gap-3 cursor-pointer transition ${
                      deploymentMode === 'public_vps'
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}>
                      <input
                        type="radio"
                        name="deploy_mode_order"
                        className="mt-1"
                        checked={deploymentMode === 'public_vps'}
                        onChange={() => handleDeploymentModeChange('public_vps')}
                      />
                      <div>
                        <span className="font-bold text-xs text-gray-900 dark:text-white block">VPS Cloud Publik (Hosting Online)</span>
                        <span className="text-[10px] text-gray-500 leading-normal block">Server Anda sudah dideploy di VPS awan publik (sudah memiliki IP Publik).</span>
                      </div>
                    </label>
                  </div>
                </div>

                {deploymentMode === 'public_vps' ? (
                  <div className="bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 p-3 rounded-lg text-xs leading-relaxed border border-amber-200 dark:border-amber-900">
                    ⚠️ <strong>Informasi:</strong> Server VPS Cloud Publik sudah terhubung langsung ke Internet dan memiliki IP Publik/Domain tersendiri. Anda tidak membutuhkan terowongan VPN (Easy Tunnel) untuk mengonlinekannya.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Subdomain:</label>
                      <input
                        type="text"
                        required
                        placeholder="slug"
                        className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800"
                        value={subdomainSlug}
                        onChange={e => setSubdomainSlug(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Port Lokal:</label>
                      <input
                        type="number"
                        required
                        disabled={deploymentMode === 'on_premise'}
                        className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 bg-slate-50 dark:disabled:bg-slate-900 disabled:text-gray-500"
                        value={localPort}
                        onChange={e => setLocalPort(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                  disabled={deploymentMode === 'public_vps'}
                >
                  ✓ Buat Invoice Pembayaran
                </button>
              </form>
            ) : orderStep === 2 && invoice ? (
              <div className="text-center space-y-4 py-3">
                <span className="text-4xl">🧾</span>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Selesaikan Pembayaran Anda</h4>
                  <p className="text-xs text-gray-500">Nomor Invoice: {invoice.invoice_number}</p>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl text-center space-y-1 max-w-sm mx-auto shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total yang harus dibayar</span>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {invoice.amount_formatted || (invoice.amount ? `Rp ${Number(invoice.amount).toLocaleString('id-ID')}` : '')}
                  </p>
                </div>

                {invoice.qr_url ? (
                  <div className="flex flex-col items-center py-4">
                    {invoice.payment_method && (
                      <div className="mb-4 flex items-center justify-center">
                        {(() => {
                          const channel = paymentChannels.find(c => c.code === invoice.payment_method);
                          if (channel) {
                            return (
                              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-md">
                                {(channel.icon_url || channel.logo_url || channel.logo) && (
                                  <img src={channel.icon_url || channel.logo_url || channel.logo} alt={channel.name} className="h-5 w-auto object-contain" />
                                )}
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{channel.name}</span>
                              </div>
                            );
                          }
                          return (
                            <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-md">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{invoice.payment_method}</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <div className="bg-white p-4 rounded-2xl shadow-xl display-inline-block">
                      <img
                        src={invoice.qr_url}
                        alt="QRIS Code"
                        className="w-48 h-48 block object-contain mx-auto"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mt-4 text-center max-w-sm leading-relaxed">
                      Pindai kode QRIS di atas menggunakan aplikasi e-wallet Anda (GoPay, OVO, Dana, LinkAja, ShopeePay, BCA Mobile, dll.)
                    </span>
                  </div>
                ) : invoice.pay_url ? (
                  <a
                    href={invoice.pay_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition shadow-md"
                  >
                    💳 Klik Disini Untuk Bayar
                  </a>
                ) : (
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl text-center max-w-sm mx-auto">
                    {invoice.payment_method && (
                      <div className="mb-4 flex items-center justify-center">
                        {(() => {
                          const channel = paymentChannels.find(c => c.code === invoice.payment_method);
                          if (channel) {
                            return (
                              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-md">
                                {(channel.icon_url || channel.logo_url || channel.logo) && (
                                  <img src={channel.icon_url || channel.logo_url || channel.logo} alt={channel.name} className="h-5 w-auto object-contain" />
                                )}
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{channel.name}</span>
                              </div>
                            );
                          }
                          return (
                            <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-md">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{invoice.payment_method}</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Nomor Virtual Account / Kode Bayar
                    </span>
                    <div className="flex items-center justify-center gap-3">
                      <strong className="text-2xl font-mono font-black text-slate-800 dark:text-white tracking-widest">
                        {invoice.pay_code || invoice.payment_code}
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(invoice.pay_code || invoice.payment_code);
                          showSuccessToast('Kode bayar disalin!');
                        }}
                        className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm focus:outline-none"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-2 font-medium">
                      Gunakan kode VA di atas untuk melakukan transfer melalui ATM/M-Banking.
                    </span>
                  </div>
                )}

                {/* Petunjuk Pembayaran Accordion */}
                {Array.isArray(invoice.payment_instructions) && invoice.payment_instructions.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-left max-w-sm mx-auto">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Petunjuk Pembayaran
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {invoice.payment_instructions.map((inst: any, idx: number) => (
                        <div key={idx} className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/30 rounded-xl">
                          <strong className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-2">{inst.title}</strong>
                          <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {inst.steps.map((step: string, sIdx: number) => (
                              <li key={sIdx} dangerouslySetInnerHTML={{ __html: step }} />
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex flex-col gap-2 max-w-sm mx-auto w-full">
                  <button
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 focus:outline-none"
                    onClick={async () => {
                      setOrderLoading(true);
                      try {
                        const statusRes = await easyTunnelApi.checkInvoiceStatus(invoice.invoice_number);
                        const isPaid = statusRes?.success && (statusRes.data?.status === 'paid' || statusRes.data?.status === 'PAID' || statusRes.data?.paid || statusRes.paid);
                        if (isPaid) {
                          const key = statusRes.data?.license_key || statusRes.license_key || invoice?.license_key || licenseKey || '';
                          showSuccessToast(`Pembayaran Sukses! Lisensi Anda: ${key}`);
                          setLicenseKey(key);
                          setOrderStep(3);
                        } else {
                          showErrorToast('Pembayaran belum terdeteksi. Silakan selesaikan pembayaran terlebih dahulu.');
                        }
                      } catch (err: any) {
                        showErrorToast('Gagal mengecek status: ' + getErrorMessage(err));
                      } finally {
                        setOrderLoading(false);
                      }
                    }}
                  >
                    🔄 Verifikasi Pembayaran
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const waNum = '6287779937341';
                      const msgText = `Halo Admin, saya ingin mengirimkan bukti pembayaran lisensi Easy Tunnel.\nInvoice: ${invoice.invoice_number}\nJumlah: Rp ${Number(invoice.amount).toLocaleString('id-ID')}`;
                      const msg = encodeURIComponent(msgText);
                      window.open(`https://wa.me/${waNum}?text=${msg}`, '_blank');
                    }}
                    className="w-full py-2 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/40 text-green-600 dark:text-green-400 font-bold text-xs rounded-lg transition-all border border-green-100 dark:border-green-900/30 flex items-center justify-center gap-2 focus:outline-none"
                  >
                    Hubungi WhatsApp Admin (Konfirmasi Manual)
                  </button>

                  <button className="text-xs text-gray-500 hover:text-gray-700 mt-1 focus:outline-none" onClick={() => setShowOrderModal(false)}>
                    Kembali Nanti
                  </button>
                </div>
              </div>
            ) : orderStep === 3 ? (
              <div className="text-center space-y-4 py-6">
                <span className="text-5xl text-emerald-500">🎉</span>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Pembayaran Berhasil!</h4>
                  <p className="text-sm text-gray-500">Kunci lisensi Easy Tunnel Anda telah aktif.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-800 max-w-sm mx-auto space-y-2">
                  <p className="text-xs text-gray-500">License Key Anda:</p>
                  <p className="font-mono font-bold text-sm bg-white dark:bg-slate-900 p-2 border rounded text-gray-900 dark:text-white select-all">
                    {licenseKey}
                  </p>
                </div>

                <button
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
                  onClick={async () => {
                    setOrderLoading(true);
                    try {
                      const setupRes = await easyTunnelApi.setup({
                        license_key: licenseKey,
                        subdomain_slug: subdomainSlug,
                        local_port: localPort,
                        app_name: appName
                      });
                      showSuccessToast(setupRes.message || 'Tunnel berhasil dipasang!');
                      setShowOrderModal(false);
                      loadData();
                    } catch (err: any) {
                      showErrorToast('Gagal memasang tunnel otomatis: ' + getErrorMessage(err));
                      setShowOrderModal(false);
                      setShowSetupModal(true); // fallback ke manual
                    } finally {
                      setOrderLoading(false);
                    }
                  }}
                >
                  🚀 Pasang Tunnel di PC/Server Ini
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
      
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
