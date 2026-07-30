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
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async connectLocal(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      await waGatewayService.initTenant(tenant_id);
      return reply.send({ success: true, message: 'Menghubungkan ke WhatsApp...' });
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
      const health = waGatewayService.getHealthStatus(tenant_id);
      return reply.send({ success: true, data: health });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getLocalQR(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      const qr = waGatewayService.getQRBase64(tenant_id);
      return reply.send({ success: true, qr });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getGroups(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      const groups = await waGatewayService.getParticipatingGroups(tenant_id);
      return reply.send({ success: true, data: groups });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message || 'Gagal mengambil daftar grup WA' });
    }
  }
}

