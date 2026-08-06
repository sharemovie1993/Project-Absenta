import { sesiDb as prisma } from './repositories/sesi.db';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { getEffectiveAbsensiMode } from '@/utils/attendanceModeHelper';
import { AbsenStatus, JenisTap } from '@/constants/enums';
import { ATTENDANCE_POINTS } from '@/constants/attendance-points';
import { cacheService } from '@/utils/cache.service';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '@/constants/cache-keys';
import { attendanceMetricsAggregator } from '@/utils/attendance-metrics';
import { getRedisConnection } from '@/queue/redis';
import { emitDomainEvent } from '@/infra/event-bus';
import { sendGuruNotification } from './commands/guru-notification.command';
import { handleLateOrAlpaNotification } from './commands/late-alpa-notification.command';
import { propagateGateAbsenceToSessions as propagateGateAbsenceToSessionsCommand } from './commands/propagate-gate-absence.command';
import { propagateGateAbsencesForNewSessionCommand } from './commands/propagate-gate-absences-batch.command';

export class SesiService {


  async create(tenantId: string, _org: any, payload: any, userId: string) {

    const {
      kelas_id,
      guru_id,
      mapel_id,
      semester_id,
      jenis_kegiatan,
      tanggal,
      waktu_mulai,
      waktu_selesai,
      tahun_pelajaran_id,
      sumber_sesi,
      jadwal_kbm_id,
      jadwal_template_id
    } = payload;

    const resolvedJadwalKBMId = jadwal_kbm_id || jadwal_template_id;

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    
    let resolvedNama = String(jenis_kegiatan || '');
    let resolvedTipe = String(jenis_kegiatan || '');

    if (isUUID(resolvedNama)) {
        const master = await prisma.jenisKegiatanMaster.findFirst({ where: { id: resolvedNama, tenant_id: tenantId } });
        if (master) {
            resolvedNama = master.nama;
            resolvedTipe = master.tipe || master.nama;
        }
    }

    const jkNorm = String(resolvedTipe || '').trim().toUpperCase();
    const requiresGuru = jkNorm.startsWith('KBM') || jkNorm === 'ESKUL';
    const guruIdToUse = String(guru_id || '').trim() ? String(guru_id) : null;

    // NOTE: Authorization (isGuru, isPetugas) handled by SesiGuard
    if (requiresGuru && !guruIdToUse) {
      throw new Error('Guru wajib dipilih untuk kegiatan KBM/Eskul');
    }

    const parseSafeDate = (input: any) => {
      if (!input) return new Date();
      if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
      const str = String(input).trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        const parts = str.split(' ');
        const dateParts = parts[0].split('/');
        const day = dateParts[0].padStart(2, '0');
        const month = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        const timePart = parts[1] || '00:00:00';
        const isoStr = `${year}-${month}-${day}T${timePart}`;
        const d = new Date(isoStr);
        if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(str);
      return isNaN(d.getTime()) ? new Date() : d;
    };

    const tgl = parseSafeDate(tanggal);
    const mulai = parseSafeDate(waktu_mulai);
    const selesai = waktu_selesai ? parseSafeDate(waktu_selesai) : new Date(mulai.getTime() + 60 * 60 * 1000);

    const cfgForDay = await systemConfigService.getActive(tenantId);
    const tzForDay = String(cfgForDay?.timezone || 'Asia/Jakarta').trim();
    const TZ_OFFSET: Record<string, number> = {
      'Asia/Jakarta': 7,
      'Asia/Makassar': 8,
      'Asia/Jayapura': 9
    };
    const offsetHoursForDay = TZ_OFFSET[tzForDay] ?? 7;
    const offsetSignForDay = offsetHoursForDay >= 0 ? '+' : '-';
    const offsetForDay = `${offsetSignForDay}${String(Math.abs(offsetHoursForDay)).padStart(2, '0')}:00`;
    const dayIso = new Intl.DateTimeFormat('sv-SE', { timeZone: tzForDay }).format(tgl);
    const startDay = new Date(`${dayIso}T00:00:00.000${offsetForDay}`);
    const endDay = new Date(`${dayIso}T23:59:59.999${offsetForDay}`);

    const existingSame = await prisma.sesiAbsensi.findFirst({
      where: {
        tenant_id: tenantId,
        kelas_id,
        jenis_kegiatan,
        tanggal: { gte: startDay, lte: endDay },
        waktu_mulai: mulai,
        ...(guruIdToUse ? { guru_id: guruIdToUse } : { guru_id: null }),
      },
      select: { id: true, status: true, kelas_id: true, tanggal: true, waktu_mulai: true, guru_id: true, jenis_kegiatan: true },
    });

    if (existingSame) {
      const existingFull = await prisma.sesiAbsensi.findFirst({
        where: { id: existingSame.id, tenant_id: tenantId },
        select: {
          id: true,
          kelas_id: true,
          guru_id: true,
          tanggal: true,
          waktu_mulai: true,
          tahun_pelajaran_id: true,
          semester_id: true,
        }
      });

      if (existingFull && existingFull.guru_id) {
        const existsAbsenGuru = await prisma.absenGuru.findFirst({
          where: { tenant_id: tenantId, sesi_id: existingFull.id, guru_id: existingFull.guru_id },
          select: { id: true }
        });
        if (!existsAbsenGuru) {
          await prisma.absenGuru.create({
            data: {
              tenant_id: tenantId,
              sesi_id: existingFull.id,
              guru_id: existingFull.guru_id,
              status: 'Belum Hadir',
              waktu_tap: null,
              tahun_pelajaran_id: existingFull.tahun_pelajaran_id,
              semester_id: existingFull.semester_id,
            },
          });
        }
      }

      if (existingFull) {
        await propagateGateAbsencesForNewSessionCommand({
          tenantId,
          startDay,
          endDay,
          kelasId: existingFull.kelas_id,
          session: existingFull,
          waktuMulaiFallback: existingFull.waktu_mulai,
        });
      }

      return existingSame;
    }

    let tahunPelajaranIdToUse = tahun_pelajaran_id;
    let semesterIdToUse = semester_id;

    if (tahun_pelajaran_id) {
      const tahunEntity = await prisma.tahunPelajaran.findFirst({ where: { id: String(tahun_pelajaran_id), tenant_id: tenantId } });
      if (!tahunEntity) throw new Error('Tahun Pelajaran tidak valid');
      tahunPelajaranIdToUse = tahunEntity.id;
    }

    if (semester_id) {
      const semesterEntity = await prisma.semester.findFirst({ where: { id: String(semester_id), tenant_id: tenantId } });
      if (!semesterEntity) throw new Error('Semester tidak valid');
      semesterIdToUse = semesterEntity.id;
    }

    if (!tahunPelajaranIdToUse) {
      const activeYear = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });
      if (!activeYear) throw new Error('Tahun Pelajaran aktif tidak ditemukan');
      tahunPelajaranIdToUse = activeYear.id;
    }

    if (!semesterIdToUse) {
      const activeSemester = await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true, tahun_pelajaran_id: tahunPelajaranIdToUse } });
      if (!activeSemester) throw new Error('Semester aktif tidak ditemukan');
      semesterIdToUse = activeSemester.id;
    }

    const overlapExists = await prisma.sesiAbsensi.findFirst({
      where: {
        tenant_id: tenantId,
        kelas_id,
        tanggal: { gte: startDay, lte: endDay },
        AND: [
          { waktu_mulai: { lt: selesai } },
          { OR: [{ waktu_selesai: null }, { waktu_selesai: { gt: mulai } }] }
        ]
      },
      select: { id: true, status: true }
    });
    if (overlapExists && String(overlapExists.status).toUpperCase() !== 'SELESAI') {
      throw new Error('Sesi lain bertumpang tindih');
    }

    const created = await prisma.sesiAbsensi.create({
      data: {
        tenant_id: tenantId,
        kelas_id,
        guru_id: guruIdToUse,
        mapel_id: mapel_id || null,
        jenis_kegiatan: resolvedNama,
        tanggal: tgl,
        waktu_mulai: mulai,
        waktu_selesai: selesai,
        tahun_pelajaran_id: tahunPelajaranIdToUse,
        semester_id: semesterIdToUse,
        created_by_user_id: (userId && isUUID(userId)) ? userId : null,
        status: 'BERLANGSUNG',
        sumber_sesi: sumber_sesi || 'MANUAL',
        jadwal_kbm_id: resolvedJadwalKBMId || null,
        keterangan: payload.keterangan || null,
      },
    });

    if (guruIdToUse) {
      await prisma.absenGuru.create({
        data: {
          tenant_id: tenantId,
          sesi_id: created.id,
          guru_id: guruIdToUse,
          status: 'Belum Hadir',
          waktu_tap: null,
          tahun_pelajaran_id: created.tahun_pelajaran_id,
          semester_id: created.semester_id,
        },
      });
      sendGuruNotification({ tenantId, guruId: guruIdToUse, kelasId: kelas_id, mapelId: mapel_id, tgl, mulai, sesiId: created.id });
    }

    await prisma.activityLog.create({
      data: {
        tenant_id: tenantId,
        user_id: (userId && isUUID(userId)) ? userId : null,
        action: 'SESI_CREATE',
        entity: 'SesiAbsensi',
        entity_id: created.id,
        metadata: JSON.stringify({ kelas_id, guru_id, jenis_kegiatan: resolvedNama, tanggal: tgl.toISOString().slice(0, 10) })
      }
    });

    await propagateGateAbsencesForNewSessionCommand({
      tenantId,
      startDay,
      endDay,
      kelasId: kelas_id,
      session: created,
      waktuMulaiFallback: mulai,
    });

    // 11. Inheritance Attendance Logic (Pull)
    // Jika sesi KBM baru dibuat, cek apakah ada sesi PEMBIASAAN yang tumpang tindih untuk diwariskan kehadirannya
    void (async () => {
      try {
        await this.pullAttendanceFromOverlappingPembiasaan(tenantId, created);
      } catch (e) {
        console.error('[SesiService] pullAttendanceFromOverlappingPembiasaan failed', e);
      }
    })();

    void cacheInvalidationService.invalidateAttendanceCache(tenantId);

    return created;
  }

  async list(tenantId: string, org: any, query: any) {
    const { tanggal, kelas_id, jenis_kegiatan, tahun_pelajaran_id, semester_id } = query;

    let dateFilter: { gte: Date; lte: Date } | undefined;
    if (tanggal) {
        const cfgSess = await systemConfigService.getActive(tenantId);
        const tz = String(cfgSess?.timezone || 'Asia/Jakarta').trim();
        const TZ_OFFSET: Record<string, number> = {
          'Asia/Jakarta': 7,
          'Asia/Makassar': 8,
          'Asia/Jayapura': 9
        };
        const offsetHours = TZ_OFFSET[tz] ?? 7;
        const offsetSign = offsetHours >= 0 ? '+' : '-';
        const offsetStr = `${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;
        const dayStr = String(tanggal);
        const start = new Date(`${dayStr}T00:00:00.000${offsetStr}`);
        const end = new Date(`${dayStr}T23:59:59.999${offsetStr}`);
        dateFilter = { gte: start, lte: end };
    }

    // Injected Filters from Organization Engine / Guard
    let allowed = (org && org.tenant_wide !== true) ? (Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : []) : null;

    if (query.allowedKelasIds && Array.isArray(query.allowedKelasIds)) {
      allowed = query.allowedKelasIds.map((x: any) => String(x));
    }
    
    // Use guruIdFilter from query if provided by SesiGuard, otherwise fallback to org logic
    let guruIdFilterFinal = query.guruIdFilter;

    // Resolve guru ID directly if only_me or guru_id=me is specified
    if (query.only_me === 'true' || query.only_me === true || query.guru_id === 'me') {
      const currentUserId = query.currentUserId || org?.user_id || query.userId;
      if (currentUserId) {
        const guruRec = await prisma.guru.findFirst({
          where: { tenant_id: tenantId, OR: [{ user_id: String(currentUserId) }, { id: String(currentUserId) }] },
          select: { id: true }
        });
        if (guruRec) {
          guruIdFilterFinal = guruRec.id;
        }
      }
    } else if (!guruIdFilterFinal && org && org.is_guru && org.user_id && org.tenant_wide !== true) {
       guruIdFilterFinal = { User: { id: org.user_id } };
    }

    // Direct filter from query, merge with allowed
    let kelasFilter: any = kelas_id;
    if (org?.tenant_wide === true) {
        kelasFilter = kelas_id || undefined;
    } else if (allowed !== null) {
      if (kelasFilter) {
          if (!allowed.includes(String(kelasFilter))) {
              return [];
          }
      } else {
          kelasFilter = { in: allowed };
      }
    }

    const whereClause: any = {
      tenant_id: tenantId,
      ...(dateFilter && { tanggal: dateFilter }),
      ...(jenis_kegiatan && { jenis_kegiatan }),
      ...(tahun_pelajaran_id && { tahun_pelajaran_id: String(tahun_pelajaran_id) }),
      ...(semester_id && { semester_id: String(semester_id) }),
    };

    if (guruIdFilterFinal) {
      if (typeof guruIdFilterFinal === 'string') {
        whereClause.guru_id = guruIdFilterFinal;
      } else {
        whereClause.Guru = guruIdFilterFinal;
      }
      if (kelasFilter) {
        whereClause.kelas_id = kelasFilter;
      }
    } else if (org?.tenant_wide === true) {
      if (kelasFilter) {
        whereClause.kelas_id = kelasFilter;
      }
    } else {
      whereClause.OR = [
        {
          AND: [
            kelasFilter ? { kelas_id: kelasFilter } : {},
            guruIdFilterFinal ? { guru_id: guruIdFilterFinal } : {}
          ]
        },
        guruIdFilterFinal ? { guru_id: guruIdFilterFinal } : { id: 'impossible-id' }
      ];
    }

    const sessions = await prisma.sesiAbsensi.findMany({
      where: whereClause,
      include: {
        Semester: { select: { id: true, nama_semester: true } },
        TahunPelajaran: { select: { id: true, tahun: true } },
        Kelas: { 
          include: {
            Jurusan: { select: { id: true, nama: true } }
          }
        },
        Guru: { select: { id: true, nama_guru: true } },
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        ProgresMateri: true,
        AbsenGuru: {
          select: {
            id: true,
            status: true,
            waktu_tap: true,
            is_terlambat: true
          }
        },
        _count: {
          select: { AbsenSiswa: true }
        }
      },
      orderBy: { waktu_mulai: 'asc' },
    });

    if (sessions.length > 0) {
      const now = new Date();
      const expiredIds = sessions
        .filter((s: any) => s?.waktu_selesai && String(s?.status || '').toUpperCase() !== 'SELESAI' && now > new Date(s.waktu_selesai))
        .map((s: any) => String(s.id));

      if (expiredIds.length > 0) {
        await Promise.all(expiredIds.map(async (id) => {
          try {
            await prisma.sesiAbsensi.update({
              where: { id, tenant_id: tenantId },
              data: { 
                status: 'SELESAI',
                is_auto_closed: true 
              },
            });
            await this.finalizeSessionAndNotify(tenantId, id);
          } catch (e) {
            console.warn(`Passive close for session ${id} failed`, e);
          }
        }));

        (sessions as any[]).forEach((s: any) => {
          if (expiredIds.includes(String(s.id))) s.status = 'SELESAI';
        });
      }

      // If summary is requested, use enrichWithSummary for detailed status (teacher, live, etc.)
      if (query.summary === 'true' || query.summary === true) {
        const enriched = await this.enrichWithSummary(tenantId, sessions);
        enriched.forEach((s: any) => {
          s.summary = {
            HADIR: s._summary.hadir,
            hadir: s._summary.hadir,
            TOTAL: s._summary.total,
            total: s._summary.total
          };
        });
        return this.attachJenisKegiatanMeta(tenantId, enriched);
      } else {
        // Fallback to basic summary if not explicitly requested
        const summaryResults = await Promise.all(sessions.map(async (s) => {
          const counts = await prisma.absenSiswa.groupBy({
            by: ['status'],
            where: { sesi_id: s.id, tenant_id: tenantId },
            _count: true
          });
          const summary: any = { total: (s as any)._count?.AbsenSiswa || 0 };
          counts.forEach((c: any) => { summary[c.status] = c._count; });
          return { id: s.id, summary };
        }));
        const summaryMap = new Map(summaryResults.map(r => [r.id, r.summary]));
        
        (sessions as any[]).forEach((s: any) => {
          s.summary = summaryMap.get(s.id) || { total: 0 };
        });
      }
    }

    return this.attachJenisKegiatanMeta(tenantId, sessions);
  }

  async updateStatus(tenantId: string, _org: any, sesiId: string, status: string) {

    // Auth Logic handled by Guard (ensureCanManageSesi)
    // Sesi existence checked by Guard, but we need details for Redis/Closing
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesiId, tenant_id: tenantId },
      select: { id: true, kelas_id: true, guru_id: true, tanggal: true, Kelas: { select: { nama_kelas: true } } }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    const updated = await prisma.sesiAbsensi.update({ 
      where: { id: sesiId }, 
      data: { 
        status,
        is_auto_closed: false
      } 
    });

    this.publishRedisEvent('events:sesi_status_update', {
      tenant_id: tenantId,
      sesi_id: sesiId,
      status,
      kelas_id: sesi.kelas_id,
      timestamp: new Date().toISOString(),
    });

    if (status === 'SELESAI') {
      await this.handleSessionClose(tenantId, sesiId, sesi);
    }

    void cacheInvalidationService.invalidateAttendanceCache(tenantId);

    return updated;
  }

  async update(tenantId: string, org: any, id: string, data: any) {
    // Auth Logic handled by Guard

    // Convert strings to Dates if needed
    const updateData: any = { ...data };
    if (data.tanggal) updateData.tanggal = new Date(data.tanggal);
    if (data.waktu_mulai) updateData.waktu_mulai = new Date(data.waktu_mulai);
    if (data.waktu_selesai) updateData.waktu_selesai = new Date(data.waktu_selesai);

    // Extract ProgresMateri if present
    const { progres_materi, ...rest } = updateData;

    const updated = await prisma.sesiAbsensi.update({
      where: { id, tenant_id: tenantId },
      data: rest,
      include: { ProgresMateri: true }
    });

    if (progres_materi) {
      await this.upsertProgresMateri(tenantId, org, id, progres_materi);
    }

    return updated;
  }

  async upsertProgresMateri(tenantId: string, _org: any, sesiId: string, payload: any) {
    const { judul_materi, deskripsi, pencapaian_persen, kendala } = payload;

    return prisma.progresMateri.upsert({
      where: { sesi_id: sesiId },
      create: {
        tenant_id: tenantId,
        sesi_id: sesiId,
        judul_materi: judul_materi || 'Materi Baru',
        deskripsi,
        pencapaian_persen: Number(pencapaian_persen) || 0,
        kendala
      },
      update: {
        judul_materi,
        deskripsi,
        pencapaian_persen: Number(pencapaian_persen),
        kendala
      }
    });
  }

  async remove(tenantId: string, _org: any, id: string, userId: string) {
    // Auth Logic handled by Guard

    await prisma.$transaction([
      prisma.absenSiswa.deleteMany({ where: { tenant_id: tenantId, sesi_id: id } }),
      prisma.absenGuru.deleteMany({ where: { tenant_id: tenantId, sesi_id: id } }),
      prisma.sesiAbsensi.delete({ where: { id, tenant_id: tenantId } })
    ]);

    await prisma.activityLog.create({ data: { tenant_id: tenantId, user_id: (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) ? userId : null, action: 'SESI_DELETE', entity: 'SesiAbsensi', entity_id: id, metadata: JSON.stringify({ id }) } });

    return { id };
  }

  async updateAbsenGuru(tenantId: string, _org: any, id: string, guruId: string, data: any) {
    const { status, catatan } = data;

    // Auth Logic handled by Guard
    const sesi = await prisma.sesiAbsensi.findFirst({ where: { id, tenant_id: tenantId }, select: { id: true, guru_id: true, kelas_id: true, status: true, waktu_mulai: true, waktu_selesai: true, tahun_pelajaran_id: true, semester_id: true } });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    const statusUpper = String(sesi.status || '').toUpperCase();
    const now = new Date();
    const isExpired = sesi.waktu_selesai && now > new Date(sesi.waktu_selesai);

    if (statusUpper === 'SELESAI' || isExpired) {
      if (isExpired && statusUpper !== 'SELESAI') {
        try { await this.updateStatus(tenantId, _org, id, 'SELESAI'); } catch {}
      }
      throw new Error('Forbidden: Sesi sudah ditutup atau waktu mengajar sudah habis. Transaksi ditolak.');
    }

    // Validasi waktu mulai: maksimal 15 menit sebelum sesi dimulai
    if (sesi.waktu_mulai) {
      const startTime = new Date(sesi.waktu_mulai).getTime();
      const earlyThreshold = startTime - 15 * 60 * 1000;
      if (now.getTime() < earlyThreshold) {
        throw new Error('Forbidden: Sesi KBM belum dimulai. Absensi hanya dapat dilakukan maksimal 15 menit sebelum kelas dimulai.');
      }
    }

    if (!sesi.guru_id) throw new Error('Forbidden: sesi tidak memiliki guru untuk dikonfirmasi');
    if (String(sesi.guru_id) !== String(guruId)) throw new Error('Forbidden: guru tidak sesuai dengan sesi');

    const existing = await prisma.absenGuru.findFirst({ where: { tenant_id: tenantId, sesi_id: id, guru_id: guruId } });
    if (!existing) throw new Error('Absen guru tidak ditemukan');
    
    // Hitung keterlambatan Guru
    const cfg = await systemConfigService.getActive(tenantId);
    const thresholdLate = Number((cfg as any)?.default_late_threshold || 5);
    const diffMs = now.getTime() - (sesi.waktu_mulai ? (sesi.waktu_mulai as Date).getTime() : now.getTime());
    const lateMinutes = Math.max(0, Math.floor(diffMs / 60000));
    const isTerlambat = lateMinutes >= thresholdLate;

    const normalizedStatus = status ? (String(status).toUpperCase() === 'HADIR' ? 'Hadir / Mengajar' : status) : 'Hadir / Mengajar';

    // Hitung poin kehadiran Guru
    const rawStatus = normalizedStatus.toUpperCase();
    let poinKehadiran = 0;
    if (rawStatus.includes('HADIR') || rawStatus.includes('MENGAJAR')) {
      poinKehadiran = isTerlambat ? ATTENDANCE_POINTS.HADIR_TERLAMBAT : ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;
    } else if (rawStatus.includes('SAKIT')) {
      poinKehadiran = ATTENDANCE_POINTS.SAKIT;
    } else if (rawStatus.includes('IZIN')) {
      poinKehadiran = ATTENDANCE_POINTS.IZIN;
    } else if (rawStatus.includes('DISPEN')) {
      poinKehadiran = ATTENDANCE_POINTS.DISPEN;
    } else if (rawStatus.includes('ALPA')) {
      poinKehadiran = ATTENDANCE_POINTS.ALPA;
    }

    const updated = await prisma.absenGuru.update({
      where: { id: existing.id },
      data: {
        status: normalizedStatus,
        waktu_tap: now,
        is_terlambat: isTerlambat,
        menit_keterlambatan: lateMinutes,
        poin_kehadiran: poinKehadiran,
        catatan: typeof catatan !== 'undefined' ? catatan : existing.catatan,
        updated_at: new Date(),
      },
    });

    if (String(sesi.status || '').toUpperCase() === 'DRAFT') {
      try {
        await prisma.sesiAbsensi.update({ where: { id }, data: { status: 'BERLANGSUNG' } });
        this.publishRedisEvent('events:sesi_status_update', {
          tenant_id: tenantId,
          sesi_id: id,
          status: 'BERLANGSUNG',
          kelas_id: sesi.kelas_id,
          timestamp: new Date().toISOString(),
        });
      } catch (e) { }
    }

    return updated;
  }

  async tapSiswa(tenantId: string, _org: any, sesi_id: string, data: any, userId: string) {
    let { siswa_id, siswa_akademik_id, status, rfid, device_id, catatan } = data;
    const startedAt = Date.now();
    const nowTap = new Date();

    // 0. Resolve Siswa ID from Siswa Akademik ID if provided
    if (!siswa_id && siswa_akademik_id) {
      const sa = await prisma.siswaAkademik.findFirst({
        where: { id: siswa_akademik_id },
        select: { siswa_id: true }
      });
      if (sa) siswa_id = sa.siswa_id;
    }

    // 1. Resolve Student from RFID if needed
    if (!siswa_id && rfid) {
      const siswaFound = await prisma.siswa.findFirst({
        where: { tenant_id: tenantId, no_rfid: rfid },
        select: { id: true }
      });
      if (!siswaFound) throw new Error('Kartu RFID tidak terdaftar');
      siswa_id = siswaFound.id;
    }

    // 2. Resolve Session from Device ID if sesi_id is not a valid UUID or is 'auto'
    let targetSesiId = sesi_id;
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    
    if ((!targetSesiId || !isUUID(targetSesiId) || targetSesiId === 'auto') && device_id) {
       const device = await prisma.attendanceDevice.findFirst({
         where: { tenant_id: tenantId, device_id: device_id },
         select: { kelas_id: true }
       });
       
       if (!device || !device.kelas_id) {
         throw new Error(`Perangkat '${device_id}' tidak terdaftar atau belum dihubungkan ke kelas mana pun`);
       }
       
       // 1. Cari sesi yang sedang berjalan (sekarang berada di antara waktu_mulai dan waktu_selesai)
       let activeSesi = await prisma.sesiAbsensi.findFirst({
         where: { 
           tenant_id: tenantId, 
           kelas_id: device.kelas_id, 
           status: 'BERLANGSUNG',
           waktu_mulai: { lte: nowTap },
           waktu_selesai: { gte: nowTap }
         },
         select: { id: true }
       });

       // 2. Jika tidak ada sesi aktif berjalan, cari sesi berikutnya yang akan dimulai dalam 15 menit ke depan
       if (!activeSesi) {
         const fifteenMinutesLater = new Date(nowTap.getTime() + 15 * 60 * 1000);
         activeSesi = await prisma.sesiAbsensi.findFirst({
           where: { 
             tenant_id: tenantId, 
             kelas_id: device.kelas_id, 
             status: 'BERLANGSUNG',
             waktu_mulai: {
               gte: nowTap,
               lte: fifteenMinutesLater
             }
           },
           orderBy: { waktu_mulai: 'asc' },
           select: { id: true }
         });
       }

       if (!activeSesi) throw new Error('Tidak ada sesi absensi yang aktif atau akan segera dimulai untuk kelas ini');
       targetSesiId = activeSesi.id;
    }

    if (!siswa_id) throw new Error('Siswa tidak teridentifikasi');
    if (!targetSesiId || !isUUID(targetSesiId)) throw new Error('Sesi tidak ditemukan atau ID tidak valid');

    // ── Distributed Idempotency Lock ─────────────────────────────────────────────
    // Apapun metode input (RFID, QR, HID keyboard) — 1 siswa + 1 sesi = 1 record.
    // Redis SETNX mencegah burst <5s masuk ke DB.
    const tapLockKey = `absenta:sesi_tap_lock:${tenantId}:${targetSesiId}:${siswa_id}`;
    try {
      const redis = getRedisConnection();
      const lockResult = await redis.set(tapLockKey, '1', 'EX', 5, 'NX');
      if (lockResult !== 'OK') {
        // Burst tap — kembalikan record yang sudah ada
        const lockedExisting = await prisma.absenSiswa.findFirst({
          where: { tenant_id: tenantId, sesi_id: targetSesiId, siswa_id },
        });
        if (lockedExisting) {
          console.log(`[SesiService] 🔒 Tap sesi ditolak Redis lock (burst): sesi=${targetSesiId} siswa=${siswa_id}`);
          return lockedExisting;
        }
      }
    } catch (redisErr) {
      // Redis tidak tersedia — lanjut, DB constraint tetap menjaga
      console.warn('[SesiService] Redis lock unavailable, falling back to DB upsert:', redisErr);
    }
    // ──────────────────────────────────────────────────────────────────────────

    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: targetSesiId, tenant_id: tenantId },
      select: {
        id: true,
        kelas_id: true,
        guru_id: true,
        status: true,
        jenis_kegiatan: true,
        tanggal: true,
        waktu_mulai: true,
        waktu_selesai: true,
        tahun_pelajaran_id: true,
        semester_id: true,
        Mapel: { select: { nama_mapel: true } },
        Kelas: { select: { nama_kelas: true } }
      }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan di database');

    const statusUpperSesi = String(sesi.status || '').toUpperCase();
    const isExpiredSesi = sesi.waktu_selesai && nowTap > new Date(sesi.waktu_selesai);

    if (statusUpperSesi === 'SELESAI' || isExpiredSesi) {
      if (isExpiredSesi && statusUpperSesi !== 'SELESAI') {
        try { await this.updateStatus(tenantId, _org, targetSesiId, 'SELESAI'); } catch {}
      }
      throw new Error('Forbidden: Sesi sudah ditutup atau waktu mengajar sudah habis. Transaksi ditolak.');
    }

    // Validasi waktu mulai: maksimal 15 menit sebelum sesi dimulai
    if (sesi.waktu_mulai) {
      const startTime = new Date(sesi.waktu_mulai).getTime();
      const earlyThreshold = startTime - 15 * 60 * 1000;
      if (nowTap.getTime() < earlyThreshold) {
        throw new Error('Forbidden: Sesi KBM belum dimulai. Absensi hanya dapat dilakukan maksimal 15 menit sebelum kelas dimulai.');
      }
    }

    const cfgForDay = await systemConfigService.getActive(tenantId);
    const tzForDay = String(cfgForDay?.timezone || 'Asia/Jakarta').trim();
    const TZ_OFFSET: Record<string, number> = {
      'Asia/Jakarta': 7,
      'Asia/Makassar': 8,
      'Asia/Jayapura': 9
    };
    const offsetHoursForDay = TZ_OFFSET[tzForDay] ?? 7;
    const offsetSignForDay = offsetHoursForDay >= 0 ? '+' : '-';
    const offsetForDay = `${offsetSignForDay}${String(Math.abs(offsetHoursForDay)).padStart(2, '0')}:00`;

    // Resolve local date ISO string (e.g. "2026-07-28") based on tenant timezone
    const getLocalDayIso = (d: Date) => {
      return new Intl.DateTimeFormat('sv-SE', { timeZone: tzForDay }).format(new Date(d));
    };

    const todayLocalIso = getLocalDayIso(nowTap);
    const sesiLocalIso = (sesi as any).tanggal ? getLocalDayIso(new Date((sesi as any).tanggal)) : todayLocalIso;

    // Check gate tap for today's date first, then fallback to session date
    let gateTap: { id: string } | null = null;
    const targetDayIsos = Array.from(new Set([todayLocalIso, sesiLocalIso]));

    for (const targetDayIso of targetDayIsos) {
      if (gateTap) break;

      try {
        const redis = getRedisConnection();
        const key = `absenta:gate_present:${tenantId}:${targetDayIso}:${siswa_id}`;
        const val = await redis.get(key);
        if (val === '1') gateTap = { id: 'cache' };
      } catch { }

      if (!gateTap) {
        const startOfDay = new Date(`${targetDayIso}T00:00:00.000${offsetForDay}`);
        const endOfDay = new Date(`${targetDayIso}T23:59:59.999${offsetForDay}`);

        const gateSession = await cacheService.getOrSet(
          CACHE_KEYS.ATTENDANCE.SESSIONS(tenantId, targetDayIso),
          async () => prisma.sesiGerbang.findFirst({
            where: { tenant_id: tenantId, tanggal: { gte: startOfDay, lte: endOfDay } },
            select: { id: true },
          }),
          CACHE_TTL.REAL_TIME
        );
        gateTap = gateSession ? await prisma.absenGerbangSiswa.findFirst({
          where: { tenant_id: tenantId, sesi_gerbang_id: gateSession.id, siswa_id, arah: { in: [JenisTap.GERBANG_DATANG, 'MASUK'] } },
          select: { id: true },
        }) : null;
      }
    }

    const currentMode = await getEffectiveAbsensiMode(tenantId);
    if (!gateTap && currentMode === 'MULTI_SESI') {
      throw new Error('Siswa tidak teridentifikasi: Belum melakukan absensi di Gerbang hari ini.');
    }
    const asalGerbang = !!gateTap;

    const [siswa, activeYear] = await Promise.all([
      prisma.siswa.findFirst({ where: { id: siswa_id, tenant_id: tenantId, kelas_id: sesi.kelas_id, status: 'AKTIF' }, include: { Kelas: { select: { nama_kelas: true, tingkat: true } } } }),
      cacheService.getOrSet(
        CACHE_KEYS.ACADEMIC.TAHUN_PELAJARAN(tenantId),
        async () => prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } }),
        300
      )
    ]);
    if (!siswa) throw new Error('Siswa tidak ditemukan atau bukan anggota kelas sesi');

    const activeSemester = await cacheService.getOrSet(
      CACHE_KEYS.ACADEMIC.SEMESTER(tenantId),
      async () => prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true, tahun_pelajaran_id: activeYear?.id || '' } }),
      300
    );

    const siswaAkademik = await prisma.siswaAkademik.findFirst({
      where: { siswa_id, tahun_pelajaran_id: activeYear?.id || '', semester_id: activeSemester?.id || '' },
      select: { id: true, tahun_pelajaran_id: true, semester_id: true, status: true },
    });
    if (!siswaAkademik) throw new Error('Siswa tidak memiliki status akademik aktif pada semester ini');
    if (String(siswaAkademik.status) !== 'AKTIF') throw new Error(`Siswa status '${siswaAkademik.status}' (tidak AKTIF). Transaksi ditolak.`);

    if (String(siswaAkademik.tahun_pelajaran_id) !== String(sesi.tahun_pelajaran_id) || String(siswaAkademik.semester_id) !== String(sesi.semester_id)) {
      throw new Error('Konteks akademik tidak konsisten');
    }

    const thresholdLate = Number((cfgForDay as any)?.default_late_threshold || 5);
    const diffMsTap = nowTap.getTime() - (sesi.waktu_mulai ? (sesi.waktu_mulai as Date).getTime() : nowTap.getTime());
    const lateMinutesComputed = Math.max(0, Math.floor(diffMsTap / 60000));
    // Hitung status: jika terlambat > threshold, status HADIR tapi flag is_terlambat=true
    // Kecuali jika user kirim status eksplisit (IZIN/SAKIT/dll)
    let finalStatus = status as AbsenStatus;
    let isTerlambat = false;
    let poin = ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;

    if (!finalStatus) {
      // Default HADIR
      finalStatus = AbsenStatus.HADIR;

      if (lateMinutesComputed >= thresholdLate) {
        isTerlambat = true;
        poin = ATTENDANCE_POINTS.HADIR_TERLAMBAT;
      }
    } else {
      // Jika status eksplisit (IZIN, SAKIT, ALPA, DISPEN)
      const statusUpper = String(finalStatus).toUpperCase();
      if (statusUpper === 'HADIR') {
        if (lateMinutesComputed >= thresholdLate) {
          isTerlambat = true;
          poin = ATTENDANCE_POINTS.HADIR_TERLAMBAT;
        } else {
          poin = ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;
        }
      } else if (statusUpper === 'SAKIT') {
        poin = ATTENDANCE_POINTS.SAKIT;
      } else if (statusUpper === 'IZIN') {
        poin = ATTENDANCE_POINTS.IZIN;
      } else if (statusUpper === 'DISPEN') {
        poin = ATTENDANCE_POINTS.DISPEN;
      } else if (statusUpper === 'ALPA') {
        poin = ATTENDANCE_POINTS.ALPA;
      } else {
        poin = 0; // Default fallback
      }
    }

    const existing = await prisma.absenSiswa.findFirst({
      where: { tenant_id: tenantId, sesi_id: sesi_id, siswa_akademik_id: siswaAkademik.id },
      select: { id: true, status: true, waktu_tap: true, created_at: true, catatan: true, is_terlambat: true },
    });

    // VALIDASI: Cegah override status non-hadir (SAKIT, IZIN, ALPA, DISPEN) jika scan biasa (status tidak eksplisit)
    if (existing && !status) {
      const protectedStatuses = ['SAKIT', 'IZIN', 'ALPA', 'DISPEN'];
      const currentStatusUpper = String(existing.status || '').toUpperCase();
      if (protectedStatuses.includes(currentStatusUpper)) {
        throw new Error(`Scan ditolak: status siswa tercatat ${currentStatusUpper}.`);
      }
    }

    // LOGIKA PERLINDUNGAN STATUS (Mencegah Downgrade)
    let finalStatusToSave = finalStatus;
    let isTerlambatToSave = isTerlambat;
    let lateMinutesToSave = isTerlambat ? lateMinutesComputed : 0;
    let poinToSave = poin;
    let catatanToSave = catatan ? String(catatan).trim() : (existing?.catatan || null);

    if (existing) {
      const isAlreadyHadir = String(existing.status).toUpperCase() === 'HADIR';
      const isAlreadyOnTime = !existing.is_terlambat;

      // Jika sudah Hadir dan Tepat Waktu (mungkin via inheritance), jangan buat jadi Terlambat jika tap manual telat
      if (isAlreadyHadir && isAlreadyOnTime && isTerlambat) {
        isTerlambatToSave = false;
        lateMinutesToSave = 0;
        poinToSave = ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;
      }
      
      // Jika tap manual, tambahkan info di catatan tanpa menghapus info inheritance
      if (catatanToSave && !catatanToSave.includes('Konfirmasi Tap Manual')) {
        catatanToSave = `${catatanToSave} (Konfirmasi Tap Manual)`;
      }
    }

    let updated;
    try {
      if (existing) {
        updated = await prisma.absenSiswa.update({
          where: { id_created_at: { id: existing.id, created_at: existing.created_at } },
          data: {
            status: finalStatusToSave,
            waktu_tap: nowTap,
            is_terlambat: isTerlambatToSave,
            menit_keterlambatan: lateMinutesToSave,
            poin_kehadiran: poinToSave,
            catatan: catatanToSave,
            updated_at: new Date()
          }
        });
      } else {
        // UPSERT — idempoten untuk semua metode input (RFID, QR, HID, manual)
        // Jika race condition lolos Redis lock, DB constraint mencegah duplikat
        updated = await prisma.absenSiswa.upsert({
          where: {
            sesi_id_siswa_akademik_id: {
              sesi_id: sesi_id,
              siswa_akademik_id: siswaAkademik.id,
            }
          },
          create: {
            tenant_id: tenantId,
            sesi_id: sesi_id,
            siswa_id,
            siswa_akademik_id: siswaAkademik.id,
            status: finalStatus,
            waktu_tap: nowTap,
            catatan: catatanToSave,
            asal_gerbang: asalGerbang,
            is_terlambat: isTerlambat,
            menit_keterlambatan: isTerlambat ? lateMinutesComputed : 0,
            poin_kehadiran: poin,
            kelas_id_snapshot: siswa.kelas_id || null,
            kelas_nama_snapshot: siswa.Kelas?.nama_kelas || null,
            tingkat_snapshot: siswa.Kelas?.tingkat ?? null,
            tahun_pelajaran_id_snapshot: activeYear?.id || null,
          },
          update: {
            // Jika sudah ada (race winner), update waktu tap saja
            waktu_tap: nowTap,
            updated_at: new Date(),
          },
        });
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Safety net terakhir — seharusnya tidak pernah sampai sini
        const retryExisting = await prisma.absenSiswa.findFirst({
          where: { tenant_id: tenantId, sesi_id: sesi_id, siswa_akademik_id: siswaAkademik.id },
          select: { id: true, status: true, waktu_tap: true, created_at: true, catatan: true, is_terlambat: true },
        });
        if (retryExisting) {
          if (!status) {
            const protectedStatuses = ['SAKIT', 'IZIN', 'ALPA', 'DISPEN'];
            const currentStatusUpper = String(retryExisting.status || '').toUpperCase();
            if (protectedStatuses.includes(currentStatusUpper)) {
              throw new Error(`Scan ditolak: status siswa tercatat ${currentStatusUpper}.`);
            }
          }
          updated = await prisma.absenSiswa.update({
            where: { id_created_at: { id: retryExisting.id, created_at: retryExisting.created_at } },
            data: { status: finalStatusToSave, waktu_tap: nowTap, is_terlambat: isTerlambatToSave,
                    menit_keterlambatan: lateMinutesToSave, poin_kehadiran: poinToSave, catatan: catatanToSave, updated_at: new Date() }
          });
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    this.publishRedisEvent('events:session_attendance_update', {
      tenant_id: tenantId,
      sesi_id: sesi_id,
      record: { id: updated.id, siswa_id, status: updated.status, waktu_tap: updated.waktu_tap }
    });

    // Late/ALPA Notification
    handleLateOrAlpaNotification({ tenantId, sesiFull: sesi, siswa, updated, lateMinutes: lateMinutesComputed });

    // Parent Notification (Queue)
    await emitDomainEvent({
      event_type: 'attendance.session.tap',
      tenant_id: tenantId,
      source_service: 'attendance',
      payload: {
        tenant_id: tenantId,
        student_id: siswa_id,
        device_id: null,
        tap_time: updated.waktu_tap ? updated.waktu_tap.toISOString() : new Date().toISOString(),
        source: 'SESSION',
        related_id: updated.id,
        sesi_id: sesi_id,
        status: finalStatus,
        mapel: sesi.Mapel?.nama_mapel || sesi.jenis_kegiatan || 'Kelas',
        notification_hint: 'SESSION_PRESENT',
      },
    });

    void (async () => {
      try {
        await prisma.activityLog.create({
          data: {
            tenant_id: tenantId,
            user_id: (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) ? userId : null,
            action: 'SESI_TAP_SISWA',
            entity: 'AbsenSiswa',
            entity_id: `${sesi_id}-${siswa_id}`,
            metadata: JSON.stringify({ sesi_id, siswa_id, status: finalStatus, timestamp: new Date().toISOString() }),
          },
        });
      } catch (e) {
        console.error('[SesiService] activityLog write failed for tapSiswa', e);
      }
    })();

    const totalMs = Date.now() - startedAt;
    try {
      const thresholdSessionMs = 400;
      const isPeakHour = () => {
        const now = new Date();
        const hour = now.getHours();
        return (hour >= 6 && hour < 9) || (hour >= 11 && hour < 14);
      };
      console.log('[ATTENDANCE_SESSION_TAP_METRIC]', {
        tenant_id: tenantId,
        sesi_id,
        siswa_id,
        total_ms: totalMs,
        late_minutes: lateMinutesComputed,
        status: finalStatus,
        asal_gerbang: asalGerbang,
      });
      if (isPeakHour() && totalMs > thresholdSessionMs) {
        console.warn('[ATTENDANCE_LATENCY_ALERT]', {
          tenant_id: tenantId,
          source: 'SESSION',
          total_ms: totalMs,
          threshold_ms: thresholdSessionMs,
          timestamp: new Date().toISOString(),
        });
      }
    } catch { }
    attendanceMetricsAggregator.record(tenantId, 'SESSION', totalMs);

    // 10. Inheritance Attendance Logic
    // Jika sesi ini adalah PEMBIASAAN, wariskan kehadiran ke sesi KBM yang tumpang tindih
    void (async () => {
      try {
        await this.syncAttendanceToOverlappingSessions(
          tenantId,
          sesi,
          siswa_id,
          siswaAkademik.id,
          finalStatus,
          nowTap,
          String(sesi.tahun_pelajaran_id),
          String(sesi.semester_id),
          {
            is_terlambat: isTerlambat,
            menit_keterlambatan: isTerlambat ? lateMinutesComputed : 0,
            poin_kehadiran: poin,
            asal_gerbang: asalGerbang,
            kelas_id_snapshot: siswa.kelas_id || null,
            kelas_nama_snapshot: siswa.Kelas?.nama_kelas || null,
            tingkat_snapshot: siswa.Kelas?.tingkat ?? null,
            tahun_pelajaran_id_snapshot: activeYear?.id || null,
          }
        );
      } catch (e) {
        console.error('[SesiService] syncAttendanceToOverlappingSessions failed', e);
      }
    })();

    return updated;
  }

  private async syncAttendanceToOverlappingSessions(
    tenantId: string,
    sourceSesi: any,
    siswaId: string,
    siswaAkademikId: string,
    status: string,
    waktuTap: Date,
    _tahunPelajaranId: string,
    _semesterId: string,
    snapshots: any
  ) {
    // 1. Cek apakah sesi asal adalah tipe PEMBIASAAN
    // Kita cari master data jenis kegiatan untuk mendapatkan tipenya
    const jkMaster = await prisma.jenisKegiatanMaster.findFirst({
      where: { tenant_id: tenantId, nama: sourceSesi.jenis_kegiatan }
    });

    // Hanya wariskan jika tipenya PEMBIASAAN (seperti Ketarunaan, Upacara, dll)
    if (!jkMaster || jkMaster.tipe !== 'PEMBIASAAN') return;

    // 2. Cari sesi KBM di kelas yang sama pada hari yang sama yang tumpang tindih waktunya
    const overlappingSessions = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: sourceSesi.kelas_id,
        tanggal: sourceSesi.tanggal,
        status: 'BERLANGSUNG',
        id: { not: sourceSesi.id },
        AND: [
          // Gunakan lte/gte agar sesi yang berbatasan (misal 07:00 dan 07:00) tetap terhitung tumpang tindih
          { waktu_mulai: { lte: sourceSesi.waktu_selesai || new Date(sourceSesi.waktu_mulai.getTime() + 60 * 60 * 1000) } },
          { OR: [{ waktu_selesai: null }, { waktu_selesai: { gte: sourceSesi.waktu_mulai } }] }
        ]
      }
    });

    if (overlappingSessions.length === 0) return;

    // Filter hanya yang tipenya KBM
    const kbmTargetSessions = [];
    for (const s of overlappingSessions) {
      const m = await prisma.jenisKegiatanMaster.findFirst({
        where: { tenant_id: tenantId, nama: s.jenis_kegiatan }
      });
      if (m && m.tipe === 'KBM') {
        kbmTargetSessions.push(s);
      }
    }

    if (kbmTargetSessions.length === 0) return;

    const config = await systemConfigService.getActive(tenantId);
    const thresholdLate = Number(config?.default_late_threshold || 5);
    const catatan = `Hadir (Mengikuti kegiatan ${sourceSesi.jenis_kegiatan})`;

    // 3. Eksekusi sinkronisasi kehadiran
    for (const kbm of kbmTargetSessions) {
      // RE-CALCULATE Lateness for the target session
      const diffMsTarget = waktuTap.getTime() - kbm.waktu_mulai.getTime();
      const lateMinutesTarget = Math.max(0, Math.floor(diffMsTarget / 60000));
      const isTerlambatTarget = lateMinutesTarget >= thresholdLate;
      const poinTarget = isTerlambatTarget ? ATTENDANCE_POINTS.HADIR_TERLAMBAT : ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;

      const existing = await prisma.absenSiswa.findFirst({
        where: { tenant_id: tenantId, sesi_id: kbm.id, siswa_akademik_id: siswaAkademikId },
        select: { id: true, status: true, created_at: true }
      });

      if (existing) {
        // Jangan override jika status sudah SAKIT, IZIN, atau DISPEN
        const protectedStatuses = ['SAKIT', 'IZIN', 'DISPEN'];
        if (!protectedStatuses.includes(String(existing.status).toUpperCase())) {
          await prisma.absenSiswa.update({
            where: { id_created_at: { id: existing.id, created_at: existing.created_at } },
            data: {
              status: status,
              waktu_tap: waktuTap,
              catatan: catatan,
              is_terlambat: isTerlambatTarget,
              menit_keterlambatan: lateMinutesTarget,
              poin_kehadiran: poinTarget,
              updated_at: new Date()
            }
          });
        }
      } else {
        await prisma.absenSiswa.create({
          data: {
            tenant_id: tenantId,
            sesi_id: kbm.id,
            siswa_id: siswaId,
            siswa_akademik_id: siswaAkademikId,
            status: status,
            waktu_tap: waktuTap,
            catatan: catatan,
            // Copy snapshots dari sesi asal, tapi hitung ulang keterlambatan
            asal_gerbang: snapshots.asal_gerbang,
            is_terlambat: isTerlambatTarget,
            menit_keterlambatan: lateMinutesTarget,
            poin_kehadiran: poinTarget,
            kelas_id_snapshot: snapshots.kelas_id_snapshot,
            kelas_nama_snapshot: snapshots.kelas_nama_snapshot,
            tingkat_snapshot: snapshots.tingkat_snapshot,
            tahun_pelajaran_id_snapshot: snapshots.tahun_pelajaran_id_snapshot,
          }
        });
      }

      // Emit event untuk setiap sesi yang diupdate agar frontend terupdate secara real-time
      this.publishRedisEvent('events:session_attendance_update', {
        tenant_id: tenantId,
        sesi_id: kbm.id,
        record: { siswa_id: siswaId, status: status, waktu_tap: waktuTap, is_terlambat: isTerlambatTarget, catatan }
      });
    }
  }

  private async pullAttendanceFromOverlappingPembiasaan(tenantId: string, targetSesi: any) {
    // 1. Cek apakah sesi target adalah tipe KBM
    const jkTarget = await prisma.jenisKegiatanMaster.findFirst({
      where: { tenant_id: tenantId, nama: targetSesi.jenis_kegiatan }
    });
    if (!jkTarget || jkTarget.tipe !== 'KBM') return;

    // 2. Cari sesi PEMBIASAAN yang tumpang tindih pada hari dan kelas yang sama
    const overlappingSessions = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: targetSesi.kelas_id,
        tanggal: targetSesi.tanggal,
        id: { not: targetSesi.id },
        AND: [
          // Gunakan lte/gte agar sesi yang berbatasan tetap terdeteksi
          { waktu_mulai: { lte: targetSesi.waktu_selesai || new Date(targetSesi.waktu_mulai.getTime() + 60 * 60 * 1000) } },
          { OR: [{ waktu_selesai: null }, { waktu_selesai: { gte: targetSesi.waktu_mulai } }] }
        ]
      }
    });

    for (const p of overlappingSessions) {
      const jkP = await prisma.jenisKegiatanMaster.findFirst({
        where: { tenant_id: tenantId, nama: p.jenis_kegiatan }
      });

      if (jkP && jkP.tipe === 'PEMBIASAAN') {
        const attendanceRecords = await prisma.absenSiswa.findMany({
          where: { tenant_id: tenantId, sesi_id: p.id }
        });

        const config = await systemConfigService.getActive(tenantId);
        const thresholdLate = Number(config?.default_late_threshold || 5);
        const catatan = `Hadir (Mengikuti kegiatan ${p.jenis_kegiatan})`;

        for (const rec of attendanceRecords) {
          // RE-CALCULATE Lateness for the target session
          const waktuTap = rec.waktu_tap || new Date();
          const diffMsTarget = waktuTap.getTime() - targetSesi.waktu_mulai.getTime();
          const lateMinutesTarget = Math.max(0, Math.floor(diffMsTarget / 60000));
          const isTerlambatTarget = lateMinutesTarget >= thresholdLate;
          const poinTarget = isTerlambatTarget ? ATTENDANCE_POINTS.HADIR_TERLAMBAT : ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;

          const existing = await prisma.absenSiswa.findFirst({
            where: { tenant_id: tenantId, sesi_id: targetSesi.id, siswa_akademik_id: rec.siswa_akademik_id },
            select: { id: true, status: true, created_at: true }
          });

          if (existing) {
            const protectedStatuses = ['SAKIT', 'IZIN', 'DISPEN'];
            if (!protectedStatuses.includes(String(existing.status).toUpperCase())) {
              await prisma.absenSiswa.update({
                where: { id_created_at: { id: existing.id, created_at: existing.created_at } },
                data: {
                  status: rec.status,
                  waktu_tap: rec.waktu_tap,
                  catatan: catatan,
                  is_terlambat: isTerlambatTarget,
                  menit_keterlambatan: lateMinutesTarget,
                  poin_kehadiran: poinTarget,
                  updated_at: new Date()
                }
              });
            }
          } else {
            await prisma.absenSiswa.create({
              data: {
                tenant_id: tenantId,
                sesi_id: targetSesi.id,
                siswa_id: rec.siswa_id,
                siswa_akademik_id: rec.siswa_akademik_id,
                status: rec.status,
                waktu_tap: rec.waktu_tap,
                catatan: catatan,
                asal_gerbang: rec.asal_gerbang,
                is_terlambat: isTerlambatTarget,
                menit_keterlambatan: lateMinutesTarget,
                poin_kehadiran: poinTarget,
                kelas_id_snapshot: rec.kelas_id_snapshot,
                kelas_nama_snapshot: rec.kelas_nama_snapshot,
                tingkat_snapshot: rec.tingkat_snapshot,
                tahun_pelajaran_id_snapshot: rec.tahun_pelajaran_id_snapshot,
              }
            });
          }
        }
      }
    }
  }

  async listAbsenSiswa(tenantId: string, org: any, sesi_id: string, userId: string) {
    // Auth Logic
    const sesi = await prisma.sesiAbsensi.findFirst({ 
      where: { id: sesi_id, tenant_id: tenantId }, 
      select: { 
        id: true, 
        kelas_id: true, 
        guru_id: true,
        tahun_pelajaran_id: true,
        semester_id: true,
        status: true
      } 
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    // Isolate data by class if not tenant-wide
    if (org && org.tenant_wide !== true) {
      const isTeacherOfSession = userId && await prisma.guru.findFirst({ 
        where: { tenant_id: tenantId, user_id: userId, id: sesi.guru_id || '' } 
      });

      const hasClassAccess = Array.isArray(org.kelas_ids) && org.kelas_ids.includes(String(sesi.kelas_id));

      if (!hasClassAccess && !isTeacherOfSession) {
        throw new Error('Forbidden: You do not have access to this session data');
      }
    }

    // 1. Get all students registered in this class for the session's academic context
    const allStudentsInClass = await prisma.siswaAkademik.findMany({
      where: {
        kelas_id: sesi.kelas_id,
        tahun_pelajaran_id: sesi.tahun_pelajaran_id,
        semester_id: sesi.semester_id,
        status: 'AKTIF'
      },
      include: {
        siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            no_rfid: true
          }
        },
        kelas: true
      }
    }) as any[];

    // 2. Get existing attendance records
    const records = await prisma.absenSiswa.findMany({
      where: { tenant_id: tenantId, sesi_id: sesi_id },
      orderBy: { waktu_tap: 'asc' },
    });

    // 3. Merge: Map all students to an attendance status
    const recordMap = new Map(records.map(r => [r.siswa_akademik_id, r]));
    
    const mergedList = allStudentsInClass.map((sa: any) => {
      const existingRecord = recordMap.get(sa.id);
      
      if (existingRecord) {
        return {
          ...existingRecord,
          Siswa: sa.siswa,
          SiswaAkademik: sa
        };
      }

      // If no record exists, return a "virtual" record
      // If session is finished, it should have been 'ALPA' (handled by finalize), 
      // but if somehow missing or session is ongoing, we show 'BELUM_TAP'
      return {
        id: `virtual-${sa.id}`,
        tenant_id: tenantId,
        sesi_id: sesi_id,
        siswa_id: sa.siswa_id,
        siswa_akademik_id: sa.id,
        status: sesi.status === 'SELESAI' ? 'ALPA' : 'BELUM_TAP',
        waktu_tap: null,
        asal_gerbang: false,
        is_terlambat: false,
        menit_keterlambatan: 0,
        poin_kehadiran: 0,
        Siswa: sa.siswa,
        SiswaAkademik: sa
      };
    });

    return mergedList;
  }

  async summaryById(tenantId: string, _org: any, id: string) {
    // Auth Logic handled by Guard

    const grouped = await prisma.absenSiswa.groupBy({ by: ['status'], where: { tenant_id: tenantId, sesi_id: id }, _count: { _all: true } });

    // Count late students explicitly
    const lateCount = await prisma.absenSiswa.count({
      where: { tenant_id: tenantId, sesi_id: id, status: 'HADIR', is_terlambat: true }
    });

    const counts: any = { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0, DISPEN: 0, PENDING_GATE: 0 };

    // Count pending gate reconciliation explicitly
    const pendingGateCount = await prisma.absenSiswa.count({
      where: { tenant_id: tenantId, sesi_id: id, status: 'HADIR', asal_gerbang: false }
    });
    counts.PENDING_GATE = pendingGateCount;
    for (const g of grouped as any[]) {
      const st = String(g.status || '').toUpperCase();
      const c = g._count?._all || g._count || 0;
      if (counts[st] !== undefined) counts[st] = Number(c) || 0;
    }

    // Adjust HADIR and TERLAMBAT counts
    // Since 'HADIR' status includes late students, we subtract late ones from HADIR and assign to TERLAMBAT
    if (counts.HADIR >= lateCount) {
      counts.HADIR -= lateCount;
      counts.TERLAMBAT = lateCount;
    }

    return counts;
  }

  async checkPetugasActive(userId: string, _tenantId: string, org: any) {
    // 1. Check by Organizational Scope (Petugas Siswa / Class-restricted officers)
    if (org && org.tenant_wide !== true && Array.isArray(org.kelas_ids) && org.kelas_ids.length > 0) {
      // Fetch Class Names for better UX in frontend
      const kelasData = await prisma.kelas.findMany({
        where: { id: { in: org.kelas_ids } },
        select: { id: true, nama_kelas: true }
      });

      // User has specific classes assigned, they are active as a classroom operator
      return { 
        active: true, 
        managed_kelas_ids: org.kelas_ids,
        managed_kelas_names: kelasData.map((k: { id: string; nama_kelas: string }) => k.nama_kelas).join(', '),
        is_petugas_kelas: true 
      };
    }

    // 2. Check by Capability (RBAC)
    const canScan = await authorizationService.hasUserPermission(userId, 'attendance.scan');
    const canManageSessions = await authorizationService.hasUserPermission(userId, 'attendance.sessions.update.attendance');
    const canCreateSessions = await authorizationService.hasUserPermission(userId, 'attendance.sessions.create');

    if (canScan) return { active: true };
    if (canManageSessions) return { active: true };
    // PETUGAS_KELAS has sessions.create but not sessions.update.attendance
    // Also include managed_kelas_ids from org scope if available
    if (canCreateSessions) {
      const base: any = { active: true, is_petugas_kelas: true };
      if (org && Array.isArray(org.kelas_ids) && org.kelas_ids.length > 0) {
        const kelasData = await prisma.kelas.findMany({
          where: { id: { in: org.kelas_ids } },
          select: { id: true, nama_kelas: true }
        });
        base.managed_kelas_ids = org.kelas_ids;
        base.managed_kelas_names = kelasData.map((k: { id: string; nama_kelas: string }) => k.nama_kelas).join(', ');
      }
      return base;
    }

    return { active: false };
  }


  public async propagateGateAbsenceToSessions(
    tenantId: string,
    siswaId: string,
    status: string,
    waktuTap: Date,
    tahunPelajaranId?: string,
    semesterId?: string,
  ): Promise<void> {
    await propagateGateAbsenceToSessionsCommand({ tenantId, siswaId, status, waktuTap, tahunPelajaranId, semesterId });
  }

  async enrichWithSummary(tenantId: string, sessions: any[]) {
    const ids = sessions.map((s) => String(s.id));
    const counts = await prisma.absenSiswa.groupBy({
      by: ['sesi_id'],
      where: { tenant_id: tenantId, sesi_id: { in: ids }, status: 'HADIR' },
      _count: { id: true },
    });

    const pendingCounts = await prisma.absenSiswa.groupBy({
      by: ['sesi_id'],
      where: { tenant_id: tenantId, sesi_id: { in: ids }, status: 'HADIR', asal_gerbang: false },
      _count: { id: true },
    });

    const countMap = counts.reduce((acc, curr) => {
      acc[String(curr.sesi_id)] = curr._count.id;
      return acc;
    }, {} as any);

    const pendingMap = pendingCounts.reduce((acc, curr) => {
      acc[String(curr.sesi_id)] = curr._count.id;
      return acc;
    }, {} as any);

    // Get real counts per class AND academic term for accuracy
    const academicKeys = sessions.map(s => ({
      kelas_id: String(s.kelas_id),
      tahun_pelajaran_id: String(s.tahun_pelajaran_id),
      semester_id: String(s.semester_id)
    }));

    // Filter unique combinations to minimize DB calls
    const uniqueKeys = academicKeys.filter((v, i, a) => 
      a.findIndex(t => (t.kelas_id === v.kelas_id && t.tahun_pelajaran_id === v.tahun_pelajaran_id && t.semester_id === v.semester_id)) === i
    );

    const realTotalSiswa = await Promise.all(uniqueKeys.map(async (key) => {
      let count = 0;
      try {
        count = await prisma.siswaAkademik.count({
          where: { 
            kelas_id: key.kelas_id,
            tahun_pelajaran_id: key.tahun_pelajaran_id,
            semester_id: key.semester_id,
          }
        });
      } catch {}

      if (!count || count === 0) {
        count = await prisma.siswa.count({
          where: { 
            tenant_id: tenantId,
            kelas_id: key.kelas_id,
            status: 'AKTIF'
          }
        });
      }
      return { ...key, count };
    }));

    const realTotalMap = realTotalSiswa.reduce((acc, curr) => {
      const compositeKey = `${curr.kelas_id}_${curr.tahun_pelajaran_id}_${curr.semester_id}`;
      acc[compositeKey] = curr.count;
      return acc;
    }, {} as any);

    return sessions.map((s) => {
      const compositeKey = `${s.kelas_id}_${s.tahun_pelajaran_id}_${s.semester_id}`;
      const totalSiswa = realTotalMap[compositeKey] || 0;

      const absenGuru = s.AbsenGuru?.[0];
      let teacherStatus = 'BELUM_MULAI';
      const now = new Date();
      const startTime = new Date(s.waktu_mulai);
      const endTime = new Date(s.waktu_selesai);
      
      const isFinished = String(s.status) === 'SELESAI' || now > endTime;
      const isLive = !isFinished && (String(s.status) === 'BERLANGSUNG' || (now >= startTime && now <= endTime));

      // Extra check: If we have a tap time, they are definitely present/late, 
      // regardless of the status string in AbsenGuru
      const hasTap = !!(absenGuru?.waktu_tap);

      const sStatus = (absenGuru?.status || '').toUpperCase().replace(/\s+/g, '_');

      if (sStatus === 'HADIR' || sStatus === 'HADIR_/_MENGAJAR' || hasTap) {
        teacherStatus = (absenGuru?.is_terlambat || false) ? 'TERLAMBAT' : 'TEPAT_WAKTU';
      } else if (sStatus === 'BELUM_HADIR' || sStatus === 'BELUM_TAP' || !absenGuru) {
        if (isLive) {
          teacherStatus = 'BELUM_TAP';
        } else if (isFinished) {
          teacherStatus = 'ALPA';
        }
      } else if (sStatus === 'ALPA') {
        teacherStatus = 'ALPA';
      } else if (sStatus) {
        teacherStatus = sStatus;
      }

      return {
        ...s,
        _summary: {
          hadir: countMap[String(s.id)] || 0,
          pending_gate: pendingMap[String(s.id)] || 0,
          total: totalSiswa,
          teacherStatus,
          isLive,
          isFinished
        },
      };
    });
  }

  private async attachJenisKegiatanMeta(tenantId: string, sessions: any[]) {
    if (!Array.isArray(sessions) || sessions.length === 0) return sessions;

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const uniqueJenis = Array.from(new Set(sessions.map((s: any) => String(s?.jenis_kegiatan || '')).filter(Boolean)));
    const jenisIds = uniqueJenis.filter(v => uuidRe.test(v));

    let byId = new Map<string, { id: string; nama: string; tipe: string }>();
    if (jenisIds.length > 0) {
      const items = await prisma.jenisKegiatanMaster.findMany({
        where: { tenant_id: tenantId, id: { in: jenisIds } },
        select: { id: true, nama: true, tipe: true },
      });
      byId = new Map(items.map(i => [String(i.id), { id: String(i.id), nama: String(i.nama || ''), tipe: String((i as any).tipe || '') }]));
    }

    return sessions.map((s: any) => {
      const raw = String(s?.jenis_kegiatan || '');
      const meta = byId.get(raw);
      const nama = meta?.nama || (!uuidRe.test(raw) ? raw : '');
      const tipe = meta?.tipe || '';
      return {
        ...s,
        ...(nama ? { jenis_kegiatan_nama: nama } : {}),
        ...(tipe ? { jenis_kegiatan_tipe: tipe } : {}),
      };
    });
  }

  private async publishRedisEvent(channel: string, payload: any) {
    try {
      const redis = (await import('@/queue/redis')).getRedisConnection() as any;
      await redis.publish(channel, JSON.stringify(payload));
    } catch (e) {
      console.warn(`Publish ${channel} failed`, e);
    }
  }

  private async handleSessionClose(tenantId: string, sesiId: string, _sesi: any) {
    try {
      await this.finalizeSessionAndNotify(tenantId, sesiId);
    } catch (e) {
      console.warn('handleSessionClose failed', e);
    }
  }

  private async processBatch<T>(
    items: T[], 
    batchSize: number, 
    processor: (item: T) => Promise<any>, 
    delayMs: number = 300
  ) {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.all(batch.map(item => processor(item).catch(e => console.error('Batch processing item error:', e))));
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  public async finalizeSessionAndNotify(tenantId: string, sesiId: string) {
    try {
      const sesiFull = await prisma.sesiAbsensi.findFirst({
        where: { id: sesiId, tenant_id: tenantId },
        select: {
          id: true,
          guru_id: true,
          tanggal: true,
          kelas_id: true,
          waktu_mulai: true,
          waktu_selesai: true,
          tahun_pelajaran_id: true,
          semester_id: true,
          Kelas: { select: { id: true, nama_kelas: true } },
          Guru: { select: { user_id: true, no_hp: true } }
        }
      });

      if (sesiFull && sesiFull.kelas_id && sesiFull.tahun_pelajaran_id && sesiFull.semester_id) {
        const siswaAkademikList = await prisma.siswaAkademik.findMany({
          where: {
            kelas_id: sesiFull.kelas_id,
            tahun_pelajaran_id: sesiFull.tahun_pelajaran_id,
            semester_id: sesiFull.semester_id,
            status: 'AKTIF'
          },
          select: { id: true }
        });

        const siswaAkademikIds = siswaAkademikList.map(s => s.id);

        if (siswaAkademikIds.length > 0) {
          const existing = await prisma.absenSiswa.findMany({
            where: {
              tenant_id: tenantId,
              sesi_id: sesiId,
              siswa_akademik_id: { in: siswaAkademikIds }
            },
            select: { siswa_akademik_id: true }
          });

          const existingSet = new Set(existing.map(e => e.siswa_akademik_id));
          const targetIds = siswaAkademikIds.filter(id => !existingSet.has(id));

          if (targetIds.length > 0) {
            // Get system config for timeout
            const sysCfg = await systemConfigService.getActive(tenantId);
            const maxIzinMenit = sysCfg?.max_izin_sementara_menit ?? 45;

            // INTEGRASI PIKET: Cek izin keluar yang tumpang tindih dengan sesi ini
            const permits = await prisma.izinKeluarSiswa.findMany({
              where: {
                siswa_akademik_id: { in: targetIds },
                jam_keluar: { lt: sesiFull.waktu_selesai || new Date() },
                OR: [
                  { jam_kembali: null },
                  { jam_kembali: { gt: sesiFull.waktu_mulai || new Date() } }
                ]
              }
            });

            const studentPermitMap = new Map<string, any>();
            permits.forEach(p => studentPermitMap.set(p.siswa_akademik_id, p));

            await prisma.absenSiswa.createMany({
              data: targetIds.map(id => {
                const permit = studentPermitMap.get(id);
                let isIzin = !!permit;
                let finalCatatan = isIzin ? `[PIKET] ${permit.alasan}` : 'Auto-closed by system';
                let finalStatus = isIzin ? 'IZIN' : 'ALPA';

                // SMART TIMEOUT LOGIC
                if (isIzin && permit.tipe_izin === 'IZIN_KELUAR' && !permit.jam_kembali) {
                  const waktuSelesaiSesi = sesiFull.waktu_selesai || new Date();
                  const diffMenit = Math.floor((waktuSelesaiSesi.getTime() - permit.jam_keluar.getTime()) / (1000 * 60));
                  
                  if (diffMenit > maxIzinMenit) {
                    isIzin = false;
                    finalStatus = 'ALPA';
                    finalCatatan = `[BOLOS] Izin keluar sementara melebihi batas ${maxIzinMenit} menit (Durasi: ${diffMenit}m)`;
                  }
                }
                
                return {
                  tenant_id: tenantId,
                  sesi_id: sesiId,
                  siswa_akademik_id: id,
                  status: finalStatus,
                  waktu_tap: null,
                  asal_gerbang: false,
                  kelas_id_snapshot: sesiFull.kelas_id,
                  kelas_nama_snapshot: sesiFull.Kelas?.nama_kelas || null,
                  tingkat_snapshot: null,
                  tahun_pelajaran_id_snapshot: sesiFull.tahun_pelajaran_id,
                  catatan: finalCatatan,
                  poin_kehadiran: isIzin ? ATTENDANCE_POINTS.IZIN : ATTENDANCE_POINTS.ALPA
                };
              }),
              skipDuplicates: true
            });
          }
        }
      }

      if (sesiFull && sesiFull.guru_id) {
        await prisma.absenGuru.updateMany({
          where: {
            tenant_id: tenantId,
            sesi_id: sesiId,
            guru_id: sesiFull.guru_id,
            OR: [
              { status: 'Belum Hadir' },
              { status: '' }
            ]
          },
          data: {
            status: 'ALPA'
          }
        });
      }

      const counts = await this.summaryById(tenantId, null, sesiId);

      const cfgFinish = await systemConfigService.getActive(tenantId);
      const tzFinish = String(cfgFinish?.timezone || 'Asia/Jakarta').trim();
      const localTanggalStr = new Intl.DateTimeFormat('sv-SE', { timeZone: tzFinish }).format(sesiFull?.tanggal || new Date());

      const tenantRoomPayload = {
        sesi_id: sesiId,
        guru_id: sesiFull?.guru_id,
        tanggal: localTanggalStr,
        counts,
        tenant_id: tenantId,
      };

      await this.publishRedisEvent('events:sesi_summary_update', tenantRoomPayload);

      const pref = await (prisma as any).notificationPreference.findFirst({
        where: { tenant_id: tenantId, user_id: sesiFull?.Guru?.user_id || '' }
      });
      const channels = ((pref?.channels_json as any) || {}).ATTENDANCE || { in_app: true, email: false, wa: false };
      const enabledTypes = (pref?.enabled_types_json as any) || { ATTENDANCE: true };
      const thresholds = (pref?.thresholds_json as any) || { late: 5, no_tap: 5 };

      if (enabledTypes.ATTENDANCE) {
        const subject = `Rekap Kehadiran Sesi ${sesiFull?.Kelas?.nama_kelas || ''} ${tenantRoomPayload.tanggal}`;
        const message = `HADIR: ${counts.HADIR}, TERLAMBAT: ${counts.TERLAMBAT || 0}, IZIN: ${counts.IZIN}, SAKIT: ${counts.SAKIT}, ALPA: ${counts.ALPA}`;
        let alpaListText = '';

        let emailService: any = null;
        let whatsappService: any = null;
        
        const getEmailService = async () => {
          if (!emailService) {
            const { EmailService } = await import('@/modules/notification/services/email.service');
            emailService = new EmailService();
          }
          return emailService;
        };

        const getWhatsAppService = async () => {
          if (!whatsappService) {
            const { WhatsAppService } = await import('@/modules/notification/services/whatsapp.service');
            whatsappService = new WhatsAppService();
          }
          return whatsappService;
        };

        const emailTasks: Array<() => Promise<any>> = [];
        const waTasks: Array<() => Promise<any>> = [];

        if (counts.ALPA > 0 && Number(thresholds.no_tap || 0) >= 0) {
          const alpans = await prisma.absenSiswa.findMany({
            where: { tenant_id: tenantId, sesi_id: sesiId, status: 'ALPA' },
            include: { 
              SiswaAkademik: { include: { siswa: true } },
            },
          });
          
          const names = alpans
            .map(a => {
              const siswa = (a as any).SiswaAkademik?.siswa || null;
              const nama = siswa?.nama_siswa || '';
              const nis = siswa?.nis ? ` (${siswa.nis})` : '';
              return `${nama}${nis}`;
            })
            .filter(Boolean);
          if (names.length > 0) alpaListText = `\nALPA: ${names.join(', ')}`;

          const parentEmailEnabled = true; 
          const parentWaEnabled = true;    

          if (parentEmailEnabled || parentWaEnabled) {
            const siswaIds = alpans
              .map(a => (a as any).SiswaAkademik?.siswa?.id || null)
              .filter(id => !!id) as string[];
              
            const allOrtuLinks = siswaIds.length > 0 ? await prisma.orangTuaSiswa.findMany({
              where: { siswa_id: { in: siswaIds } },
              include: { OrangTua: true }
            }) : [];

            const ortuBySiswa: Record<string, any[]> = {};
            for (const link of allOrtuLinks) {
              const sid = link.siswa_id;
              const parent = link.OrangTua;
              if (!ortuBySiswa[sid]) ortuBySiswa[sid] = [];
              ortuBySiswa[sid].push(parent);
            }

            for (const a of alpans) {
              const sId = (a as any).SiswaAkademik?.siswa?.id;
              if (!sId) continue;
              
              const ortuList = ortuBySiswa[sId] || [];
              
              if (parentEmailEnabled) {
                for (const o of ortuList) {
                  if (o.email) {
                    emailTasks.push(async () => {
                      const es = await getEmailService();
                      await es.sendEmail({ 
                        to: o.email, 
                        subject: `Peringatan ALPA ${ (a as any).SiswaAkademik?.siswa?.nama_siswa || ''}`, 
                        html: `<p>${message.replace(/\n/g, '<br/>')}</p>`, 
                        tenantId 
                      });
                    });
                  }
                }
              }
              if (parentWaEnabled) {
                for (const o of ortuList) {
                  if (o.no_hp) {
                    waTasks.push(async () => {
                      const ws = await getWhatsAppService();
                      const formatted = ws.formatPhoneNumber(o.no_hp);
                      await ws.sendWhatsApp({ 
                        phoneNumber: formatted, 
                        message: `Peringatan ALPA ${ (a as any).SiswaAkademik?.siswa?.nama_siswa || ''} pada ${tenantRoomPayload.tanggal}`, 
                        tenantId, 
                        relatedId: sesiId 
                      });
                    });
                  }
                }
              }
            }
          }
        }

        if (channels.email) {
          const user = await prisma.user.findFirst({ where: { tenant_id: tenantId, id: sesiFull?.Guru?.user_id || '' }, select: { email: true } });
          if (user?.email) {
            emailTasks.push(async () => {
              const es = await getEmailService();
              await es.sendEmail({ 
                to: user.email, 
                subject, 
                html: `<p>${message.replace(/\n/g, '<br/>')}${alpaListText ? '<br/><p>' + alpaListText + '</p>' : ''}</p>`, 
                tenantId 
              });
            });
          }
        }
        if (channels.wa) {
          const hp = sesiFull?.Guru?.no_hp || '';
          if (hp) {
            waTasks.push(async () => {
              const ws = await getWhatsAppService();
              const formatted = ws.formatPhoneNumber(hp);
              await ws.sendWhatsApp({ 
                phoneNumber: formatted, 
                message: `Rekap Kehadiran ${sesiFull?.Kelas?.nama_kelas || ''} ${tenantRoomPayload.tanggal}\n${message}${alpaListText}`, 
                tenantId, 
                relatedId: sesiId 
              });
            });
          }
        }

        if (emailTasks.length > 0) {
          await this.processBatch(emailTasks, 20, task => task());
        }
        if (waTasks.length > 0) {
          await this.processBatch(waTasks, 20, task => task());
        }
      }
    } catch (e) {
      console.warn('finalizeSessionAndNotify failed', e);
    }
  }
}

export const sesiService = new SesiService();
