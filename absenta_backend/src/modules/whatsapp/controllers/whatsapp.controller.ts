import { WhatsappService } from '../services/whatsapp.service';
import { waGatewayService } from '../../../services/wa-gateway.service';

const whatsappService = new WhatsappService();

export class WhatsappController {
  async getConfig(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      const config = await whatsappService.getConfig(tenant_id);
      return reply.send({ success: true, data: config });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async saveConfig(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    const body = request.body as any;
    try {
      const config = await whatsappService.saveConfig(tenant_id, body);
      return reply.send({ success: true, message: 'Konfigurasi berhasil disimpan', data: config });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async testConnection(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    const { test_number } = request.body as any;
    
    if (!test_number) {
      return reply.status(400).send({ success: false, message: 'Nomor tes wajib diisi' });
    }

    try {
      const result = await whatsappService.testConnection(tenant_id, test_number);
      return reply.send({ success: true, message: 'Pesan tes berhasil dikirim', data: result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message || 'Gagal mengirim pesan tes WA' });
    }
  }

  async connectLocal(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      await waGatewayService.initTenant(tenant_id);

      // Wait up to 3 seconds for QR code generation
      let qr = await waGatewayService.getQRBase64(tenant_id);
      if (!qr) {
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 500));
          qr = await waGatewayService.getQRBase64(tenant_id);
          if (qr) break;
        }
      }

      const health = await waGatewayService.getHealthStatus(tenant_id);
      return reply.send({ success: true, message: 'Menghubungkan ke WhatsApp...', qr, data: health });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async disconnectLocal(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      await waGatewayService.disconnectTenant(tenant_id);
      return reply.send({ success: true, message: 'Koneksi WhatsApp terputus' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getLocalStatus(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      // Gunakan getHealthStatus untuk verifikasi kualitas koneksi yang sebenarnya
      const health = await waGatewayService.getHealthStatus(tenant_id);
      return reply.send({ success: true, data: health });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getLocalQR(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      let qr = await waGatewayService.getQRBase64(tenant_id);
      if (!qr) {
        await waGatewayService.initTenant(tenant_id);
        for (let i = 0; i < 4; i++) {
          await new Promise(r => setTimeout(r, 500));
          qr = await waGatewayService.getQRBase64(tenant_id);
          if (qr) break;
        }
      }
      return reply.send({ success: true, qr });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getGroups(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    // ?refresh=true → paksa bypass cache dan fetch ulang dari WA server
    const forceRefresh = (request.query as any)?.refresh === 'true';
    try {
      const groups = await waGatewayService.getParticipatingGroups(tenant_id, forceRefresh);
      return reply.send({ success: true, data: groups, cached: !forceRefresh });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message || 'Gagal mengambil daftar grup WA' });
    }
  }

  async invalidateGroupsCache(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      await waGatewayService.invalidateGroupsCache(tenant_id);
      return reply.send({ success: true, message: 'Cache daftar grup WA berhasil dihapus' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}

