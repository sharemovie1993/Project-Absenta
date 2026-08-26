// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { storageService } from '@/infra/storage/storage.service';
import { emitDomainEvent } from '@/infra/event-bus';
import { getTenantTimezone, getTenantOffsetString, getTimezoneLabel } from '@/utils/timezone.utils';
import { PLATFORM_TIMEZONE } from '@/infra/jobEngine';
import { parseSafeDate } from '../sesi-absensi.schema';
import { sesiReminderService } from '../sesi-reminder.service';
import { sesiCloseNotifyService } from '../sesi-close-notify.service';
import { sesiHelperService } from '../sesi-helper.service';

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
  _kelasId: string,
  slotIndex: number,
  hariName: string
): { jam_mulai?: string; jam_selesai?: string } | null {
  if (!shiftConfig) return null;
  const upperHari = hariName.toUpperCase();

  // Prioritaskan day_patterns[hari] jika punya slots
  const slots: any[] =
    (shiftConfig.day_patterns?.[upperHari]?.slots?.length > 0)
      ? shiftConfig.day_patterns[upperHari].slots
      : (shiftConfig.slots || []);

  if (slots.length === 0) return null;

  // 1. Coba cari slot dengan index yang sama
  const exactSlot = slots.find((s: any) => Number(s.index) === slotIndex || Number(s.jam_ke) === slotIndex);
  if (exactSlot && exactSlot.jam_mulai && exactSlot.jam_selesai) {
    return { jam_mulai: exactSlot.jam_mulai, jam_selesai: exactSlot.jam_selesai };
  }

  // 2. Fallback: index berbasis urutan 1-based (slot ke-1 = index 0)
  const fallbackSlot = slots[slotIndex - 1];
  if (fallbackSlot && fallbackSlot.jam_mulai && fallbackSlot.jam_selesai) {
    return { jam_mulai: fallbackSlot.jam_mulai, jam_selesai: fallbackSlot.jam_selesai };
  }

  return null;
}

/**
 * Enrich JadwalKBM items with dynamic day_patterns / shift slot times for Sesi module.
 */
function enrichJadwalWithDayTimesSesi(schedules: any[], shiftConfig: any, hariName: string): any[] {
  if (!shiftConfig || !schedules || schedules.length === 0) return schedules;
  return schedules.map(item => {
    const slotIdx = item.slot_index ?? item.jam_ke_start;
    if (slotIdx === undefined || slotIdx === null) return item;
    const resolved = resolveSlotTimeSesi(shiftConfig, item.kelas_id, Number(slotIdx), hariName);
    if (!resolved) return item;
    return {
      ...item,
      jam_mulai: resolved.jam_mulai || item.jam_mulai,
      jam_selesai: resolved.jam_selesai || item.jam_selesai
    };
  });
}

/**
 * Centralized Time-Window & Cutoff Guard saat membuat/membuka sesi KBM (Timezone-Aware)
 */
function validateSessionTimeWindow(
  waktuMulai: Date | null,
  _waktuSelesai: Date | null,
  isLiveOpening: boolean,
  tz: string = PLATFORM_TIMEZONE
) {
  if (!waktuMulai || isNaN(waktuMulai.getTime())) return;
  const now = new Date();
  const EARLY_TOLERANCE_MS = 15 * 60 * 1000;
  const earliestAllowed = new Date(waktuMulai.getTime() - EARLY_TOLERANCE_MS);

  if (isLiveOpening && now.getTime() < earliestAllowed.getTime()) {
    const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tz });
    const openTimeStr = fmt(earliestAllowed);
    const startTimeStr = fmt(waktuMulai);
    const tzLabel = getTimezoneLabel(tz);
    throw new Error(`Sesi KBM belum dibuka. Presensi kehadiran guru untuk sesi ini (jam ${startTimeStr}) baru dapat dilakukan mulai pukul ${openTimeStr} ${tzLabel} (15 menit sebelum jam mulai).`);
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
  catatan: string = 'Hadir saat pembukaan sesi KBM (Foto)',
  kelasId?: string | null
): Promise<void> {
  try {
    const now = new Date();
    
    // ⚖️ Resolusi Target Mulai Efektif (Pembiasaan & Transisi Guru Molor)
    const { effectiveStartTarget, auditNote } = await sesiHelperService.resolveEffectiveKbmStartTarget(
      tenantId,
      kelasId,
      startTarget,
      now
    );

    let isTerlambat = false;
    let menitKeterlambatan = 0;
    if (effectiveStartTarget && !isNaN(effectiveStartTarget.getTime()) && now.getTime() > effectiveStartTarget.getTime()) {
      isTerlambat = true;
      menitKeterlambatan = Math.max(0, Math.floor((now.getTime() - effectiveStartTarget.getTime()) / (60 * 1000)));
    }

    const finalCatatan = auditNote ? `${catatan} (${auditNote})` : catatan;

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
          catatan: finalCatatan,
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
          catatan: finalCatatan,
          tahun_pelajaran_id: tahunPelajaranId || 'default-tp',
          semester_id: semesterId || 'default-sem',
        }
      });
    }
  } catch (err) {
    console.error('[SesiLifecycleService] Error in upsertTeacherAttendanceOnOpen:', err);
  }
}

export class SesiCreatorService {
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
            'Hadir saat pembukaan sesi KBM (Foto)',
            existingSesi.kelas_id
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
    let fallbackJamSelesai: string | null = null;
    let fallbackJamMulai: string | null = null;

    if (payload.jadwal_kbm_id) {
      const cleanJadwalId = String(payload.jadwal_kbm_id).replace(/^sched_/, '');
      try {
        const existingJadwal = await (prisma as any).jadwalKBM.findUnique({
          where: { id: cleanJadwalId },
          select: { id: true, jam_mulai: true, jam_selesai: true }
        });
        if (existingJadwal) {
          validJadwalKbmId = existingJadwal.id;
          fallbackJamSelesai = existingJadwal.jam_selesai;
          fallbackJamMulai = existingJadwal.jam_mulai;
        }
      } catch (e) {
        validJadwalKbmId = null;
      }
    }

    // 🛡️ Resolve fallback waktu_selesai dari JadwalKegiatan jika jadwal_kbm_id tidak ada
    if (!fallbackJamSelesai && payload.jadwal_kegiatan_id) {
      try {
        const existingKegiatan = await (prisma as any).jadwalKegiatan.findUnique({
          where: { id: payload.jadwal_kegiatan_id },
          select: { waktu_selesai: true }
        });
        if (existingKegiatan?.waktu_selesai) {
          fallbackJamSelesai = existingKegiatan.waktu_selesai;
        }
      } catch (e) {
        // ignore
      }
    }

    // 🛡️ Pastikan waktu_selesai fisik selalu terisi jika terkait Jadwal
    let effectiveParsedEnd = parsedEnd;
    const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(parsedStart);
    if (!effectiveParsedEnd && fallbackJamSelesai) {
      const computedEnd = new Date(`${todayDateStr}T${fallbackJamSelesai}:00.000${tzOffset}`);
      if (!isNaN(computedEnd.getTime())) {
        effectiveParsedEnd = computedEnd;
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
        waktu_selesai: effectiveParsedEnd,
        status: initialStatus,
        foto_kegiatan: finalFotoUrl,
        created_by_user_id: userId
      }
    });

    if (guru_id && finalFotoUrl) {
      // ⚖️ Aturan KERAS: Guru dievaluasi dari jam jadwal resmi (JadwalKBM.jam_mulai),
      // BUKAN dari parsedStart (waktu fisik guru buka sesi).
      let teacherScheduledStart: Date = parsedStart;
      if (fallbackJamMulai) {
        const fromSchedule = new Date(`${todayDateStr}T${fallbackJamMulai}:00.000${tzOffset}`);
        if (!isNaN(fromSchedule.getTime())) {
          teacherScheduledStart = fromSchedule;
        }
      }

      await upsertTeacherAttendanceOnOpen(
        tenantId,
        sesi.id,
        guru_id,
        teacherScheduledStart,
        targetTpId || 'default-tp',
        targetSemId || 'default-sem',
        'Otomatis HADIR saat pembukaan sesi KBM (Foto)',
        kelas_id
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
}
