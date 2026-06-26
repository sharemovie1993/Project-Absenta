import { Hari } from '@prisma/client';
import { RoleName } from '../../../../constants/enums';
import { prisma } from '../../../../utils/prisma';
import { JadwalValidationService } from '../../../jadwal/services/jadwal-validation.service';
import { jadwalTemplateDb } from '../services/repositories/jadwal-template.db';
import { applyDataScope } from '../../../../utils/applyDataScope';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { jadwalTemplateService } from '../services/jadwal-template.service';
import { smartReadSheet } from '@/utils/excel-import.utils';
import * as XLSX from 'xlsx-js-style';

const validationService = new JadwalValidationService();

export class JadwalTemplateController {
  
  private async getAuthorizedContext(request: any, reply: any) {
    const { tenantId, user } = request;
    const userId = user?.id;
    const roleName = user?.roleName;

    if (roleName === RoleName.SISWA) {
      // Get Siswa
      const siswa = await jadwalTemplateDb.siswa.findFirst({
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
      const petugas = await jadwalTemplateDb.organizationalAssignment.findFirst({
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
      const guru = await jadwalTemplateDb.guru.findFirst({
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
      const waliKelasStruktur = await jadwalTemplateDb.organizationalAssignment.findFirst({
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
          const wl = await jadwalTemplateDb.organizationalAssignment.findFirst({ 
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
      (await jadwalTemplateDb.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
      })) ||
      (preferredTahunPelajaranId
        ? await jadwalTemplateDb.tahunPelajaran.findFirst({
            where: { tenant_id: tenantId, id: preferredTahunPelajaranId },
          })
        : null);

    if (!tahunPelajaran) {
      reply.status(400).send({ success: false, message: 'Tahun Pelajaran tidak ditemukan (aktif atau dipilih)' });
      return null;
    }

    let semester =
      (await jadwalTemplateDb.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true, tahun_pelajaran_id: tahunPelajaran.id },
      })) ||
      (preferredSemesterId
        ? await jadwalTemplateDb.semester.findFirst({
            where: { tenant_id: tenantId, id: preferredSemesterId, tahun_pelajaran_id: tahunPelajaran.id },
          })
        : null) ||
      (await jadwalTemplateDb.semester.findFirst({
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
    
    // If it's a Guru, they might want their personal list OR if they are a Wali Kelas, the class list
    // If dataScope is present and filtered by class, we assume they want the Class List (Wali Kelas context)
    if (user?.roleName === RoleName.GURU && (!dataScope || !dataScope.kelasIds)) {
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

    if (roleName === RoleName.SISWA) {
      const siswa = await jadwalTemplateDb.siswa.findFirst({
        where: { tenant_id: tenantId, user_id: userId },
      });
      if (!siswa) {
        return reply.status(404).send({ success: false, message: 'Siswa profile not found' });
      }
      ctx = await this.buildContext(request, reply, tenantId, siswa.kelas_id, siswa);
    } else if (roleName === RoleName.GURU) {
      const guru = await jadwalTemplateDb.guru.findFirst({
        where: { tenant_id: tenantId, user_id: userId },
      });
      if (!guru) {
        return reply.status(404).send({ success: false, message: 'Guru profile not found' });
      }
      // For Guru, we don't strictly bind to a single Kelas in context building, 
      // but buildContext needs a kelasId. We use a placeholder or detect if they are Wali Kelas.
      const waliKelasAssignment = await jadwalTemplateDb.organizationalAssignment.findFirst({
        where: { tenant_id: tenantId, user_id: userId, Position: { code: 'WALIKELAS' }, is_active: true }
      });
      ctx = await this.buildContext(request, reply, tenantId, waliKelasAssignment?.kelas_id || '', undefined, undefined, guru);
    }

    if (!ctx) return;

    // 2. Resolve Hari
    const validHari = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
    let targetHari: any = undefined;
    if (hari && validHari.includes(String(hari).toUpperCase())) {
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

    // 3. Fetch schedules
    const scheduleWhere: any = {
      tenant_id: ctx.tenantId,
      tahun_pelajaran_id: ctx.tahunPelajaranId,
      semester_id: ctx.semesterId,
      hari: targetHari,
    };
    
    // If Guru, filter by their own ID. If Siswa, filter by their Kelas.
    if (roleName === RoleName.GURU) {
      scheduleWhere.guru_id = ctx.guru.id;
    } else {
      scheduleWhere.kelas_id = ctx.kelasId;
    }

    const jadwal = await jadwalTemplateDb.jadwalTemplate.findMany({
      where: scheduleWhere,
      include: {
        Mapel: { select: { nama_mapel: true, kode_mapel: true } },
        Guru: { select: { id: true, User: { select: { full_name: true } } } },
        Kelas: { select: { id: true, nama_kelas: true } },
      },
      orderBy: [{ jam_mulai: 'asc' }],
    });

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

    const sessions = await jadwalTemplateDb.sesiAbsensi.findMany({
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

    const summaryResults = await Promise.all(sessions.map(async (s) => {
        const counts = await (prisma as any).absenSiswa.groupBy({
            by: ['status'],
            where: { sesi_id: s.id, tenant_id: ctx.tenantId },
            _count: true
        });
        const summary: any = { total: (s as any)._count?.AbsenSiswa || 0 };
        counts.forEach((c: any) => { summary[c.status] = c._count; });
        return { id: s.id, summary };
    }));
    const summaryMap = new Map(summaryResults.map(r => [r.id, r.summary]));

    // 5. Merge logic
    const sessionMap = new Map();
    const matchedSessionIds = new Set();
    
    sessions.forEach((s: any) => {
      if (s.jadwal_template_id) {
        sessionMap.set(s.jadwal_template_id, s);
      }
    });

    const masterKegiatan = await jadwalTemplateDb.jenisKegiatanMaster.findMany({
      where: { tenant_id: ctx.tenantId }
    });
    const mapKegiatan = new Map(masterKegiatan.map((m: any) => [m.id, m.nama]));

    const scheduledItems = jadwal.map((j: any) => {
      let session = sessionMap.get(j.id);
      
      // Fuzzy match if no direct link
      if (!session) {
        session = sessions.find(s => 
          !s.jadwal_template_id && 
          String(s.kelas_id) === String(j.kelas_id) && 
          (s.mapel_id === j.mapel_id || (!s.mapel_id && String(s.jenis_kegiatan).toUpperCase() === String(j.jenis_kegiatan).toUpperCase()))
        );
      }

      if (session) matchedSessionIds.add(session.id);

      const attendance = roleName === RoleName.SISWA ? session?.AbsenSiswa?.[0] : session?.AbsenGuru?.[0];
      const resolvedNama = mapKegiatan.get(j.jenis_kegiatan);

      const sessionWithSummary = session ? { ...session, _summary: summaryMap.get(session.id) } : null;

      return {
        ...j,
        jenis_kegiatan: resolvedNama || j.jenis_kegiatan || 'KBM',
        session: sessionWithSummary,
        attendance_status: attendance?.status || (session ? 'BELUM_PRESENSI' : null), 
        waktu_tap: attendance?.waktu_tap || null,
        is_live: session ? session.status === 'BERLANGSUNG' : false,
        is_finished: session ? session.status === 'SELESAI' : false
      };
    });

    // 6. Add orphan sessions (AdHoc)
    const adhocItems = sessions
      .filter(s => !matchedSessionIds.has(s.id))
      .map(s => {
        const attendance = roleName === RoleName.SISWA ? s.AbsenSiswa?.[0] : s.AbsenGuru?.[0];
        const sessionWithSummary = { ...s, _summary: summaryMap.get(s.id) };
        return {
          id: `adhoc-${s.id}`,
          jam_mulai: s.waktu_mulai ? new Date(s.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') : '??:??',
          jam_selesai: s.waktu_selesai ? new Date(s.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') : '??:??',
          kelas_nama: s.Kelas?.nama_kelas || '-',
          kegiatan: s.Mapel?.nama_mapel || s.jenis_kegiatan || 'Manual',
          session: sessionWithSummary,
          attendance_status: attendance?.status || 'BELUM_PRESENSI',
          waktu_tap: attendance?.waktu_tap || null,
          is_live: s.status === 'BERLANGSUNG',
          is_finished: s.status === 'SELESAI',
          is_adhoc: true
        };
      });

    const finalResult = [...scheduledItems, ...adhocItems].sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));

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

    const guru = await jadwalTemplateDb.guru.findFirst({
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
      (await jadwalTemplateDb.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true },
      })) ||
      (preferredTahunPelajaranId
        ? await jadwalTemplateDb.tahunPelajaran.findFirst({
            where: { tenant_id: tenantId, id: preferredTahunPelajaranId },
            select: { id: true },
          })
        : null);

    if (!tahunPelajaran) {
      return reply.status(400).send({ success: false, message: 'Tahun Pelajaran tidak ditemukan (aktif atau dipilih)' });
    }

    const semester =
      (await jadwalTemplateDb.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true, tahun_pelajaran_id: tahunPelajaran.id },
        select: { id: true },
      })) ||
      (preferredSemesterId
        ? await jadwalTemplateDb.semester.findFirst({
            where: { tenant_id: tenantId, id: preferredSemesterId, tahun_pelajaran_id: tahunPelajaran.id },
            select: { id: true },
          })
        : null) ||
      (await jadwalTemplateDb.semester.findFirst({
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

    const jadwal = await jadwalTemplateDb.jadwalTemplate.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: tahunPelajaran.id,
        semester_id: semester.id,
        guru_id: guru.id,
        ...(hari ? { hari } : {}),
      },
      include: {
        Mapel: { select: { nama_mapel: true, kode_mapel: true } },
        Guru: { select: { id: true, User: { select: { full_name: true } } } },
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

    const jadwal = await jadwalTemplateDb.jadwalTemplate.findMany({
      where: {
        tenant_id: ctx.tenantId,
        kelas_id: ctx.kelasId,
        tahun_pelajaran_id: ctx.tahunPelajaranId,
        semester_id: ctx.semesterId,
      },
      include: {
        Mapel: { select: { nama_mapel: true, kode_mapel: true } },
        Guru: { select: { id: true, User: { select: { full_name: true } } } },
        Kelas: { select: { id: true, nama_kelas: true } },
      },
      orderBy: [
        { hari: 'asc' },
        { jam_mulai: 'asc' },
      ],
    });

    return reply.send({ success: true, data: jadwal });
  }

  // --- Admin Endpoints ---

  async create(request: any, reply: any) {
    const { tenantId, user } = request;
    let {
      tahun_pelajaran_id,
      semester_id,
      kelas_id,
      guru_id,
      mapel_id,
      jenis_kegiatan,
      hari,
      jam_mulai,
      jam_selesai,
    } = request.body;

    const isValidTime = (t: any) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t);

    try {
    if (user?.roleName === RoleName.SISWA || user?.roleName === RoleName.GURU) {
        const ctx = await this.getAuthorizedContext(request, reply);
        if (!ctx) return;

        kelas_id = ctx.kelasId;
        tahun_pelajaran_id = ctx.tahunPelajaranId;
        semester_id = ctx.semesterId;
      }

      if (!hari) {
        return reply.status(400).send({ success: false, message: 'Hari wajib diisi' });
      }
      if (!isValidTime(jam_mulai) || !isValidTime(jam_selesai)) {
        return reply.status(400).send({ success: false, message: 'Jam mulai/jam selesai wajib format HH:mm' });
      }

      const validationResult = await validationService.validateConflict({
        tenant_id: tenantId,
        tahun_pelajaran_id,
        semester_id,
        hari,
        jam_mulai,
        jam_selesai,
        kelas_id,
        guru_id,
      });

      if (!validationResult.is_valid) {
        return reply.status(409).send({
          success: false,
          message: validationResult.error?.message,
          code: validationResult.error?.code,
          details: validationResult.error?.details,
        });
      }

      const jadwal = await jadwalTemplateDb.jadwalTemplate.create({
        data: {
          tenant_id: tenantId,
          tahun_pelajaran_id,
          semester_id,
          kelas_id,
          guru_id,
          mapel_id,
          jenis_kegiatan: jenis_kegiatan || 'KBM',
          hari,
          jam_mulai,
          jam_selesai,
        },
        include: {
          Mapel: { select: { nama_mapel: true } },
          Guru: { select: { User: { select: { full_name: true } } } },
          Kelas: { select: { nama_kelas: true } },
        },
      });

      return reply.send({ success: true, data: jadwal });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return reply.status(409).send({ success: false, message: 'Jadwal bentrok (duplikasi slot waktu)' });
      }
      throw e;
    }
  }

  async update(request: any, reply: any) {
    const { tenantId, user } = request;
    const { id } = request.params;
    let {
      tahun_pelajaran_id,
      semester_id,
      kelas_id,
      guru_id,
      mapel_id,
      jenis_kegiatan,
      hari,
      jam_mulai,
      jam_selesai,
    } = request.body;

    const isValidTime = (t: any) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t);

    // Check existence
    const existing = await jadwalTemplateDb.jadwalTemplate.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      return reply.status(404).send({ success: false, message: 'Jadwal Template not found' });
    }

    // Enforce SISWA/GURU Context
    if (user?.roleName === RoleName.SISWA || user?.roleName === RoleName.GURU) {
      const ctx = await this.getAuthorizedContext(request, reply);
      if (!ctx) return;

      // Ensure user can only update schedules for their authorized class
      if (existing.kelas_id !== ctx.kelasId) {
        return reply.status(403).send({ success: false, message: 'Forbidden: You can only update schedules for your own class' });
      }
      
      kelas_id = ctx.kelasId;
      tahun_pelajaran_id = ctx.tahunPelajaranId;
      semester_id = ctx.semesterId;
    }

    // 1. Conflict Validation
    const effectiveHari = hari || existing.hari;
    const effectiveMulai = jam_mulai || existing.jam_mulai;
    const effectiveSelesai = jam_selesai || existing.jam_selesai;

    if (!effectiveHari) {
      return reply.status(400).send({ success: false, message: 'Hari wajib diisi' });
    }
    if (!isValidTime(effectiveMulai) || !isValidTime(effectiveSelesai)) {
      return reply.status(400).send({ success: false, message: 'Jam mulai/jam selesai wajib format HH:mm' });
    }

    const validationResult = await validationService.validateConflict({
      tenant_id: tenantId,
      tahun_pelajaran_id: tahun_pelajaran_id || existing.tahun_pelajaran_id,
      semester_id: semester_id || existing.semester_id,
      hari: effectiveHari,
      jam_mulai: effectiveMulai,
      jam_selesai: effectiveSelesai,
      kelas_id: kelas_id || existing.kelas_id,
      guru_id: guru_id || existing.guru_id,
      exclude_jadwal_template_id: id,
    });

    if (!validationResult.is_valid) {
      return reply.status(409).send({
        success: false,
        message: validationResult.error?.message,
        code: validationResult.error?.code,
        details: validationResult.error?.details,
      });
    }

    try {
      const jadwal = await jadwalTemplateDb.jadwalTemplate.update({
        where: { id },
        data: {
          tahun_pelajaran_id,
          semester_id,
          kelas_id,
          guru_id,
          mapel_id,
          jenis_kegiatan,
          hari,
          jam_mulai,
          jam_selesai,
        },
        include: {
          Mapel: { select: { nama_mapel: true } },
          Guru: { select: { User: { select: { full_name: true } } } },
          Kelas: { select: { nama_kelas: true } },
        },
      });

      return reply.send({ success: true, data: jadwal });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return reply.status(409).send({ success: false, message: 'Jadwal bentrok (duplikasi slot waktu)' });
      }
      throw e;
    }
  }

  async delete(request: any, reply: any) {
    const { tenantId, user } = request;
    const { id } = request.params;

    const existing = await jadwalTemplateDb.jadwalTemplate.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      return reply.status(404).send({ success: false, message: 'Jadwal Template not found' });
    }

    // Enforce SISWA/GURU Context
    if (user?.roleName === RoleName.SISWA || user?.roleName === RoleName.GURU) {
      const ctx = await this.getAuthorizedContext(request, reply);
      if (!ctx) return;

      // Ensure user can only delete schedules for their authorized class
      if (existing.kelas_id !== ctx.kelasId) {
        return reply.status(403).send({ success: false, message: 'Forbidden: You can only delete schedules for your own class' });
      }
    }

    await jadwalTemplateDb.jadwalTemplate.delete({
      where: { id },
    });

    return reply.send({ success: true, message: 'Jadwal Template deleted' });
  }

  async getDetail(request: any, reply: any) {
    const { tenantId } = request;
    const { id } = request.params;

    const jadwal = await jadwalTemplateDb.jadwalTemplate.findFirst({
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

    const jadwal = await jadwalTemplateDb.jadwalTemplate.findMany({
      where: filters,
      include: {
        Mapel: { select: { nama_mapel: true, kode_mapel: true } },
        Guru: { select: { id: true, User: { select: { full_name: true } } } },
        Kelas: { select: { id: true, nama_kelas: true } },
      },
      orderBy: [
        { hari: 'asc' },
        { jam_mulai: 'asc' },
      ],
    });

    return reply.send({ success: true, data: jadwal });
  }

  async getImportTemplate(_request: any, reply: any) {
    try {
      const headers = ['hari', 'jam_mulai', 'jam_selesai', 'nama_kelas', 'nama_mapel', 'nama_guru'];
      const sample = [
        { hari: 'SENIN', jam_mulai: '07:00', jam_selesai: '07:45', nama_kelas: 'X RPL 1', nama_mapel: 'Matematika', nama_guru: 'Ahmad Subarjo, S.Kom' },
        { hari: 'SENIN', jam_mulai: '07:45', jam_selesai: '08:30', nama_kelas: 'X RPL 1', nama_mapel: 'Bahasa Indonesia', nama_guru: 'Siti Aminah, S.Pd' }
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sample, { header: headers });

      const headerStyle = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFD700" } }, // Gold for Required
        alignment: { horizontal: "center" }
      };

      headers.forEach((_, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
        if (cell) cell.s = headerStyle;
      });

      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Pelajaran');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="template_impor_jadwal.xlsx"');
      return reply.send(buffer);
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Gagal membuat template' });
    }
  }

  async importFromExcel(request: any, reply: any) {
    try {
      const { tenantId } = request;
      const { tahun_pelajaran_id, semester_id } = request.query;

      if (!tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({ success: false, message: 'Tahun Pelajaran dan Semester wajib dipilih' });
      }

      const part = await request.file();
      if (!part) return reply.status(400).send({ success: false, message: 'File tidak ditemukan' });

      const buffer = await part.toBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = smartReadSheet(ws);

      const result = await jadwalTemplateService.importFromExcel(
        data, 
        tenantId, 
        tahun_pelajaran_id, 
        semester_id
      );

      return reply.status(200).send({
        success: true,
        message: `Import selesai. Berhasil: ${result.success}, Gagal: ${result.failed}`,
        data: result
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}

export const jadwalTemplateController = new JadwalTemplateController();
