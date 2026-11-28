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
import { sesiOpenNotifyService } from '../sesi-open-notify.service';
import { sesiHelperService } from '../sesi-helper.service';
import { propagateGateAbsencesForNewSessionCommand } from '../commands/propagate-gate-absences-batch.command';

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
  slotIndex: number,
  hariName: string
): { jam_mulai?: string; jam_selesai?: string } | null {
  if (!shiftConfig) return null;
  const upperHari = (hariName || '').toUpperCase();

  // Handle shifts array structure: { shifts: [...], class_assignments: {...} }
  const shifts = Array.isArray(shiftConfig.shifts) ? shiftConfig.shifts : [shiftConfig];
  const assignedShiftId = shiftConfig.class_assignments?.[kelasId] || 'pagi';
  const shift = shifts.find((s: any) => s.id === assignedShiftId) || shifts[0];
  if (!shift) return null;

  // Prioritaskan day_patterns[hari] jika punya slots
  const slots: any[] =
    (shift.day_patterns?.[upperHari]?.slots?.length > 0)
      ? shift.day_patterns[upperHari].slots
      : (shift.slots || []);

  if (slots.length === 0) return null;

  // 1. Coba cari slot dengan field slot, index, atau jam_ke yang cocok
  const exactSlot = slots.find((s: any) => 
    Number(s.slot) === slotIndex || 
    Number(s.slot_index) === slotIndex || 
    Number(s.index) === slotIndex || 
    Number(s.jam_ke) === slotIndex
  );
  if (exactSlot) {
    const start = exactSlot.start || exactSlot.jam_mulai;
    const end = exactSlot.end || exactSlot.jam_selesai;
    if (start && end) return { jam_mulai: start, jam_selesai: end };
  }

  // 2. Fallback: index berbasis urutan 1-based (slot ke-1 = index 0)
  const fallbackSlot = slots[slotIndex - 1];
  if (fallbackSlot) {
    const start = fallbackSlot.start || fallbackSlot.jam_mulai;
    const end = fallbackSlot.end || fallbackSlot.jam_selesai;
    if (start && end) return { jam_mulai: start, jam_selesai: end };
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
  tz: string = PLATFORM_TIMEZONE,
  isPetugasOpening: boolean = false
) {
  if (!waktuMulai || isNaN(waktuMulai.getTime())) return;
  // 🛡️ Jika sesi dibuka oleh Siswa Petugas Kelas, jangan blokir dengan validasi kehadiran guru
  if (isPetugasOpening) return;

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
  kelasId?: string | null,
  endTarget?: Date | null
): Promise<void> {
  try {
    const now = new Date();
    const tz = await getTenantTimezone(tenantId);
    const tzOffset = getTenantOffsetString(tz);
    const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
    const formatHHMM = (dt?: Date | null) => {
      if (!dt || isNaN(dt.getTime())) return null;
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(dt);
    };

    // ⚖️ Resolusi Target Mulai Efektif (Kejadian Khusus & Transisi Guru Molor;
    // pengampunan kegiatan TIDAK otomatis — wajib diverifikasi via kehadiran aktual di kegiatan!)
    const { effectiveStartTarget, auditNote } = await sesiHelperService.resolveEffectiveKbmStartTarget(
      tenantId,
      kelasId,
      startTarget,
      now,
      { skipKegiatanExtension: true, kbmEnd: endTarget }
    );

    const tenantCfg = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { toleransi_kbm_guru_inval_menit: true }
    });
    const tolGuruKbmInval = tenantCfg?.toleransi_kbm_guru_inval_menit ?? 10;

    let isTerlambat = false;
    let menitKeterlambatan = 0;
    let graceAuditNote: string | null = null;
    if (effectiveStartTarget && !isNaN(effectiveStartTarget.getTime())) {
      const diffMinutes = Math.floor((now.getTime() - effectiveStartTarget.getTime()) / (60 * 1000));
      if (diffMinutes > tolGuruKbmInval) {
        isTerlambat = true;
        menitKeterlambatan = Math.max(0, diffMinutes);
      }
    }

    // 🛡️ Pengampunan Keterlambatan Tugas Kegiatan (Tap Terminal ATAU Selfie Mandiri Kegiatan):
    // Berlaku HANYA jika guru tercatat HADIR di sesi kegiatan non-APEL_SORE yang beririsan hari ini.
    if (isTerlambat && startTarget) {
      const grace = await sesiHelperService.checkGuruKegiatanGracePeriod(
        tenantId,
        guruId,
        formatHHMM(startTarget),
        formatHHMM(endTarget),
        todayDateStr,
        tz,
        tzOffset
      );
      if (grace.forgiven) {
        isTerlambat = false;
        menitKeterlambatan = 0;
        graceAuditNote = `Pengampunan tugas ${grace.kegiatanNama || 'Kegiatan'}`;
      }
    }

    const combinedNote = graceAuditNote || auditNote;
    const finalCatatan = combinedNote ? `${catatan} (${combinedNote})` : catatan;

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
  async create(tenantId: string, org: any, payload: any, userId: string) {
    const user = userId ? await prisma.user.findUnique({
      where: { id: userId },
      include: { Role: true }
    }) : null;
    const isSiswaUser = user?.Role?.name === 'SISWA';

    const isPetugasOpening = Boolean(
      isSiswaUser ||
      payload.opened_by_petugas ||
      payload.opened_by === 'PETUGAS_KELAS' ||
      org?.positions?.some((p: any) => p.code === 'PETUGAS_KELAS' || p.code === 'PETUGAS_ABSENSI') ||
      payload.is_petugas_kelas
    );

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
          // ⚡ O(1) String Slice: Jauh lebih cepat dari Regex match pada jutaan karakter Base64
          const commaIdx = rawFoto.indexOf(',');
          if (commaIdx !== -1) {
            const header = rawFoto.substring(0, commaIdx);
            const base64Data = rawFoto.substring(commaIdx + 1);
            const mimeMatch = header.match(/data:([^;]+)/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
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

    // 🛡️ Resolve JadwalKBM reference early so unit_pengajaran_id & idempotency guard stay aligned
    const cleanJadwalKbmId = payload.jadwal_kbm_id ? String(payload.jadwal_kbm_id).replace(/^sched_/, '') : null;
    let validJadwalKbmId: string | null = null;
    let fallbackJamSelesai: string | null = null;
    let fallbackJamMulai: string | null = null;
    let jadwalUnitPengajaranId: string | null = null;
    let jadwalGuruPelaksanaId: string | null = null;

    if (cleanJadwalKbmId) {
      try {
        const existingJadwal = await (prisma as any).jadwalKBM.findUnique({
          where: { id: cleanJadwalKbmId },
          select: {
            id: true,
            jam_mulai: true,
            jam_selesai: true,
            unit_pengajaran_id: true,
            guru_pelaksana_id: true,
          },
        });
        if (existingJadwal) {
          validJadwalKbmId = existingJadwal.id;
          fallbackJamSelesai = existingJadwal.jam_selesai;
          fallbackJamMulai = existingJadwal.jam_mulai;
          jadwalUnitPengajaranId = existingJadwal.unit_pengajaran_id || null;
          jadwalGuruPelaksanaId = existingJadwal.guru_pelaksana_id || null;
        }
      } catch {
        validJadwalKbmId = null;
      }
    }

    const resolvedUnitPengajaranId: string | null = payload.unit_pengajaran_id || jadwalUnitPengajaranId || null;

    // 🛡️ IDEMPOTENCY GUARD: Prevent duplicate session creation for same schedule slot / unit & date
    const tz = await getTenantTimezone(tenantId);
    const tzOffset = getTenantOffsetString(tz);
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(sessionDate);
    const startOfDay = new Date(`${dateStr}T00:00:00.000${tzOffset}`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999${tzOffset}`);

    const matchingSesis = await (prisma.sesiAbsensi as any).findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay },
        OR: [
          ...(validJadwalKbmId ? [{ jadwal_kbm_id: validJadwalKbmId }] : []),
          ...(kelas_id && mapel_id
            ? [
                {
                  kelas_id,
                  mapel_id,
                  jenis_kegiatan: 'KBM',
                  ...(resolvedUnitPengajaranId
                    ? { unit_pengajaran_id: resolvedUnitPengajaranId }
                    : guru_id
                    ? { guru_id }
                    : {}),
                },
              ]
            : []),
        ],
      },
      orderBy: { waktu_mulai: 'asc' },
    });

    const existingSesi = matchingSesis[0] || null;
    const latestMatchedSesi = matchingSesis.length > 1 ? matchingSesis[matchingSesis.length - 1] : existingSesi;

    if (existingSesi) {
      if (existingSesi.status === 'SELESAI') {
        throw new Error('Sesi KBM telah selesai. Tidak dapat membuka kembali sesi yang sudah ditutup.');
      }
      if (existingSesi.status === 'TERLEWAT') {
        throw new Error('Jadwal sesi KBM telah terlewat dan ditutup. Anda tidak dapat lagi membuka sesi yang sudah terlewat.');
      }

      const now = new Date();
      const startTarget = existingSesi.waktu_mulai || (waktu_mulai ? parseSafeDate(waktu_mulai, tzOffset) : now);
      const endTarget = latestMatchedSesi?.waktu_selesai || existingSesi.waktu_selesai || (waktu_selesai ? parseSafeDate(waktu_selesai, tzOffset) : null);
      
      // 🛡️ Centralized Time-Window & Cutoff Guard (Timezone-Aware)
      validateSessionTimeWindow(startTarget, endTarget, Boolean(finalFotoUrl), tz, isPetugasOpening);

      if (finalFotoUrl || waktu_mulai || payload.status === 'BERLANGSUNG' || isPetugasOpening) {
        const updateData: any = {
          status: 'BERLANGSUNG',
          ...(finalFotoUrl ? { foto_kegiatan: finalFotoUrl } : {}),
          ...(waktu_mulai ? { waktu_mulai: parseSafeDate(waktu_mulai, tzOffset) } : {}),
          ...(endTarget ? { waktu_selesai: endTarget } : {}),
          updated_at: new Date()
        };
        if (isPetugasOpening) {
          updateData.keterangan = `[DIBUKA_PETUGAS_KELAS] ${user?.full_name || (user as any)?.name || 'Petugas Kelas'}`;
          if (userId) updateData.created_by_user_id = userId;
        } else if (userId && !existingSesi.created_by_user_id) {
          updateData.created_by_user_id = userId;
          updateData.keterangan = `[DIBUKA_GURU] ${user?.full_name || (user as any)?.name || 'Guru'}`;
        }

        const updatedSesi = await prisma.sesiAbsensi.update({
          where: { id: existingSesi.id },
          data: updateData
        });

        const effectiveAttendingGuruId = guru_id || existingSesi.guru_id || (existingSesi as any).Guru?.id;
        // HANYA tandai guru hadir jika dibuka oleh Guru dengan foto resmi (bukan siswa petugas membuka kelas)
        if (effectiveAttendingGuruId && finalFotoUrl && !isPetugasOpening) {
          await upsertTeacherAttendanceOnOpen(
            tenantId,
            existingSesi.id,
            effectiveAttendingGuruId,
            startTarget,
            existingSesi.tahun_pelajaran_id,
            existingSesi.semester_id,
            'Hadir saat pembukaan sesi KBM (Foto Guru)',
            existingSesi.kelas_id,
            endTarget
          );
        }

        if (finalFotoUrl) {
          setImmediate(() => {
            sesiOpenNotifyService.notifyKbmSessionOpened(tenantId, updatedSesi, rawFoto, finalFotoUrl)
              .catch(err => appLogger.warn(`[sesiOpenNotify] existingSesi error: ${err.message}`));
          });
        }
        return updatedSesi;
      }
      return existingSesi;
    }

    const parsedStart = waktu_mulai ? parseSafeDate(waktu_mulai, tzOffset) : new Date();
    const parsedEnd = waktu_selesai ? parseSafeDate(waktu_selesai, tzOffset) : null;
    const now = new Date();

    // 🛡️ Centralized Time-Window & Cutoff Guard saat membuat sesi baru (Timezone-Aware)
    validateSessionTimeWindow(parsedStart, parsedEnd, Boolean(finalFotoUrl), tz, isPetugasOpening);

    const isFutureSchedule = parsedStart.getTime() - now.getTime() > 15 * 60 * 1000;
    const initialStatus = (finalFotoUrl || isPetugasOpening) ? 'BERLANGSUNG' : isFutureSchedule ? 'MENDATANG' : 'BERLANGSUNG';

    // jadwalKbmId & fallback times already resolved above

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

    // 🛡️ Safely resolve guru_id foreign key
    let validGuruId: string | null = null;
    if (guru_id && guru_id !== 'default-guru') {
      const guruExists = await prisma.guru.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [
            { id: guru_id },
            { user_id: guru_id }
          ]
        },
        select: { id: true }
      });
      if (guruExists) {
        validGuruId = guruExists.id;
      }
    }

    const guruPelaksanaId = payload.guru_pelaksana_id || jadwalGuruPelaksanaId || null;
    const isDelegasi = Boolean(payload.is_delegasi || guruPelaksanaId);

    const sesi = await (prisma.sesiAbsensi as any).create({
      data: {
        tenant_id: tenantId,
        jadwal_kbm_id: validJadwalKbmId,
        jadwal_kegiatan_id: payload.jadwal_kegiatan_id || null,
        unit_pengajaran_id: resolvedUnitPengajaranId,
        kelas_id,
        mapel_id: mapel_id || null,
        guru_id: validGuruId,
        guru_pelaksana_id: guruPelaksanaId,
        is_delegasi: isDelegasi,
        tahun_pelajaran_id: targetTpId || 'default-tp',
        semester_id: targetSemId || 'default-sem',
        jenis_kegiatan,
        sumber_sesi: resolvedSumberSesi,
        tanggal: sessionDate,
        waktu_mulai: parsedStart,
        waktu_selesai: effectiveParsedEnd,
        status: initialStatus,
        foto_kegiatan: finalFotoUrl,
        keterangan: isPetugasOpening ? `[DIBUKA_PETUGAS_KELAS] ${user?.full_name || (user as any)?.name || 'Petugas Kelas'}` : `[DIBUKA_GURU] ${user?.full_name || (user as any)?.name || 'Guru'}`,
        created_by_user_id: userId
      }
    });

    // Evaluasi presensi guru pengajar riil di kelas (guru pelaksana jika delegasi, atau guru resmi)
    const effectiveAttendingGuruId = guruPelaksanaId || validGuruId;

    if (effectiveAttendingGuruId && finalFotoUrl && !isPetugasOpening) {
      // ⚖️ Aturan KERAS: Guru dievaluasi dari jam jadwal resmi (JadwalKBM.jam_mulai),
      // BUKAN dari parsedStart (waktu fisik guru buka sesi).
      let teacherScheduledStart: Date = parsedStart;
      if (fallbackJamMulai) {
        const fromSchedule = new Date(`${todayDateStr}T${fallbackJamMulai}:00.000${tzOffset}`);
        if (!isNaN(fromSchedule.getTime())) {
          teacherScheduledStart = fromSchedule;
        }
      }

      const note = isDelegasi
        ? 'Otomatis HADIR saat pembukaan sesi KBM (Pengajar Pelaksana / Delegasi)'
        : 'Otomatis HADIR saat pembukaan sesi KBM (Foto)';

      await upsertTeacherAttendanceOnOpen(
        tenantId,
        sesi.id,
        effectiveAttendingGuruId,
        teacherScheduledStart,
        targetTpId || 'default-tp',
        targetSemId || 'default-sem',
        note,
        kelas_id,
        effectiveParsedEnd
      );
    }

    // 🛡️ PEWARISAN KETIDAKHADIRAN GERBANG (SAKIT, IZIN, ALPA, DISPEN):
    // Siswa yang di gerbang tercatat SAKIT, IZIN, ALPA, atau DISPEN otomatis diwariskan ke sesi baru
    // ⚡ Asynchronous Background Execution agar response HTTP 201 kembali instan (<100ms) ke antarmuka guru
    if (kelas_id) {
      const dayStart = new Date(sessionDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(sessionDate);
      dayEnd.setHours(23, 59, 59, 999);

      setImmediate(() => {
        propagateGateAbsencesForNewSessionCommand({
          tenantId,
          startDay: dayStart,
          endDay: dayEnd,
          kelasId: kelas_id,
          session: sesi,
          waktuMulaiFallback: parsedStart,
        }).catch(err => {
          console.warn('[createSesi] Failed to propagate gate non-attendance:', err);
        });
      });
    }

    // 📲 NOTIFIKASI WHATSAPP BUKA SESI KBM:
    // Kirim notifikasi foto kehadiran guru ke grup WhatsApp yang sudah ditentukan
    // ⚡ Asynchronous Background Execution agar response HTTP 201 kembali instan (<100ms)
    if (finalFotoUrl) {
      setImmediate(() => {
        sesiOpenNotifyService.notifyKbmSessionOpened(tenantId, sesi, rawFoto, finalFotoUrl)
          .catch(err => {
            appLogger.warn(`[sesiOpenNotify] newSesi error: ${err.message}`);
          });
      });
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
