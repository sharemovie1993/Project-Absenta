import { 
  GerbangTapInput, 
  GerbangServiceResponse, 
  GerbangTapData,
  GerbangProcessingInfo
} from '../types/gerbang.types';
import { AbsensiMode, JenisTap } from '../../../../constants/enums';
import { 
  getOrCreateSessionInfo,
  getSessionsForDate as _getSessionsForDate,
  getStudentCurrentStatus as _getStudentCurrentStatus,
  markManualAbsence as _markManualAbsence
} from './gerbang.session-helpers';
import { gerbangDb } from './repositories/gerbang.db';
import { resolveTapTime, buildTapResponseData, buildErrorResponse } from './gerbang.tap-helpers';
import { processTapTransaction } from './gerbang.tap-transaction';
import { emitDomainEvent } from '@/infra/event-bus';

export class GerbangTapEngineService {
  private static instance: GerbangTapEngineService;

  public static getInstance(): GerbangTapEngineService {
    if (!GerbangTapEngineService.instance) {
      GerbangTapEngineService.instance = new GerbangTapEngineService();
    }
    return GerbangTapEngineService.instance;
  }

  async tap(input: GerbangTapInput, userId: string, tenantId: string, attendanceMode?: AbsensiMode): Promise<GerbangServiceResponse<GerbangTapData>> {
    const processingInfo: GerbangProcessingInfo = {
      start_time: new Date(),
      tenant_id: tenantId,
      user_id: userId,
      mode: attendanceMode || AbsensiMode.MULTI_SESI,
      validation_steps: [],
      processing_steps: [],
    };

    try {
      const rawId = input.siswa_id ? String(input.siswa_id).trim() : (input.rfid ? String(input.rfid).trim() : '');
      const cleanId = rawId.replace(/^0+/, '');

      if (!rawId && !input.rfid) {
        return buildErrorResponse({
          error_type: 'VALIDATION_ERROR',
          message: 'Nomor RFID atau ID Siswa/Guru wajib disertakan',
        } as any, processingInfo);
      }

      // 1. Cari Siswa
      let siswa: any = await gerbangDb.siswa.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [
            { id: rawId },
            { nisn: rawId },
            { nis: rawId },
            { no_rfid: rawId },
            ...(input.rfid ? [{ no_rfid: String(input.rfid).trim() }] : []),
            ...(cleanId && cleanId !== rawId ? [{ nisn: cleanId }, { nis: cleanId }, { no_rfid: cleanId }] : [])
          ]
        },
        include: { Kelas: { select: { nama_kelas: true } } },
      } as any);

      let isGuru = false;
      let guru: any = null;

      // 2. Jika bukan Siswa, cari Guru / Pegawai Tendik
      if (!siswa) {
        guru = await gerbangDb.guru.findFirst({
          where: {
            tenant_id: tenantId,
            OR: [
              { id: rawId },
              { nip: rawId },
              { no_rfid: rawId },
              ...(input.rfid ? [{ no_rfid: String(input.rfid).trim() }] : []),
              ...(cleanId && cleanId !== rawId ? [{ nip: cleanId }, { no_rfid: cleanId }] : [])
            ]
          }
        });
        if (guru) {
          isGuru = true;
        }
      }

      if (!siswa && !guru) {
        return buildErrorResponse({
          error_type: 'STUDENT_NOT_FOUND',
          message: `Data tidak ditemukan di sistem untuk ID/NIP/NIS/RFID: "${rawId || input.rfid}"`,
        } as any, processingInfo);
      }

      const sessionInfo = await getOrCreateSessionInfo(tenantId);
      const tenantMode = attendanceMode || AbsensiMode.MULTI_SESI;
      const tapTime = resolveTapTime(input, sessionInfo);

      // 3. Eksekusi Transaksi Database (AbsenGerbangSiswa atau AbsenGerbangGuru)
      const tapTx = await processTapTransaction({
        input,
        siswa,
        guru,
        isGuru,
        userId,
        tenantId,
        tenantMode,
        sessionInfo,
        tapTime,
      });

      // 4. Bangun payload response lengkap
      const tapData = await buildTapResponseData(tapTx.record, siswa, tenantMode, sessionInfo, input, guru);

      // 5. Emit Domain Event untuk notifikasi / realtime feed
      try {
        await emitDomainEvent({
          event_type: 'attendance.tap' as any,
          tenant_id: tenantId,
          source_service: 'attendance',
          payload: {
            tenant_id: tenantId,
            student_id: isGuru ? undefined : (siswa?.id || input.siswa_id),
            guru_id: isGuru ? guru?.id : undefined,
            device_id: input.device_id,
            tap_time: tapTime.toISOString(),
            source: 'GERBANG',
            related_id: tapTx.record?.id,
            status: tapTx.record?.status,
            arah: input.arah,
            duplicate: tapTx.isDuplicate,
          } as any,
        });
      } catch (eventErr) {
        console.warn('[GerbangTapEngineService] emitDomainEvent warning:', eventErr);
      }

      return {
        success: true,
        message: tapTx.isDuplicate ? 'Duplicate tap detected' : 'Tap recorded',
        data: {
          ...tapData,
          duplicate_detected: tapTx.isDuplicate,
        } as any,
      };
    } catch (err: any) {
      console.error('[GerbangTapEngineService] tap error:', err);
      return buildErrorResponse({
        error_type: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'Internal server error',
      } as any, processingInfo);
    }
  }

  async getStudentCurrentStatus(tenantId: string, siswaId: string): Promise<GerbangServiceResponse<any>> {
    return _getStudentCurrentStatus(tenantId, siswaId);
  }

  async getOrCreateSession(tenantId: string): Promise<GerbangServiceResponse<any>> {
    return getOrCreateSessionInfo(tenantId);
  }

  async getSessionsForDate(tenantId: string, date?: Date): Promise<GerbangServiceResponse<any>> {
    return _getSessionsForDate(tenantId, date);
  }

  async bypassLate(payload: { siswa_id: string; note?: string }, userId?: string, tenantId?: string, attendanceMode?: any): Promise<GerbangServiceResponse<any>> {
    const processingInfo: GerbangProcessingInfo = {
      start_time: new Date(),
      tenant_id: tenantId || '',
      user_id: userId || '',
      mode: attendanceMode || AbsensiMode.MULTI_SESI,
      validation_steps: ['bypass_initiated'],
      processing_steps: [],
    };

    try {
      const sessionInfo = await getOrCreateSessionInfo(tenantId || '');
      const rawId = payload.siswa_id ? String(payload.siswa_id).trim() : '';

      const siswa = await gerbangDb.siswa.findFirst({
        where: {
          tenant_id: tenantId || '',
          OR: [{ id: rawId }, { nisn: rawId }, { nis: rawId }, { no_rfid: rawId }]
        },
        include: { Kelas: { select: { nama_kelas: true } } },
      } as any);

      if (!siswa) {
        return buildErrorResponse({
          error_type: 'STUDENT_NOT_FOUND',
          message: 'Siswa tidak ditemukan untuk bypass',
        } as any, processingInfo);
      }

      const activeYear = await gerbangDb.tahunPelajaran.findFirst({ where: { tenant_id: tenantId || '', is_active: true } } as any);

      const record = await gerbangDb.absenGerbangSiswa.upsert({
        where: {
          sesi_gerbang_id_siswa_id_arah: {
            sesi_gerbang_id: sessionInfo.id,
            siswa_id: siswa.id,
            arah: JenisTap.GERBANG_DATANG,
          }
        },
        create: {
          tenant_id: tenantId || '',
          sesi_gerbang_id: sessionInfo.id,
          siswa_id: siswa.id,
          arah: JenisTap.GERBANG_DATANG,
          status: 'HADIR' as any,
          is_terlambat: false,
          menit_keterlambatan: 0,
          waktu_tap: new Date(),
          catatan: payload.note || 'Bypass Mode',
          tahun_pelajaran_id_snapshot: (activeYear as any)?.id || null,
        },
        update: {
          status: 'HADIR' as any,
          is_terlambat: false,
          menit_keterlambatan: 0,
          catatan: payload.note || 'Bypass Mode',
          waktu_tap: new Date(),
        }
      });

      return {
        success: true,
        message: `BYPASS BERHASIL: ${siswa.nama_siswa}`,
        data: {
          ...record,
          nama_siswa: siswa.nama_siswa,
          kelas: (siswa as any).Kelas?.nama_kelas || '-',
        } as any,
      };
    } catch (err: any) {
      console.error('[GerbangTapEngineService] bypass error:', err);
      return buildErrorResponse({
        error_type: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'Gagal memproses bypass',
      } as any, processingInfo);
    }
  }

  async markManualAbsence(
    tenantId: string,
    siswaId: string,
    status: string,
    userId: string,
    source?: any,
    keterangan?: string
  ): Promise<GerbangServiceResponse<any>> {
    return _markManualAbsence({
      tenantId,
      siswaId,
      status,
      userId,
      source,
      keterangan,
      getOrCreateSession: getOrCreateSessionInfo,
    });
  }
}

export const gerbangTapEngineService = GerbangTapEngineService.getInstance();
