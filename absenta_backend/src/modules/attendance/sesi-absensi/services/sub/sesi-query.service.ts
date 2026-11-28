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
import {
  resolveJadwalKegiatanPolicy,
  formatOrgDutyLabel,
} from '../../../unified-kegiatan/services/kegiatan-wajib-config.helper';

const HARI_BY_WEEKDAY = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;

function resolveHariFromDateStr(dateStr: string): string {
  const [y, m, d] = String(dateStr || '').slice(0, 10).split('-').map(Number);
  if (y && m && d) {
    return HARI_BY_WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  }
  return HARI_BY_WEEKDAY[new Date().getDay()];
}

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

export class SesiQueryService {
  async list(tenantId: string, orgOrQuery?: any, maybeQuery?: any) {
    const query = (maybeQuery !== undefined ? maybeQuery : orgOrQuery) || {};
    const _org = maybeQuery !== undefined ? orgOrQuery : {};
    const {
      kelas_id,
      guru_id,
      allowedKelasIds,
      guruIdFilter,
      tanggal,
      status,
      status_filter,
      include_scheduled,
      limit = 50,
      page = 1,
      tahun_pelajaran_id,
      semester_id,
    } = query;

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

    const targetGuruId = guru_id || guruIdFilter;
    if (targetGuruId) {
      where.OR = [
        { guru_id: targetGuruId },
        { guru_pelaksana_id: targetGuruId },
        { UnitPengajaran: { guru_id: targetGuruId } },
      ];
    }

    if (status) where.status = status;
    if (tahun_pelajaran_id) where.tahun_pelajaran_id = tahun_pelajaran_id;
    if (semester_id) where.semester_id = semester_id;
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

    // 0. Auto-ensure SesiAbsensi records exist for active JadwalKegiatan on the requested date
    try {
      const checkDateStr = tanggal || new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
      const checkDateLocalStart = new Date(`${checkDateStr}T00:00:00.000${tzOffset}`);
      const checkDateLocalEnd = new Date(`${checkDateStr}T23:59:59.999${tzOffset}`);
      const checkDateUtcStart = new Date(`${checkDateStr}T00:00:00.000Z`);
      const checkDateUtcEnd = new Date(`${checkDateStr}T23:59:59.999Z`);
      const checkHariName = resolveHariFromDateStr(checkDateStr);
      const validHariEnums = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];

      if (validHariEnums.includes(checkHariName)) {
        const activeKegiatans = await prisma.jadwalKegiatan.findMany({
          where: {
            tenant_id: tenantId,
            aktif: true,
            hari: { has: checkHariName as any },
            berlaku_mulai: { lte: checkDateUtcEnd },
            OR: [
              { berlaku_sampai: null },
              { berlaku_sampai: { gte: checkDateUtcStart } },
            ],
          },
        });

        if (activeKegiatans.length > 0) {
          const [activeYear, existingActSessions] = await Promise.all([
            prisma.tahunPelajaran.findFirst({
              where: { tenant_id: tenantId, is_active: true },
              include: { Semester: { where: { is_active: true }, take: 1 } },
            }),
            prisma.sesiAbsensi.findMany({
              where: {
                tenant_id: tenantId,
                tanggal: { gte: checkDateLocalStart, lte: checkDateLocalEnd },
                OR: [
                  { jadwal_kegiatan_id: { in: activeKegiatans.map((k: any) => k.id) } },
                  { jenis_kegiatan: { not: 'KBM' } }
                ]
              },
              select: {
                id: true,
                jadwal_kegiatan_id: true,
                kelas_id: true,
                jenis_kegiatan: true,
                waktu_mulai: true,
                waktu_selesai: true,
                status: true,
                _count: { select: { AbsenSiswa: true, AbsenGuru: true } },
              },
            }),
          ]);

          const activeSemId = activeYear?.Semester?.[0]?.id;
          if (activeYear && activeSemId) {
            const existingSet = new Set<string>();
            const existingMap = new Map<string, any>();
            existingActSessions.forEach((s: any) => {
              if (s.jadwal_kegiatan_id) {
                existingSet.add(`${s.jadwal_kegiatan_id}_${s.kelas_id}`);
                existingMap.set(`${s.jadwal_kegiatan_id}_${s.kelas_id}`, s);
              }
              const norm = String(s.jenis_kegiatan || '').trim().toLowerCase();
              if (norm) {
                existingSet.add(`named_${norm}_${s.kelas_id}`);
                existingMap.set(`named_${norm}_${s.kelas_id}`, s);
              }
            });
            let allActiveKelasIds: string[] | null = null;
            const toCreate: any[] = [];

            // Cek bila ada pembina upacara terjadwal pada tanggal ini
            const upacaraSchedule = await prisma.jadwalPembinaUpacara.findFirst({
              where: {
                tenant_id: tenantId,
                tanggal: { gte: checkDateUtcStart, lte: checkDateUtcEnd },
              },
              select: { guru_id: true, guru_pengganti_id: true },
            });
            const pembinaGuruId = upacaraSchedule?.guru_pengganti_id || upacaraSchedule?.guru_id || null;

            for (const kegiatan of activeKegiatans) {
              let targetKelasIds: string[] = [];
              if (kegiatan.target_semua_kelas) {
                if (!allActiveKelasIds) {
                  const allK = await prisma.kelas.findMany({
                    where: { tenant_id: tenantId, is_active: true },
                    select: { id: true },
                  });
                  allActiveKelasIds = allK.map((k: any) => k.id);
                }
                targetKelasIds = allActiveKelasIds;
              } else {
                targetKelasIds = Array.isArray(kegiatan.target_kelas_ids) ? kegiatan.target_kelas_ids : [];
              }

              const startMulai = new Date(`${checkDateStr}T${kegiatan.waktu_mulai}:00.000${tzOffset}`);
              const startSelesai = kegiatan.waktu_selesai
                ? new Date(`${checkDateStr}T${kegiatan.waktu_selesai}:00.000${tzOffset}`)
                : new Date(startMulai.getTime() + 60 * 60 * 1000);
              const isUpacara = String(kegiatan.nama || '').toLowerCase().includes('upacara');
              const normKegiatan = String(kegiatan.nama || '').trim().toLowerCase();

              for (const kId of targetKelasIds) {
                const existingMatch =
                  existingMap.get(`${kegiatan.id}_${kId}`) ||
                  (normKegiatan ? existingMap.get(`named_${normKegiatan}_${kId}`) : undefined);
                if (existingMatch) {
                  const prevMulai = existingMatch.waktu_mulai ? new Date(existingMatch.waktu_mulai).getTime() : 0;
                  const prevSelesai = existingMatch.waktu_selesai ? new Date(existingMatch.waktu_selesai).getTime() : 0;
                  const timeChanged =
                    Math.abs(prevMulai - startMulai.getTime()) > 30_000 ||
                    Math.abs(prevSelesai - startSelesai.getTime()) > 30_000 ||
                    existingMatch.jadwal_kegiatan_id !== kegiatan.id;

                  if (timeChanged) {
                    const canReopen = startSelesai.getTime() > Date.now();
                    const hasAnyTap =
                      (existingMatch._count?.AbsenSiswa || 0) > 0 || (existingMatch._count?.AbsenGuru || 0) > 0;
                    const nextStatus =
                      canReopen && existingMatch.status === 'SELESAI'
                        ? (hasAnyTap ? 'BERLANGSUNG' : 'MENDATANG')
                        : existingMatch.status;
                    await prisma.sesiAbsensi.update({
                      where: { id: existingMatch.id },
                      data: {
                        jadwal_kegiatan_id: kegiatan.id,
                        waktu_mulai: startMulai,
                        waktu_selesai: startSelesai,
                        jenis_kegiatan: kegiatan.nama,
                        status: nextStatus,
                        updated_at: new Date(),
                      },
                    }).catch(() => {});
                  }
                  continue;
                }
                toCreate.push({
                  tenant_id: tenantId,
                  kelas_id: kId,
                  guru_id: isUpacara ? pembinaGuruId : null,
                  semester_id: activeSemId,
                  tahun_pelajaran_id: kegiatan.tahun_pelajaran_id || activeYear.id,
                  tanggal: checkDateLocalStart,
                  waktu_mulai: startMulai,
                  waktu_selesai: startSelesai,
                  jenis_kegiatan: kegiatan.nama,
                  sumber_sesi: 'TEMPLATE',
                  jadwal_kegiatan_id: kegiatan.id,
                  status: 'MENDATANG',
                });
                existingSet.add(`${kegiatan.id}_${kId}`);
                if (normKegiatan) existingSet.add(`named_${normKegiatan}_${kId}`);
              }
            }

            if (toCreate.length > 0) {
              await prisma.sesiAbsensi.createMany({ data: toCreate, skipDuplicates: true });
            }
          }
        }
      }
    } catch (syncErr: any) {
      appLogger.warn({ error: syncErr?.message }, '[getSesiAbsensiList] Auto-sync JadwalKegiatan warning');
    }

    // 1. Fetch physical DB sessions
    const rawData = await prisma.sesiAbsensi.findMany({
      where,
      select: {
        id: true,
        tenant_id: true,
        kelas_id: true,
        mapel_id: true,
        guru_id: true,
        guru_pelaksana_id: true,
        unit_pengajaran_id: true,
        is_delegasi: true,
        jadwal_kbm_id: true,
        jadwal_kegiatan_id: true,
        jenis_kegiatan: true,
        tanggal: true,
        waktu_mulai: true,
        waktu_selesai: true,
        status: true,
        foto_kegiatan: true,
        created_at: true,
        keterangan: true,
        created_by_user_id: true,
        created_by: { select: { id: true, full_name: true, Role: { select: { name: true } } } },
        Kelas: { select: { id: true, nama_kelas: true } },
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        UnitPengajaran: { select: { id: true, nama_unit: true, guru_id: true, Guru: { select: { id: true, nama_guru: true, foto: true } } } },
        Guru: { select: { id: true, nama_guru: true, nip: true, no_hp: true, foto: true } },
        GuruPelaksana: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
        AbsenGuru: { select: { status: true, is_terlambat: true, waktu_tap: true, catatan: true, foto_bukti: true } },
        ProgresMateri: {
          select: {
            id: true,
            judul_materi: true,
            deskripsi: true,
            pencapaian_persen: true,
            kendala: true,
            mode_pelaksanaan: true,
            perangkat_ajar_id: true,
            instruksi_tugas: true,
            file_tugas_url: true,
            referensi_json: true,
            meeting_room_id: true,
            updated_at: true
          }
        }
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
      
      let jam_mulai = item.jam_mulai;
      let jam_selesai = item.jam_selesai;
      let tanggal_formatted = item.tanggal ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: tz }).format(new Date(item.tanggal)) : null;
      let hari = item.tanggal ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: tz }).format(new Date(item.tanggal)) : null;

      if (!jam_mulai && item.waktu_mulai) {
        jam_mulai = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(new Date(item.waktu_mulai));
      }
      if (!jam_selesai && item.waktu_selesai) {
        jam_selesai = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(new Date(item.waktu_selesai));
      }

      let opened_by: 'GURU' | 'PETUGAS_KELAS' | null = null;
      let opened_by_name: string | null = null;

      if (item.keterangan?.includes('[DIBUKA_PETUGAS_KELAS]') || item.created_by?.Role?.name === 'SISWA') {
        opened_by = 'PETUGAS_KELAS';
        opened_by_name = (item.keterangan?.replace('[DIBUKA_PETUGAS_KELAS]', '').trim()) || item.created_by?.full_name || 'Petugas Kelas';
      } else if (item.keterangan?.includes('[DIBUKA_GURU]') || item.created_by?.Role?.name === 'GURU') {
        opened_by = 'GURU';
        opened_by_name = (item.keterangan?.replace('[DIBUKA_GURU]', '').trim()) || item.created_by?.full_name || item.Guru?.nama_guru || 'Guru';
      } else if (item.AbsenGuru?.[0]?.status === 'HADIR' || item.AbsenGuru?.[0]?.waktu_tap) {
        opened_by = 'GURU';
        opened_by_name = item.Guru?.nama_guru || 'Guru';
      }

      return {
        ...item,
        jam_mulai,
        jam_selesai,
        hari,
        tanggal_formatted,
        status: item.status || 'MENDATANG',
        summary,
        progres: item.ProgresMateri || null,
        ProgresMateri: item.ProgresMateri || null,
        kelas_nama: item.Kelas?.nama_kelas || null,
        mapel_nama: item.Mapel?.nama_mapel || item.Mapel?.kode_mapel || null,
        unit_pengajaran_id: item.unit_pengajaran_id || null,
        UnitPengajaran: item.UnitPengajaran || null,
        unit_nama: item.UnitPengajaran?.nama_unit || null,
        guru_nama: item.Guru?.nama_guru || null,
        guru_foto: item.Guru?.foto || item.UnitPengajaran?.Guru?.foto || null,
        guru_no_hp: item.Guru?.no_hp || null,
        guru_pengganti_nama: item.GuruPelaksana?.nama_guru || null,
        guru_pengampu_nama: item.Guru?.nama_guru || null,
        guru_pelaksana_id: item.guru_pelaksana_id || null,
        is_delegasi: item.is_delegasi || Boolean(item.guru_pelaksana_id),
        guru_status: item.AbsenGuru?.[0]?.status || (item.status === 'SELESAI' ? 'ALPA' : 'BELUM_HADIR'),
        absenGuru: item.AbsenGuru?.[0] || null,
        AbsenGuru: item.AbsenGuru || [],
        GuruPelaksana: item.GuruPelaksana || null,
        opened_by,
        opened_by_name,
        opened_by_petugas: opened_by === 'PETUGAS_KELAS',
      };
    });

    // 2. If include_scheduled === 'true' or true (or when tanggal is specified), hydrate with JadwalKBM slots
    const shouldHydrate = include_scheduled === true || include_scheduled === 'true' || !!tanggal;

    if (!shouldHydrate) {
      const total = await prisma.sesiAbsensi.count({ where });
      return { total, page: Number(page), limit: take, data: physicalSessions.slice(skip, skip + take) };
    }

    // Determine Day of Week deterministically for JadwalKBM query
    const dateStr = tanggal || new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    const targetDateObj = new Date(`${dateStr}T00:00:00.000${tzOffset}`);
    const hariName = resolveHariFromDateStr(dateStr);

    let effectiveTpId = tahun_pelajaran_id;
    let effectiveSemesterId = semester_id;
    if (!effectiveTpId) {
      const activeTp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true },
      });
      if (activeTp) effectiveTpId = activeTp.id;
    }
    if (!effectiveSemesterId && effectiveTpId) {
      const activeSem = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, tahun_pelajaran_id: effectiveTpId, is_active: true },
        select: { id: true },
      });
      if (activeSem) effectiveSemesterId = activeSem.id;
    }

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

    if (effectiveTpId) {
      scheduleWhere.tahun_pelajaran_id = effectiveTpId;
    }
    if (effectiveSemesterId) {
      scheduleWhere.semester_id = effectiveSemesterId;
    }

    if (kelas_id) {
      scheduleWhere.kelas_id = kelas_id;
    } else if (parsedAllowedKelasIds && parsedAllowedKelasIds.length > 0) {
      scheduleWhere.kelas_id = { in: parsedAllowedKelasIds };
    }

    const schedTargetGuruId = guru_id || guruIdFilter;
    if (schedTargetGuruId) {
      scheduleWhere.OR = [
        { guru_pelaksana_id: schedTargetGuruId },
        { guru_pelaksana_id: null, UnitPengajaran: { is: { guru_id: schedTargetGuruId } } },
        { guru_pelaksana_id: null, unit_pengajaran_id: null, guru_id: schedTargetGuruId },
      ];
    }

    const targetDateUtc = new Date(`${dateStr}T00:00:00.000Z`);
    const { resolveKbmOperationalFilter } = await import('@/modules/attendance/helpers/kbm-operational-period.helper');
    const [rawSchedulesFetchedAll, activeLeavesToday, pjjEventsToday, kbmOpFilter] = await Promise.all([
      (prisma as any).jadwalKBM.findMany({
        where: scheduleWhere,
        include: {
          Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
          Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true, kelompok_mapel: true } },
          UnitPengajaran: { select: { id: true, nama_unit: true, guru_id: true, Guru: { select: { id: true, nama_guru: true, foto: true } } } },
          Guru: { select: { id: true, nama_guru: true, nip: true, no_hp: true, foto: true } },
          GuruPelaksana: { select: { id: true, nama_guru: true, nip: true, no_hp: true } }
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
      }),
      prisma.absensiKejadianKhusus.findMany({
        where: {
          tenant_id: tenantId,
          tanggal: targetDateUtc,
          mode_kejadian: 'PJJ_DARING'
        }
      }),
      resolveKbmOperationalFilter(tenantId, dateStr),
    ]);

    // Saring jadwal KBM yang sedang ditangguhkan oleh Periode Operasional KBM (PKL, KBM Blok Kelompok Mapel, Non-KBM)
    const rawSchedulesFetched = kbmOpFilter.filterActiveSchedules(rawSchedulesFetchedAll);

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
          String(prev.guru_pelaksana_id || '') === String(item.guru_pelaksana_id || '') &&
          String(prev.unit_pengajaran_id || '') === String(item.unit_pengajaran_id || '') &&
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
            unit_pengajaran_id: item.unit_pengajaran_id || null,
            UnitPengajaran: item.UnitPengajaran || null,
            jam_mulai: item.jam_mulai,
            jam_selesai: item.jam_selesai,
            jam_ke_start: item.slot_index,
            jam_ke_end: item.slot_index,
            jenis_kegiatan: item.jenis_kegiatan,
            Kelas: item.Kelas,
            Mapel: item.Mapel,
            Guru: item.Guru,
            GuruPelaksana: item.GuruPelaksana || null,
            guru_pelaksana_id: item.guru_pelaksana_id || null,
            is_delegasi: Boolean(item.guru_pelaksana_id),
          });
        }
      });

      mergedRanges.push(...classMerged);
    });

    // Match merged schedule ranges with physical sessions
    const matchedPhysicalIds = new Set<string>();

    const isKbmPhysical = (ps: any) =>
      !ps.jadwal_kegiatan_id && (!ps.jenis_kegiatan || String(ps.jenis_kegiatan).toUpperCase() === 'KBM');

    const unifiedList = mergedRanges.map((mRange: any) => {
      const sameUnit = (ps: any) => {
        if (ps.unit_pengajaran_id && mRange.unit_pengajaran_id) {
          return String(ps.unit_pengajaran_id) === String(mRange.unit_pengajaran_id);
        }
        // Fallback matching if one or both records don't have unit_pengajaran_id populated
        const matchesTeacher =
          ps.guru_id === mRange.guru_id ||
          (ps.guru_pelaksana_id && ps.guru_pelaksana_id === mRange.guru_pelaksana_id) ||
          (ps.guru_pelaksana_id && ps.guru_pelaksana_id === mRange.guru_id) ||
          (mRange.guru_pelaksana_id && ps.guru_id === mRange.guru_pelaksana_id);
        return Boolean(matchesTeacher);
      };

      // Find matching physical session:
      // Priority 1 = Matches schedule link OR (kelas_id + mapel_id + unit_pengajaran_id) with active (BERLANGSUNG) or completed (SELESAI) status
      let physicalMatch = physicalSessions.find((ps: any) => {
        if (matchedPhysicalIds.has(ps.id) || !isKbmPhysical(ps)) return false;
        const matchesSchedule = ps.jadwal_kbm_id && mRange.schedule_ids.includes(ps.jadwal_kbm_id);
        const matchesClassMapel = ps.kelas_id === mRange.kelas_id && ps.mapel_id === mRange.mapel_id && sameUnit(ps);
        const isStarted = ps.status === 'BERLANGSUNG' || Boolean(ps.foto_kegiatan) || ps.status === 'SELESAI';
        return (matchesSchedule || matchesClassMapel) && isStarted;
      });

      // Priority 2 = Fallback match by exact jadwal_kbm_id link (e.g. unstarted MENDATANG physical sessions)
      if (!physicalMatch) {
        physicalMatch = physicalSessions.find((ps: any) => {
          if (matchedPhysicalIds.has(ps.id) || !isKbmPhysical(ps)) return false;
          return ps.jadwal_kbm_id && mRange.schedule_ids.includes(ps.jadwal_kbm_id);
        });
      }

      // Priority 3 = Fallback match by kelas_id, mapel_id, and unit
      if (!physicalMatch) {
        physicalMatch = physicalSessions.find((ps: any) => {
          if (matchedPhysicalIds.has(ps.id) || !isKbmPhysical(ps)) return false;
          return ps.kelas_id === mRange.kelas_id && ps.mapel_id === mRange.mapel_id && sameUnit(ps);
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
          unit_pengajaran_id: physicalMatch.unit_pengajaran_id || mRange.unit_pengajaran_id || null,
          UnitPengajaran: physicalMatch.UnitPengajaran || mRange.UnitPengajaran || null,
          unit_nama: physicalMatch.UnitPengajaran?.nama_unit || mRange.UnitPengajaran?.nama_unit || physicalMatch.unit_nama || null,
          GuruPelaksana: physicalMatch.GuruPelaksana || mRange.GuruPelaksana || null,
          guru_pelaksana_id: physicalMatch.guru_pelaksana_id || mRange.guru_pelaksana_id || null,
          guru_pengganti_nama: physicalMatch.GuruPelaksana?.nama_guru || mRange.GuruPelaksana?.nama_guru || physicalMatch.guru_pengganti_nama || null,
          guru_pengampu_nama: physicalMatch.Guru?.nama_guru || mRange.Guru?.nama_guru || physicalMatch.guru_nama || null,
          is_delegasi: physicalMatch.is_delegasi || Boolean(mRange.guru_pelaksana_id),
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
        unit_pengajaran_id: mRange.unit_pengajaran_id || null,
        UnitPengajaran: mRange.UnitPengajaran || null,
        unit_nama: mRange.UnitPengajaran?.nama_unit || null,
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
        GuruPelaksana: mRange.GuruPelaksana || null,
        kelas_nama: mRange.Kelas?.nama_kelas || null,
        mapel_nama: mRange.Mapel?.nama_mapel || mRange.Mapel?.kode_mapel || null,
        guru_nama: mRange.Guru?.nama_guru || null,
        guru_foto: mRange.Guru?.foto || mRange.UnitPengajaran?.Guru?.foto || null,
        guru_no_hp: mRange.Guru?.no_hp || null,
        guru_pelaksana_id: mRange.guru_pelaksana_id || null,
        guru_pengganti_nama: mRange.GuruPelaksana?.nama_guru || null,
        guru_pengampu_nama: mRange.Guru?.nama_guru || null,
        is_delegasi: Boolean(mRange.guru_pelaksana_id),
        summary: { total: 0, HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, TERLAMBAT: 0 }
      };
    });

    // 🛡️ Push physical activity sessions AND real started/finished sessions that did not match schedule slots.
    // Unmatched out-of-bounds KBM sessions remain blocked when include_scheduled = true only if never started.
    // Jika kelas/mapel sedang ditangguhkan PKL / KBM Blok, sesi KBM kosong (tanpa kehadiran guru riil) juga dilewati agar tidak memicu ALPA palsu.
    physicalSessions.forEach((ps: any) => {
      if (!matchedPhysicalIds.has(ps.id)) {
        const isActivitySession = !!ps.jadwal_kegiatan_id || (ps.jenis_kegiatan && String(ps.jenis_kegiatan).toUpperCase() !== 'KBM');
        const hasRealTeacherEvidence =
          Boolean(ps.foto_kegiatan) ||
          Boolean(ps.waktu_tap) ||
          (Array.isArray(ps.AbsenGuru) && ps.AbsenGuru.some((ag: any) => Boolean(ag.waktu_tap) || String(ag.status || '').toUpperCase() === 'HADIR'));

        if (!isActivitySession && !hasRealTeacherEvidence && kbmOpFilter.checkSchedule(ps).suspended) {
          return;
        }

        const isStartedOrFinished = ps.status === 'BERLANGSUNG' || ps.status === 'SELESAI' || Boolean(ps.foto_kegiatan);
        if (isActivitySession || isStartedOrFinished || !include_scheduled) {
          unifiedList.push(ps);
        }
      }
    });

    // 🎯 Mode Wajib Tap Terminal vs Selfie Mandiri Kegiatan Guru (Relasional Per JadwalKegiatan):
    // Jika query untuk 1 guru tertentu (schedTargetGuruId), evaluasi tiap JadwalKegiatan aktif hari ini
    // berdasarkan relasi JadwalKegiatan + JadwalKegiatanWajibPosition.
    const guruAttendedKegiatanList: Array<{ jadwalId: string | null; nama: string; startMin: number; endMin: number }> = [];
    const activeKegiatanPoliciesForKbm: Array<{
      startMin: number;
      endMin: number;
      targetSemuaKelas: boolean;
      targetKelasIds: string[];
      wajibTapTerminalGuru: boolean;
      wajibGuruBeririsan: boolean;
    }> = [];

    if (schedTargetGuruId) {
      try {
        const toMin = (hhmm?: string | null) => {
          if (!hhmm || !hhmm.includes(':')) return null;
          const [h, m] = hhmm.split(':').map(Number);
          return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
        };
        const fmtHHMM = (dt?: Date | null) => {
          if (!dt) return null;
          return new Intl.DateTimeFormat('en-GB', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(dt);
        };

        const dayLocalStart = new Date(`${dateStr}T00:00:00.000${tzOffset}`);
        const dayLocalEnd = new Date(`${dateStr}T23:59:59.999${tzOffset}`);
        const dayUtcStart = new Date(`${dateStr}T00:00:00.000Z`);
        const dayUtcEnd = new Date(`${dateStr}T23:59:59.999Z`);

        const [guruKegiatanAbsens, activeKegiatansHariIni, guruRecord] = await Promise.all([
          prisma.absenGuru.findMany({
            where: {
              tenant_id: tenantId,
              guru_id: schedTargetGuruId,
              SesiAbsensi: {
                tanggal: { gte: dayLocalStart, lte: dayLocalEnd },
                jenis_kegiatan: { not: 'KBM' },
              },
            },
            include: {
              SesiAbsensi: {
                select: {
                  id: true,
                  kelas_id: true,
                  jadwal_kegiatan_id: true,
                  jenis_kegiatan: true,
                  waktu_mulai: true,
                  waktu_selesai: true,
                  status: true,
                  JadwalKegiatan: {
                    select: {
                      id: true,
                      nama: true,
                      jenis_kegiatan: true,
                      waktu_mulai: true,
                      waktu_selesai: true,
                    },
                  },
                },
              },
            },
          }),
          prisma.jadwalKegiatan.findMany({
            where: {
              tenant_id: tenantId,
              aktif: true,
              hari: { has: hariName as any },
              berlaku_mulai: { lte: dayUtcEnd },
              OR: [
                { berlaku_sampai: null },
                { berlaku_sampai: { gte: dayUtcStart } },
              ],
            },
            include: {
              WajibPositions: {
                select: {
                  position_id: true,
                  Position: { select: { id: true, code: true, name: true } },
                },
              },
            },
          }),
          prisma.guru.findFirst({
            where: { id: schedTargetGuruId, tenant_id: tenantId },
            select: { id: true, user_id: true },
          }),
        ]);

        // Ambil seluruh penugasan jabatan organisasi aktif milik guru ini (akan dicocokkan per JadwalKegiatan)
        const guruOrgAssignments = guruRecord?.user_id
          ? await prisma.organizationalAssignment.findMany({
              where: {
                tenant_id: tenantId,
                user_id: guruRecord.user_id,
                is_active: true,
                Position: { is_active: true },
              },
              include: {
                Position: { select: { id: true, code: true, name: true } },
                Kelas: { select: { nama_kelas: true } },
                Unit: { select: { nama: true } },
              },
            })
          : [];

        // Rekam semua kegiatan di mana guru sudah tercatat HADIR hari ini (baik via Terminal maupun Selfie)
        guruKegiatanAbsens.forEach((ag: any) => {
          if (ag.status !== 'HADIR' || !ag.SesiAbsensi) return;
          const s = ag.SesiAbsensi;
          const sStart = toMin(s.JadwalKegiatan?.waktu_mulai || fmtHHMM(s.waktu_mulai));
          const sEnd = toMin(s.JadwalKegiatan?.waktu_selesai || fmtHHMM(s.waktu_selesai));
          if (sStart !== null && sEnd !== null) {
            guruAttendedKegiatanList.push({
              jadwalId: s.jadwal_kegiatan_id || s.JadwalKegiatan?.id || null,
              nama: s.JadwalKegiatan?.nama || s.jenis_kegiatan || 'Kegiatan',
              startMin: sStart,
              endMin: sEnd,
            });
          }
        });

        // Evaluasi kebijakan per JadwalKegiatan aktif hari ini
        if (activeKegiatansHariIni.length > 0) {
          const guruKbmSlots = unifiedList
            .filter((it: any) => !it.jadwal_kegiatan_id && (!it.jenis_kegiatan || String(it.jenis_kegiatan).toUpperCase() === 'KBM'))
            .map((it: any) => {
              const sMin = toMin(it.jam_mulai || (it.waktu_mulai ? fmtHHMM(new Date(it.waktu_mulai)) : null));
              const eMin = toMin(it.jam_selesai || (it.waktu_selesai ? fmtHHMM(new Date(it.waktu_selesai)) : null)) ?? (sMin !== null ? sMin + 45 : null);
              return { sMin, eMin, kelasId: it.kelas_id };
            })
            .filter((x: any) => x.sMin !== null && x.eMin !== null);

          if (guruKbmSlots.length > 0 || guruOrgAssignments.length > 0) {
            const existingActivityJadwalIds = new Set(
              unifiedList
                .filter((it: any) => Boolean(it.jadwal_kegiatan_id))
                .map((it: any) => String(it.jadwal_kegiatan_id))
            );

            // Ambil 1 sesi fisik perwakilan per jadwal_kegiatan_id hari ini jika sudah ada
            const existingRepSessions = await prisma.sesiAbsensi.findMany({
              where: {
                tenant_id: tenantId,
                tanggal: { gte: dayLocalStart, lte: dayLocalEnd },
                jadwal_kegiatan_id: { in: activeKegiatansHariIni.map((k: any) => k.id) },
              },
              select: {
                id: true,
                kelas_id: true,
                jadwal_kegiatan_id: true,
                status: true,
                waktu_mulai: true,
                waktu_selesai: true,
              },
              orderBy: { created_at: 'asc' },
            });
            const repSessionByJadwal = new Map<string, any>();
            existingRepSessions.forEach((s: any) => {
              if (s.jadwal_kegiatan_id && !repSessionByJadwal.has(s.jadwal_kegiatan_id)) {
                repSessionByJadwal.set(s.jadwal_kegiatan_id, s);
              }
            });

            for (const keg of activeKegiatansHariIni) {
              const policy = resolveJadwalKegiatanPolicy(keg);
              // Abaikan Apel Pulang / Apel Sore (aware 2 shift)
              if (policy.isApelPulang) continue;

              const kegMulai = (keg.waktu_mulai || '06:30').slice(0, 5);
              const kegSelesai = (keg.waktu_selesai || '08:00').slice(0, 5);
              const kegStartMin = toMin(kegMulai);
              const kegEndMin = toMin(kegSelesai);
              if (kegStartMin === null || kegEndMin === null) continue;

              const kegTargetSemua = Boolean(keg.target_semua_kelas);
              const kegTargetKelasIds: string[] = !kegTargetSemua && Array.isArray(keg.target_kelas_ids)
                ? keg.target_kelas_ids
                : [];
              const isKegRestrictedKelas = !kegTargetSemua && kegTargetKelasIds.length > 0;

              activeKegiatanPoliciesForKbm.push({
                startMin: kegStartMin,
                endMin: kegEndMin,
                targetSemuaKelas: kegTargetSemua,
                targetKelasIds: kegTargetKelasIds,
                wajibTapTerminalGuru: policy.wajibTapTerminalGuru,
                wajibGuruBeririsan: policy.wajibGuruBeririsan,
              });

              if (existingActivityJadwalIds.has(String(keg.id))) continue;

              // Cocokkan posisi jabatan organisasi guru ini dengan relasi WajibPositions milik JadwalKegiatan ini
              // Scope-aware WALIKELAS: hanya berlaku jika kelas binaannya masuk target_kelas_ids kegiatan ini
              const applicableOrgAssigns = guruOrgAssignments.filter((a: any) => {
                const posId = a.Position?.id;
                const posCode = String(a.Position?.code || '').toUpperCase();
                const matchesPosition = policy.wajibPositionsConfigured
                  ? Boolean(posId && policy.orgPositionIds.includes(posId))
                  : !((posCode === 'KOORDINATOR_DHUHA' || posCode === 'PEMBINA_ROHIS') && !policy.isDhuha) &&
                    policy.orgPositionCodes.includes(posCode);
                if (!matchesPosition) return false;
                if (posCode === 'WALIKELAS' && isKegRestrictedKelas) {
                  return Boolean(a.kelas_id && kegTargetKelasIds.includes(a.kelas_id));
                }
                return true;
              });

              const orgDutyLabels = Array.from(new Set(applicableOrgAssigns.map(formatOrgDutyLabel)));
              const hasOrgDuty = orgDutyLabels.length > 0;

              // Cek apakah benar-benar beririsan dengan minimal 1 jadwal KBM guru hari ini pada rombel target kegiatan
              const isOverlapping = policy.wajibGuruBeririsan && guruKbmSlots.some(
                (slot: any) => {
                  if (isKegRestrictedKelas && (!slot.kelasId || !kegTargetKelasIds.includes(slot.kelasId))) {
                    return false;
                  }
                  return Math.max(kegStartMin, slot.sMin) < Math.min(kegEndMin, slot.eMin);
                }
              );

              if (!isOverlapping && !hasOrgDuty) continue;

              // Mode ON (Wajib Tap Terminal): jika guru hanya guru mapel beririsan (tanpa jabatan organisasi),
              // peringatan wajib tap sudah muncul langsung di kartu KBM beririsannya.
              // Jika guru memegang jabatan organisasi yang diwajibkan, tetap tampilkan kartu kegiatan
              // agar mereka selalu melihat kewajiban & status hadirnya di dashboard (meski tidak punya KBM beririsan).
              if (policy.wajibTapTerminalGuru && !hasOrgDuty) continue;

              const dutyReasonLabel = hasOrgDuty
                ? orgDutyLabels.join(' • ')
                : 'Guru KBM Beririsan';

              // Cari apakah guru ini sudah pernah absen/selfie pada kegiatan ini hari ini
              const kegName = String(keg.nama || '');
              const matchedAbsen = guruKegiatanAbsens.find(
                (ag: any) =>
                  ag.SesiAbsensi?.jadwal_kegiatan_id === keg.id ||
                  String(ag.SesiAbsensi?.jenis_kegiatan || '').trim().toLowerCase() === kegName.trim().toLowerCase()
              );
              const repSesi = matchedAbsen?.SesiAbsensi || repSessionByJadwal.get(keg.id) || null;
              const hasGuruAttended = matchedAbsen?.status === 'HADIR';

              unifiedList.push({
                id: repSesi?.id || `keg_virtual_${keg.id}`,
                tenant_id: tenantId,
                kelas_id: repSesi?.kelas_id || '',
                mapel_id: null,
                guru_id: schedTargetGuruId,
                jadwal_kbm_id: null,
                jadwal_kegiatan_id: keg.id,
                jenis_kegiatan: keg.nama || keg.jenis_kegiatan || 'KEGIATAN',
                kegiatan: keg.nama || keg.jenis_kegiatan || 'Kegiatan',
                mapel_nama: keg.nama || keg.jenis_kegiatan || 'Kegiatan',
                kelas_nama: 'Kegiatan Sekolah',
                jabatan_kegiatan_label: dutyReasonLabel,
                tanggal: dayLocalStart,
                waktu_mulai: `${dateStr}T${kegMulai}:00.000${tzOffset}`,
                waktu_selesai: `${dateStr}T${kegSelesai}:00.000${tzOffset}`,
                jam_mulai: kegMulai,
                jam_selesai: kegSelesai,
                status: hasGuruAttended ? 'BERLANGSUNG' : (repSesi?.status || 'MENDATANG'),
                foto_kegiatan: matchedAbsen?.foto_bukti || null,
                guru_status: hasGuruAttended ? 'HADIR' : 'BELUM_TAP',
                absenGuru: matchedAbsen
                  ? {
                      status: matchedAbsen.status,
                      is_terlambat: matchedAbsen.is_terlambat,
                      waktu_tap: matchedAbsen.waktu_tap,
                      catatan: matchedAbsen.catatan,
                      foto_bukti: matchedAbsen.foto_bukti,
                    }
                  : null,
                AbsenGuru: matchedAbsen
                  ? [
                      {
                        status: matchedAbsen.status,
                        is_terlambat: matchedAbsen.is_terlambat,
                        waktu_tap: matchedAbsen.waktu_tap,
                        catatan: matchedAbsen.catatan,
                        foto_bukti: matchedAbsen.foto_bukti,
                      },
                    ]
                  : [],
                is_guru_kegiatan_selfie_card: true,
                wajib_tap_terminal_kegiatan_guru: policy.wajibTapTerminalGuru,
                kegiatan_wajib_guru_beririsan: policy.wajibGuruBeririsan,
                summary: { total: 0, HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, TERLAMBAT: 0 },
              });
            }
          }
        }
      } catch (kegInjectErr: any) {
        appLogger.warn({ error: kegInjectErr?.message }, '[getSesiAbsensiList] Guru kegiatan selfie injection warning');
      }
    }

    // Merge multiple session/schedule fragments belonging to the same lesson block (kelas, guru, mapel, unit)
    const blockMap = new Map<string, any[]>();
    unifiedList.forEach((item: any) => {
      const isActivity = !!item.jadwal_kegiatan_id || (item.jenis_kegiatan && String(item.jenis_kegiatan).toUpperCase() !== 'KBM');
      const normActivityName = String(item.jenis_kegiatan || item.nama || item.kegiatan || '').trim().toLowerCase();
      const key = isActivity
        ? `activity_${item.kelas_id || 'all'}_${normActivityName}`
        : `${item.kelas_id || 'no_kelas'}_${item.guru_id || 'no_guru'}_${item.mapel_id || 'no_mapel'}_${item.unit_pengajaran_id || 'no_unit'}`;
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
          const isSameActivityBlock = (item.jadwal_kegiatan_id || (item.jenis_kegiatan && String(item.jenis_kegiatan).toUpperCase() !== 'KBM'));

          if (isSameActivityBlock || isSlotContiguous || isTimeContiguous || prev.jadwal_kbm_id === item.jadwal_kbm_id) {
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

        // Prefer active/completed physical session or one with attendance records
        const sessionWithAttendance = subItems.find((i: any) => (i.summary?.HADIR || 0) > 0 || (i.summary?.total || 0) > 0);
        const nonVirtualPhysical = subItems.find((i: any) => !String(i.id).startsWith('sched_'));
        const bestPhysical = sessionWithAttendance || nonVirtualPhysical || subItems.find((i: any) => i.status === 'SELESAI' || i.status === 'BERLANGSUNG' || i.status === 'AKTIF') || subItems[0];
        
        // Merge summary across all subItems so attendance from terminal/mobile is preserved
        const mergedSummary = subItems.reduce((acc: any, curr: any) => {
          const s = curr.summary || {};
          acc.total = Math.max(acc.total, s.total || 0);
          acc.HADIR = Math.max(acc.HADIR, s.HADIR || 0);
          acc.IZIN = Math.max(acc.IZIN, s.IZIN || 0);
          acc.SAKIT = Math.max(acc.SAKIT, s.SAKIT || 0);
          acc.ALPA = Math.max(acc.ALPA, s.ALPA || 0);
          acc.TERLAMBAT = Math.max(acc.TERLAMBAT, s.TERLAMBAT || 0);
          return acc;
        }, { total: 0, HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, TERLAMBAT: 0 });

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
          summary: mergedSummary,
          waktu_mulai: earliestStart,
          waktu_selesai: latestEnd,
          jam_mulai: subItems[0].jam_mulai || bestPhysical.jam_mulai,
          jam_selesai: subItems[subItems.length - 1].jam_selesai || bestPhysical.jam_selesai,
          guru_status: teacherHadirItem ? 'HADIR' : bestPhysical.guru_status,
          absenGuru: teacherHadirItem?.absenGuru || bestPhysical.absenGuru || (teacherHadirItem ? { status: 'HADIR' } : null),
          AbsenGuru: teacherHadirItem?.AbsenGuru || bestPhysical.AbsenGuru || (teacherHadirItem ? [{ status: 'HADIR' }] : []),
          opened_by: bestPhysical.opened_by || teacherHadirItem?.opened_by || null,
          opened_by_name: bestPhysical.opened_by_name || teacherHadirItem?.opened_by_name || null,
          opened_by_petugas: bestPhysical.opened_by_petugas || (bestPhysical.opened_by === 'PETUGAS_KELAS'),
        });
      });
    });

    // Sort unified list chronologically (by jam_mulai / waktu_mulai ascending)
    consolidatedList.sort((a: any, b: any) => {
      const timeA = a.jam_mulai || (a.waktu_mulai ? new Date(a.waktu_mulai).toISOString() : '00:00');
      const timeB = b.jam_mulai || (b.waktu_mulai ? new Date(b.waktu_mulai).toISOString() : '00:00');
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

      const isFinishedRaw = item.status === 'SELESAI';
      const isLiveByTime = hasValidTime && serverNow >= (startAt as Date) && serverNow <= (endAt as Date);
      const isPastSchedule = hasValidTime && serverNow > (endAt as Date);
      
      const isVirtualSession = typeof item.id === 'string' && (item.id.startsWith('sched_') || item.id.startsWith('keg_virtual_') || item.status === 'MENDATANG');
      
      const absenGuru = item.absenGuru || (Array.isArray(item.AbsenGuru) ? item.AbsenGuru[0] : null);
      const isPlaceholderAbsenGuru = !absenGuru || (!absenGuru.waktu_tap && (!absenGuru.status || String(absenGuru.status).toUpperCase().includes('BELUM')));

      // 🌐 Konsolidasi Mode PJJ / KBM Daring dari KejadianKhusus & ProgresMateri
      const matchingPjjEvent = (pjjEventsToday as any[])?.find((ev: any) => !ev.kelas_id || String(ev.kelas_id) === String(item.kelas_id));
      const pm = item.ProgresMateri || item.progres || null;
      const isDaringFromProgres = Boolean(
        pm && (
          pm.mode_pelaksanaan === 'DARING_LIVE' ||
          pm.mode_pelaksanaan === 'DARING_TUGAS' ||
          pm.instruksi_tugas ||
          pm.perangkat_ajar_id ||
          pm.meeting_room_id
        )
      );
      const isPjjDaring = Boolean(matchingPjjEvent || isDaringFromProgres);

      if (pm) {
        if (pm.instruksi_tugas && !item.instruksi_tugas) item.instruksi_tugas = pm.instruksi_tugas;
        if (pm.file_tugas_url && !item.file_tugas_url) item.file_tugas_url = pm.file_tugas_url;
        if (pm.perangkat_ajar_id && !item.perangkat_ajar_id) item.perangkat_ajar_id = pm.perangkat_ajar_id;
        if (pm.referensi_json && !item.referensi_json) item.referensi_json = pm.referensi_json;
        if (pm.meeting_room_id && !item.meeting_room_id) item.meeting_room_id = pm.meeting_room_id;
        if (pm.mode_pelaksanaan && !item.mode_pelaksanaan) item.mode_pelaksanaan = pm.mode_pelaksanaan;
      }
      if (isPjjDaring) {
        item.is_pjj_daring = true;
        item.pjj_keterangan = matchingPjjEvent?.keterangan || null;
        if (!item.meeting_room_id && item.id) {
          item.meeting_room_id = `kbm-sesi-${String(item.id).replace(/^sched_/, '')}`;
        }
      }

      const hasTeacherCheckInOrPhoto = Boolean(item.foto_kegiatan) || isDaringFromProgres || (item.guru_status && item.guru_status !== 'BELUM_TAP' && item.guru_status !== 'BELUM_HADIR' && item.guru_status !== 'ALPA') || !isPlaceholderAbsenGuru;

      const isSelfieKegiatanCard = Boolean(item.is_guru_kegiatan_selfie_card);
      const isFinished = isFinishedRaw || (isSelfieKegiatanCard && isPastSchedule && hasTeacherCheckInOrPhoto);

      // 1. isLive:
      // - HANYA bernilai TRUE jika sesi fisik sudah resmi dibuka/dimulai oleh guru (ada foto / check-in guru)
      //   dan sesi belum selesai ditutup.
      const isKegiatanItem = Boolean(
        item.jadwal_kegiatan_id ||
        (item.jenis_kegiatan && String(item.jenis_kegiatan).toUpperCase() !== 'KBM')
      );
      const isLive = !isFinished && !isVirtualSession && item.status === 'BERLANGSUNG' && (isSelfieKegiatanCard ? hasTeacherCheckInOrPhoto : (hasTeacherCheckInOrPhoto || isKegiatanItem));

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
      } else if (item.guru_status === 'HADIR' && (Boolean(item.foto_kegiatan) || isDaringFromProgres)) {
        teacherStatus = 'TEPAT_WAKTU';
      } else if (isDaringFromProgres) {
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

      const guruPengganti = item.guru_inval_nama || item.guru_pengganti_nama || item.GuruPelaksana?.nama_guru || null;
      const guruPengampu = item.guru_pengampu_nama || item.Guru?.nama_guru || item.guru_nama || null;

      // Cek apakah guru sudah tercatat HADIR pada kegiatan yang beririsan dengan KBM ini
      // serta resolusi kebijakan (wajib tap terminal & wajib guru beririsan) dari JadwalKegiatan yang beririsan
      let guruHadirKegiatanNama: string | null = null;
      let itemWajibTapTerminalGuru = item.wajib_tap_terminal_kegiatan_guru !== false;
      let itemWajibGuruBeririsan = item.kegiatan_wajib_guru_beririsan !== false;

      if (schedTargetGuruId && !isKegiatanItem) {
        const parseMin = (hhmm?: string | null) => {
          if (!hhmm || !hhmm.includes(':')) return null;
          const [h, m] = hhmm.split(':').map(Number);
          return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
        };
        const sMin = parseMin(item.jam_mulai);
        const eMin = parseMin(item.jam_selesai) ?? (sMin !== null ? sMin + 45 : null);
        if (sMin !== null && eMin !== null) {
          if (guruAttendedKegiatanList.length > 0) {
            const matched = guruAttendedKegiatanList.find((att) => Math.max(att.startMin, sMin) < Math.min(att.endMin, eMin));
            if (matched) guruHadirKegiatanNama = matched.nama;
          }
          const matchedPolicy = activeKegiatanPoliciesForKbm.find((pol) => {
            const isClassMatch =
              pol.targetSemuaKelas ||
              pol.targetKelasIds.length === 0 ||
              !item.kelas_id ||
              pol.targetKelasIds.includes(item.kelas_id);
            return isClassMatch && Math.max(pol.startMin, sMin) < Math.min(pol.endMin, eMin);
          });
          if (matchedPolicy) {
            itemWajibTapTerminalGuru = matchedPolicy.wajibTapTerminalGuru;
            itemWajibGuruBeririsan = matchedPolicy.wajibGuruBeririsan;
          }
        }
      }

      return {
        ...item,
        wajib_tap_terminal_kegiatan_guru: itemWajibTapTerminalGuru,
        kegiatan_wajib_guru_beririsan: itemWajibGuruBeririsan,
        guru_hadir_kegiatan_beririsan: Boolean(guruHadirKegiatanNama),
        guru_hadir_kegiatan_nama: guruHadirKegiatanNama,
        isLive,
        isReadyToOpen,
        isFinished,
        isOverdue,
        is_overdue: isOverdue,
        isUpcoming,
        isVirtual: isVirtualSession,
        is_virtual: isVirtualSession,
        guru_status: effectiveGuruStatus,
        guru_pengganti_nama: guruPengganti,
        guru_pengampu_nama: guruPengampu,
        _summary: {
          ...baseSummary,
          isLive,
          isReadyToOpen,
          isFinished,
          isOverdue,
          isUpcoming,
          isVirtual: isVirtualSession,
          is_virtual: isVirtualSession,
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
          !item.isLive && 
          !item.isFinished && 
          (item.isReadyToOpen || (item.isOverdue && item.is_virtual)) &&
          (!item.guru_status || item.guru_status.includes('BELUM') || item.guru_status === 'BELUM_TAP' || item.guru_status === 'BELUM_HADIR' || item.guru_status === 'ALPA')
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

  async listByTanggal(tenantId: string, tanggal: Date | string) {
    const tz = await getTenantTimezone(tenantId);
    const tzOffset = getTenantOffsetString(tz);
    const dateStr = typeof tanggal === 'string'
      ? tanggal.slice(0, 10)
      : new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(tanggal);

    const startOfDay = new Date(`${dateStr}T00:00:00.000${tzOffset}`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999${tzOffset}`);

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
