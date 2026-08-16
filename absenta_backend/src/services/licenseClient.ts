import fetch from 'node-fetch';

const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';

/** Ambil daftar metode pembayaran dari server lisensi */
export async function fetchPaymentChannels(productId: string = 'easy-tunnel'): Promise<any[]> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/payment-channels?productId=${encodeURIComponent(productId)}`, {
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal mengambil metode pembayaran.');
  return data.data;
}

export interface EasyTunnelPackage {
  id: string;
  title: string;
  price: string;
  duration: string;
  badge: string | null;
}

export interface TunnelConfig {
  license_key: string;
  client_ip: string;
  subdomain: string;
  local_port: number;
  app_name: string | null;
  config: string;
}

export interface LicenseInfo {
  license_key: string;
  school_name: string;
  expires_at: string;
  wireguard_ip: string | null;
  requested_slug: string | null;
  local_port: number | null;
  app_name: string | null;
  active_hostname?: string | null;
  expired?: boolean;
}

/** Ambil daftar paket Easy Tunnel dari server lisensi */
export async function fetchPackages(): Promise<EasyTunnelPackage[]> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/easy-tunnel/packages`, {
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal mengambil paket.');
  
  const raw = data.data || [];
  return raw.map((p: any) => {
    let duration = '1 Bulan';
    let priceVal = p.priceMonthly;
    if (p.id.includes('annual') || p.id.includes('year') || p.billingPeriod === 'YEAR') {
      duration = '1 Tahun';
      priceVal = p.priceYearly || (p.priceMonthly * 12);
    } else if (p.id.includes('semester')) {
      duration = '6 Bulan (1 Semester)';
      priceVal = p.priceYearly || (p.priceMonthly * 6);
    } else if (p.id.includes('monthly') || p.billingPeriod === 'MONTH') {
      duration = '1 Bulan';
      priceVal = p.priceMonthly;
    }
    const formattedPrice = `Rp ${Number(priceVal).toLocaleString('id-ID')}`;
    return {
      id: p.id,
      title: p.name || p.title || '',
      duration,
      price: formattedPrice,
      badge: p.badge || null
    };
  });
}

/** Ambil daftar lisensi Easy Tunnel berdasarkan subdomain slug */
export async function fetchLicensesBySlug(slug: string): Promise<any[]> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/easy-tunnel/by-slug/${encodeURIComponent(slug.trim().toLowerCase())}`, {
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal mengambil daftar lisensi.');
  return data.data || [];
}

/** Validasi license key dari server lisensi */
export async function validateLicenseKey(licenseKey: string): Promise<LicenseInfo> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/easy-tunnel/validate/${encodeURIComponent(licenseKey.trim())}`, {
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'License tidak valid.');
  return data.data;
}

/** Order tunnel baru ke server lisensi */
export async function requestTunnelConfig(params: {
  license_key: string;
  subdomain_slug: string;
  local_port: number;
  app_name: string;
  hostname?: string;
}): Promise<TunnelConfig> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/easy-tunnel/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(30000) // 30s karena ada operasi WireGuard di server
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal memproses tunnel di server.');
  return data.data;
}

/** Lepas kunci perangkat (device lock) lisensi */
export async function releaseLicense(licenseKey: string): Promise<any> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/easy-tunnel/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey.trim() }),
    signal: AbortSignal.timeout(10000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal melepas kunci perangkat.');
  return data;
}

/** Request lisensi baru / perpanjangan via billing (order + bayar) */
export async function requestNewLicense(params: {
  school_name: string;
  plan_id: string;
  payment_method: string;
  renew_license_key?: string;
  subdomain_slug?: string;
  requested_slug?: string;
  app_name?: string;
  local_port?: number;
}): Promise<any> {
  const bodyData = {
    ...params,
    product_id: 'easy-tunnel',
    device_limit: 1,
    is_unlimited: 0,
    requested_slug: params.requested_slug || params.subdomain_slug,
    subdomain_slug: params.subdomain_slug || params.requested_slug
  };

  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData),
    signal: AbortSignal.timeout(15000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal mengajukan lisensi baru.');
  return data;
}

/** Cek status lisensi key (polling setelah bayar) */
export async function checkLicenseStatus(licenseKey: string): Promise<any> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/check/${encodeURIComponent(licenseKey)}`, {
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  return data;
}

/** Cek status invoice (untuk polling setelah order) */
export async function checkInvoiceStatus(invoiceNumber: string): Promise<any> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/invoice-status/${encodeURIComponent(invoiceNumber.trim())}`, {
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  return data;
}

/** Cek ketersediaan subdomain slug */
export async function checkSlugAvailability(slug: string): Promise<{ available: boolean; message: string }> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/check-slug/${encodeURIComponent(slug)}`, {
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  return { available: data.available ?? false, message: data.message || '' };
}

/** Update port lisensi di server */
export async function updateLicensePort(licenseKey: string, localPort: number, appName?: string): Promise<any> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/easy-tunnel/update-port`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: licenseKey.trim(),
      local_port: localPort,
      app_name: appName ? appName.trim() : undefined
    }),
    signal: AbortSignal.timeout(10000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal memperbarui port di server.');
  return data;
}

/** Request OTP login ke server lisensi */
export async function requestOTP(nomor: string): Promise<any> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nomor }),
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal mengirim OTP.');
  return data;
}

/** Verifikasi OTP login ke server lisensi */
export async function verifyOTP(nomor: string, code: string): Promise<{ success: boolean; token: string; message: string }> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nomor, code }),
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal memverifikasi OTP.');
  return data;
}

/** Ambil daftar lisensi milik operator dari server lisensi */
export async function fetchMyLicenses(token: string): Promise<any[]> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/auth/my-licenses`, {
    headers: { 'Authorization': `Bearer ${token}` },
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal mengambil daftar lisensi.');
  return data.data;
}

/** Klaim lisensi ke operator */
export async function claimLicense(token: string, licenseKey: string): Promise<any> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/auth/claim-license`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ license_key: licenseKey }),
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal mengklaim lisensi.');
  return data;
}

/** Ambil daftar transaksi milik operator dari server lisensi */
export async function fetchMyOrders(token: string): Promise<any[]> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/auth/my-orders`, {
    headers: { 'Authorization': `Bearer ${token}` },
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal mengambil riwayat transaksi.');
  return data.data;
}

/** Daftarkan custom domain ke server lisensi + trigger Caddy sync */
export async function setLicenseCustomDomain(licenseKey: string, customDomain: string): Promise<any> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/tunnel/custom-domain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: licenseKey.trim(),
      custom_domain: customDomain.trim().toLowerCase()
    }),
    signal: AbortSignal.timeout(15000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal mendaftarkan custom domain ke server.');
  return data;
}

/** Hapus custom domain dari server lisensi + trigger Caddy sync */
export async function removeLicenseCustomDomain(licenseKey: string): Promise<any> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/tunnel/custom-domain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: licenseKey.trim(),
      custom_domain: null
    }),
    signal: AbortSignal.timeout(15000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal menghapus custom domain dari server.');
  return data;
}

/** Update nama sekolah dan NPSN ke server lisensi */
export async function updateLicenseInfo(params: {
  license_key: string;
  school_name?: string;
  npsn?: string;
}): Promise<any> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/update-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(10000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal memperbarui informasi lisensi di server pusat.');
  return data;
}

/** Kirim notifikasi WA pendaftaran tenant ke server lisensi */
export async function sendRegistrationWa(params: {
  school_name: string;
  subdomain: string;
  admin_email: string;
  admin_password: string;
  admin_phone: string;
}): Promise<any> {
  const res = await fetch(`${LICENSE_SERVER_URL}/api/license/tenant-registered-wa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(10000)
  });
  const data = await res.json() as any;
  if (!data.success) throw new Error(data.message || 'Gagal mengirimkan notifikasi WA pendaftaran ke server pusat.');
  return data;
}

