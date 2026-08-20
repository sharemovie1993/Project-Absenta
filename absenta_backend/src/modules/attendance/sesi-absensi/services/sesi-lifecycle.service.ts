import { prisma } from '../../../../utils/prisma';
import { appLogger } from '../../../../utils/app-logger';
import { storageService } from '../../../../infra/storage/storage.service';
import { emitDomainEvent } from '../../../../infra/event-bus';
import { getTenantTimezone, getTenantOffsetString, getTimezoneLabel } from '../../../../utils/timezone.utils';
import { PLATFORM_TIMEZONE } from '../../../../infra/jobEngine';
import { parseSafeDate } from './sesi-absensi.schema';
import { sesiReminderService } from './sesi-reminder.service';

/**
 * Load shift_jam_pelajaran config for a tenant.
 * Identical to JadwalKBMService.loadShiftConfig — kept inline to avoid circular imports.
 */
async function loadShiftConfig(tenantId: string): Promise<any | null> {
  const config = await prisma.config.findFirst({
    where: { tenant_id: tenantId, key: 'shift_jam_pelajaran' },
  });
  if (!config?.value) return null;
  try { return JSON.parse(config.value as string); } catch { return null; }
}

/**
 * Resolve jam_mulai & jam_selesai per-hari from shift config.
 * Priority: day_patterns[HARI].slots → shift.slots (fallback).
 * Identical logic to JadwalKBMService.resolveSlotTime.
 */
function resolveSlotTimeSesi(
  shiftConfig: any,
  kelasId: string,
  hari: string,
  slotIndex: number,
): { start: string; end: string } | null {
  if (!shiftConfig?.shifts) return null;
  const assignedShiftId = shiftConfig.class_assignments?.[kelasId] || 'pagi';
  const shift = shiftConfig.shifts.find((s: any) => s.id === assignedShiftId) || shiftConfig.shifts[0];
  if (!shift) return null;

  const upperHari = (hari || '').toUpperCase();
  // Prioritaskan day_patterns[hari] jika punya slots
  const daySlots =
    (shift.day_patterns?.[upperHari]?.slots?.length > 0)
      ? shift.day_patterns[upperHari].slots
      : (shift.slots || []);
  const found = daySlots.find((sl: any) => (sl.slot !== undefined ? sl.slot === slotIndex : sl.slot_index === slotIndex));
  return found ? { start: found.start, end: found.end } : null;
}

/**
 * Enrich JadwalKBM array with correct jam_mulai/jam_selesai from shift config.
 * Identical to JadwalKBMService.enrichJadwalWithDayTimes.
 */
function enrichJadwalWithDayTimesSesi(rawSchedules: any[], shiftConfig: any, defaultHari: string): any[] {
  if (!shiftConfig) return rawSchedules;
  return rawSchedules.map((item) => {
    if (item.slot_index === undefined || item.slot_index === null) return item;
    const effectiveHari = item.hari || defaultHari || '';
    const resolved = resolveSlotTimeSesi(shiftConfig, item.kelas_id, effectiveHari, item.slot_index);
    if (!resolved) return item;
    return {
      ...item,
      jam_mulai: resolved.start,
      jam_selesai: resolved.end,
    };
  });
}

/**
 * Validate Early Tolerance (15m before start) and Late Cutoff (after end time) in Tenant Timezone.
 */
function validateSessionTimeWindow(
  startTarget: Date | null,
  endTarget: Date | null,
  hasFoto: boolean,
  timezone: string = PLATFORM_TIMEZONE
): void {
  if (!hasFoto) return;
  const now = new Date();
  const tzLabel = getTimezoneLabel(timezone);

  if (startTarget && !isNaN(startTarget.getTime())) {
    const EARLY_TOLERANCE_MS = 15 * 60 * 1000;
    const earliestAllowed = new Date(startTarget.getTime() - EARLY_TOLERANCE_MS);
    if (now.getTime() < earliestAllowed.getTime()) {
      const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
      const openTimeStr = fmt(earliestAllowed);
      const startTimeStr = fmt(startTarget);
      throw new Error(`Sesi KBM belum dibuka. Anda baru dapat membuka sesi dan mencatat kehadiran untuk jam ${startTimeStr} mulai pukul ${openTimeStr} ${tzLabel} (15 menit sebelum jam mulai).`);
    }
  }

  if (endTarget && !isNaN(endTarget.getTime())) {
    if (now.getTime() > endTarget.getTime()) {
      const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
      const endTimeStr = fmt(endTarget);
      throw new Error(`Jadwal sesi KBM telah berakhir pada pukul ${endTimeStr} ${tzLabel}. Anda tidak dapat lagi membuka sesi yang sudah terlewat.`);
    }
  }
}

/**
 * Upsert AbsenGuru record as HADIR upon teacher opening session with photo.
 */
async function upsertTeacherAttendanceOnOpen(
  tenantId: string,
  sesiId: string,
  guruId: string,
  startTarget: Date | null,
  tahunPelajaranId: string,
  semesterId: string,
  catatan: string = 'Hadir saat pembukaan sesi KBM (Foto)'
): Promise<void> {
  try {
    const now = new Date();
    let isTerlambat = false;
    let menitKeterlambatan = 0;
    if (startTarget && !isNaN(startTarget.getTime()) && now.getTime() > startTarget.getTime()) {
      isTerlambat = true;
      menitKeterlambatan = Math.max(0, Math.floor((now.getTime() - startTarget.getTime()) / (60 * 1000)));
    }

    const existingAbsen = await prisma.absenGuru.findFirst({
      where: { tenant_id: tenantId, sesi_id: sesiId, guru_id: guruId }
    });

    if (existingAbsen) {
      await prisma.absenGuru.update({
        where: { id: existingAbsen.id },
        data: {
          status: 'HADIR',
          waktu_tap: now,
          is_terlambat: isTerlambat,
          menit_keterlambatan: menitKeterlambatan,
          catatan,
          updated_at: new Date()
        }
      });
    } else {
      await prisma.absenGuru.create({
        data: {
          tenant_id: tenantId,
          sesi_id: sesiId,
          guru_id: guruId,
          status: 'HADIR',
          waktu_tap: now,
          is_terlambat: isTerlambat,
          menit_keterlambatan: menitKeterlambatan,
          catatan,
          tahun_pelajaran_id: tahunPelajaranId || 'default-tp',
          semester_id: semesterId || 'default-sem',
        }
      });
    }
  } catch (err) {
    console.error('[SesiLifecycleService] Error in upsertTeacherAttendanceOnOpen:', err);
  }
}

export class SesiLifecycleService {
  private static instance: SesiLifecycleService;

  public static getInstance(): SesiLifecycleService {
    if (!SesiLifecycleService.instance) {
      SesiLifecycleService.instance = new SesiLifecycleService();
    }
    return SesiLifecycleService.instance;
  }

  async create(tenantId: string, _org: any, payload: any, userId: string) {
    const {
      kelas_id,
      mapel_id,
      guru_id,
      jenis_kegiatan = 'KBM',
      tanggal,
      waktu_mulai,
      waktu_selesai,
      tahun_pelajaran_id,
      semester_id,
      foto_kegiatan,
      foto_bukti_url,
    } = payload;

    let finalFotoUrl: string | null = null;
    const rawFoto = foto_kegiatan || foto_bukti_url;

    if (rawFoto && typeof rawFoto === 'string') {
      if (rawFoto.startsWith('data:image/')) {
        try {
          const match = rawFoto.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const base64Data = match[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const ext = mimeType.split('/')[1] || 'jpeg';
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const storageKey = `uploads/tenants/${tenantId}/sesi-kbm/${fileName}`;

            await storageService.uploadBuffer(storageKey, buffer, { contentType: mimeType });
            finalFotoUrl = `/api/${storageKey}`;
          } else {
            finalFotoUrl = rawFoto;
          }
        } catch (storageErr) {
          console.error('[SesiLifecycleService] Error uploading session photo to storage:', storageErr);
          finalFotoUrl = rawFoto;
        }
      } else {
        finalFotoUrl = rawFoto;
      }
    }

    const sessionDate = tanggal ? new Date(tanggal) : new Date();

    let targetTpId = tahun_pelajaran_id;
    let targetSemId = semester_id;

    if (!targetTpId || targetTpId === 'default-tp') {
      const activeTp = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });
      if (activeTp) {
        targetTpId = activeTp.id;
      } else {
        const anyTp = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId } });
        if (anyTp) targetTpId = anyTp.id;
      }
    }

    if (!targetSemId || targetSemId === 'default-sem') {
      const activeSem = await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } });
      if (activeSem) {
        targetSemId = activeSem.id;
      } else {
        const anySem = await prisma.semester.findFirst({ where: { tenant_id: tenantId } });
        if (anySem) targetSemId = anySem.id;
      }
    }

    // 🛡️ IDEMPOTENCY GUARD: Prevent duplicate session creation for same schedule slot & date
    const cleanJadwalKbmId = payload.jadwal_kbm_id ? String(payload.jadwal_kbm_id).replace(/^sched_/, '') : null;
    const startOfDay = new Date(sessionDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(sessionDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const matchingSesis = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay },
        OR: [
          ...(cleanJadwalKbmId ? [{ jadwal_kbm_id: cleanJadwalKbmId }] : []),
          ...(kelas_id && mapel_id ? [{ kelas_id, mapel_id, jenis_kegiatan: 'KBM' }] : [])
        ]
      },
      orderBy: { waktu_mulai: 'asc' }
    });

    const existingSesi = matchingSesis[0] || null;
    const latestMatchedSesi = matchingSesis.length > 1 ? matchingSesis[matchingSesis.length - 1] : existingSesi;

    const tz = await getTenantTimezone(tenantId);

    if (existingSesi) {
      if (existingSesi.status === 'SELESAI') {
        throw new Error('Sesi KBM telah selesai. Tidak dapat membuka kembali sesi yang sudah ditutup.');
      }
      if (existingSesi.status === 'TERLEWAT') {
        throw new Error('Jadwal sesi KBM telah terlewat dan ditutup. Anda tidak dapat lagi membuka sesi yang sudah terlewat.');
      }

      const tzOffset = getTenantOffsetString(tz);
      const now = new Date();
      const startTarget = existingSesi.waktu_mulai || (waktu_mulai ? parseSafeDate(waktu_mulai, tzOffset) : now);
      const endTarget = latestMatchedSesi?.waktu_selesai || existingSesi.waktu_selesai || (waktu_selesai ? parseSafeDate(waktu_selesai, tzOffset) : null);
      
      // 🛡️ Centralized Time-Window & Cutoff Guard (Timezone-Aware)
      validateSessionTimeWindow(startTarget, endTarget, Boolean(finalFotoUrl), tz);

      if (finalFotoUrl || waktu_mulai) {
        const updatedSesi = await prisma.sesiAbsensi.update({
          where: { id: existingSesi.id },
          data: {
            ...(finalFotoUrl ? { foto_kegiatan: finalFotoUrl, status: 'BERLANGSUNG' } : {}),
            ...(waktu_mulai ? { waktu_mulai: parseSafeDate(waktu_mulai, tzOffset) } : {}),
            ...(endTarget ? { waktu_selesai: endTarget } : {}),
            updated_at: new Date()
          }
        });

        if (guru_id && finalFotoUrl) {
          await upsertTeacherAttendanceOnOpen(
            tenantId,
            existingSesi.id,
            guru_id,
            startTarget,
            existingSesi.tahun_pelajaran_id,
            existingSesi.semester_id,
            'Hadir saat pembukaan sesi KBM (Foto)'
          );
        }
        return updatedSesi;
      }
      return existingSesi;
    }

    const tzOffset = getTenantOffsetString(tz);
    const parsedStart = waktu_mulai ? parseSafeDate(waktu_mulai, tzOffset) : new Date();
    const parsedEnd = waktu_selesai ? parseSafeDate(waktu_selesai, tzOffset) : null;
    const now = new Date();

    // 🛡️ Centralized Time-Window & Cutoff Guard saat membuat sesi baru (Timezone-Aware)
    validateSessionTimeWindow(parsedStart, parsedEnd, Boolean(finalFotoUrl), tz);

    const isFutureSchedule = parsedStart.getTime() - now.getTime() > 15 * 60 * 1000;
    const initialStatus = finalFotoUrl ? 'BERLANGSUNG' : isFutureSchedule ? 'MENDATANG' : 'BERLANGSUNG';

    // 🛡️ Safely resolve foreign key for jadwal_kbm_id (strip sched_ prefix & verify DB existence)
    let validJadwalKbmId: string | null = null;
    if (payload.jadwal_kbm_id) {
      const cleanJadwalId = String(payload.jadwal_kbm_id).replace(/^sched_/, '');
      try {
        const existingJadwal = await (prisma as any).jadwalKBM.findUnique({
          where: { id: cleanJadwalId },
          select: { id: true }
        });
        if (existingJadwal) {
          validJadwalKbmId = existingJadwal.id;
        }
      } catch (e) {
        validJadwalKbmId = null;
      }
    }

    const resolvedSumberSesi = payload.sumber_sesi || (validJadwalKbmId || payload.jadwal_kegiatan_id ? 'TEMPLATE' : 'MANUAL');

    const sesi = await (prisma.sesiAbsensi as any).create({
      data: {
        tenant_id: tenantId,
        jadwal_kbm_id: validJadwalKbmId,
        jadwal_kegiatan_id: payload.jadwal_kegiatan_id || null,
        kelas_id,
        mapel_id: mapel_id || null,
        guru_id: guru_id || null,
        tahun_pelajaran_id: targetTpId || 'default-tp',
        semester_id: targetSemId || 'default-sem',
        jenis_kegiatan,
        sumber_sesi: resolvedSumberSesi,
        tanggal: sessionDate,
        waktu_mulai: parsedStart,
        waktu_selesai: parsedEnd,
        status: initialStatus,
        foto_kegiatan: finalFotoUrl,
        created_by_user_id: userId
      }
    });

    if (guru_id && finalFotoUrl) {
      await upsertTeacherAttendanceOnOpen(
        tenantId,
        sesi.id,
        guru_id,
        parsedStart,
        targetTpId || 'default-tp',
        targetSemId || 'default-sem',
        'Otomatis HADIR saat pembukaan sesi KBM (Foto)'
      );
    }

    emitDomainEvent({
      event_type: 'SESI_CREATED',
      tenant_id: tenantId,
      source_service: 'sesi-lifecycle.service',
      payload: sesi,
    }).catch(() => {});

    return sesi;
  }

  async list(tenantId: string, _org: any, query: any) {
    const { kelas_id, guru_id, allowedKelasIds, guruIdFilter, tanggal, status, status_filter, include_scheduled, limit = 50, page = 1 } = query;

    const tz = await getTenantTimezone(tenantId);
    const tzOffset = getTenantOffsetString(tz);

    const where: any = { tenant_id: tenantId };

    let parsedAllowedKelasIds: string[] | undefined = undefined;
    if (Array.isArray(allowedKelasIds)) {
      parsedAllowedKelasIds = allowedKelasIds;
    } else if (typeof allowedKelasIds === 'string' && allowedKelasIds.trim()) {
      parsedAllowedKelasIds = allowedKelasIds.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (kelas_id) {
      where.kelas_id = kelas_id;
    } else if (parsedAllowedKelasIds && parsedAllowedKelasIds.length > 0) {
      where.kelas_id = { in: parsedAllowedKelasIds };
    }

    if (guru_id) {
      where.guru_id = guru_id;
    } else if (guruIdFilter) {
      where.guru_id = guruIdFilter;
    }

    if (status) where.status = status;
    const targetSessionId = (query as any).id || (query as any).sesi_id;
    if (targetSessionId && typeof targetSessionId === 'string' && !targetSessionId.startsWith('sched_')) {
      where.id = targetSessionId;
    }

    if (tanggal) {
      const dayStr = tanggal;
      const startOfDay = new Date(`${dayStr}T00:00:00.000${tzOffset}`);
      const endOfDay = new Date(`${dayStr}T23:59:59.999${tzOffset}`);
      where.tanggal = { gte: startOfDay, lte: endOfDay };
    }

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    // 1. Fetch physical DB sessions
    const rawData = await prisma.sesiAbsensi.findMany({
      where,
      select: {
        id: true,
        tenant_id: true,
        kelas_id: true,
        mapel_id: true,
        guru_id: true,
        jadwal_kbm_id: true,
        jenis_kegiatan: true,
        tanggal: true,
        waktu_mulai: true,
        waktu_selesai: true,
        status: true,
        foto_kegiatan: true,
        created_at: true,
        Kelas: { select: { id: true, nama_kelas: true } },
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        Guru: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
        AbsenGuru: { select: { status: true, is_terlambat: true, waktu_tap: true } },
        ProgresMateri: { select: { id: true, judul_materi: true, deskripsi: true, pencapaian_persen: true, kendala: true, updated_at: true } }
      },
      orderBy: { waktu_mulai: 'desc' }
    });

    // 🚀 ULTRA-OPTIMIZED BATCH QUERY: 1 single query instead of N individual database queries
    const sessionIds = rawData.map((item: any) => item.id).filter(Boolean);
    const summaryMap = new Map<string, Record<string, number>>();

    if (sessionIds.length > 0) {
      try {
        const counts = await prisma.absenSiswa.groupBy({
          by: ['sesi_id', 'status'],
          where: { sesi_id: { in: sessionIds }, tenant_id: tenantId },
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
        appLogger.warn({ error: err?.message }, '[getSesiAbsensiList] Batch absenSiswa groupBy warning');
      }
    }

    const physicalSessions = rawData.map((item: any) => {
      const summary = summaryMap.get(item.id) || { total: 0, HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, TERLAMBAT: 0 };
      return {
        ...item,
        status: item.status || 'MENDATANG',
        summary,
        progres: item.ProgresMateri || null,
        ProgresMateri: item.ProgresMateri || null,
        kelas_nama: item.Kelas?.nama_kelas || null,
        mapel_nama: item.Mapel?.nama_mapel || item.Mapel?.kode_mapel || null,
        guru_nama: item.Guru?.nama_guru || null,
        guru_no_hp: item.Guru?.no_hp || null,
        guru_status: item.AbsenGuru?.[0]?.status || (item.status === 'SELESAI' ? 'ALPA' : 'BELUM_HADIR'),
        absenGuru: item.AbsenGuru?.[0] || null,
        AbsenGuru: item.AbsenGuru || [],
      };
    });

    // 2. If include_scheduled === 'true' or true (or when tanggal is specified), hydrate with JadwalKBM slots
    const shouldHydrate = include_scheduled === true || include_scheduled === 'true' || !!tanggal;

    if (!shouldHydrate) {
      const total = await prisma.sesiAbsensi.count({ where });
      return { total, page: Number(page), limit: take, data: physicalSessions.slice(skip, skip + take) };
    }

    // Determine Day of Week in Tenant Timezone for JadwalKBM query
    const dateStr = tanggal || new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    const targetDateObj = new Date(`${dateStr}T00:00:00.000${tzOffset}`);
    const hariName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: tz }).format(targetDateObj).toUpperCase();

    const scheduleWhere: any = {
      tenant_id: tenantId,
      hari: hariName,
      NOT: {
        AND: [
          { mapel_id: null },
          { guru_id: null }
        ]
      }
    };

    if (kelas_id) {
      scheduleWhere.kelas_id = kelas_id;
    } else if (parsedAllowedKelasIds && parsedAllowedKelasIds.length > 0) {
      scheduleWhere.kelas_id = { in: parsedAllowedKelasIds };
    }

    if (guru_id) {
      scheduleWhere.guru_id = guru_id;
    } else if (guruIdFilter) {
      scheduleWhere.guru_id = guruIdFilter;
    }

    const [rawSchedulesFetched, activeLeavesToday] = await Promise.all([
      (prisma as any).jadwalKBM.findMany({
        where: scheduleWhere,
        include: {
          Kelas: { select: { id: true, nama_kelas: true } },
          Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
          Guru: { select: { id: true, nama_guru: true, nip: true, no_hp: true } }
        },
        orderBy: [{ kelas_id: 'asc' }, { slot_index: 'asc' }, { jam_mulai: 'asc' }]
      }),
      (prisma as any).permohonanIzinGuru.findMany({
        where: {
          tenant_id: tenantId,
          tanggal_mulai: { lte: targetDateObj },
          tanggal_selesai: { gte: targetDateObj },
          status: { in: ['DISETUJUI', 'PENDING'] }
        },
        include: {
          GuruInval: { select: { id: true, nama_guru: true, nip: true } }
        }
      })
    ]);

    // 🔑 Apply day_patterns shift config enrichment — same as JadwalKBMService.enrichJadwalWithDayTimes
    // This ensures jam_mulai/jam_selesai are resolved identically across Siswa, Guru, Ops, and Monitoring modules.
    const shiftConfig = await loadShiftConfig(tenantId);
    const rawSchedules = enrichJadwalWithDayTimesSesi(rawSchedulesFetched, shiftConfig, hariName);

    // Group consecutive slots per class for same teacher, mapel, and activity in backend
    const mergedRanges: any[] = [];
    const classMap = new Map<string, any[]>();

    rawSchedules.forEach((item: any) => {
      const kId = item.kelas_id || 'UNKNOWN';
      if (!classMap.has(kId)) classMap.set(kId, []);
      classMap.get(kId)!.push(item);
    });

    classMap.forEach((classSchedules) => {
      const sortedInClass = [...classSchedules].sort((a: any, b: any) => {
        const idxA = a.slot_index ?? 0;
        const idxB = b.slot_index ?? 0;
        if (idxA !== idxB) return idxA - idxB;
        return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
      });

      let classMerged: any[] = [];
      sortedInClass.forEach((item: any) => {
        const prev = classMerged[classMerged.length - 1];
        const isConsecutive = prev && (
          (item.slot_index !== undefined && prev.jam_ke_end !== undefined && item.slot_index === prev.jam_ke_end + 1) ||
          (prev.jam_selesai && item.jam_mulai && prev.jam_selesai === item.jam_mulai)
        );
        const isSameGroup = prev &&
          prev.kelas_id === item.kelas_id &&
          prev.guru_id === item.guru_id &&
          prev.mapel_id === item.mapel_id &&
          prev.jenis_kegiatan === item.jenis_kegiatan &&
          isConsecutive;

        if (isSameGroup) {
          prev.jam_selesai = item.jam_selesai;
          prev.schedule_ids.push(item.id);
          if (item.slot_index !== undefined && item.slot_index !== null) prev.jam_ke_end = item.slot_index;
        } else {
          classMerged.push({
            id: item.id,
            schedule_ids: [item.id],
            tenant_id: item.tenant_id,
            kelas_id: item.kelas_id,
            mapel_id: item.mapel_id,
            guru_id: item.guru_id,
            jam_mulai: item.jam_mulai,
            jam_selesai: item.jam_selesai,
            jam_ke_start: item.slot_index,
            jam_ke_end: item.slot_index,
            jenis_kegiatan: item.jenis_kegiatan,
            Kelas: item.Kelas,
            Mapel: item.Mapel,
            Guru: item.Guru,
          });
        }
      });

      mergedRanges.push(...classMerged);
    });

    // Match merged schedule ranges with physical sessions
    const matchedPhysicalIds = new Set<string>();

    const unifiedList = mergedRanges.map((mRange: any) => {
      // Find matching physical session:
      // Priority 1 = Matches schedule link OR (kelas_id + mapel_id) with active (BERLANGSUNG) or completed (SELESAI) status
      let physicalMatch = physicalSessions.find((ps: any) => {
        if (matchedPhysicalIds.has(ps.id)) return false;
        const matchesSchedule = ps.jadwal_kbm_id && mRange.schedule_ids.includes(ps.jadwal_kbm_id);
        const matchesClassMapel = ps.kelas_id === mRange.kelas_id && ps.mapel_id === mRange.mapel_id;
        const isStarted = ps.status === 'BERLANGSUNG' || Boolean(ps.foto_kegiatan) || ps.status === 'SELESAI';
        return (matchesSchedule || matchesClassMapel) && isStarted;
      });

      // Priority 2 = Fallback match by exact jadwal_kbm_id link (e.g. unstarted MENDATANG physical sessions)
      if (!physicalMatch) {
        physicalMatch = physicalSessions.find((ps: any) => {
          if (matchedPhysicalIds.has(ps.id)) return false;
          return ps.jadwal_kbm_id && mRange.schedule_ids.includes(ps.jadwal_kbm_id);
        });
      }

      // Priority 3 = Fallback match by kelas_id and mapel_id
      if (!physicalMatch) {
        physicalMatch = physicalSessions.find((ps: any) => {
          if (matchedPhysicalIds.has(ps.id)) return false;
          return ps.kelas_id === mRange.kelas_id && ps.mapel_id === mRange.mapel_id;
        });
      }

      if (physicalMatch) {
        matchedPhysicalIds.add(physicalMatch.id);
        const jpCount = (mRange.jam_ke_start !== undefined && mRange.jam_ke_end !== undefined)
          ? (mRange.jam_ke_end - mRange.jam_ke_start + 1)
          : (mRange.schedule_ids?.length || 1);
        const jLabel = (mRange.jam_ke_start !== undefined && mRange.jam_ke_end !== undefined)
          ? (mRange.jam_ke_start === mRange.jam_ke_end ? `Jam Ke-${mRange.jam_ke_start}` : `Jam Ke-${mRange.jam_ke_start} - ${mRange.jam_ke_end}`)
          : undefined;

        return {
          ...physicalMatch,
          waktu_mulai: mRange.jam_mulai ? `${dateStr}T${mRange.jam_mulai}:00.000${tzOffset}` : physicalMatch.waktu_mulai,
          waktu_selesai: mRange.jam_selesai ? `${dateStr}T${mRange.jam_selesai}:00.000${tzOffset}` : physicalMatch.waktu_selesai,
          jam_mulai: mRange.jam_mulai,
          jam_selesai: mRange.jam_selesai,
          total_jp: jpCount,
          jam_ke_start: mRange.jam_ke_start,
          jam_ke_end: mRange.jam_ke_end,
          jam_label: jLabel,
        };
      }

      const jpCount = (mRange.jam_ke_start !== undefined && mRange.jam_ke_end !== undefined)
        ? (mRange.jam_ke_end - mRange.jam_ke_start + 1)
        : (mRange.schedule_ids?.length || 1);
      const jLabel = (mRange.jam_ke_start !== undefined && mRange.jam_ke_end !== undefined)
        ? (mRange.jam_ke_start === mRange.jam_ke_end ? `Jam Ke-${mRange.jam_ke_start}` : `Jam Ke-${mRange.jam_ke_start} - ${mRange.jam_ke_end}`)
        : undefined;

      // No physical session exists -> Virtual session (MENDATANG)
      return {
        id: `sched_${mRange.id}`,
        tenant_id: tenantId,
        kelas_id: mRange.kelas_id,
        mapel_id: mRange.mapel_id,
        guru_id: mRange.guru_id,
        jadwal_kbm_id: mRange.id,
        jenis_kegiatan: 'KBM',
        tanggal: new Date(`${dateStr}T00:00:00.000${tzOffset}`),
        waktu_mulai: `${dateStr}T${mRange.jam_mulai}:00.000${tzOffset}`,
        waktu_selesai: `${dateStr}T${mRange.jam_selesai}:00.000${tzOffset}`,
        jam_mulai: mRange.jam_mulai,
        jam_selesai: mRange.jam_selesai,
        total_jp: jpCount,
        jam_ke_start: mRange.jam_ke_start,
        jam_ke_end: mRange.jam_ke_end,
        jam_label: jLabel,
        status: 'MENDATANG',
        foto_kegiatan: null,
        created_at: new Date(),
        Kelas: mRange.Kelas,
        Mapel: mRange.Mapel,
        Guru: mRange.Guru,
        kelas_nama: mRange.Kelas?.nama_kelas || null,
        mapel_nama: mRange.Mapel?.nama_mapel || mRange.Mapel?.kode_mapel || null,
        guru_nama: mRange.Guru?.nama_guru || null,
        guru_no_hp: mRange.Guru?.no_hp || null,
        summary: { total: 0, HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, TERLAMBAT: 0 }
      };
    });

    // 🛡️ Push physical activity sessions (jadwal_kegiatan_id != null or non-KBM) so they render in Tab 2 (Kegiatan & Pembiasaan).
    // Unmatched out-of-bounds KBM sessions remain blocked when include_scheduled = true to prevent Live Monitoring pollution.
    physicalSessions.forEach((ps: any) => {
      if (!matchedPhysicalIds.has(ps.id)) {
        const isActivitySession = !!ps.jadwal_kegiatan_id || (ps.jenis_kegiatan && String(ps.jenis_kegiatan).toUpperCase() !== 'KBM');
        if (isActivitySession || !include_scheduled) {
          unifiedList.push(ps);
        }
      }
    });

    // Merge multiple session/schedule fragments belonging to the same lesson block (kelas, guru, mapel)
    const blockMap = new Map<string, any[]>();
    unifiedList.forEach((item: any) => {
      const key = `${item.kelas_id || 'no_kelas'}_${item.guru_id || 'no_guru'}_${item.mapel_id || 'no_mapel'}`;
      if (!blockMap.has(key)) blockMap.set(key, []);
      blockMap.get(key)!.push(item);
    });

    const consolidatedList: any[] = [];
    blockMap.forEach((groupItems) => {
      if (groupItems.length === 1) {
        consolidatedList.push(groupItems[0]);
        return;
      }

      groupItems.sort((a: any, b: any) => {
        const timeA = a.waktu_mulai || a.jam_mulai || '00:00';
        const timeB = b.waktu_mulai || b.jam_mulai || '00:00';
        return String(timeA).localeCompare(String(timeB));
      });

      // Split into sub-blocks if times are non-consecutive
      const subBlocks: any[][] = [];
      let currentSubBlock: any[] = [];

      groupItems.forEach((item: any) => {
        if (currentSubBlock.length === 0) {
          currentSubBlock.push(item);
        } else {
          const prev = currentSubBlock[currentSubBlock.length - 1];
          const prevEnd = prev.jam_selesai || (prev.waktu_selesai ? new Date(prev.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '');
          const currStart = item.jam_mulai || (item.waktu_mulai ? new Date(item.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '');
          
          // If both have explicit slot indices or adjacent times, keep in same subBlock
          const isSlotContiguous = (prev.jam_ke_end !== undefined && item.jam_ke_start !== undefined && item.jam_ke_start <= prev.jam_ke_end + 1);
          const isTimeContiguous = !prevEnd || !currStart || prevEnd === currStart;

          if (isSlotContiguous || isTimeContiguous || prev.jadwal_kbm_id === item.jadwal_kbm_id) {
            currentSubBlock.push(item);
          } else {
            subBlocks.push(currentSubBlock);
            currentSubBlock = [item];
          }
        }
      });
      if (currentSubBlock.length > 0) subBlocks.push(currentSubBlock);

      subBlocks.forEach((subItems) => {
        if (subItems.length === 1) {
          consolidatedList.push(subItems[0]);
          return;
        }

        // Prefer active/completed physical session
        const bestPhysical = subItems.find((i: any) => i.status === 'SELESAI' || i.status === 'BERLANGSUNG' || i.status === 'AKTIF') || subItems[0];
        const teacherHadirItem = subItems.find((i: any) => 
          i.guru_status === 'HADIR' || 
          i.absenGuru?.status === 'HADIR' || 
          i.AbsenGuru?.[0]?.status === 'HADIR' ||
          i._summary?.teacherStatus === 'TEPAT_WAKTU' ||
          i._summary?.teacherStatus === 'HADIR'
        );

        const earliestStart = subItems[0].waktu_mulai || subItems[0].jam_mulai;
        const latestEnd = subItems[subItems.length - 1].waktu_selesai || subItems[subItems.length - 1].jam_selesai;

        consolidatedList.push({
          ...bestPhysical,
          waktu_mulai: earliestStart,
          waktu_selesai: latestEnd,
          jam_mulai: subItems[0].jam_mulai || bestPhysical.jam_mulai,
          jam_selesai: subItems[subItems.length - 1].jam_selesai || bestPhysical.jam_selesai,
          guru_status: teacherHadirItem ? 'HADIR' : bestPhysical.guru_status,
          absenGuru: teacherHadirItem?.absenGuru || bestPhysical.absenGuru || (teacherHadirItem ? { status: 'HADIR' } : null),
          AbsenGuru: teacherHadirItem?.AbsenGuru || bestPhysical.AbsenGuru || (teacherHadirItem ? [{ status: 'HADIR' }] : []),
        });
      });
    });

    // Sort unified list chronologically (by waktu_mulai/jam_mulai ascending)
    consolidatedList.sort((a: any, b: any) => {
      const timeA = a.waktu_mulai || a.jam_mulai || '00:00';
      const timeB = b.waktu_mulai || b.jam_mulai || '00:00';
      return String(timeA).localeCompare(String(timeB));
    });

    // Filter by status if query provided
    let finalData = consolidatedList;
    if (status) {
      finalData = consolidatedList.filter((item: any) => item.status === status);
    }

    const serverNow = new Date();

    // 🏛️ SERVER-SIDE STATUS ENRICHMENT — Single Source of Truth
    // Compute isLive, isFinished, isOverdue, isUpcoming, teacherStatus, hadir, total
    // on the server so NO frontend component needs to calculate time manually.
    const enrichedData = finalData.map((item: any) => {
      const startAt = item.waktu_mulai ? new Date(item.waktu_mulai) : null;
      const endAt = item.waktu_selesai ? new Date(item.waktu_selesai) : null;
      const hasValidTime = !!startAt && !!endAt && !isNaN(startAt.getTime()) && !isNaN(endAt.getTime());

      const isFinished = item.status === 'SELESAI';
      const isLiveByTime = hasValidTime && serverNow >= (startAt as Date) && serverNow <= (endAt as Date);
      const isPastSchedule = hasValidTime && serverNow > (endAt as Date);
      
      const isVirtualSession = typeof item.id === 'string' && (item.id.startsWith('sched_') || item.status === 'MENDATANG');
      
      const absenGuru = item.absenGuru || (Array.isArray(item.AbsenGuru) ? item.AbsenGuru[0] : null);
      const isPlaceholderAbsenGuru = !absenGuru || (!absenGuru.waktu_tap && (!absenGuru.status || String(absenGuru.status).toUpperCase().includes('BELUM')));
      const hasTeacherCheckInOrPhoto = Boolean(item.foto_kegiatan) || (item.guru_status && item.guru_status !== 'BELUM_TAP' && item.guru_status !== 'BELUM_HADIR' && item.guru_status !== 'ALPA') || !isPlaceholderAbsenGuru;

      // 1. isLive:
      // - HANYA bernilai TRUE jika sesi fisik sudah resmi dibuka/dimulai oleh guru (ada foto / check-in guru)
      //   dan sesi belum selesai ditutup.
      const isLive = !isFinished && !isVirtualSession && item.status === 'BERLANGSUNG' && hasTeacherCheckInOrPhoto;

      // 2. isOverdue (TERLEWAT):
      // - HANYA untuk jadwal virtual atau sesi yang TIDAK PERNAH DIBUKA sama sekali (tanpa foto / tanpa check-in guru)
      //   yang jam jadwalnya sudah lewat.
      const isOverdue = !isFinished && !isLive && isPastSchedule && (!hasTeacherCheckInOrPhoto || isVirtualSession);

      // 3. isReadyToOpen (SIAP DIMULAI / MASUK JAM JADWAL TAPI BELUM DIBUKA GURU):
      const isReadyToOpen = !isFinished && !isLive && !isOverdue && isLiveByTime && (!hasTeacherCheckInOrPhoto || isVirtualSession);

      // 4. isUpcoming (BELUM MASUK JAM JADWAL):
      const isUpcoming = !isFinished && !isLive && !isOverdue && !isReadyToOpen;

      // 5. Teacher status derived from AbsenGuru record & PermohonanIzinGuru
      let teacherStatus: string;

      // Check if this teacher has an active/pending leave for today
      const matchingLeave = (activeLeavesToday as any[])?.find((l: any) => {
        if (l.guru_id !== item.guru_id) return false;
        if (l.tipe_durasi === 'SEBAGIAN_SESI' && l.jam_mulai && l.jam_selesai) {
          const itemStart = item.jam_mulai || (item.waktu_mulai ? String(item.waktu_mulai).slice(11, 16) : '');
          const itemEnd = item.jam_selesai || (item.waktu_selesai ? String(item.waktu_selesai).slice(11, 16) : '');
          if (itemStart && itemEnd) {
            return l.jam_mulai < itemEnd && l.jam_selesai > itemStart;
          }
        }
        return true;
      });

      if (matchingLeave) {
        item.instruksi_tugas = matchingLeave.instruksi_tugas || item.instruksi_tugas;
        item.file_tugas_url = matchingLeave.file_tugas_url || item.file_tugas_url;
        item.tugas_per_kelas = matchingLeave.tugas_per_kelas || item.tugas_per_kelas;
        item.permohonan_izin = {
          id: matchingLeave.id,
          tipe_izin: matchingLeave.tipe_izin,
          status: matchingLeave.status,
          alasan: matchingLeave.alasan,
          instruksi_tugas: matchingLeave.instruksi_tugas,
          tugas_per_kelas: matchingLeave.tugas_per_kelas,
          file_tugas_url: matchingLeave.file_tugas_url,
          guru_inval: matchingLeave.GuruInval ? {
            id: matchingLeave.GuruInval.id,
            nama_guru: matchingLeave.GuruInval.nama_guru,
            nip: matchingLeave.GuruInval.nip
          } : null
        };
        if (matchingLeave.GuruInval) {
          item.guru_inval_nama = matchingLeave.GuruInval.nama_guru;
        }

        if (matchingLeave.status === 'DISETUJUI') {
          teacherStatus = matchingLeave.GuruInval ? 'INVAL' : (matchingLeave.tipe_izin === 'DINAS_LUAR' ? 'DINAS_LUAR' : (matchingLeave.tipe_izin === 'SAKIT' ? 'SAKIT' : 'IZIN'));
        } else if (matchingLeave.status === 'PENDING') {
          teacherStatus = 'PENDING_IZIN';
        } else {
          teacherStatus = 'BELUM_TAP';
        }
      } else if (absenGuru && !isPlaceholderAbsenGuru) {
        if (absenGuru.is_terlambat) teacherStatus = 'TERLAMBAT';
        else if (absenGuru.status === 'IZIN') teacherStatus = 'IZIN';
        else if (absenGuru.status === 'SAKIT') teacherStatus = 'SAKIT';
        else if (absenGuru.status === 'PENUGASAN') teacherStatus = 'PENUGASAN';
        else if (absenGuru.status === 'ALPA') teacherStatus = 'ALPA';
        else teacherStatus = 'TEPAT_WAKTU';
      } else if (item.guru_status === 'HADIR' && Boolean(item.foto_kegiatan)) {
        teacherStatus = 'TEPAT_WAKTU';
      } else if (isFinished || isOverdue) {
        teacherStatus = 'ALPA';
      } else {
        teacherStatus = 'BELUM_TAP';
      }

      const effectiveGuruStatus = (teacherStatus === 'TEPAT_WAKTU' || teacherStatus === 'HADIR')
        ? 'HADIR'
        : (teacherStatus === 'TERLAMBAT' || teacherStatus === 'IZIN' || teacherStatus === 'SAKIT' || teacherStatus === 'PENUGASAN' || teacherStatus === 'INVAL' || teacherStatus === 'DINAS_LUAR' || teacherStatus === 'PENDING_IZIN' || teacherStatus === 'ALPA')
        ? teacherStatus
        : (isFinished || isOverdue ? 'ALPA' : (item.guru_status && !item.guru_status.toUpperCase().includes('BELUM') ? item.guru_status : 'BELUM_TAP'));

      const baseSummary = item.summary || {};
      const hadir = (baseSummary.HADIR || 0) + (baseSummary.TERLAMBAT || 0);

      return {
        ...item,
        isLive,
        isReadyToOpen,
        isFinished,
        isOverdue,
        is_overdue: isOverdue,
        isUpcoming,
        guru_status: effectiveGuruStatus,
        _summary: {
          ...baseSummary,
          isLive,
          isReadyToOpen,
          isFinished,
          isOverdue,
          isUpcoming,
          teacherStatus,
          hadir,
          total: baseSummary.total || 0,
        }
      };
    });

    // 🎯 Filter by status_filter if query provided (e.g. READY_UNOPENED for Meja Piket)
    let processedData = enrichedData;
    if (status_filter) {
      const upperFilter = String(status_filter).toUpperCase();
      if (upperFilter === 'READY_UNOPENED' || upperFilter === 'PIKET') {
        processedData = enrichedData.filter(item => 
          item.isReadyToOpen && 
          !item.isLive && 
          !item.isOverdue && 
          !item.isFinished && 
          (!item.guru_status || item.guru_status.includes('BELUM') || item.guru_status === 'BELUM_TAP' || item.guru_status === 'BELUM_HADIR')
        );
      } else if (upperFilter === 'LIVE') {
        processedData = enrichedData.filter(item => item.isLive);
      } else if (upperFilter === 'OVERDUE') {
        processedData = enrichedData.filter(item => item.isOverdue);
      } else if (upperFilter === 'FINISHED') {
        processedData = enrichedData.filter(item => item.isFinished);
      } else if (upperFilter === 'UPCOMING') {
        processedData = enrichedData.filter(item => item.isUpcoming);
      }
    }

    if (targetSessionId) {
      processedData = processedData.filter(item => item.id === targetSessionId);
    }

    // ⚡ Batch Ambil Status WA Reminder dari Redis (Zero DB query overhead)
    const processedSessionIds = processedData.map(it => it.id).filter(Boolean);
    const reminderMetaMap = await sesiReminderService.getBatchReminderMeta(tenantId, processedSessionIds);

    const withReminderData = processedData.map(item => {
      const reminder = reminderMetaMap.get(item.id) || null;
      return {
        ...item,
        reminder_meta: reminder,
        _summary: {
          ...item._summary,
          reminder_meta: reminder
        }
      };
    });

    const total = withReminderData.length;
    const paginatedData = withReminderData.slice(skip, skip + take);

    return {
      total,
      page: Number(page),
      limit: take,
      data: paginatedData
    };
  }

  /**
   * 🏛️ Single Source of Truth (SSOT) Agregasi Statistik Sesi KBM
   * Digunakan seragam oleh Dashboard Kurikulum, Meja Piket, dan Monitoring Global.
   */
  static aggregateSessionStats(sessions: any[]) {
    const list = Array.isArray(sessions) ? sessions : [];
    const stats = {
      total: list.length,
      live: 0,
      finished: 0,
      overdue: 0,
      upcoming: 0,
      withJournal: 0,
      teacherOnTime: 0,
      teacherLate: 0,
      teacherBelumMasuk: 0,
      teacherNotArrived: 0, // Backward-compatible alias
      teacherAlpa: 0,
      teacherInval: 0,
      teacherDinasLuar: 0,
      teacherIzinSakit: 0,
      teacherPending: 0,
    };

    list.forEach((s) => {
      const isLive = s.isLive || s._summary?.isLive || false;
      const isFinished = s.isFinished || s._summary?.isFinished || false;
      const isOverdue = s.isOverdue || s.is_overdue || s._summary?.isOverdue || false;
      const isUpcoming = s.isUpcoming || s._summary?.isUpcoming || false;
      const isReadyToOpen = s.isReadyToOpen || s._summary?.isReadyToOpen || false;

      if (isLive) stats.live++;
      if (isFinished) stats.finished++;
      if (isOverdue) stats.overdue++;
      if (isUpcoming) stats.upcoming++;
      if (s.ProgresMateri || s._summary?.hasJournal) stats.withJournal++;

      const tStatus = String(s._summary?.teacherStatus || s.guru_status || '').toUpperCase();
      if (tStatus === 'HADIR' || tStatus === 'TEPAT_WAKTU') {
        stats.teacherOnTime++;
      } else if (tStatus === 'TERLAMBAT') {
        stats.teacherLate++;
      } else if (tStatus === 'DINAS_LUAR' || tStatus === 'PENUGASAN') {
        stats.teacherDinasLuar++;
      } else if (tStatus === 'INVAL' || tStatus === 'DIGANTIKAN') {
        stats.teacherInval++;
      } else if (tStatus === 'IZIN' || tStatus === 'SAKIT') {
        stats.teacherIzinSakit++;
      } else if (tStatus === 'PENDING_IZIN' || tStatus === 'MENUNGGU_VERIFIKASI') {
        stats.teacherPending++;
      } else if (tStatus === 'ALPA' || isOverdue) {
        stats.teacherAlpa++;
      } else if (isReadyToOpen && !isLive) {
        // 🎯 HANYA sesi yang sedang aktif jam ini yang dihitung Belum Masuk!
        stats.teacherBelumMasuk++;
        stats.teacherNotArrived++;
      }
    });

    return stats;
  }

  async updateStatus(tenantId: string, _org: any, sesiId: string, status: string) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesiId, tenant_id: tenantId }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    const targetStatus = status === 'AKTIF' ? 'BERLANGSUNG' : status;
    const allowedStatuses = ['MENDATANG', 'BERLANGSUNG', 'TERLEWAT', 'SELESAI'];
    if (!allowedStatuses.includes(targetStatus)) {
      throw new Error(`Status sesi '${status}' tidak valid`);
    }

    const updated = await prisma.sesiAbsensi.update({
      where: { id: sesiId },
      data: {
        status: targetStatus,
        updated_at: new Date()
      }
    });

    emitDomainEvent({
      event_type: 'SESI_UPDATED',
      tenant_id: tenantId,
      source_service: 'sesi-lifecycle.service',
      payload: updated,
    }).catch(() => {});

    return updated;
  }

  async update(tenantId: string, _org: any, id: string, data: any) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    const updated = await prisma.sesiAbsensi.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date()
      }
    });

    return updated;
  }

  async remove(tenantId: string, _org: any, id: string, _userId: string) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    await prisma.sesiAbsensi.delete({
      where: { id }
    });

    return { success: true, message: 'Sesi berhasil dihapus' };
  }

  async listByTanggal(tenantId: string, tanggal: Date) {
    const startOfDay = new Date(tanggal);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(tanggal);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay }
      },
      select: {
        id: true,
        kelas_id: true,
        mapel_id: true,
        guru_id: true,
        jadwal_kbm_id: true,
        jenis_kegiatan: true,
        waktu_mulai: true,
        waktu_selesai: true,
        status: true
      }
    });
  }
}

export const sesiLifecycleService = SesiLifecycleService.getInstance();
