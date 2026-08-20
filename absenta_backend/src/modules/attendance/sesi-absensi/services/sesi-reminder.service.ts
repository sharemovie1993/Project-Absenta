import { prisma } from '@/utils/prisma';
import { getRedisConnection } from '@/queue/redis';
import { getTenantTimezone, getTimezoneLabel, formatTenantTime } from '@/utils/timezone.utils';
import { waGatewayService } from '@/services/wa-gateway.service';
import { SesiLifecycleService } from './sesi-lifecycle.service';

export interface SendKbmReminderPayload {
  method: 'GATEWAY' | 'PERSONAL_LINK';
  senderRole: 'PIKET' | 'KEPALA_SEKOLAH' | 'KURIKULUM' | string;
  senderName?: string;
}

export class SesiReminderService {
  private static instance: SesiReminderService;

  public static getInstance(): SesiReminderService {
    if (!SesiReminderService.instance) {
      SesiReminderService.instance = new SesiReminderService();
    }
    return SesiReminderService.instance;
  }

  /**
   * 📲 Kirim Pengingat WhatsApp KBM (Gateway / Personal) dengan Cooldown Anti-Spam
   */
  async sendReminder(tenantId: string, sesiId: string, payload: SendKbmReminderPayload) {
    const tz = await getTenantTimezone(tenantId);
    const tzLabel = getTimezoneLabel(tz);

    // 1. Ambil detail sesi dari SesiLifecycleService
    const lifecycleRes = await SesiLifecycleService.getInstance().list(
      tenantId,
      {},
      { id: sesiId, limit: 1, summary: true, include_scheduled: true }
    );

    const session = lifecycleRes.data?.[0];
    if (!session) {
      throw new Error('Sesi KBM tidak ditemukan');
    }

    // 2. Periksa Status Sesi (Hanya sesi yang belum buka/belum masuk yang bisa diingatkan)
    if (session.isLive) {
      throw new Error('Guru sudah membuka sesi KBM di kelas ini.');
    }
    if (session.isFinished) {
      throw new Error('Sesi KBM ini sudah selesai.');
    }

    // 3. Periksa Cooldown via Redis
    const redis = getRedisConnection();
    const redisKey = `kbm:reminder:${tenantId}:${sesiId}`;
    let previousReminder: Record<string, string> | null = null;

    if (redis) {
      try {
        previousReminder = await redis.hgetall(redisKey);
      } catch (err: any) {
        console.warn('[SesiReminderService] Redis hgetall error:', err.message);
      }
    }

    if (previousReminder && previousReminder.last_wa_sent_at) {
      const lastSentMs = new Date(previousReminder.last_wa_sent_at).getTime();
      const diffMinutes = Math.floor((Date.now() - lastSentMs) / 60000);
      const COOLDOWN_MINUTES = 10;

      // Cooldown 10 menit untuk Meja Piket & Kurikulum (Kepala Sekolah memiliki hak bypass eskalasi)
      if (diffMinutes < COOLDOWN_MINUTES && payload.senderRole !== 'KEPALA_SEKOLAH') {
        const remaining = COOLDOWN_MINUTES - diffMinutes;
        throw new Error(
          `Pengingat baru saja dikirim ${diffMinutes} menit yang lalu oleh ${previousReminder.last_wa_sent_by || 'Meja Piket'}. Mohon tunggu jeda ${remaining} menit lagi untuk menghindari spam.`
        );
      }
    }

    // 4. Resolusi Data Guru & Nomor HP
    const namaGuru = session.guru_nama || session.Guru?.nama_guru || 'Bapak/Ibu Guru';
    const kelasNama = session.kelas_nama || session.Kelas?.nama_kelas || 'Kelas';
    const mapelNama = session.mapel_nama || session.Mapel?.nama_mapel || session.jenis_kegiatan || 'Mata Pelajaran';
    const jamMulai = session.jam_mulai || '--:--';
    const jamSelesai = session.jam_selesai || '--:--';

    let targetPhone = session.guru_no_hp || session.Guru?.no_hp || (session.Guru?.User as any)?.no_hp;
    if (!targetPhone && session.guru_id) {
      const guruDb = await prisma.guru.findUnique({
        where: { id: session.guru_id },
        select: { no_hp: true, user_id: true }
      });
      if (guruDb?.no_hp) {
        targetPhone = guruDb.no_hp;
      } else if (guruDb?.user_id) {
        const userDb = await prisma.user.findUnique({
          where: { id: guruDb.user_id },
          select: { no_hp: true }
        });
        targetPhone = userDb?.no_hp || null;
      }
    }

    const senderTitle = payload.senderRole === 'KEPALA_SEKOLAH'
      ? 'Kepala Sekolah'
      : payload.senderRole === 'KURIKULUM'
      ? 'Waka Kurikulum'
      : 'Meja Piket';

    const messageText = 
      `Yth. Bapak/Ibu *${namaGuru}*,\n\n` +
      `Jadwal KBM Anda di kelas *${kelasNama}* (*${mapelNama}*) pukul *${jamMulai} – ${jamSelesai} ${tzLabel}* saat ini telah siap dimulai.\n\n` +
      `Mohon untuk segera hadir di kelas, membuka sesi, dan mengambil foto presensi KBM di aplikasi Absenta guna menghindari akumulasi keterlambatan mengajar.\n\n` +
      `Terima kasih.\n` +
      `— *${senderTitle}* Absenta`;

    // 5. Eksekusi Pengiriman WA jika metode GATEWAY
    if (payload.method === 'GATEWAY') {
      if (!targetPhone) {
        throw new Error(`Nomor WhatsApp Bapak/Ibu ${namaGuru} belum terdaftar di sistem sekolah.`);
      }
      const sent = await waGatewayService.sendMessage(tenantId, targetPhone, messageText);
      if (!sent) {
        console.warn(`[SesiReminderService] Gateway returned false for ${targetPhone}, message queued.`);
      }
    }

    // 6. Simpan Status Reminder ke Redis & Siapkan Metadata
    const currentSentCount = parseInt(previousReminder?.wa_sent_count || '0', 10) + 1;
    const nowIso = new Date().toISOString();
    const reminderMeta = {
      last_wa_sent_at: nowIso,
      last_wa_sent_by: payload.senderName || senderTitle,
      last_wa_method: payload.method,
      wa_sent_count: String(currentSentCount),
      formatted_time: formatTenantTime(new Date(), tz, true)
    };

    if (redis) {
      try {
        await redis.hset(redisKey, reminderMeta);
        await redis.expire(redisKey, 86400); // Expire 24 jam
        // Broadcast event ke Redis Pub/Sub untuk pembaruan instan seluruh browser
        await redis.publish(
          'events:sesi_reminder_updated',
          JSON.stringify({
            tenant_id: tenantId,
            sesi_id: sesiId,
            reminder_meta: reminderMeta
          })
        );
      } catch (err: any) {
        console.warn('[SesiReminderService] Redis save/publish error:', err.message);
      }
    }

    // 7. Format Deep-Link Personal wa.me
    let cleanPhone = (targetPhone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const personalWaLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}` : null;

    return {
      success: true,
      sesi_id: sesiId,
      target_phone: targetPhone,
      method: payload.method,
      reminder_meta: reminderMeta,
      personal_wa_link: personalWaLink,
      message_text: messageText,
    };
  }

  /**
   * ⚡ Batch Ambil Status Reminder untuk Daftar Sesi dari Redis
   */
  async getBatchReminderMeta(tenantId: string, sessionIds: string[]): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    if (!sessionIds || sessionIds.length === 0) return map;

    const redis = getRedisConnection();
    if (!redis) return map;

    try {
      const pipeline = redis.pipeline();
      sessionIds.forEach(id => {
        pipeline.hgetall(`kbm:reminder:${tenantId}:${id}`);
      });
      const results = await pipeline.exec();
      if (Array.isArray(results)) {
        results.forEach(([err, data], idx) => {
          if (!err && data && typeof data === 'object' && Object.keys(data).length > 0) {
            map.set(sessionIds[idx], data);
          }
        });
      }
    } catch (e: any) {
      console.warn('[SesiReminderService] getBatchReminderMeta error:', e.message);
    }
    return map;
  }
}

export const sesiReminderService = SesiReminderService.getInstance();
