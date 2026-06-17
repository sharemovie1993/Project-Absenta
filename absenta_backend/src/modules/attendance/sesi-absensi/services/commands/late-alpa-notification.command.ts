import { emitDomainEvent } from '@/infra/event-bus';
import { sesiDb } from '../repositories/sesi.db';

export async function handleLateOrAlpaNotification(params: {
  tenantId: string;
  sesiFull: any;
  siswa: any;
  updated: any;
  lateMinutes: number;
}): Promise<void> {
  const { tenantId, sesiFull, siswa, updated, lateMinutes } = params;
  const sesi: any = await sesiDb.sesiAbsensi.findFirst({
    where: { id: sesiFull.id, tenant_id: tenantId } as any,
    select: { waktu_mulai: true, Guru: { select: { user_id: true, no_hp: true } }, Kelas: { select: { nama_kelas: true } } } as any,
  } as any);

  try {
    if (updated.is_terlambat) {
      const teacherUserId = String(sesi?.Guru?.user_id || '').trim();
      const pref = await (sesiDb as any).notificationPreference.findFirst({ where: { tenant_id: tenantId, user_id: teacherUserId } });
      const thresholds = (pref?.thresholds_json as any) || { late: 5, no_tap: 5 };
      const channels = ((pref?.channels_json as any) || {}).ATTENDANCE || { in_app: true, email: false, wa: false };
      const enabledTypes = (pref?.enabled_types_json as any) || { ATTENDANCE: true };

      if (enabledTypes.ATTENDANCE && lateMinutes > Number(thresholds.late || 0)) {
        const subject = `Peringatan Keterlambatan ${siswa.Kelas?.nama_kelas || ''}`;
        const msg = `Siswa ${siswa.nama_siswa} terlambat ${lateMinutes} menit pada sesi ${siswa.Kelas?.nama_kelas || ''}.`;

        if (channels.email) {
          const user = await sesiDb.user.findFirst({ where: { tenant_id: tenantId, id: teacherUserId } as any, select: { email: true } as any });
          if (user?.email) {
            await emitDomainEvent({
              event_type: 'notification.email.send-requested',
              tenant_id: tenantId,
              source_service: 'attendance',
              payload: {
                to: user.email,
                subject,
                html: `<p>${msg}</p>`,
                tenantId,
                relatedId: String(updated?.id || ''),
              },
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Notification handling failed', e);
  }
}
