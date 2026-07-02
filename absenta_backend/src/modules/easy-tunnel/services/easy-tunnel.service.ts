import { prisma } from '../../../utils/prisma';
import { WireguardManager } from '../../../services/wireguardManager';
import {
  validateLicenseKey,
  requestTunnelConfig,
  releaseLicense,
  updateLicensePort,
  setLicenseCustomDomain,
  removeLicenseCustomDomain
} from '../../../services/licenseClient';
import os from 'os';
import dns from 'dns/promises';

const PLATFORM_DOMAIN = process.env.EASY_TUNNEL_BASE_DOMAIN || 'absenta.id';
const VALID_CNAME_TARGETS = [
  `app.${PLATFORM_DOMAIN}`,
  PLATFORM_DOMAIN,
  `www.${PLATFORM_DOMAIN}`
];

async function verifyCname(customDomain: string): Promise<boolean> {
  try {
    const addresses = await dns.resolveCname(customDomain);
    const resolved = addresses.map((a: string) => a.toLowerCase().replace(/\.$/, ''));
    return resolved.some((addr: string) =>
      VALID_CNAME_TARGETS.some(target => addr === target || addr.endsWith(`.${PLATFORM_DOMAIN}`))
    );
  } catch {
    try {
      const aRecords = await dns.resolve4(customDomain);
      const platformIps = await dns.resolve4(`app.${PLATFORM_DOMAIN}`).catch(() => [] as string[]);
      return aRecords.some((ip: string) => platformIps.includes(ip));
    } catch {
      return false;
    }
  }
}


export class EasyTunnelService {
  /**
   * Sinkronisasi status/port terowongan dari server lisensi secara periodik/diam-diam
   */
  static async syncTunnelPort(tunnel: any): Promise<any> {
    if (!tunnel.license_key || tunnel.status !== 'active') return tunnel;

    try {
      const remoteInfo = await validateLicenseKey(tunnel.license_key);

      // 1. Update tanggal kedaluwarsa jika berbeda
      if (remoteInfo.expires_at && remoteInfo.expires_at !== tunnel.expires_at) {
        await prisma.easyTunnel.update({
          where: { id: tunnel.id },
          data: { expires_at: new Date(remoteInfo.expires_at) }
        });
      }

      // 2. Deteksi status kedaluwarsa dari server lisensi
      if (remoteInfo.expired) {
        console.warn(`[EasyTunnel-Sync] Tunnel "${tunnel.app_name}" terdeteksi kedaluwarsa.`);
        return await prisma.easyTunnel.update({
          where: { id: tunnel.id },
          data: { status: 'expired' }
        });
      }

      // 3. Update port lokal jika diubah di server lisensi
      const remotePort = remoteInfo.local_port;
      if (remotePort && remotePort !== tunnel.local_port) {
        console.log(`[EasyTunnel-Sync] Mengubah port lokal ${tunnel.local_port} -> ${remotePort}`);
        return await prisma.easyTunnel.update({
          where: { id: tunnel.id },
          data: { local_port: remotePort }
        });
      }
    } catch (e: any) {
      const msg = (e.message || '').toLowerCase();
      const isExpired =
        msg.includes('kedaluwarsa') || msg.includes('expired') ||
        msg.includes('tidak ditemukan') || msg.includes('not found') ||
        msg.includes('tidak valid') || msg.includes('invalid');

      if (isExpired) {
        return await prisma.easyTunnel.update({
          where: { id: tunnel.id },
          data: { status: 'expired' }
        });
      }
      console.warn(`[EasyTunnel-Sync] Gagal sinkronisasi terowongan "${tunnel.app_name}":`, e.message);
    }

    return tunnel;
  }

  static async verifyTunnelTenant(tunnelSlug: string, tenantId?: string): Promise<void> {
    if (!tenantId) return; // Skip if no tenant (e.g. global admin)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subdomain: true }
    });
    if (!tenant) throw new Error('Tenant tidak ditemukan.');
    const tenantSubdomain = tenant.subdomain || undefined;
    if (tunnelSlug !== tenantSubdomain) {
      throw new Error('Akses ditolak. Terowongan ini bukan milik institusi Anda.');
    }
  }

  static async getTunnelsForTenant(tenantId?: string): Promise<any[]> {
    let tenantSubdomain: string | undefined;

    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subdomain: true }
      });
      if (tenant) {
        tenantSubdomain = tenant.subdomain || undefined;
      }
    }

    return this.getAllTunnels(tenantSubdomain);
  }

  static async getAllTunnels(subdomain?: string): Promise<any[]> {
    const tunnels = await prisma.easyTunnel.findMany({
      where: subdomain ? { slug: subdomain } : {},
      orderBy: { created_at: 'desc' }
    });

    const enriched = [];
    for (const t of tunnels) {
      // Jalankan sync port
      const synced = await this.syncTunnelPort(t);
      const wgStatus = synced.slug
        ? WireguardManager.getStatus(synced.slug)
        : { status: 'not_configured' as const };
      enriched.push({
        ...synced,
        wg_status: wgStatus
      });
    }

    return enriched;
  }

  static async getTunnelById(id: string, tenantId?: string): Promise<any> {
    const t = await prisma.easyTunnel.findUnique({ where: { id } });
    if (!t) throw new Error('Tunnel tidak ditemukan.');
    await this.verifyTunnelTenant(t.slug, tenantId);

    const synced = await this.syncTunnelPort(t);
    const wgStatus = synced.slug
      ? WireguardManager.getStatus(synced.slug)
      : { status: 'not_configured' as const };

    return { ...synced, wg_status: wgStatus };
  }

  static async setupTunnel(params: {
    license_key: string;
    subdomain_slug: string;
    local_port: number;
    app_name: string;
  }, tenantId?: string): Promise<any> {
    const { license_key, subdomain_slug, local_port, app_name } = params;

    // Verify tenant subdomain match
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subdomain: true }
      });
      if (tenant) {
        const tenantSubdomain = tenant.subdomain || undefined;
        if (subdomain_slug !== tenantSubdomain) {
          throw new Error('Akses ditolak. Subdomain harus sesuai dengan subdomain institusi Anda.');
        }
      }
    }

    // Cek duplikasi lisensi
    const existing = await prisma.easyTunnel.findFirst({
      where: { license_key: license_key.trim() }
    });
    if (existing) {
      throw new Error('License key ini sudah terdaftar di aplikasi.');
    }

    // 1. Ambil config dari server lisensi
    const tunnelData = await requestTunnelConfig({
      license_key: license_key.trim(),
      subdomain_slug: subdomain_slug.trim().toLowerCase(),
      local_port,
      app_name: app_name.trim(),
      hostname: os.hostname()
    });

    // 2. Tulis file konfigurasi WireGuard lokal
    const slug = tunnelData.subdomain.split('.')[0];
    WireguardManager.writeConfig(slug, tunnelData.config);

    // 3. Ambil detail tanggal kedaluwarsa
    let expiresAt: Date | null = null;
    try {
      const licInfo = await validateLicenseKey(license_key.trim());
      if (licInfo.expires_at) expiresAt = new Date(licInfo.expires_at);
    } catch {}

    // 4. Buat record di DB
    return await prisma.easyTunnel.create({
      data: {
        app_name: app_name.trim(),
        license_key: license_key.trim(),
        slug,
        local_port,
        status: 'inactive',
        expires_at: expiresAt
      }
    });
  }

  static async startTunnel(id: string, tenantId?: string): Promise<any> {
    const tunnel = await prisma.easyTunnel.findUnique({ where: { id } });
    if (!tunnel) throw new Error('Tunnel tidak ditemukan.');
    await this.verifyTunnelTenant(tunnel.slug, tenantId);

    // Validasi kedaluwarsa secara berkala ke server lisensi
    try {
      const remoteInfo = await validateLicenseKey(tunnel.license_key);
      if (remoteInfo.expired) {
        await prisma.easyTunnel.update({
          where: { id },
          data: { status: 'expired' }
        });
        throw new Error('Lisensi terowongan ini telah kedaluwarsa.');
      }
    } catch (e: any) {
      if (e.message && (e.message.toLowerCase().includes('kedaluwarsa') || e.message.toLowerCase().includes('expired'))) {
        await prisma.easyTunnel.update({
          where: { id },
          data: { status: 'expired' }
        });
        throw new Error('Lisensi terowongan ini telah kedaluwarsa.');
      }
    }

    if (!WireguardManager.isWireGuardInstalled()) {
      throw new Error('WireGuard belum terpasang di sistem ini.');
    }

    const res = await WireguardManager.startTunnel(tunnel.slug);
    await prisma.easyTunnel.update({
      where: { id },
      data: { status: 'active' }
    });

    return res;
  }

  static async stopTunnel(id: string, tenantId?: string): Promise<any> {
    const tunnel = await prisma.easyTunnel.findUnique({ where: { id } });
    if (!tunnel) throw new Error('Tunnel tidak ditemukan.');
    await this.verifyTunnelTenant(tunnel.slug, tenantId);

    const res = await WireguardManager.stopTunnel(tunnel.slug);
    await prisma.easyTunnel.update({
      where: { id },
      data: { status: 'inactive' }
    });

    return res;
  }

  static async removeTunnel(id: string, tenantId?: string): Promise<any> {
    const tunnel = await prisma.easyTunnel.findUnique({ where: { id } });
    if (!tunnel) throw new Error('Tunnel tidak ditemukan.');
    await this.verifyTunnelTenant(tunnel.slug, tenantId);

    // 1. Lepas lisensi di server pusat
    try {
      await releaseLicense(tunnel.license_key);
    } catch (releaseErr: any) {
      const msg = (releaseErr.message || '').toLowerCase();
      if (!msg.includes('tidak ditemukan') && !msg.includes('sudah dilepas')) {
        throw new Error(`Koneksi ke server pusat gagal (${releaseErr.message}). Penghapusan dibatalkan untuk menjaga status lisensi.`);
      }
    }

    // 2. Hapus layanan WireGuard
    await WireguardManager.removeTunnel(tunnel.slug);

    // 3. Hapus dari database
    return await prisma.easyTunnel.delete({ where: { id } });
  }

  static async editTunnel(id: string, localPort: number, appName: string, tenantId?: string): Promise<any> {
    const tunnel = await prisma.easyTunnel.findUnique({ where: { id } });
    if (!tunnel) throw new Error('Tunnel tidak ditemukan.');
    await this.verifyTunnelTenant(tunnel.slug, tenantId);

    // 1. Update ke server pusat
    await updateLicensePort(tunnel.license_key, localPort, appName);

    // 2. Simpan perubahan ke DB lokal
    return await prisma.easyTunnel.update({
      where: { id },
      data: {
        local_port: localPort,
        app_name: appName.trim()
      }
    });
  }

  static async forceRelease(licenseKey: string): Promise<any> {
    return await releaseLicense(licenseKey);
  }

  // ─── Custom Domain Methods ────────────────────────────────────────────────────

  /**
   * Daftarkan custom domain untuk tenant.
   * Flow: validasi format → cek konflik → kirim ke License Server (trigger Caddy sync)
   *       → update Tenant.custom_domain + status PENDING
   */
  static async setCustomDomain(tenantId: string, customDomain: string): Promise<any> {
    const domainClean = customDomain.trim().toLowerCase();

    // 1. Validasi format domain
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!domainRegex.test(domainClean)) {
      throw new Error('Format domain tidak valid. Contoh: absen.smkn1.sch.id');
    }

    // 2. Cek konflik dengan tenant lain di Absenta DB
    const conflict = await prisma.tenant.findFirst({
      where: { custom_domain: domainClean, id: { not: tenantId } }
    });
    if (conflict) {
      throw new Error('Domain ini sudah digunakan oleh institusi lain.');
    }

    // 3. Ambil data tenant saat ini
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subdomain: true, custom_domain: true, custom_domain_status: true }
    });
    if (!tenant) throw new Error('Tenant tidak ditemukan.');

    // UX Optimization: Jika domain sama dan sudah ACTIVE, tidak perlu di-reset
    if (tenant.custom_domain === domainClean && tenant.custom_domain_status === 'ACTIVE') {
      return {
        custom_domain: tenant.custom_domain,
        custom_domain_status: tenant.custom_domain_status,
        message: `Domain '${domainClean}' sudah aktif.`
      };
    }

    const tunnel = await prisma.easyTunnel.findFirst({
      where: { slug: tenant.subdomain || '' }
    });
    if (!tunnel) {
      throw new Error('Tunnel belum dikonfigurasi. Pasang lisensi Easy Tunnel terlebih dahulu sebelum mendaftarkan custom domain.');
    }

    // 4. Kirim ke License Server → update licenses.db + trigger Caddy sync
    await setLicenseCustomDomain(tunnel.license_key, domainClean);

    // 5. Cek verifikasi DNS secara instan (agar tidak perlu menunggu cron job)
    const isInstantVerified = await verifyCname(domainClean);
    const targetStatus = isInstantVerified ? 'ACTIVE' : 'PENDING';
    const verifiedAt = isInstantVerified ? new Date() : null;

    // 6. Update Tenant DB
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        custom_domain: domainClean,
        custom_domain_status: targetStatus,
        custom_domain_verified_at: verifiedAt
      }
    });

    const userMsg = isInstantVerified 
      ? `Domain '${domainClean}' berhasil didaftarkan dan langsung aktif! 🎉`
      : `Domain '${domainClean}' berhasil didaftarkan. Silakan tambahkan CNAME record di DNS Anda.`;

    return {
      custom_domain: updated.custom_domain,
      custom_domain_status: updated.custom_domain_status,
      message: userMsg
    };
  }

  /**
   * Hapus custom domain dari tenant.
   */
  static async removeCustomDomain(tenantId: string): Promise<any> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subdomain: true, custom_domain: true }
    });
    if (!tenant) throw new Error('Tenant tidak ditemukan.');
    if (!tenant.custom_domain) throw new Error('Tidak ada custom domain yang terdaftar.');

    const tunnel = await prisma.easyTunnel.findFirst({
      where: { slug: tenant.subdomain || '' }
    });

    // Hapus dari License Server jika ada tunnel
    if (tunnel) {
      try {
        await removeLicenseCustomDomain(tunnel.license_key);
      } catch (e: any) {
        console.warn('[EasyTunnel] Gagal hapus domain dari License Server:', e.message);
      }
    }

    // Clear dari Tenant DB
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        custom_domain: null,
        custom_domain_status: 'NONE',
        custom_domain_verified_at: null
      }
    });

    return { message: 'Custom domain berhasil dihapus.' };
  }

  /**
   * Ambil status custom domain tenant saat ini.
   */
  static async getCustomDomainStatus(tenantId: string): Promise<any> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        custom_domain: true,
        custom_domain_status: true,
        custom_domain_verified_at: true,
        subdomain: true
      }
    });
    if (!tenant) throw new Error('Tenant tidak ditemukan.');

    return {
      custom_domain: tenant.custom_domain,
      custom_domain_status: tenant.custom_domain_status || 'NONE',
      custom_domain_verified_at: tenant.custom_domain_verified_at,
      platform_subdomain: tenant.subdomain,
      platform_url: tenant.subdomain
        ? `${tenant.subdomain}.${process.env.EASY_TUNNEL_BASE_DOMAIN || 'absenta.id'}`
        : null
    };
  }
}

export const easyTunnelService = new EasyTunnelService();
