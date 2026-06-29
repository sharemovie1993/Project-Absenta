import React, { useEffect, useState, useMemo } from 'react';
import { easyTunnelApi, Tunnel, SystemInfo } from '../../api/easyTunnel.api';
import { requestWithFallback } from '../../api/apiUtils';

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
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  
  // Modals state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Prepopulate state
  const [hasPrepopulated, setHasPrepopulated] = useState(false);

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

      // Auto pre-populate dari data tenant (sekolah)
      if (!hasPrepopulated) {
        try {
          const tenantRes = await requestWithFallback<any>('get', '/api/me/tenant');
          if (tenantRes?.success && tenantRes.data) {
            const tenant = tenantRes.data;
            setSchoolName(tenant.name || '');
            setAppName(tenant.name || 'Absenta Local Portal');
            setSubdomainSlug(resolveSmartSlug(tenant));
            setHasPrepopulated(true);
          }
        } catch (err) {
          console.warn('Failed to pre-populate tenant data:', err);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (systemInfo?.platform) {
      if (systemInfo.platform === 'win32') {
        setDeploymentMode('local_windows');
        setLocalPort(3003);
      } else {
        setDeploymentMode('on_premise');
        setLocalPort(443);
      }
    }
  }, [systemInfo?.platform]);

  const handleDeploymentModeChange = (mode: 'on_premise' | 'local_windows' | 'public_vps') => {
    setDeploymentMode(mode);
    if (mode === 'on_premise') {
      setLocalPort(443);
      setEditLocalPort(443);
    } else if (mode === 'local_windows') {
      setLocalPort(3003);
      setEditLocalPort(3003);
    }
  };

  const handleInstallWireguard = async () => {
    setActionLoading(prev => ({ ...prev, install: 'installing' }));
    try {
      const res = await easyTunnelApi.installWireguard();
      alert(res.message || 'Proses instalasi selesai.');
      loadData();
    } catch (err: any) {
      alert('Gagal menginstal WireGuard: ' + err.message);
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
      if (!window.confirm('Apakah Anda yakin ingin menghapus tunnel ini secara permanen dari server lokal?')) return;
    }

    setActionLoading(prev => ({ ...prev, [id]: action }));
    try {
      if (action === 'start') {
        const res = await easyTunnelApi.start(id);
        alert(res.message);
      } else if (action === 'stop') {
        const res = await easyTunnelApi.stop(id);
        alert(res.message);
      } else {
        const res = await easyTunnelApi.remove(id);
        alert(res.message);
      }
      loadData();
    } catch (err: any) {
      alert(`Gagal ${action} tunnel: ${err.message}`);
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
        alert('Gagal mendiagnosa koneksi.');
      }
    } catch (err: any) {
      alert('Gagal mendiagnosa koneksi: ' + err.message);
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
        alert(res.message || 'Tunnel berhasil dikonfigurasi!');
        setShowSetupModal(false);
        setLicenseKey('');
        setSubdomainSlug('');
        loadData();
      }
    } catch (err: any) {
      setSetupError(err.message || 'Gagal memproses setup tunnel.');
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
        alert(res.message || 'Konfigurasi berhasil diperbarui!');
        setShowEditModal(false);
        loadData();
      }
    } catch (err: any) {
      setEditError(err.message || 'Gagal memperbarui konfigurasi.');
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
        setOrderStep(2);
      }
    } catch (err: any) {
      setOrderError(err.message || 'Gagal mengajukan transaksi baru.');
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
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{t.slug}.tefatjkt.net</p>
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
                    className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition"
                    onClick={() => handleTunnelAction(t.id, 'stop')}
                    disabled={actionLoading[t.id] !== undefined}
                  >
                    Nonaktifkan
                  </button>
                ) : (
                  <button
                    className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                    onClick={() => handleTunnelAction(t.id, 'start')}
                    disabled={actionLoading[t.id] !== undefined}
                  >
                    Aktifkan
                  </button>
                )}
                <button
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition"
                  onClick={() => handleDiagnose(t.id)}
                  disabled={actionLoading[t.id] !== undefined}
                >
                  🔍 Diagnosa
                </button>
                <button
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition"
                  onClick={() => handleEditClick(t)}
                  disabled={actionLoading[t.id] !== undefined}
                >
                  ✏️ Edit
                </button>
                <button
                  className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:hover:bg-red-900 dark:text-red-300 rounded-lg text-xs font-semibold transition"
                  onClick={() => handleTunnelAction(t.id, 'delete')}
                  disabled={actionLoading[t.id] !== undefined}
                  title="Hapus Permanen"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: SETUP LISENSI */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
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
                  <span className="px-3 bg-slate-100 dark:bg-slate-800 text-xs text-gray-500 font-mono">.tefatjkt.net</span>
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
                      <span className="text-[10px] text-gray-500 leading-normal block">Untuk keperluan testing lokal langsung pada PC Windows/Linux tanpa web server Caddy. (Port 3003)</span>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
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
                        <span className="text-[10px] text-gray-500 leading-normal block">Untuk keperluan testing lokal langsung pada PC Windows/Linux tanpa web server Caddy. (Port 3003)</span>
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

                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 max-w-sm mx-auto space-y-2">
                  <p className="text-xs text-gray-500">Total Tagihan:</p>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{invoice.amount_formatted}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Metode: {invoice.payment_method}</p>
                </div>

                {invoice.qr_url ? (
                  <div className="space-y-2">
                    <img src={invoice.qr_url} alt="QR Code Pembayaran" className="w-48 h-48 mx-auto border p-2 bg-white rounded-lg" />
                    <p className="text-xs text-gray-500">Scan QRIS diatas menggunakan e-wallet Anda.</p>
                  </div>
                ) : invoice.pay_url ? (
                  <a
                    href={invoice.pay_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
                  >
                    💳 Klik Disini Untuk Bayar
                  </a>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Nomor Rekening / Virtual Account:</p>
                    <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">{invoice.payment_code}</p>
                  </div>
                )}

                <div className="pt-4 border-t flex flex-col gap-2">
                  <button
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition"
                    onClick={async () => {
                      setOrderLoading(true);
                      try {
                        const status = await easyTunnelApi.checkInvoiceStatus(invoice.invoice_number);
                        if (status.paid) {
                          alert(`Pembayaran Sukses!\nLisensi Anda: ${status.license_key}`);
                          setLicenseKey(status.license_key);
                          setOrderStep(3);
                        } else {
                          alert('Pembayaran belum terdeteksi. Silakan selesaikan pembayaran terlebih dahulu.');
                        }
                      } catch (err: any) {
                        alert('Gagal mengecek status: ' + err.message);
                      } finally {
                        setOrderLoading(false);
                      }
                    }}
                  >
                    🔄 Cek Status Pembayaran
                  </button>
                  <button className="text-xs text-gray-500 hover:text-gray-700" onClick={() => setShowOrderModal(false)}>
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
                      alert(setupRes.message || 'Tunnel berhasil dipasang!');
                      setShowOrderModal(false);
                      loadData();
                    } catch (err: any) {
                      alert('Gagal memasang tunnel otomatis: ' + err.message);
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
    </div>
  );
}
