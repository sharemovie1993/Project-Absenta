import { emitDomainEvent } from '@/infra/event-bus';
import { sesiDb } from '../repositories/sesi.db';

export async function sendGuruNotification(params: {
  tenantId: string;
  guruId: string;
  kelasId: string;
  mapelId?: string;
  tgl: Date;
  mulai: Date;
  sesiId: string;
}): Promise<void> {
  const { tenantId, guruId, kelasId, mapelId, tgl, mulai, sesiId } = params;

  try {
    const guruInfo: any = await sesiDb.guru.findUnique({ where: { id: guruId } as any, select: { nama_guru: true, no_hp: true } as any } as any);
    const rawHp = String(guruInfo?.no_hp || '').trim();
    if (rawHp) {
      const kelasInfo = await sesiDb.kelas.findUnique({ where: { id: kelasId } as any, select: { nama_kelas: true } as any });
      const mapelInfo = mapelId ? await sesiDb.mapel.findUnique({ where: { id: mapelId } as any, select: { nama_mapel: true } as any }) : null;

      const mapelName = mapelInfo?.nama_mapel || '-';
      const kelasName = kelasInfo?.nama_kelas || '-';
      const startTime = mulai.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      const message = `Halo ${guruInfo.nama_guru},\n\nSesi mengajar baru telah dijadwalkan:\n\n📅 Tanggal: ${tgl.toLocaleDateString('id-ID')}\n⏰ Waktu: ${startTime}\n🏫 Kelas: ${kelasName}\n📚 Mapel: ${mapelName}\n\nMohon bersiap untuk mengajar.`;

      let formattedHp = rawHp;
      if (formattedHp.startsWith('0')) formattedHp = '62' + formattedHp.slice(1);

      await emitDomainEvent({
        event_type: 'notification.whatsapp.send-requested',
        tenant_id: tenantId,
        source_service: 'attendance',
        payload: {
          phoneNumber: formattedHp,
          message,
          tenantId,
          relatedId: sesiId,
          event: 'ATTENDANCE_SESSION_CREATED',
        },
      });
    }
  } catch (err) {
    console.error('Failed to send WA notification to Guru:', err);
  }
}
