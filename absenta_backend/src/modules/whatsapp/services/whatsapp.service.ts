import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Normalisasi nomor HP ke format internasional Indonesia (628xxx).
 * Mendukung format input: "08xxx", "628xxx", "+628xxx", "8xxx".
 * Dibutuhkan agar pesan WA terkirim ke format JID yang benar.
 */
function normalizeToWaNumber(phone: string): string {
  if (!phone) return phone;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '62' + digits.substring(1);
  } else if (!digits.startsWith('62')) {
    digits = '62' + digits;
  }
  return digits;
}

export class WhatsappService {
  async getConfig(tenantId: string) {
    return prisma.whatsappConfig.findUnique({
      where: { tenant_id: tenantId }
    });
  }

  async saveConfig(tenantId: string, data: any) {
    return prisma.whatsappConfig.upsert({
      where: { tenant_id: tenantId },
      create: {
        ...data,
        tenant_id: tenantId
      },
      update: data
    });
  }

  async testConnection(tenantId: string, testNumber: string) {
    const config = await this.getConfig(tenantId);
    if (!config || !config.is_active) {
      throw new Error('WhatsApp configuration not found or inactive');
    }

    return this.sendMessage(config, testNumber, 'Tes koneksi WhatsApp dari Absenta. Jika Anda menerima pesan ini, konfigurasi Anda sudah benar.');
  }

  async sendMessage(config: any, to: string, message: string) {
    const normalizedTo = normalizeToWaNumber(to);

    if (config.provider_name === 'LOCAL') {
      const { waGatewayService } = await import('../../../services/wa-gateway.service');
      return waGatewayService.sendMessage(config.tenant_id, normalizedTo, message);
    }

    if (!config.api_url || !config.api_token) {
      throw new Error('API URL or Token missing');
    }

    try {
      // Logic for different providers (Fonnte is default)
      if (config.provider_name === 'FONNTE') {
        const response = await axios.post(config.api_url, {
          target: normalizedTo,
          message: message,
          delay: '2',
          countryCode: '62', // Default Indonesia
        }, {
          headers: {
            'Authorization': config.api_token
          }
        });
        return response.data;
      }
      
      // Generic Custom Provider (Standard POST)
      const response = await axios.post(config.api_url, {
        to: normalizedTo,
        message: message
      }, {
        headers: {
          'Authorization': `Bearer ${config.api_token}`,
          'X-API-KEY': config.api_token
        }
      });
      
      return response.data;
    } catch (error: any) {
      console.error('WhatsApp Send Error:', error.response?.data || error.message);
      throw new Error(`Gagal mengirim pesan: ${error.response?.data?.message || error.message}`);
    }
  }

  async sendAttendanceNotification(tenantId: string, studentName: string, time: string, type: 'MASUK' | 'PULANG', parentNumber: string) {
    const config = await this.getConfig(tenantId);
    if (!config || !config.is_active) return;

    let template = type === 'MASUK' ? config.template_absen_masuk : config.template_absen_pulang;
    if (!template) return;

    const message = template
      .replace(/{{nama_siswa}}/g, studentName)
      .replace(/{{waktu}}/g, time)
      .replace(/{{tipe}}/g, type === 'MASUK' ? 'Masuk' : 'Pulang');

    return this.sendMessage(config, parentNumber, message);
  }
}
