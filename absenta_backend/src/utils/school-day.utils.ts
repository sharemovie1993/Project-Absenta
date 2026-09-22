import { prisma } from './prisma';
import { Hari } from '@prisma/client';

/**
 * Helper untuk mendapatkan nama Hari Enum dari Date berbasis timezone
 */
export function getHariEnum(date: Date = new Date(), timezone: string = 'Asia/Jakarta'): Hari {
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(date);
  const dayMap: Record<string, Hari> = {
    Sun: 'MINGGU',
    Mon: 'SENIN',
    Tue: 'SELASA',
    Wed: 'RABU',
    Thu: 'KAMIS',
    Fri: 'JUMAT',
    Sat: 'SABTU',
  };
  return dayMap[dayName] || 'SENIN';
}

/**
 * Helper untuk memeriksa apakah tanggal target merupakan Hari Kerja Sekolah Aktif
 * Memeriksa:
 * 1. Konfigurasi Hari Sekolah Tenant (5 hari vs 6 hari kerja di tenant.hari_sekolah)
 * 2. Kejadian Khusus / Libur Darurat Global (AbsensiKejadianKhusus)
 * 3. Kalender Akademik (Libur Nasional / Libur Semester / Cuti Bersama di KalenderAkademik)
 */
export async function isSchoolDay(
  tenantId: string,
  dateTarget: Date = new Date(),
  timezone: string = 'Asia/Jakarta'
): Promise<{ isWorkingDay: boolean; reason?: string }> {
  const hariEnum = getHariEnum(dateTarget, timezone);

  // 1. Cek konfigurasi hari operasional tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { hari_sekolah: true, name: true },
  });

  const operationalDays =
    tenant?.hari_sekolah && tenant.hari_sekolah.length > 0
      ? tenant.hari_sekolah
      : [Hari.SENIN, Hari.SELASA, Hari.RABU, Hari.KAMIS, Hari.JUMAT];

  if (!operationalDays.includes(hariEnum)) {
    return {
      isWorkingDay: false,
      reason: `Bukan hari operasional sekolah (${hariEnum}). Sekolah menerapkan sistem ${operationalDays.length} hari kerja.`,
    };
  }

  // Normalisasi rentang tanggal target (UTC date boundary)
  const targetDateStart = new Date(dateTarget);
  targetDateStart.setUTCHours(0, 0, 0, 0);
  const targetDateEnd = new Date(dateTarget);
  targetDateEnd.setUTCHours(23, 59, 59, 999);

  // 2. Cek Kejadian Khusus Global (Libur Darurat / Kebencanaan)
  const globalSpecialEvent = await prisma.absensiKejadianKhusus.findFirst({
    where: {
      tenant_id: tenantId,
      tanggal: {
        gte: targetDateStart,
        lte: targetDateEnd,
      },
      kelas_id: null,
      mode_kejadian: 'LIBUR',
    },
  });

  if (globalSpecialEvent) {
    return {
      isWorkingDay: false,
      reason: `Sekolah diliburkan secara global (Kejadian Khusus: ${globalSpecialEvent.keterangan || 'Libur Darurat'})`,
    };
  }

  // 3. Cek Kalender Akademik (Libur Terjadwal / Libur Nasional)
  const academicHoliday = await prisma.kalenderAkademik.findFirst({
    where: {
      tenant_id: tenantId,
      tanggal_mulai: { lte: targetDateEnd },
      tanggal_selesai: { gte: targetDateStart },
      jenis: { startsWith: 'LIBUR' },
    },
  });

  if (academicHoliday) {
    return {
      isWorkingDay: false,
      reason: `Hari Libur Akademik Terjadwal (${academicHoliday.judul})`,
    };
  }

  return { isWorkingDay: true };
}
