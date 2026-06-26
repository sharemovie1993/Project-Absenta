import { notifyDb as prisma } from '../services/repositories/notify.db';
import { RoleName } from '../../../../constants/enums';
import { authorizationService } from '../../../auth/services/authorization.service';
import { emitDomainEvent } from '@/infra/event-bus';

export async function buildAttendanceFeed(tenantId: string, userId: string, roleName: string | undefined, params: { tanggal?: string; kelas_id?: string; guru_id?: string; siswa_id?: string }) {
  if (!tenantId) {
    throw new Error('Unauthorized: tenant_id not found');
  }
  const { tanggal, kelas_id, guru_id, siswa_id } = params || {};

  let dateFilter: { gte: Date; lte: Date } | undefined;
  const tzConfig = await prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'TIMEZONE' } });
  const timeZone = tzConfig?.value || 'Asia/Jakarta';
  const TZ_OFFSET: Record<string, number> = { 'Asia/Jakarta': 7, 'Asia/Makassar': 8, 'Asia/Jayapura': 9 };
  const offset = TZ_OFFSET[timeZone] ?? 7;

  const dayStr = tanggal || new Date().toISOString().split('T')[0];
  const start = new Date(new Date(`${dayStr}T00:00:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
  const end = new Date(new Date(`${dayStr}T23:59:59.999Z`).getTime() - (offset * 60 * 60 * 1000));
  dateFilter = { gte: start, lte: end };

  let kelasFilter = kelas_id as string | undefined;
  let guruFilter: string | undefined = guru_id as string | undefined;
  let siswaFilter: string | undefined = siswa_id as string | undefined;

  if (roleName === RoleName.SISWA) {
    const siswa = await prisma.siswa.findFirst({ where: { tenant_id: tenantId, user_id: userId }, select: { id: true, kelas_id: true } });
    if (!siswa) { throw new Error('Forbidden: siswa profile not found'); }
    const now = new Date();
    const petugas = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        is_active: true,
        ...(kelasFilter ? { kelas_id: kelasFilter } : {}),
        AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
        Position: { code: 'PETUGAS_KELAS' },
      },
      select: { id: true },
    });
    const isPetugas = Boolean(petugas?.id);
    kelasFilter = kelasFilter || siswa.kelas_id || undefined;
    if (isPetugas) {
      if (siswaFilter && String(siswaFilter) !== String(siswa.id)) {
        siswaFilter = siswa.id;
      }
    } else {
      siswaFilter = siswa.id;
    }
  } else if (roleName === RoleName.GURU) {
    const guru = await prisma.guru.findFirst({ where: { tenant_id: tenantId, user_id: userId }, select: { id: true } });
    if (!guru) { throw new Error('Forbidden: guru profile not found'); }

    const canView = await authorizationService.hasUserPermission(userId, 'attendance.reports.view');
    const canScan = await authorizationService.hasUserPermission(userId, 'attendance.gate.tap.entry');
    const isPetugas = canView || canScan;

    if (isPetugas) {
      // If Petugas, respect the requested filters (e.g. kelas_id)
      // If no filters provided, maybe default to something? 
      // For now, if they provide kelas_id, we use it. 
      // We do NOT enforce guruFilter = guru.id here, so they can see other teachers' sessions.
      if (!guruFilter && !kelasFilter) {
          // If no filter at all, maybe fallback to their own sessions to avoid spam?
          // But if they want to see all, they might need to send specific params.
          // For safety/default behavior, if NO params, show own sessions.
          guruFilter = guru.id;
      }
    } else {
      // Regular Guru: Restricted to own sessions
      guruFilter = guruFilter || guru.id;
      kelasFilter = undefined; // Regular guru sees their sessions across all classes, or specific class if they teach it? 
      // Actually existing logic wiped kelasFilter. Let's keep it restrictive for regular guru.
      if (guruFilter !== guru.id) {
         // If they tried to filter by another guru, block it? 
         // For now, just enforce own ID.
         guruFilter = guru.id;
      }
    }
  }

  const sessions = await prisma.sesiAbsensi.findMany({
    where: {
      tenant_id: tenantId,
      tanggal: dateFilter,
      ...(kelasFilter && { kelas_id: kelasFilter }),
      ...(guruFilter && { guru_id: guruFilter }),
      ...(siswaFilter && { 
        AbsenSiswa: { 
          some: { 
            SiswaAkademik: { is: { siswa_id: siswaFilter } }
          } 
        } 
      }),
    },
    select: { id: true, jenis_kegiatan: true, status: true, waktu_mulai: true, waktu_selesai: true, kelas_id: true, Kelas: { select: { nama_kelas: true } }, Guru: { select: { nama_guru: true } } },
    orderBy: { waktu_mulai: 'asc' }
  });

  const ids = sessions.map(s => s.id);
  const grouped = ids.length ? await prisma.absenSiswa.groupBy({ by: ['sesi_id', 'status'], where: { tenant_id: tenantId, sesi_id: { in: ids } }, _count: { _all: true } }) : [];
  const countsBySession: Record<string, any> = {};
  for (const g of grouped as any[]) {
    const sid = String(g.sesi_id); const st = String(g.status || '').toUpperCase(); const c = g._count?._all || g._count || 0;
    if (!countsBySession[sid]) countsBySession[sid] = { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
    if (countsBySession[sid][st] !== undefined) countsBySession[sid][st] = Number(c) || 0;
  }

  const feed = sessions.map((s: any) => ({
    id: s.id,
    type: 'ATTENDANCE_SESSION',
    title: `${s.jenis_kegiatan || 'Sesi'} - ${s.Kelas?.nama_kelas || s.kelas_id}`,
    message: `Status: ${s.status || 'DRAFT'} | Mulai ${s.waktu_mulai?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
    status: s.status,
    kelas: s.Kelas?.nama_kelas || s.kelas_id,
    guru: s.Guru?.nama_guru || '',
    counts: countsBySession[String(s.id)] || { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0 },
    waktu_mulai: s.waktu_mulai,
    waktu_selesai: s.waktu_selesai,
  }));

  return feed;
}

export const attendanceNotifyController = {
  async sessionCreated(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const userId = request.user?.id ?? request.user?.userId ?? request.user?.user_id;
      const { sesi_id, channel, guru_id, message } = request.body || {};

      if (!tenantId || !userId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id or user_id not found' };
      }

      if (!sesi_id || !channel || !guru_id) {
        reply.status(400);
        return { success: false, message: 'sesi_id, channel, and guru_id are required' };
      }

      if (!['WA', 'PUSH'].includes(channel)) {
        reply.status(400);
        return { success: false, message: 'Invalid channel. Allowed: WA, PUSH' };
      }

      const sesi = await prisma.sesiAbsensi.findFirst({
        where: { id: sesi_id, tenant_id: tenantId },
        select: { id: true, jenis_kegiatan: true, waktu_mulai: true, waktu_selesai: true, Kelas: { select: { nama_kelas: true } }, Guru: { select: { nama_guru: true } } }
      });
      const guru = await prisma.guru.findFirst({
        where: { id: guru_id, tenant_id: tenantId },
        select: { id: true, nama_guru: true, no_hp: true, user_id: true }
      });

      if (!sesi) {
        reply.status(404);
        return { success: false, message: 'Sesi tidak ditemukan' };
      }

      if (!guru) {
        reply.status(404);
        return { success: false, message: 'Guru tidak ditemukan' };
      }

      const startStr = sesi.waktu_mulai ? new Date(sesi.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
      const endStr = sesi.waktu_selesai ? new Date(sesi.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';

      const defaultMsg = `🔔 *Sesi Aktif*\n\nAda sesi aktif untuk Anda:\n\n📚 ${sesi.jenis_kegiatan}\n🏫 ${sesi.Kelas?.nama_kelas || '-'}\n🕒 ${startStr} - ${endStr}`;
      const finalMessage = (message && String(message).trim().length > 0) ? message : defaultMsg;

      let success = false;
      let resultInfo: any = {};

      if (channel === 'WA') {
        if (!guru.no_hp) {
          reply.status(400);
          return { success: false, message: 'Nomor WhatsApp guru tidak tersedia' };
        }
        let formattedPhone = String(guru.no_hp || '').trim();
        if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
        await emitDomainEvent({
          event_type: 'notification.whatsapp.send-requested',
          tenant_id: tenantId,
          source_service: 'attendance',
          payload: {
            phoneNumber: formattedPhone,
            message: finalMessage,
            tenantId,
            relatedId: sesi.id,
            subject: 'Jadwal Mengajar Baru',
            event: 'SESSION_CREATED',
          },
        });
        success = true;
        resultInfo = { recipient: formattedPhone };
      } else if (channel === 'PUSH') {
        await prisma.notificationLog.create({
          data: {
            tenant_id: tenantId,
            type: 'ATTENDANCE',
            recipient: guru.user_id || guru.id,
            subject: 'Jadwal Mengajar Baru',
            message: finalMessage,
            status: 'SENT',
            related_id: sesi.id,
            event: 'SESSION_CREATED'
          }
        });
        resultInfo = { recipient: guru.user_id || guru.id };
        success = true;
      }

      reply.status(success ? 200 : 500);
      return {
        success,
        message: success ? 'Notifikasi diproses' : 'Gagal mengirim notifikasi',
        data: { sesi_id, channel, guru_id, requested_by: userId, ...resultInfo }
      };
    } catch (error) {
      console.error('Notify session created error:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async feed(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const userId = request.user?.id ?? request.user?.userId ?? request.user?.user_id;
      const roleName = request.user?.roleName || request.user?.Role?.name || request.user?.role?.name;
      const { tanggal, kelas_id, guru_id, siswa_id } = request.query || {};
      try {
        const feed = await buildAttendanceFeed(String(tenantId), String(userId), roleName, { tanggal, kelas_id, guru_id, siswa_id });
        reply.status(200);
        return { success: true, message: 'Attendance feed', data: feed };
      } catch (e: any) {
        const msg = e?.message || 'Internal error building feed';
        if (msg.startsWith('Unauthorized')) { reply.status(401); }
        else if (msg.startsWith('Forbidden')) { reply.status(403); }
        else { reply.status(500); }
        return { success: false, message: msg };
      }
    } catch (error) {
      console.error('Attendance feed error:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },
};
