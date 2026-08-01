import { AbsenStatus, JenisTap } from '@/constants/enums';
import { ATTENDANCE_POINTS } from '@/constants/attendance-points';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { emitDomainEvent } from '@/infra/event-bus';
import { resolveAttendanceConfig } from '@/utils/attendance-rules';
import { isMultiSesiMode } from '../types/gerbang.types';
import { gerbangDb } from './repositories/gerbang.db';
import { getModeFeatures } from './gerbang.tap-helpers';
import { getRedisConnection } from '@/queue/redis';
import { cacheService } from '@/utils/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/constants/cache-keys';

export async function processTapTransaction(params: {
  input: any;
  siswa?: any;
  guru?: any;
  isGuru?: boolean;
  userId: string;
  tenantId: string;
  tenantMode: any;
  sessionInfo: any;
  tapTime: Date;
}): Promise<{ record: any; isDuplicate: boolean }> {
  const { input, siswa, guru, isGuru = false, userId, tenantId, tenantMode, sessionInfo, tapTime } = params;

  // ── Distributed Idempotency Lock ──────────────────────────────────────────
  // Mencegah race condition dari SEMUA metode input (RFID, QR, HID Keyboard).
  // Jika 2 tap masuk dalam 5 detik untuk kombinasi yang sama → hanya 1 yang diproses.
  const targetId = isGuru
    ? (guru?.id ?? input.siswa_id)
    : (siswa?.id ?? input.siswa_id);
  const lockKey = `absenta:tap_lock:${tenantId}:${sessionInfo.id}:${targetId}:${input.arah}`;
  let lockAcquired = false;
  try {
    const redis = getRedisConnection();
    // SETNX + TTL 5 detik — hanya 1 request yang menang dalam window ini
    const result = await redis.set(lockKey, '1', 'EX', 5, 'NX');
    lockAcquired = result === 'OK';
    if (!lockAcquired) {
      // Request duplikat dalam 5 detik — kembalikan record yang sudah ada
      const existingRecord = isGuru
        ? await gerbangDb.absenGerbangGuru.findFirst({
            where: { sesi_gerbang_id: sessionInfo.id, guru_id: targetId, arah: input.arah },
            include: { SesiGerbang: { select: { tanggal: true, waktu_mulai: true, waktu_selesai: true } } }
          })
        : await gerbangDb.absenGerbangSiswa.findFirst({
            where: { sesi_gerbang_id: sessionInfo.id, siswa_id: targetId, arah: input.arah },
            include: { SesiGerbang: { select: { tanggal: true, waktu_mulai: true, waktu_selesai: true } } }
          });
      console.log(`[GerbangService] 🔒 Tap ditolak oleh Redis lock (burst <5s): ${lockKey}`);
      return { record: existingRecord, isDuplicate: true };
    }
  } catch (redisErr) {
    // Redis tidak tersedia — lanjut tanpa lock (DB constraint masih menjaga)
    console.warn('[GerbangService] Redis lock unavailable, falling back to DB constraint:', redisErr);
  }
  // ──────────────────────────────────────────────────────────────────────────

  const sysConfig = await systemConfigService.getActive(tenantId);
  const tz = String((sysConfig as any)?.timezone || 'Asia/Jakarta').trim();
  const offsetMap: Record<string, number> = {
    'Asia/Jakarta': 7,
    'Asia/Makassar': 8,
    'Asia/Jayapura': 9,
  };
  const offsetHours = offsetMap[tz] ?? 7;
  const offsetSign = offsetHours >= 0 ? '+' : '-';
  const offsetStr = `${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;

  const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(tapTime);

  const tapTxResult = await gerbangDb.$transaction(async (tx) => {
    let kelasId = null;
    let kelasNama = null;
    let tingkatData: any = null;

    if (!isGuru && siswa) {
      kelasId = siswa.kelas_id;
      kelasNama = siswa.Kelas?.nama_kelas || null;
      tingkatData = kelasId
        ? await (tx as any).kelas.findFirst({ where: { id: kelasId, tenant_id: tenantId }, select: { tingkat: true, jam_masuk: true, jam_pulang: true } })
        : null;
    }

    const today = new Date(`${dateStr}T00:00:00.000${offsetStr}`);

    // Redis Multi-Tenant Config Caching (Zero-Query Lookup)
    const configCacheKey = CACHE_KEYS.ATTENDANCE.GATE_RULE_CONFIG(tenantId);
    const cachedConfig = await cacheService.getOrSet(
      `${configCacheKey}:${dateStr}:${kelasId || 'all'}`,
      async () => {
        const [activeYr, tenantCfg, specEvent] = await Promise.all([
          (tx as any).tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } }),
          (tx as any).tenant.findUnique({
            where: { id: tenantId },
            select: { jam_masuk_default: true, jam_pulang_default: true, toleransi_keterlambatan_menit: true },
          }),
          (tx as any).absensiKejadianKhusus.findFirst({
            where: { tenant_id: tenantId, tanggal: today },
          }),
        ]);
        const ruleCfg = resolveAttendanceConfig(
          tenantCfg || { jam_masuk_default: '07:00', jam_pulang_default: '14:00', toleransi_keterlambatan_menit: 15 },
          tingkatData ? { jam_masuk: tingkatData.jam_masuk, jam_pulang: tingkatData.jam_pulang } : null,
          specEvent,
        );
        return { activeYr, ruleCfg };
      },
      CACHE_TTL.REAL_TIME
    );

    const activeYear = cachedConfig?.activeYr;
    const ruleConfig = cachedConfig?.ruleCfg || { jamMasuk: '07:00', toleransiMenit: 15, abaikanTerlambat: false };

    const jamMasukClean = (ruleConfig.jamMasuk || '07:00').trim();
    const scheduleStart = new Date(`${dateStr}T${jamMasukClean.length === 5 ? jamMasukClean : '07:00'}:00.000${offsetStr}`);

    let isLate = false;
    let lateMinutes = 0;

    if (input.arah === JenisTap.GERBANG_DATANG) {
      const diffMs = tapTime.getTime() - scheduleStart.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin > (ruleConfig.toleransiMenit ?? 15)) {
        if (!ruleConfig.abaikanTerlambat) {
          isLate = true;
          lateMinutes = diffMin;
        }
      }
    }

    const finalStatus = AbsenStatus.HADIR;

    let absenRecord: any = null;
    let isDuplicate = false;
    try {
      if (isGuru) {
        const targetGuruId = guru ? guru.id : input.siswa_id;
        // UPSERT — idempoten untuk semua metode input (RFID, QR, HID)
        absenRecord = await (tx as any).absenGerbangGuru.upsert({
          where: {
            sesi_gerbang_id_guru_id_arah: {
              sesi_gerbang_id: sessionInfo.id,
              guru_id: targetGuruId,
              arah: input.arah,
            }
          },
          create: {
            tenant_id: tenantId,
            sesi_gerbang_id: sessionInfo.id,
            guru_id: targetGuruId,
            arah: input.arah,
            status: finalStatus,
            is_terlambat: isLate,
            menit_keterlambatan: isLate ? lateMinutes : 0,
            poin_kehadiran: isLate ? ATTENDANCE_POINTS.HADIR_TERLAMBAT : ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU,
            waktu_tap: tapTime,
            created_at: new Date(),
            tahun_pelajaran_id_snapshot: (activeYear as any)?.id || null,
          },
          update: {
            // Tap ulang (QR/RFID/HID) hanya update waktu — status tetap
            waktu_tap: tapTime,
            updated_at: new Date(),
          },
        });
      } else {
        const targetSiswaId = siswa ? siswa.id : input.siswa_id;
        // UPSERT — idempoten untuk semua metode input (RFID, QR, HID)
        absenRecord = await (tx as any).absenGerbangSiswa.upsert({
          where: {
            sesi_gerbang_id_siswa_id_arah: {
              sesi_gerbang_id: sessionInfo.id,
              siswa_id: targetSiswaId,
              arah: input.arah,
            }
          },
          create: {
            tenant_id: tenantId,
            sesi_gerbang_id: sessionInfo.id,
            siswa_id: targetSiswaId,
            arah: input.arah,
            status: finalStatus,
            is_terlambat: isLate,
            menit_keterlambatan: isLate ? lateMinutes : 0,
            poin_kehadiran: isLate ? ATTENDANCE_POINTS.HADIR_TERLAMBAT : ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU,
            waktu_tap: tapTime,
            created_at: new Date(),
            kelas_id_snapshot: kelasId || null,
            kelas_nama_snapshot: kelasNama || null,
            tingkat_snapshot: tingkatData?.tingkat ?? null,
            tahun_pelajaran_id_snapshot: (activeYear as any)?.id || null,
          },
          update: {
            // Tap ulang (QR/RFID/HID) hanya update waktu — status tetap
            waktu_tap: tapTime,
            updated_at: new Date(),
          },
        });
        // Cek apakah ini update (duplikat) atau create baru
        // Prisma upsert tidak memberi tahu, kita deteksi dari created_at vs now
        const createdMs = new Date(absenRecord.created_at).getTime();
        const nowMs = tapTime.getTime();
        if (Math.abs(nowMs - createdMs) > 2000) {
          isDuplicate = true; // Record ini dibuat >2 detik yang lalu → ini tap ulang
        }

        // Auto-linking: Trigger creation of PelanggaranSiswa record in database transaction when late
        if (isLate && !isDuplicate) {
          try {
            await (tx as any).pelanggaranSiswa.create({
              data: {
                tenant_id: tenantId,
                siswa_id: targetSiswaId,
                kelas_id: kelasId || null,
                tanggal: today,
                jenis_pelanggaran: 'Terlambat Masuk Sekolah (Gerbang)',
                poin: 5,
                status: 'BARU',
                keterangan: `Terlambat ${lateMinutes} menit (Tap Gerbang Otomatis). Memerlukan pembinaan lapangan.`
              }
            });
          } catch (pErr) {
            console.warn('[GERBANG_TAP] Auto-creation of PelanggaranSiswa record skipped/failed:', pErr);
          }
        }
      }
    } catch (error: any) {
      throw error;
    }

    return {
      absenRecord,
      isNew: !isDuplicate,
      isDuplicate,
      isLate,
      lateMinutes,
      scheduleStartIso: scheduleStart.toISOString(),
    };
  });

  const { absenRecord, isNew, isDuplicate, isLate, lateMinutes, scheduleStartIso } = tapTxResult as any;

  if (isDuplicate) {
    return { record: absenRecord, isDuplicate: true };
  }

  if (isNew) {
    void (async () => {
      try {
        if (input.arah === JenisTap.GERBANG_DATANG) {
          if (isLate) {
            await emitDomainEvent({
              event_type: 'attendance.tap' as any,
              tenant_id: tenantId,
              source_service: 'attendance',
              payload: {
                tenant_id: tenantId,
                student_id: isGuru ? undefined : siswa.id,
                guru_id: isGuru ? guru.id : undefined,
                device_id: input.device_id,
                tap_time: tapTime.toISOString(),
                source: 'GERBANG',
                related_id: absenRecord.id,
                status: 'TERLAMBAT',
                arah: input.arah,
                late_minutes: lateMinutes,
                schedule_start: scheduleStartIso,
                notification_hint: isGuru ? 'TEACHER_LATE' : 'STUDENT_LATE',
              },
            });
          } else {
            await emitDomainEvent({
              event_type: 'attendance.tap' as any,
              tenant_id: tenantId,
              source_service: 'attendance',
              payload: {
                tenant_id: tenantId,
                student_id: isGuru ? undefined : siswa.id,
                guru_id: isGuru ? guru.id : undefined,
                device_id: input.device_id,
                tap_time: tapTime.toISOString(),
                source: 'GERBANG',
                related_id: absenRecord.id,
                status: 'HADIR',
                arah: input.arah,
                notification_hint: isGuru ? 'TEACHER_PRESENT' : 'STUDENT_PRESENT',
              },
            });
          }
        } else if (input.arah === JenisTap.GERBANG_PULANG) {
          await emitDomainEvent({
            event_type: 'attendance.tap' as any,
            tenant_id: tenantId,
            source_service: 'attendance',
            payload: {
              tenant_id: tenantId,
              student_id: isGuru ? undefined : siswa.id,
              guru_id: isGuru ? guru.id : undefined,
              device_id: input.device_id,
              tap_time: tapTime.toISOString(),
              source: 'GERBANG',
              related_id: absenRecord.id,
              status: 'PULANG',
              arah: input.arah,
              notification_hint: isGuru ? 'TEACHER_RETURN' : 'STUDENT_RETURN',
            },
          });
        }
      } catch (error) {
        console.error('[GerbangService] Failed to trigger notification:', error);
      }

      try {
        const activityMetadata: any = {
          description: isGuru
            ? `Tap gerbang ${input.arah} untuk guru/staf ${guru.nama_guru} (${tenantMode} mode)`
            : `Tap gerbang ${input.arah} untuk siswa ${siswa.nama_siswa} (${tenantMode} mode)`,
          arah: input.arah,
          siswa_id: isGuru ? undefined : siswa.id,
          siswa_nama: isGuru ? undefined : siswa.nama_siswa,
          guru_id: isGuru ? guru.id : undefined,
          guru_nama: isGuru ? guru.nama_guru : undefined,
          attendance_mode: tenantMode,
          sesi_gerbang_id: sessionInfo.id,
          device_id: input.device_id || null,
          rfid: input.rfid || null,
          integration_context: {
            supports_kegiatan: isMultiSesiMode(tenantMode),
            prerequisite_for_kegiatan: isMultiSesiMode(tenantMode) && input.arah === JenisTap.GERBANG_DATANG,
            mode_features: getModeFeatures(tenantMode),
          },
          processing_timestamp: new Date().toISOString(),
        };

        await gerbangDb.activityLog.create({
          data: {
            tenant_id: tenantId,
            user_id: userId,
            action: 'ABSEN_GERBANG',
            entity: isGuru ? 'AbsenGerbangGuru' : 'AbsenGerbangSiswa',
            entity_id: absenRecord.id,
            metadata: JSON.stringify(activityMetadata),
          },
        });
      } catch (error) {
        console.error('[GerbangService] Failed to create activity log:', error);
      }
    })();
  } else {
    if (String(process.env.LOG_LEVEL || '').toLowerCase() === 'debug') {
      console.log(`[GerbangService] Duplicate tap handled via upsert for ${isGuru ? 'guru' : 'siswa'} ${isGuru ? guru.id : siswa.id}`);
    }
  }

  if (!isGuru && ['SAKIT', 'IZIN', 'ALPA', 'DISPEN'].includes((absenRecord as any).status)) {
    const { sesiService } = await import('@/modules/attendance/sesi-absensi/services/sesi.service');
    await sesiService.propagateGateAbsenceToSessions(tenantId, (absenRecord as any).siswa_id, (absenRecord as any).status, (absenRecord as any).waktu_tap || new Date());
  }

  return { record: absenRecord, isDuplicate: false };
}

