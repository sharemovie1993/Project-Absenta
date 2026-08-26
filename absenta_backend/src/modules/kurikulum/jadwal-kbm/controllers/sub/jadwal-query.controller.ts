// @ts-nocheck
import { Hari } from '@prisma/client';
import { RoleName } from '@/constants/enums';
import { prisma } from '@/utils/prisma';
import { JadwalValidationService } from '@/modules/jadwal/services/jadwal-validation.service';
import { jadwalKBMDb } from '../../services/repositories/jadwal-kbm.db';
import { applyDataScope } from '@/utils/applyDataScope';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { jadwalKBMService } from '../../services/jadwal-kbm.service';
import { smartReadSheet } from '@/utils/excel-import.utils';
import * as XLSX from 'xlsx-js-style';
import { generateSessionsForTenantDirect, getTenantLocalTime } from '@/jobs/attendanceAutoSession.job';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { appLogger } from '@/utils/app-logger';

const validationService = new JadwalValidationService();

export class JadwalQueryController {
  private async getAuthorizedContext(request: any, reply: any) {
    const { tenantId, user } = request;
    const userId = user?.id;
    const roleName = user?.roleName;

    const isGlobalManager =
      roleName === 'ADMIN' ||
      roleName === 'SUPERADMIN' ||
      await authorizationService.hasUserPermission(userId, 'academic.structure.manage');

    if (isGlobalManager) {
      const preferredKelasId = request.body?.kelas_id || request.query?.kelas_id;
      return this.buildContext(request, reply, tenantId, preferredKelasId, undefined, undefined, undefined, undefined);
    }

    if (roleName === RoleName.SISWA) {
      // Get Siswa
      const siswa = await jadwalKBMDb.siswa.findFirst({
        where: { tenant_id: tenantId, user_id: userId },
      });

      if (!siswa) {
        reply.status(403).send({ success: false, message: 'Forbidden: Siswa profile not found' });
        return null;
      }

      // 1. Check by Capability (RBAC) - New Dynamic Flow
      const hasSchedulePermission = await authorizationService.hasUserPermission(userId, 'attendance.schedules.manage');
      
      // 2. Fallback to strict Organizational Assignment (Legacy)
      const now = new Date();
      const petugas = await jadwalKBMDb.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          user_id: userId,
          is_active: true,
          AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
          Position: { code: 'PETUGAS_KELAS' },
        },
        include: { Kelas: true, Position: true },
      });

      const kelasId = (petugas as any)?.kelas_id || siswa.kelas_id;

      if (!hasSchedulePermission && !petugas) {
        reply.status(403).send({ success: false, message: 'Forbidden: You are not an active Petugas Absensi or missing Kelas assignment' });
        return null;
      }

      return this.buildContext(request, reply, tenantId, kelasId, siswa, petugas);
    } else if (roleName === RoleName.GURU) {
      // Get Guru
      const guru = await jadwalKBMDb.guru.findFirst({
        where: { tenant_id: tenantId, user_id: userId },
      });

      if (!guru) {
        reply.status(403).send({ success: false, message: 'Forbidden: Guru profile not found' });
        return null;
      }

      // 1. Check by Capability (RBAC) - e.g. Wali Kelas should have 'attendance.schedules.manage'
      const isWaliKelasByAuth = await authorizationService.hasUserPermission(userId, 'attendance.schedules.manage');

      // 2. Fallback to strict Organizational Assignment (Legacy)
      const now = new Date();
      const waliKelasStruktur = await jadwalKBMDb.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          user_id: userId,
          is_active: true,
          AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
          Position: { code: 'WALIKELAS' },
        },
        include: { Kelas: true, Position: true },
      });

      let kelasId = (waliKelasStruktur as any)?.kelas_id;
      
      // Optimization: If user is Wali Kelas by RBAC but structure record missing class_id, 
      // we might need to look up their assigned class elsewhere, 
      // but for now, we follow the structure record if present.
      
      if (!isWaliKelasByAuth && !waliKelasStruktur) {
        reply.status(403).send({ success: false, message: 'Forbidden: You are not an active Wali Kelas or missing Kelas assignment' });
        return null;
      }

      // Fallback for kelasId if not found in structure but is Wali Kelas
      if (!kelasId && isWaliKelasByAuth) {
          const wl = await jadwalKBMDb.organizationalAssignment.findFirst({ 
              where: { 
                  user_id: userId,
                  tenant_id: tenantId,
                  is_active: true,
                  Position: { code: 'WALIKELAS' }
              } 
          });
          if (wl) kelasId = wl.kelas_id;
      }

      if (!kelasId) {
        reply.status(403).send({ success: false, message: 'Forbidden: Missing Kelas assignment for Wali Kelas' });
        return null;
      }

      return this.buildContext(request, reply, tenantId, kelasId, undefined, undefined, guru, waliKelasStruktur);
    }

    reply.status(403).send({ success: false, message: 'Forbidden: Role not authorized for this context' });
    return null;
  }

  private async buildContext(request: any, reply: any, tenantId: string, kelasId: string, siswa?: any, petugas?: any, guru?: any, waliKelas?: any) {
    const pickId = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

    const preferredTahunPelajaranId =
      pickId(request?.body?.tahun_pelajaran_id) ||
      pickId(request?.query?.tahun_pelajaran_id) ||
      pickId(siswa?.tahun_pelajaran_id);

    const preferredSemesterId =
      pickId(request?.body?.semester_id) ||
      pickId(request?.query?.semester_id) ||
      pickId(siswa?.semester_id);

    let tahunPelajaran =
      (await jadwalKBMDb.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
      })) ||
      (preferredTahunPelajaranId
        ? await jadwalKBMDb.tahunPelajaran.findFirst({
            where: { tenant_id: tenantId, id: preferredTahunPelajaranId },
          })
        : null);

    if (!tahunPelajaran) {
      reply.status(400).send({ success: false, message: 'Tahun Pelajaran tidak ditemukan (aktif atau dipilih)' });
      return null;
    }

    let semester =
      (await jadwalKBMDb.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true, tahun_pelajaran_id: tahunPelajaran.id },
      })) ||
      (preferredSemesterId
        ? await jadwalKBMDb.semester.findFirst({
            where: { tenant_id: tenantId, id: preferredSemesterId, tahun_pelajaran_id: tahunPelajaran.id },
          })
        : null) ||
      (await jadwalKBMDb.semester.findFirst({
        where: { tenant_id: tenantId, tahun_pelajaran_id: tahunPelajaran.id },
      }));

    if (!semester) {
      reply.status(400).send({ success: false, message: 'Semester tidak ditemukan (aktif atau dipilih)' });
      return null;
    }

    const context = {
      tenantId,
      siswa,
      petugas,
      guru,
      waliKelas,
      kelasId,
      tahunPelajaranId: tahunPelajaran.id,
      semesterId: semester.id,
    };
    
    console.log(`[DEBUG] listMySchedule context built:`, {
      tenantId: context.tenantId,
      kelasId: context.kelasId,
      tpId: context.tahunPelajaranId,
      semId: context.semesterId,
      isSiswa: !!siswa
    });

    return context;
  }

  async list(request: any, reply: any) {
    const { user, dataScope } = request;
    
    // If it's a Siswa/Petugas, they use specialized authorized list
    if (user?.roleName === RoleName.SISWA) {
      return this.listAuthorized(request, reply);
    }
    
    const isGlobalManager =
      user?.roleName === 'ADMIN' ||
      user?.roleName === 'SUPERADMIN' ||
      (user?.id ? (
        await authorizationService.hasUserPermission(user.id, 'academic.structure.manage') ||
        await authorizationService.hasUserPermission(user.id, 'attendance.schedules.create')
      ) : false);

    if (isGlobalManager && request.dataScope) {
      request.dataScope.tenantWide = true;
      request.dataScope.tenant_wide = true;
    }

    // If it's a Guru, they might want their personal list OR if they are a Wali Kelas, the class list
    // If dataScope is present and filtered by class, we assume they want the Class List (Wali Kelas context)
    if (user?.roleName === RoleName.GURU && !isGlobalManager && (!dataScope || !dataScope.kelasIds)) {
      return this.listGuru(request, reply);
    }
    
    // Universal scoped list (Admin or Wali Kelas)
    return this.listAdmin(request, reply);
  }

  async listMySchedule(request: any, reply: any) {
    const { tenantId, user } = request;
    const userId = user?.id;

    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant ID is required' });
    }

    if (!userId) {
      return reply.status(401).send({ success: false, message: 'User authentication required' });
    }

    const { tanggal, hari } = request.query || {};
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (tanggal && !dateRegex.test(String(tanggal))) {
      return reply.status(400).send({ success: false, message: 'Format tanggal harus YYYY-MM-DD' });
    }

    // 1. Resolve Context (Siswa or Guru)
    let ctx: any = null;
    const roleName = user?.roleName;

    console.log('🔍 [BACKEND listMySchedule] Incoming request:', {
      tenantId,
      userId,
      roleName,
      query: request.query,
    });

    if (roleName === RoleName.SISWA) {
      const siswa = await jadwalKBMDb.siswa.findFirst({
        where: { tenant_id: tenantId, user_id: userId },
      });
      console.log('👤 [BACKEND listMySchedule] Student profile lookup:', {
        found: !!siswa,
        siswaId: siswa?.id,
        nama: (siswa as any)?.nama_siswa || (siswa as any)?.nama,
        kelas_id: siswa?.kelas_id,
      });
      if (!siswa) {
        return reply.status(404).send({ success: false, message: 'Siswa profile not found' });
      }
      if (!siswa.kelas_id) {
        return reply.status(400).send({ success: false, message: 'Siswa belum memiliki kelas' });
      }
      ctx = await this.buildContext(request, reply, tenantId, siswa.kelas_id, siswa);
    } else if (roleName === RoleName.GURU) {
      const guru = await jadwalKBMDb.guru.findFirst({
        where: { tenant_id: tenantId, user_id: userId },
      });
      if (!guru) {
        return reply.status(404).send({ success: false, message: 'Guru profile not found' });
      }
      // For Guru, we don't strictly bind to a single Kelas in context building, 
      // but buildContext needs a kelasId. We use a placeholder or detect if they are Wali Kelas.
      const waliKelasAssignment = await jadwalKBMDb.organizationalAssignment.findFirst({
        where: { tenant_id: tenantId, user_id: userId, Position: { code: 'WALIKELAS' }, is_active: true }
      });
      ctx = await this.buildContext(request, reply, tenantId, waliKelasAssignment?.kelas_id || '', undefined, undefined, guru);
    }

    if (!ctx) return;

    // 2. Resolve Hari
    const validHari = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
    let targetHari: any = undefined;
    const isAllWeek = String(hari).toUpperCase() === 'ALL' || request.query?.all === 'true' || request.query?.weekly === 'true';

    if (isAllWeek) {
      targetHari = { in: validHari };
    } else if (hari && validHari.includes(String(hari).toUpperCase())) {
      targetHari = String(hari).toUpperCase();
    } else {
      const d = tanggal ? new Date(`${tanggal}T00:00:00.000+07:00`) : new Date();
      let idx = d.getDay();
      if (tanggal) {
          const [y, m, day] = tanggal.split('-').map(Number);
          idx = new Date(y, m - 1, day).getDay();
      }
      const map: any = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      targetHari = map[idx];
    }

    // 3. Fetch schedules with smart DB lookup for student class
    const scheduleWhere: any = {
      tenant_id: ctx.tenantId,
      hari: targetHari,
    };
    
    // If Guru, filter by their own ID. If Siswa, filter by their Kelas.
    if (roleName === RoleName.GURU) {
      scheduleWhere.guru_id = ctx.guru?.id;
    } else {
      scheduleWhere.kelas_id = ctx.kelasId;
    }

    console.log(`[DEBUG listMySchedule] Querying schedule:`, {
      tenantId: ctx.tenantId,
      kelasId: ctx.kelasId,
      tpId: ctx.tahunPelajaranId,
      semId: ctx.semesterId,
      targetHari,
      roleName,
    });

    // 3a. Try strict match with active tahun_pelajaran_id and semester_id
    let jadwal = await jadwalKBMDb.jadwalKBM.findMany({
      where: {
        ...scheduleWhere,
        tahun_pelajaran_id: ctx.tahunPelajaranId,
        semester_id: ctx.semesterId,
      },
      include: {
        Mapel: { select: { nama_mapel: true, kode_mapel: true } },
        Guru: { select: { id: true, nama_guru: true, User: { select: { full_name: true } } } },
        Kelas: { select: { id: true, nama_kelas: true } },
      },
      orderBy: [{ jam_mulai: 'asc' }],
    });

    // 3b. Fallback: If 0 schedules with strict TP/Semester, query by tenant, class, and day
    if (jadwal.length === 0) {
      console.log(`[DEBUG listMySchedule] Strict query returned 0, attempting query without strict TP/Semester filter...`);
      jadwal = await jadwalKBMDb.jadwalKBM.findMany({
        where: scheduleWhere,
        include: {
          Mapel: { select: { nama_mapel: true, kode_mapel: true } },
          Guru: { select: { id: true, nama_guru: true, User: { select: { full_name: true } } } },
          Kelas: { select: { id: true, nama_kelas: true } },
        },
        orderBy: [{ jam_mulai: 'asc' }],
      });
    }

    // 3c. Fallback: Case-insensitive / Enum-mode Hari matching if 0
    if (jadwal.length === 0 && ctx.kelasId) {
      console.log(`[DEBUG listMySchedule] Querying all class schedules for kelas_id: ${ctx.kelasId}`);
      const allClassSchedules = await jadwalKBMDb.jadwalKBM.findMany({
        where: { tenant_id: ctx.tenantId, kelas_id: ctx.kelasId },
        include: {
          Mapel: { select: { nama_mapel: true, kode_mapel: true } },
          Guru: { select: { id: true, nama_guru: true, User: { select: { full_name: true } } } },
          Kelas: { select: { id: true, nama_kelas: true } },
        },
        orderBy: [{ jam_mulai: 'asc' }],
      });

      console.log(`📊 [DEBUG listMySchedule] All schedules in DB for kelas_id ${ctx.kelasId} (count: ${allClassSchedules.length}):`, 
        allClassSchedules.map((s: any) => ({ id: s.id, hari: s.hari, mapel: s.Mapel?.nama_mapel, jam: `${s.jam_mulai}-${s.jam_selesai}` }))
      );

      // Filter in JS for targetHari case-insensitively
      const matchedByDay = isAllWeek
        ? allClassSchedules
        : allClassSchedules.filter((s: any) => 
            String(s.hari || '').toUpperCase() === String(targetHari || '').toUpperCase()
          );

      if (matchedByDay.length > 0) {
        console.log(`🎯 [DEBUG listMySchedule] Matched ${matchedByDay.length} schedules in JS memory filter (isAllWeek: ${isAllWeek})`);
        jadwal = matchedByDay;
      }
    } else {
      console.log(`[DEBUG listMySchedule] Found ${jadwal.length} schedules (isAllWeek: ${isAllWeek})`);
    }

    // 4. Fetch active sessions for deduplication
    const targetDate = tanggal ? new Date(`${tanggal}T00:00:00.000+07:00`) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sessionWhere: any = {
      tenant_id: ctx.tenantId,
      tanggal: { gte: startOfDay, lte: endOfDay }
    };
    if (roleName === RoleName.GURU) {
      sessionWhere.guru_id = ctx.guru.id;
    } else {
      sessionWhere.kelas_id = ctx.kelasId;
    }

    const sessions = await jadwalKBMDb.sesiAbsensi.findMany({
      where: sessionWhere,
      include: {
        AbsenSiswa: roleName === RoleName.SISWA ? {
          where: { Siswa: { user_id: userId } },
          select: { status: true, waktu_tap: true }
        } : false,
        AbsenGuru: roleName === RoleName.GURU ? {
          where: { guru_id: ctx.guru.id },
          select: { status: true, waktu_tap: true }
        } : false,
        Kelas: { select: { id: true, nama_kelas: true } },
        Mapel: { select: { id: true, nama_mapel: true } },
        _count: {
          select: { AbsenSiswa: true }
        }
      }
    });

    // 🚀 ULTRA-OPTIMIZED BATCH QUERY: 1 single query instead of N individual database queries
    const activeSessionIds = sessions.map((s: any) => s.id).filter(Boolean);
    const summaryMap = new Map<string, any>();

    if (activeSessionIds.length > 0) {
      try {
        const counts = await (prisma as any).absenSiswa.groupBy({
          by: ['sesi_id', 'status'],
          where: { sesi_id: { in: activeSessionIds }, tenant_id: ctx.tenantId },
          _count: { _all: true }
        });
        counts.forEach((c: any) => {
          if (!summaryMap.has(c.sesi_id)) {
            summaryMap.set(c.sesi_id, { total: 0, HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, TERLAMBAT: 0 });
          }
          const sum = summaryMap.get(c.sesi_id)!;
          const countVal = typeof c._count === 'object' ? (c._count._all || 0) : (c._count || 0);
          sum[c.status] = countVal;
          sum.total = (sum.total || 0) + countVal;
        });
      } catch (err: any) {
        appLogger.warn({ error: err?.message }, '[getActiveTodayJadwal] Batch absenSiswa groupBy warning');
      }
    }

    sessions.forEach((s: any) => {
      if (!summaryMap.has(s.id)) {
        summaryMap.set(s.id, { total: (s as any)._count?.AbsenSiswa || 0, HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, TERLAMBAT: 0 });
      }
    });

    // 5. Merge logic
    const sessionMap = new Map();
    const matchedSessionIds = new Set();
    
    sessions.forEach((s: any) => {
      if (s.jadwal_kbm_id) {
        sessionMap.set(s.jadwal_kbm_id, s);
      }
    });

    const masterKegiatan = await jadwalKBMDb.jenisKegiatanMaster.findMany({
      where: { tenant_id: ctx.tenantId }
    });
    const mapKegiatan = new Map(masterKegiatan.map((m: any) => [m.id, m.nama]));

    const scheduledItems = jadwal.map((j: any) => {
      let session = sessionMap.get(j.id);
      
      // Match session if direct link or 1-to-1 mapel_id match
      if (!session) {
        session = sessions.find((s: any) => 
          !s.jadwal_kbm_id && 
          !matchedSessionIds.has(s.id) &&
          String(s.kelas_id) === String(j.kelas_id) && 
          s.mapel_id && String(s.mapel_id) === String(j.mapel_id)
        );
      }

      if (session) matchedSessionIds.add(session.id);

      const attendance = roleName === RoleName.SISWA ? session?.AbsenSiswa?.[0] : session?.AbsenGuru?.[0];
      const resolvedNama = mapKegiatan.get(j.jenis_kegiatan);

      const sessionWithSummary = session ? { ...session, _summary: summaryMap.get(session.id) } : null;

      // Server-side overdue and live computation — accurate & time-aware
      const serverNow = new Date();
      const sessionStartAt = session?.waktu_mulai ? new Date(session.waktu_mulai) : null;
      const sessionEndAt = session?.waktu_selesai ? new Date(session.waktu_selesai) : null;

      const todayStr = serverNow.toLocaleDateString('sv-SE');
      const jadwalStartAt = !sessionStartAt && j.jam_mulai ? new Date(`${todayStr}T${j.jam_mulai}:00`) : null;
      const effectiveStartAt = sessionStartAt || jadwalStartAt;

      const jadwalEndAt = !sessionEndAt && j.jam_selesai ? new Date(`${todayStr}T${j.jam_selesai}:00`) : null;
      const effectiveEndAt = sessionEndAt || jadwalEndAt;

      const sched_is_finished = session ? session.status === 'SELESAI' : false;
      const hasTeacherOpened = Boolean(session?.foto_kegiatan);
      
      const isWithinWindow = Boolean(
        effectiveStartAt && effectiveEndAt &&
        (serverNow.getTime() >= effectiveStartAt.getTime() - 15 * 60 * 1000) &&
        (serverNow.getTime() <= effectiveEndAt.getTime())
      );

      // is_live only if teacher opened it OR within window and session not finished/overdue
      const sched_is_live = !sched_is_finished && (hasTeacherOpened || isWithinWindow);
      const is_overdue = !sched_is_live && !sched_is_finished && !hasTeacherOpened && Boolean(effectiveEndAt && serverNow > effectiveEndAt);

      return {
        ...j,
        jenis_kegiatan: resolvedNama || j.jenis_kegiatan || 'KBM',
        session: sessionWithSummary,
        attendance_status: attendance?.status || (session ? 'BELUM_PRESENSI' : null), 
        waktu_tap: attendance?.waktu_tap || null,
        is_live: sched_is_live,
        is_finished: sched_is_finished,
        is_overdue,
      };
    });

    // 6. Add orphan sessions (AdHoc / JadwalKegiatan)
    const serverNowOrphan = new Date();
    const adhocItems = sessions
      .filter((s: any) => !matchedSessionIds.has(s.id))
      .map((s: any) => {
        const attendance = roleName === RoleName.SISWA ? s.AbsenSiswa?.[0] : s.AbsenGuru?.[0];
        const sessionWithSummary = { ...s, _summary: summaryMap.get(s.id) };
        const resolvedNamaKegiatan = s.Mapel?.nama_mapel || (s.jenis_kegiatan && s.jenis_kegiatan !== 'KEGIATAN' ? s.jenis_kegiatan : 'Mata Pelajaran');
        const adhocEndAt = s.waktu_selesai ? new Date(s.waktu_selesai) : null;
        const adhoc_is_live = s.status === 'BERLANGSUNG';
        const adhoc_is_finished = s.status === 'SELESAI';
        const adhoc_is_overdue = !adhoc_is_live && !adhoc_is_finished && !!adhocEndAt && serverNowOrphan > adhocEndAt;
        return {
          id: `adhoc-${s.id}`,
          jam_mulai: s.waktu_mulai ? new Date(s.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') : '??:??',
          jam_selesai: s.waktu_selesai ? new Date(s.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') : '??:??',
          kelas_nama: s.Kelas?.nama_kelas || '-',
          kegiatan: resolvedNamaKegiatan,
          jenis_kegiatan: resolvedNamaKegiatan,
          category: s.jadwal_kegiatan_id ? 'KEGIATAN' : 'KBM',
          is_kegiatan: !!s.jadwal_kegiatan_id,
          Mapel: s.Mapel || (s.jenis_kegiatan && s.jenis_kegiatan !== 'KEGIATAN' ? { nama_mapel: s.jenis_kegiatan } : undefined),
          Guru: s.Guru,
          Kelas: s.Kelas,
          session: sessionWithSummary,
          attendance_status: attendance?.status || 'BELUM_PRESENSI',
          waktu_tap: attendance?.waktu_tap || null,
          is_live: adhoc_is_live,
          is_finished: adhoc_is_finished,
          is_overdue: adhoc_is_overdue,
          is_adhoc: true
        };
      });

    // 7. Add Piket assignments for Guru
    let piketItems: any[] = [];
    if (roleName === RoleName.GURU && ctx.guru?.id) {
      try {
        const piketList = await (jadwalKBMDb as any).jadwalPiketGuru.findMany({
          where: {
            tenant_id: ctx.tenantId,
            tahun_pelajaran_id: ctx.tahunPelajaranId,
            semester_id: ctx.semesterId,
            guru_id: ctx.guru.id,
            hari: targetHari
          }
        });

        piketItems = piketList.map((p: any) => ({
          id: `piket-${p.id}`,
          hari: p.hari,
          jam_mulai: p.jam_mulai || '06:30',
          jam_selesai: p.jam_selesai || '15:30',
          jenis_kegiatan: 'DUTY_PIKET',
          is_piket: true,
          pos_piket: p.pos_piket || 'Piket Umum',
          catatan: p.catatan,
          Mapel: { nama_mapel: 'TUGAS PIKET GURU', kode_mapel: 'PIKET' },
          Kelas: { nama_kelas: p.pos_piket || 'Piket Umum' },
          Guru: { id: ctx.guru.id, nama_guru: ctx.guru.nama_guru },
          session: null,
          attendance_status: null,
          waktu_tap: null,
          is_live: false,
          is_finished: false
        }));
      } catch (piketErr) {
        console.error('Error fetching piket schedule for my schedule:', piketErr);
      }
    }

    const sortedItems = [...scheduledItems, ...adhocItems, ...piketItems].sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));

    // Group and merge consecutive items for same class, teacher, subject, and activity
    const finalResult: typeof sortedItems = [];
    if (sortedItems.length > 0) {
      let current = { ...sortedItems[0] };
      finalResult.push(current);

      for (let i = 1; i < sortedItems.length; i++) {
        const next = sortedItems[i];

        const sameContext = 
          String(current.kelas_id || '') === String(next.kelas_id || '') &&
          String(current.guru_id || '') === String(next.guru_id || '') &&
          String(current.mapel_id || '') === String(next.mapel_id || '') &&
          String(current.jenis_kegiatan || '').toUpperCase() === String(next.jenis_kegiatan || '').toUpperCase();

        if (sameContext) {
          const [currH, currM] = current.jam_selesai.split(':').map(Number);
          const [nextH, nextM] = next.jam_mulai.split(':').map(Number);
          const currMins = (currH || 0) * 60 + (currM || 0);
          const nextMins = (nextH || 0) * 60 + (nextM || 0);
          const gap = nextMins - currMins;

          // If gap <= 35 minutes (covers standard breaks), merge them!
          if (gap <= 35) {
            current.jam_selesai = next.jam_selesai;
            if (!current.session && next.session) {
              current.session = next.session;
              current.attendance_status = next.attendance_status;
              current.waktu_tap = next.waktu_tap;
              current.is_live = next.is_live;
              current.is_finished = next.is_finished;
            }
            continue;
          }
        }

        current = { ...next };
        finalResult.push(current);
      }
    }

    return reply.send({ 
      success: true, 
      message: 'Timeline berhasil diambil',
      data: finalResult 
    });
  }

  private async listGuru(request: any, reply: any) {
    const { tenantId, user } = request;
    const userId = user?.id;

    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant ID is required' });
    }

    if (!userId) {
      return reply.status(401).send({ success: false, message: 'User authentication required' });
    }

    const guru = await jadwalKBMDb.guru.findFirst({
      where: { tenant_id: tenantId, user_id: userId },
      select: { id: true },
    });

    if (!guru) {
      return reply.status(403).send({ success: false, message: 'Forbidden: Guru profile not found' });
    }

    const pickId = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

    const preferredTahunPelajaranId =
      pickId(request?.body?.tahun_pelajaran_id) || pickId(request?.query?.tahun_pelajaran_id);
    const preferredSemesterId = pickId(request?.body?.semester_id) || pickId(request?.query?.semester_id);

    const tahunPelajaran =
      (await jadwalKBMDb.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true },
      })) ||
      (preferredTahunPelajaranId
        ? await jadwalKBMDb.tahunPelajaran.findFirst({
            where: { tenant_id: tenantId, id: preferredTahunPelajaranId },
            select: { id: true },
          })
        : null);

    if (!tahunPelajaran) {
      return reply.status(400).send({ success: false, message: 'Tahun Pelajaran tidak ditemukan (aktif atau dipilih)' });
    }

    const semester =
      (await jadwalKBMDb.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true, tahun_pelajaran_id: tahunPelajaran.id },
        select: { id: true },
      })) ||
      (preferredSemesterId
        ? await jadwalKBMDb.semester.findFirst({
            where: { tenant_id: tenantId, id: preferredSemesterId, tahun_pelajaran_id: tahunPelajaran.id },
            select: { id: true },
          })
        : null) ||
      (await jadwalKBMDb.semester.findFirst({
        where: { tenant_id: tenantId, tahun_pelajaran_id: tahunPelajaran.id },
        select: { id: true },
      }));

    if (!semester) {
      return reply.status(400).send({ success: false, message: 'Semester tidak ditemukan (aktif atau dipilih)' });
    }

    const rawHari = pickId(request?.query?.hari);
    const validHari: Hari[] = [Hari.SENIN, Hari.SELASA, Hari.RABU, Hari.KAMIS, Hari.JUMAT, Hari.SABTU, Hari.MINGGU];
    const normalizedHari = rawHari ? (rawHari.toUpperCase() as Hari) : undefined;
    const hari = normalizedHari && validHari.includes(normalizedHari) ? normalizedHari : undefined;

    const targetGuruId = pickId(request?.query?.guru_id) || guru.id;

    const jadwal = await jadwalKBMDb.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: tahunPelajaran.id,
        semester_id: semester.id,
        guru_id: targetGuruId,
        ...(hari ? { hari } : {}),
      },
      include: {
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        Guru: { select: { id: true, nama_guru: true, User: { select: { full_name: true } } } },
        Kelas: { select: { id: true, nama_kelas: true } },
      },
      orderBy: [
        { hari: 'asc' },
        { jam_mulai: 'asc' },
      ],
    });

    return reply.send({ success: true, data: jadwal });
  }

  private async listAuthorized(request: any, reply: any) {
    const ctx = await this.getAuthorizedContext(request, reply);
    if (!ctx) return;

    const jadwal = await jadwalKBMDb.jadwalKBM.findMany({
      where: {
        tenant_id: ctx.tenantId,
        kelas_id: ctx.kelasId,
        tahun_pelajaran_id: ctx.tahunPelajaranId,
        semester_id: ctx.semesterId,
      },
      include: {
        Mapel: { select: { nama_mapel: true, kode_mapel: true } },
        Guru: { select: { id: true, nama_guru: true, User: { select: { full_name: true } } } },
        Kelas: { select: { id: true, nama_kelas: true } },
      },
      orderBy: [
        { hari: 'asc' },
        { jam_mulai: 'asc' },
      ],
    });

    return reply.send({ success: true, data: jadwal });
  }


  async getDetail(request: any, reply: any) {
    const { tenantId } = request;
    const { id } = request.params;

    const jadwal = await jadwalKBMDb.jadwalKBM.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        Guru: { select: { id: true, User: { select: { full_name: true } } } },
        Kelas: { select: { id: true, nama_kelas: true } },
      },
    });

    if (!jadwal) {
      return reply.status(404).send({ success: false, message: 'Jadwal Template not found' });
    }

    return reply.send({ success: true, data: jadwal });
  }

  async listAdmin(request: any, reply: any) {
    const { tenantId, dataScope } = request;
    const {
      tahun_pelajaran_id,
      semester_id,
      kelas_id,
      guru_id,
      hari,
    } = request.query;

    let filters: any = { tenant_id: tenantId };
    if (tahun_pelajaran_id) filters.tahun_pelajaran_id = tahun_pelajaran_id;
    if (semester_id) filters.semester_id = semester_id;
    if (kelas_id) filters.kelas_id = kelas_id;
    if (guru_id) filters.guru_id = guru_id;
    if (hari) filters.hari = hari;

    // Apply Scoping
    if (dataScope) {
      filters = applyDataScope(filters, dataScope);
    }

    const jadwal = await jadwalKBMDb.jadwalKBM.findMany({
      where: filters,
      include: {
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        Guru: { select: { id: true, nama_guru: true, User: { select: { full_name: true } } } },
        Kelas: { select: { id: true, nama_kelas: true } },
      },
      orderBy: [
        { hari: 'asc' },
        { jam_mulai: 'asc' },
      ],
    });

    return reply.send({ success: true, data: jadwal });
  }

}
