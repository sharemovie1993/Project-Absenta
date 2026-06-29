import { prisma } from '../../../utils/prisma';
import { WireguardManager } from '../../../services/wireguardManager';
import {
  validateLicenseKey,
  requestTunnelConfig,
  releaseLicense,
  updateLicensePort
} from '../../../services/licenseClient';
import os from 'os';

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

  static async getAllTunnels(): Promise<any[]> {
    const tunnels = await prisma.easyTunnel.findMany({
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

  static async getTunnelById(id: string): Promise<any> {
    const t = await prisma.easyTunnel.findUnique({ where: { id } });
    if (!t) throw new Error('Tunnel tidak ditemukan.');

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
  }): Promise<any> {
    const { license_key, subdomain_slug, local_port, app_name } = params;

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

  static async startTunnel(id: string): Promise<any> {
    const tunnel = await prisma.easyTunnel.findUnique({ where: { id } });
    if (!tunnel) throw new Error('Tunnel tidak ditemukan.');

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

  static async stopTunnel(id: string): Promise<any> {
    const tunnel = await prisma.easyTunnel.findUnique({ where: { id } });
    if (!tunnel) throw new Error('Tunnel tidak ditemukan.');

    const res = await WireguardManager.stopTunnel(tunnel.slug);
    await prisma.easyTunnel.update({
      where: { id },
      data: { status: 'inactive' }
    });

    return res;
  }

  static async removeTunnel(id: string): Promise<any> {
    const tunnel = await prisma.easyTunnel.findUnique({ where: { id } });
    if (!tunnel) throw new Error('Tunnel tidak ditemukan.');

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

  static async editTunnel(id: string, localPort: number, appName: string): Promise<any> {
    const tunnel = await prisma.easyTunnel.findUnique({ where: { id } });
    if (!tunnel) throw new Error('Tunnel tidak ditemukan.');

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
}
