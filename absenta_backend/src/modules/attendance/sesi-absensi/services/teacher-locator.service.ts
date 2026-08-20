import { prisma } from '../../../../utils/prisma';
import { appLogger } from '../../../../utils/app-logger';
import { SesiLifecycleService } from './sesi-lifecycle.service';
import { getTenantTimezone } from '../../../../utils/timezone.utils';
import { getTenantLocalTime } from '@/jobs/attendanceAutoSession.job';

export interface TeacherPositionInfo {
  guru_id: string;
  nama_guru: string;
  nip: string | null;
  foto_url: string | null;
  no_hp: string | null;
  status_posisi: 'SEDANG_MENGAJAR' | 'BELUM_BUKA_KELAS' | 'STANDBY' | 'IZIN_SAKIT';
  status_label: string;
  current_session: {
    id?: string;
    kelas_id?: string;
    kelas_nama?: string;
    mapel_id?: string;
    mapel_nama?: string;
    jam_mulai?: string;
    jam_selesai?: string;
    status?: string;
    is_live?: boolean;
    foto_kegiatan?: string | null;
  } | null;
  today_timeline: Array<{
    id: string;
    kelas_id: string;
    kelas_nama: string;
    mapel_id: string;
    mapel_nama: string;
    jam_mulai: string;
    jam_selesai: string;
    status: string;
    is_live: boolean;
    is_ready: boolean;
    is_overdue: boolean;
    is_finished: boolean;
  }>;
  izin_today?: {
    jenis: string;
    catatan?: string | null;
  } | null;
}

export class TeacherLocatorService {
  private static instance: TeacherLocatorService;

  public static getInstance(): TeacherLocatorService {
    if (!TeacherLocatorService.instance) {
      TeacherLocatorService.instance = new TeacherLocatorService();
    }
    return TeacherLocatorService.instance;
  }

  /**
   * Locate real-time position of teachers for a tenant.
   * Leverages SesiLifecycleService.getInstance().list() for 100% DRY compliance.
   */
  public async locateTeachers(
    tenantId: string,
    userRole: string,
    options: { query?: string; tanggal?: string } = {}
  ): Promise<TeacherPositionInfo[]> {
    try {
      const tz = await getTenantTimezone(tenantId);
      const targetDate = options.tanggal || getTenantLocalTime(tz, new Date()).dateStr;
      const isStudent = (userRole || '').toUpperCase() === 'SISWA';

      // 1. Ambil seluruh sesi KBM terpadu hari ini via SesiLifecycleService
      const sessionResult = await SesiLifecycleService.getInstance().list(
        tenantId,
        {},
        {
          tanggal: targetDate,
          include_scheduled: true,
          summary: true,
          limit: 1000
        }
      );

      const allSessions: any[] = sessionResult.data || [];

      // 2. Ambil master data Guru aktif di tenant
      const rawQuery = (options.query || '').trim();
      const whereGuru: any = {
        tenant_id: tenantId,
      };

      if (rawQuery) {
        whereGuru.OR = [
          { nama_guru: { contains: rawQuery, mode: 'insensitive' } },
          { nip: { contains: rawQuery, mode: 'insensitive' } }
        ];
      }

      const teachers = await prisma.guru.findMany({
        where: whereGuru,
        select: {
          id: true,
          nama_guru: true,
          nip: true,
          foto: true,
          no_hp: true
        },
        orderBy: { nama_guru: 'asc' }
      });

      // 3. Ambil status AbsenGuru hari ini (Izin / Sakit / Penugasan)
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const guruAbsenRecords = await prisma.absenGuru.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startOfDay, lte: endOfDay },
          status: { in: ['IZIN', 'SAKIT', 'PENUGASAN', 'CUTI'] }
        }
      });

      const permitMap = new Map<string, any>();
      for (const p of guruAbsenRecords) {
        permitMap.set(p.guru_id, p);
      }

      // Group sessions by guru_id
      const sessionByGuru = new Map<string, any[]>();
      for (const s of allSessions) {
        const gId = s.guru_id || (s.Guru as any)?.id;
        if (!gId) continue;
        if (!sessionByGuru.has(gId)) {
          sessionByGuru.set(gId, []);
        }
        sessionByGuru.get(gId)!.push(s);
      }

      // 4. Transform dan tentukan status posisi real-time per guru
      const results: TeacherPositionInfo[] = [];

      for (const teacher of teachers) {
        const guruSessions = sessionByGuru.get(teacher.id) || [];
        const activePermit = permitMap.get(teacher.id) || null;

        // Sort timeline by start time
        guruSessions.sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || ''));

        // Format timeline
        const todayTimeline = guruSessions.map((s) => {
          const isLive = s.status === 'BERLANGSUNG' || Boolean(s.isLive);
          const isReady = Boolean(s.isReadyToOpen);
          const isOverdue = Boolean(s.isOverdue) || s.status === 'TERLEWAT';
          const isFinished = s.status === 'SELESAI' || Boolean(s.isFinished);

          return {
            id: s.id,
            kelas_id: s.kelas_id || s.Kelas?.id,
            kelas_nama: s.kelas_nama || s.Kelas?.nama_kelas || 'Kelas',
            mapel_id: s.mapel_id || s.Mapel?.id,
            mapel_nama: s.mapel_nama || s.Mapel?.nama_mapel || 'Mata Pelajaran',
            jam_mulai: s.jam_mulai || '07:00',
            jam_selesai: s.jam_selesai || '15:00',
            status: s.status || 'MENDATANG',
            is_live: isLive,
            is_ready: isReady,
            is_overdue: isOverdue,
            is_finished: isFinished
          };
        });

        // Determine current position
        // Priority 1: Currently active teaching session (isLive)
        const liveSession = todayTimeline.find((t) => t.is_live);
        // Priority 2: Ready to open / schedule current window but unopened
        const readySession = todayTimeline.find((t) => t.is_ready && !t.is_finished);

        let statusPosisi: 'SEDANG_MENGAJAR' | 'BELUM_BUKA_KELAS' | 'STANDBY' | 'IZIN_SAKIT' = 'STANDBY';
        let statusLabel = 'Tidak Ada Jam Saat Ini';
        let currentSessionInfo: TeacherPositionInfo['current_session'] = null;

        if (activePermit) {
          statusPosisi = 'IZIN_SAKIT';
          statusLabel = `Sedang ${activePermit.status || 'Izin/Sakit'}`;
        } else if (liveSession) {
          statusPosisi = 'SEDANG_MENGAJAR';
          statusLabel = `Sedang Mengajar (${liveSession.kelas_nama})`;
          const rawS = guruSessions.find((s) => s.id === liveSession.id);
          currentSessionInfo = {
            id: liveSession.id,
            kelas_id: liveSession.kelas_id,
            kelas_nama: liveSession.kelas_nama,
            mapel_id: liveSession.mapel_id,
            mapel_nama: liveSession.mapel_nama,
            jam_mulai: liveSession.jam_mulai,
            jam_selesai: liveSession.jam_selesai,
            status: liveSession.status,
            is_live: true,
            foto_kegiatan: rawS?.foto_kegiatan || rawS?.foto_bukti_url || null
          };
        } else if (readySession) {
          statusPosisi = 'BELUM_BUKA_KELAS';
          statusLabel = `Ada Jadwal (${readySession.kelas_nama}) - Belum Masuk`;
          currentSessionInfo = {
            id: readySession.id,
            kelas_id: readySession.kelas_id,
            kelas_nama: readySession.kelas_nama,
            mapel_id: readySession.mapel_id,
            mapel_nama: readySession.mapel_nama,
            jam_mulai: readySession.jam_mulai,
            jam_selesai: readySession.jam_selesai,
            status: readySession.status,
            is_live: false,
            foto_kegiatan: null
          };
        } else if (todayTimeline.length > 0) {
          const finishedCount = todayTimeline.filter((t) => t.is_finished).length;
          if (finishedCount === todayTimeline.length) {
            statusLabel = 'Seluruh Jadwal Mengajar Hari Ini Selesai';
          } else {
            statusLabel = 'Sedang Jam Kosong / Standby';
          }
        }

        results.push({
          guru_id: teacher.id,
          nama_guru: teacher.nama_guru,
          nip: teacher.nip,
          foto_url: teacher.foto || null,
          no_hp: isStudent ? null : teacher.no_hp, // 🔒 Privacy Guard: Sanitize phone for students
          status_posisi: statusPosisi,
          status_label: statusLabel,
          current_session: currentSessionInfo,
          today_timeline: todayTimeline,
          izin_today: activePermit
            ? { jenis: activePermit.status, catatan: activePermit.catatan }
            : null
        });
      }

      return results;
    } catch (err: any) {
      appLogger.error(`[TeacherLocatorService] Error locating teachers for tenant ${tenantId}: ${err.message}`, err);
      throw err;
    }
  }
}
