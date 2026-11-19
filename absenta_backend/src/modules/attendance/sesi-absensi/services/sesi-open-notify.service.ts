import { prisma } from '../../../../utils/prisma';
import { appLogger } from '../../../../utils/app-logger';
import { whatsappService } from '../../../whatsapp/services/whatsapp.service';
import { getTenantTimezone } from '../../../../utils/timezone.utils';
import { PLATFORM_TIMEZONE } from '../../../../infra/jobEngine';
import fs from 'fs';
import path from 'path';

export interface KbmNotificationSetting {
  isEnabled: boolean;
  groupJid: string;
  groupSubject?: string;
  template?: string;
}

export class SesiOpenNotifyService {
  private static instance: SesiOpenNotifyService;

  public static getInstance(): SesiOpenNotifyService {
    if (!SesiOpenNotifyService.instance) {
      SesiOpenNotifyService.instance = new SesiOpenNotifyService();
    }
    return SesiOpenNotifyService.instance;
  }

  /**
   * Mengambil konfigurasi Notifikasi KBM WhatsApp per tenant dari tabel Config.
   */
  async getKbmNotificationConfig(tenantId: string): Promise<KbmNotificationSetting> {
    try {
      const config = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: 'kbm_wa_notification' },
      });
      if (!config?.value) {
        return {
          isEnabled: false,
          groupJid: '',
          groupSubject: '',
          template: 'Saya *{{nama_guru}}* Telah Hadir di Kelas *{{nama_kelas}}*',
        };
      }
      const parsed = JSON.parse(config.value as string);
      return {
        isEnabled: Boolean(parsed.isEnabled),
        groupJid: String(parsed.groupJid || '').trim(),
        groupSubject: String(parsed.groupSubject || '').trim(),
        template: String(parsed.template || 'Saya *{{nama_guru}}* Telah Hadir di Kelas *{{nama_kelas}}*').trim(),
      };
    } catch {
      return {
        isEnabled: false,
        groupJid: '',
        groupSubject: '',
        template: 'Saya *{{nama_guru}}* Telah Hadir di Kelas *{{nama_kelas}}*',
      };
    }
  }

  /**
   * Menyimpan konfigurasi Notifikasi KBM WhatsApp per tenant ke tabel Config.
   */
  async saveKbmNotificationConfig(tenantId: string, setting: Partial<KbmNotificationSetting>): Promise<void> {
    const current = await this.getKbmNotificationConfig(tenantId);
    const updated: KbmNotificationSetting = {
      isEnabled: setting.isEnabled !== undefined ? Boolean(setting.isEnabled) : current.isEnabled,
      groupJid: setting.groupJid !== undefined ? String(setting.groupJid).trim() : current.groupJid,
      groupSubject: setting.groupSubject !== undefined ? String(setting.groupSubject).trim() : current.groupSubject,
      template: setting.template !== undefined ? String(setting.template).trim() : current.template,
    };

    const value = JSON.stringify(updated);
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'kbm_wa_notification' },
    });

    if (existing) {
      await prisma.config.update({
        where: { id: existing.id },
        data: { value, description: 'Konfigurasi Notifikasi WhatsApp Buka Sesi KBM' },
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: 'kbm_wa_notification',
          value,
          description: 'Konfigurasi Notifikasi WhatsApp Buka Sesi KBM',
        },
      });
    }
  }

  /**
   * Kirim notifikasi WhatsApp otomatis saat sesi KBM dibuka dengan foto.
   * Dijalankan secara non-blocking di latar belakang.
   */
  async notifyKbmSessionOpened(
    tenantId: string,
    sesi: any,
    rawFoto: string | null | undefined,
    finalFotoUrl: string | null | undefined
  ): Promise<void> {
    try {
      if (!tenantId || !sesi) return;

      const setting = await this.getKbmNotificationConfig(tenantId);
      if (!setting.isEnabled || !setting.groupJid) {
        return;
      }

      // 1. Dapatkan detail guru, kelas, mapel
      const effectiveGuruId = sesi.guru_pelaksana_id || sesi.guru_id;
      let namaGuru = 'Guru Pengajar';
      let namaKelas = '-';
      let namaMapel = '-';

      // Query paralel data pendukung
      const [guruData, kelasData, mapelData, tz] = await Promise.all([
        effectiveGuruId
          ? prisma.guru.findUnique({
              where: { id: effectiveGuruId },
              select: { nama_guru: true },
            }).catch(() => null)
          : null,
        sesi.kelas_id
          ? prisma.kelas.findUnique({
              where: { id: sesi.kelas_id },
              select: { nama_kelas: true },
            }).catch(() => null)
          : null,
        sesi.mapel_id
          ? prisma.mapel.findUnique({
              where: { id: sesi.mapel_id },
              select: { nama_mapel: true },
            }).catch(() => null)
          : null,
        getTenantTimezone(tenantId).catch(() => PLATFORM_TIMEZONE),
      ]);

      if (guruData?.nama_guru) {
        namaGuru = guruData.nama_guru;
      }

      if (kelasData?.nama_kelas) {
        namaKelas = kelasData.nama_kelas;
      }

      if (mapelData?.nama_mapel) {
        namaMapel = mapelData.nama_mapel;
      }

      // Format waktu lokal tenant
      const sessionTime = sesi.waktu_mulai ? new Date(sesi.waktu_mulai) : new Date();
      const waktuStr = sessionTime.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: tz || 'Asia/Jakarta',
      });

      // 2. Susun teks pesan
      let caption: string;
      if (setting.template && setting.template.trim()) {
        caption = setting.template
          .replace(/{{nama_guru}}/g, namaGuru)
          .replace(/{{nama_kelas}}/g, namaKelas)
          .replace(/{{nama_mapel}}/g, namaMapel)
          .replace(/{{waktu}}/g, waktuStr);
      } else {
        caption = `Saya *${namaGuru}* Telah Hadir di Kelas *${namaKelas}*`;
        if (namaMapel && namaMapel !== '-') {
          caption += `\n\n📚 *Mata Pelajaran:* ${namaMapel}`;
        }
        caption += `\n⏰ *Waktu:* ${waktuStr} WIB`;
      }

      // 3. Resolusi Base64 Gambar Foto Kehadiran
      let cleanBase64: string | null = null;

      if (rawFoto && typeof rawFoto === 'string') {
        if (rawFoto.startsWith('data:image/')) {
          const commaIdx = rawFoto.indexOf(',');
          if (commaIdx !== -1) {
            cleanBase64 = rawFoto.substring(commaIdx + 1).trim();
          }
        } else if (!rawFoto.startsWith('http') && !rawFoto.startsWith('/')) {
          cleanBase64 = rawFoto.trim();
        }
      }

      // Fallback: baca dari file storage lokal jika rawFoto tidak tersedia tapi finalFotoUrl ada
      if (!cleanBase64 && finalFotoUrl && typeof finalFotoUrl === 'string') {
        try {
          const relativeKey = finalFotoUrl.replace(/^\/+/, '');
          const storageDir = process.env.STORAGE_LOCAL_DIR
            ? path.resolve(process.env.STORAGE_LOCAL_DIR)
            : path.resolve(process.cwd());
          const filePath = path.resolve(storageDir, relativeKey);
          if (fs.existsSync(filePath)) {
            const buf = fs.readFileSync(filePath);
            cleanBase64 = buf.toString('base64');
          }
        } catch (_) {}
      }

      // 4. Kirim melalui WhatsApp Gateway
      if (cleanBase64) {
        await whatsappService.sendImage(
          tenantId,
          setting.groupJid,
          cleanBase64,
          caption
        );
        appLogger.info(`[SesiOpenNotify] Foto & Notifikasi kehadiran ${namaGuru} di kelas ${namaKelas} berhasil dikirim ke grup ${setting.groupJid}`);
      } else {
        // Fallback teks jika buffer foto tidak dapat dibaca
        await whatsappService.sendTextMessage(
          tenantId,
          setting.groupJid,
          caption
        );
        appLogger.info(`[SesiOpenNotify] Notifikasi teks kehadiran ${namaGuru} di kelas ${namaKelas} berhasil dikirim ke grup ${setting.groupJid}`);
      }
    } catch (error: any) {
      appLogger.warn(`[SesiOpenNotify] Gagal mengirim notifikasi buka sesi KBM: ${error.message}`);
    }
  }
}

export const sesiOpenNotifyService = SesiOpenNotifyService.getInstance();
