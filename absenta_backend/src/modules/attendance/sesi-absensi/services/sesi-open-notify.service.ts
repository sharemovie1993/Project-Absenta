import { prisma } from '../../../../utils/prisma';
import { appLogger } from '../../../../utils/app-logger';
import { whatsappService } from '../../../whatsapp/services/whatsapp.service';
import { getTenantTimezone } from '../../../../utils/timezone.utils';
import { PLATFORM_TIMEZONE } from '../../../../infra/jobEngine';

export interface KbmNotificationSetting {
  isEnabled: boolean;
  groupJid: string;
  groupSubject?: string;
  template?: string;
  isTagGuru?: boolean;
}

export const DEFAULT_KBM_TEMPLATE = `📸 *LOG KEHADIRAN KBM KELAS*

Saya {{tag_guru}} telah hadir dan membuka sesi pembelajaran.

🏫 *Kelas:* {{nama_kelas}} ({{ruangan}})
📚 *Mata Pelajaran:* {{nama_mapel}}
⏰ *Jam Pelajaran:* Jam ke-{{jam_ke}} ({{jam_jadwal}} WIB)
⏱️ *Status Waktu:* {{status_ketepatan}}
📖 *Materi:* {{topik_materi}}
👥 *Status Pengajar:* {{status_pengajar}}

_Sistem Presensi Terpadu Absenta_`;

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
          template: DEFAULT_KBM_TEMPLATE,
          isTagGuru: true,
        };
      }
      const parsed = JSON.parse(config.value as string);
      return {
        isEnabled: Boolean(parsed.isEnabled),
        groupJid: String(parsed.groupJid || '').trim(),
        groupSubject: String(parsed.groupSubject || '').trim(),
        template: String(parsed.template || DEFAULT_KBM_TEMPLATE).trim(),
        isTagGuru: Boolean(parsed.isTagGuru ?? true),
      };
    } catch {
      return {
        isEnabled: false,
        groupJid: '',
        groupSubject: '',
        template: DEFAULT_KBM_TEMPLATE,
        isTagGuru: true,
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
      isTagGuru: setting.isTagGuru !== undefined ? Boolean(setting.isTagGuru) : current.isTagGuru,
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

      // 1. Dapatkan detail guru, kelas, mapel, jadwal, unit, materi
      const effectiveGuruId = sesi.guru_pelaksana_id || sesi.guru_id;
      let namaGuru = 'Guru Pengajar';
      let namaKelas = '-';
      let namaMapel = '-';

      // Query paralel data pendukung akademik
      const [guruData, kelasData, mapelData, jadwalData, unitData, progresData, tz] = await Promise.all([
        effectiveGuruId
          ? prisma.guru.findUnique({
              where: { id: effectiveGuruId },
              select: {
                nama_guru: true,
                no_hp: true,
                User: { select: { no_hp: true } },
              },
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
              select: { nama_mapel: true, kode_mapel: true },
            }).catch(() => null)
          : null,
        sesi.jadwal_kbm_id
          ? prisma.jadwalKBM.findUnique({
              where: { id: sesi.jadwal_kbm_id },
              select: {
                slot_index: true,
                jam_mulai: true,
                jam_selesai: true,
                MasterRuangan: { select: { nama_ruangan: true } },
              },
            }).catch(() => null)
          : null,
        sesi.unit_pengajaran_id
          ? prisma.unitPengajaran.findUnique({
              where: { id: sesi.unit_pengajaran_id },
              select: { nama_unit: true },
            }).catch(() => null)
          : null,
        sesi.id
          ? prisma.progresMateri.findFirst({
              where: { sesi_id: sesi.id },
              select: { judul_materi: true },
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

      // Resolusi nomor WhatsApp guru untuk fitur tag/mention
      let rawPhone = guruData?.no_hp || guruData?.User?.no_hp || null;
      let cleanPhone: string | null = null;
      let teacherJid: string | null = null;

      if (rawPhone) {
        let digits = String(rawPhone).replace(/\D/g, '');
        if (digits.startsWith('0')) {
          digits = '62' + digits.slice(1);
        } else if (digits.startsWith('8')) {
          digits = '62' + digits;
        }
        if (digits.length >= 10) {
          cleanPhone = digits;
          teacherJid = `${digits}@s.whatsapp.net`;
        }
      }

      const isTagGuruActive = Boolean(setting.isTagGuru ?? true);

      // Format teks Guru:
      // Karena tidak semua anggota grup menyimpan nomor kontak guru di ponsel mereka,
      // selalu sertakan Nama Guru lengkap (*Nama Guru*) bersama tag/mention nomor HP (@nomor_hp).
      // Contoh hasil: *A. HIMAL MAULA, S.Pd.I.* (@6281909396234)
      const tagWithNama = cleanPhone && isTagGuruActive ? `*${namaGuru}* (@${cleanPhone})` : `*${namaGuru}*`;
      const tagOnly = cleanPhone && isTagGuruActive ? `@${cleanPhone}` : '';

      // Format waktu buka sesi lokal tenant
      const sessionTime = sesi.waktu_mulai ? new Date(sesi.waktu_mulai) : new Date();
      const waktuStr = sessionTime.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: tz || 'Asia/Jakarta',
      });

      // Resolusi Data Akademik untuk Supervisi Kurikulum & Kepala Sekolah
      const jamKe = jadwalData?.slot_index ? `${jadwalData.slot_index}` : (sesi.slot_kbm ? `${sesi.slot_kbm}` : '-');

      let jamJadwal = '-';
      if (jadwalData?.jam_mulai && jadwalData?.jam_selesai) {
        jamJadwal = `${jadwalData.jam_mulai} - ${jadwalData.jam_selesai}`;
      } else if (sesi.waktu_mulai && sesi.waktu_selesai) {
        const startStr = new Date(sesi.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tz || 'Asia/Jakarta' });
        const endStr = new Date(sesi.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tz || 'Asia/Jakarta' });
        jamJadwal = `${startStr} - ${endStr}`;
      }

      const ruangan = jadwalData?.MasterRuangan?.nama_ruangan || 'Ruang Kelas';
      const topikMateri = progresData?.judul_materi || unitData?.nama_unit || sesi.keterangan || '-';
      const isDelegasi = Boolean(sesi.is_delegasi || (sesi.guru_pelaksana_id && sesi.guru_id && sesi.guru_pelaksana_id !== sesi.guru_id));
      const statusPengajar = isDelegasi ? 'Guru Pengganti (Inval)' : 'Pengajar Resmi';

      // Hitung Ketepatan Waktu Guru
      let statusKetepatan = `🟢 Terverifikasi (Buka: ${waktuStr} WIB)`;
      if (jadwalData?.jam_mulai && jadwalData.jam_mulai.includes(':')) {
        const [schedH, schedM] = jadwalData.jam_mulai.split(':').map(Number);
        const openParts = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: tz || 'Asia/Jakarta',
        }).format(sessionTime).split(':').map(Number);

        const schedMinutes = schedH * 60 + schedM;
        const openMinutes = openParts[0] * 60 + openParts[1];
        const diffMinutes = openMinutes - schedMinutes;

        if (diffMinutes > 5) {
          statusKetepatan = `🟡 Terlambat ${diffMinutes} Menit (Buka: ${waktuStr} WIB)`;
        } else if (diffMinutes < -2) {
          statusKetepatan = `🟢 Hadir Lebih Awal (Buka: ${waktuStr} WIB)`;
        } else {
          statusKetepatan = `🟢 Tepat Waktu (Buka: ${waktuStr} WIB)`;
        }
      }

      // 2. Susun teks pesan
      let caption: string;
      const templateToUse = setting.template && setting.template.trim() ? setting.template : DEFAULT_KBM_TEMPLATE;

      if (templateToUse.includes('{{tag_guru}}') || templateToUse.includes('{{mention_guru}}')) {
        if (templateToUse.includes('{{nama_guru}}')) {
          caption = templateToUse
            .replace(/{{nama_guru}}/g, namaGuru)
            .replace(/{{tag_guru}}/g, tagOnly || `*${namaGuru}*`)
            .replace(/{{mention_guru}}/g, tagOnly || `*${namaGuru}*`)
            .replace(/\s*\(\s*\)/g, '');
        } else {
          // Template hanya memiliki {{tag_guru}}, sertakan Nama Lengkap + Mention Tag
          caption = templateToUse
            .replace(/{{tag_guru}}/g, tagWithNama)
            .replace(/{{mention_guru}}/g, tagWithNama);
        }
      } else if (isTagGuruActive && cleanPhone) {
        // Otomatis sertakan Nama Lengkap + Mention Tag jika opsi tag aktif
        caption = templateToUse
          .replace(/\*{{nama_guru}}\*/g, tagWithNama)
          .replace(/{{nama_guru}}/g, tagWithNama);
      } else {
        caption = templateToUse.replace(/{{nama_guru}}/g, namaGuru);
      }

      caption = caption
        .replace(/{{nama_kelas}}/g, namaKelas)
        .replace(/{{nama_mapel}}/g, namaMapel)
        .replace(/{{waktu}}/g, waktuStr)
        .replace(/{{jam_ke}}/g, jamKe)
        .replace(/{{jam_jadwal}}/g, jamJadwal)
        .replace(/{{status_ketepatan}}/g, statusKetepatan)
        .replace(/{{ruangan}}/g, ruangan)
        .replace(/{{topik_materi}}/g, topikMateri)
        .replace(/{{status_pengajar}}/g, statusPengajar);

      // Kumpulkan daftar mentions JID untuk Baileys
      const mentions: string[] = [];
      if (teacherJid && caption.includes(`@${cleanPhone}`)) {
        mentions.push(teacherJid);
      }
      const phoneMatches = caption.match(/@(\d{10,16})/g);
      if (phoneMatches) {
        for (const m of phoneMatches) {
          const num = m.replace('@', '');
          const jid = `${num}@s.whatsapp.net`;
          if (!mentions.includes(jid)) {
            mentions.push(jid);
          }
        }
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

      // Fallback: baca dari file storage (Local / S3 MinIO) jika rawFoto tidak berupa Base64
      if (!cleanBase64 && finalFotoUrl && typeof finalFotoUrl === 'string') {
        try {
          const { storageService } = await import('../../../../infra/storage/storage.service');
          const cleanKey = finalFotoUrl.replace(/^\/api\//, '').replace(/^\/+/, '');
          const buf = await storageService.readFileBuffer(cleanKey);
          if (buf && buf.length > 0) {
            cleanBase64 = buf.toString('base64');
          }
        } catch (e: any) {
          appLogger.warn(`[SesiOpenNotify] Gagal membaca buffer foto dari storage (${finalFotoUrl}): ${e.message}`);
        }
      }

      // 4. Kirim melalui WhatsApp Gateway
      if (cleanBase64) {
        await whatsappService.sendImage(
          tenantId,
          setting.groupJid,
          cleanBase64,
          caption,
          { mentions }
        );
        appLogger.info(`[SesiOpenNotify] Foto & Notifikasi kehadiran ${namaGuru} di kelas ${namaKelas} berhasil dikirim ke grup ${setting.groupJid} (mentions: ${mentions.length})`);
      } else {
        // Fallback teks jika buffer foto tidak dapat dibaca
        await whatsappService.sendTextMessage(
          tenantId,
          setting.groupJid,
          caption,
          { mentions }
        );
        appLogger.info(`[SesiOpenNotify] Notifikasi teks kehadiran ${namaGuru} di kelas ${namaKelas} berhasil dikirim ke grup ${setting.groupJid} (mentions: ${mentions.length})`);
      }
    } catch (error: any) {
      appLogger.warn(`[SesiOpenNotify] Gagal mengirim notifikasi buka sesi KBM: ${error.message}`);
    }
  }
}

export const sesiOpenNotifyService = SesiOpenNotifyService.getInstance();
