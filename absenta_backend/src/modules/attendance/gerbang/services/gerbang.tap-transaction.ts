import { AbsenStatus, JenisTap } from '@/constants/enums';
import { ATTENDANCE_POINTS } from '@/constants/attendance-points';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { emitDomainEvent } from '@/infra/event-bus';
import { calculateAttendanceStatus, resolveAttendanceConfig } from '@/utils/attendance-rules';
import { parse } from 'date-fns';
import { isMultiSesiMode } from '../types/gerbang.types';
import { gerbangDb } from './repositories/gerbang.db';
import { getModeFeatures } from './gerbang.tap-helpers';

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

  const sysConfig = await systemConfigService.getActive(tenantId);
  const tz = String((sysConfig as any)?.timezone || 'Asia/Jakarta').trim();
  const offsetMap: Record<string, number> = {
    'Asia/Jakarta': 7,
    'Asia/Makassar': 8,
    'Asia/Jayapura': 9,
  };
  const offsetHours = offsetMap[tz] ?? 7;

  const tapTxResult = await gerbangDb.$transaction(async (tx) => {
    const activeYear = await (tx as any).tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });
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

    const localTapTime = new Date(tapTime.getTime() + offsetHours * 60 * 60 * 1000);

    const today = new Date(localTapTime);
    today.setUTCHours(0, 0, 0, 0);

    const tenantConfig = await (tx as any).tenant.findUnique({
      where: { id: tenantId },
      select: { jam_masuk_default: true, jam_pulang_default: true, toleransi_keterlambatan_menit: true },
    });

    const specialEvent = await (tx as any).absensiKejadianKhusus.findUnique({
      where: {
        tenant_id_tanggal: {
          tenant_id: tenantId,
          tanggal: today,
        },
      },
    });

    const ruleConfig = resolveAttendanceConfig(
      tenantConfig || { jam_masuk_default: '07:00', jam_pulang_default: '14:00', toleransi_keterlambatan_menit: 15 },
      tingkatData ? { jam_masuk: tingkatData.jam_masuk, jam_pulang: tingkatData.jam_pulang } : null,
      specialEvent,
    );

    const scheduleStart = parse(ruleConfig.jamMasuk, 'HH:mm', localTapTime);

    const statusResult = calculateAttendanceStatus(
      input.arah === JenisTap.GERBANG_DATANG ? localTapTime : null,
      input.arah === JenisTap.GERBANG_PULANG ? localTapTime : null,
      ruleConfig,
    );

    const isLate = statusResult.status === 'TERLAMBAT';
    const lateMinutes = statusResult.menitTerlambat;
    const finalStatus = statusResult.status === 'TERLAMBAT' ? AbsenStatus.HADIR : AbsenStatus.HADIR;

    let absenRecord: any = null;
    let isDuplicate = false;
    try {
      if (isGuru) {
        absenRecord = await (tx as any).absenGerbangGuru.create({
          data: {
            tenant_id: tenantId,
            sesi_gerbang_id: sessionInfo.id,
            guru_id: guru.id,
            arah: input.arah,
            status: finalStatus,
            is_terlambat: isLate,
            menit_keterlambatan: isLate ? lateMinutes : 0,
            poin_kehadiran: isLate ? ATTENDANCE_POINTS.HADIR_TERLAMBAT : ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU,
            waktu_tap: tapTime,
            created_at: new Date(),
            tahun_pelajaran_id_snapshot: (activeYear as any)?.id || null,
          },
        });
      } else {
        absenRecord = await (tx as any).absenGerbangSiswa.create({
          data: {
            tenant_id: tenantId,
            sesi_gerbang_id: sessionInfo.id,
            siswa_id: input.siswa_id,
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
        });
      }
    } catch (error: any) {
      if (error?.code === 'P2002') {
        isDuplicate = true;
        if (isGuru) {
          absenRecord = await (tx as any).absenGerbangGuru.findFirst({
            where: {
              sesi_gerbang_id: sessionInfo.id,
              guru_id: guru.id,
              arah: input.arah,
            },
            include: {
              SesiGerbang: {
                select: { tanggal: true, waktu_mulai: true, waktu_selesai: true },
              },
            },
          });
        } else {
          absenRecord = await (tx as any).absenGerbangSiswa.findFirst({
            where: {
              sesi_gerbang_id: sessionInfo.id,
              siswa_id: input.siswa_id,
              arah: input.arah,
            },
            include: {
              SesiGerbang: {
                select: { tanggal: true, waktu_mulai: true, waktu_selesai: true },
              },
            },
          });
        }
      } else {
        throw error;
      }
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

