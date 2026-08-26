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

export class SesiMutatorService {
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

    if (targetStatus === 'SELESAI') {
      try {
        await sesiCloseNotifyService.handleSessionClose(tenantId, sesiId, updated);
      } catch (err: any) {
        appLogger.warn({ error: err?.message, sesiId }, '[updateStatus] Failed to auto-finalize session absences on close');
      }
    }

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
}
