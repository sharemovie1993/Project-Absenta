import { defineCronJob } from '../infra/jobEngine';
import { prisma } from '../utils/prisma';
import { WireguardManager } from '../services/wireguardManager';

export default defineCronJob({
  name: 'easyTunnelAutoHealing',
  schedule: '* * * * *', // Setiap 1 menit
  async run() {
    try {
      const activeTunnels = await prisma.easyTunnel.findMany({
        where: {
          status: 'active'
        }
      });

      if (!activeTunnels || activeTunnels.length === 0) return;

      for (const tunnel of activeTunnels) {
        try {
          const wgStatus = WireguardManager.getStatus(tunnel.slug);

          // Jika status terdeteksi disconnected atau error, lakukan auto-healing reconnection
          if (wgStatus.status === 'disconnected' || wgStatus.status === 'error') {
            console.warn(`[EasyTunnel-AutoHealing] ⚠️ Terowongan "${tunnel.slug}" terdeteksi ${wgStatus.status}. Memulai rekoneksi otomatis...`);
            
            // Reconnect tunnel
            await WireguardManager.startTunnel(tunnel.slug);
            console.log(`[EasyTunnel-AutoHealing] ✅ Terowongan "${tunnel.slug}" berhasil dipulihkan & terhubung kembali.`);
          }
        } catch (err: any) {
          console.error(`[EasyTunnel-AutoHealing] Gagal memulihkan terowongan "${tunnel.slug}":`, err.message);
        }
      }
    } catch (globalErr: any) {
      console.error('[EasyTunnel-AutoHealing] Global Error:', globalErr.message);
    }
  }
});
