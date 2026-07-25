import { gerbangDb } from './repositories/gerbang.db';
import { AbsenStatus, JenisTap, AbsensiMode } from '@/constants/enums';
import { ATTENDANCE_POINTS } from '@/constants/attendance-points';
import { attendanceMetricsAggregator } from '@/utils/attendance-metrics';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { emitDomainEvent } from '@/infra/event-bus';
import { getRedisConnection } from '@/queue/redis';
import { calculateAttendanceStatus, resolveAttendanceConfig } from '@/utils/attendance-rules';
import { 
  GerbangTapInput, 
  GerbangServiceResponse,
  GerbangTapData,
  GerbangProcessingInfo,
  GerbangErrorDetails,
  isMultiSesiMode
} from '../types/gerbang.types';
import { FaceVerifyInput, FaceEnrollInput } from '../types/gerbang.types';
import {
  buildDuplicateResponse,
  buildErrorResponse,
  buildTapResponseData,
  getIntegrationStatus,
  getModeFeatures,
  getTapSuccessMessage,
  logTapPerformance,
  resolveTapTime,
} from './gerbang.tap-helpers';
import {
  getOrCreateSessionInfo,
  getSessionsForDate,
  getStudentCurrentStatus,
  markGatePresent,
  markManualAbsence as markManualAbsenceHelper,
} from './gerbang.session-helpers';
import { processTapTransaction } from './gerbang.tap-transaction';

export class GerbangService {
  /**
   * Bypass late attendance (Force HADIR)
   */
  async bypassLate(
    input: { siswa_id: string; note?: string },
    userId: string,
    tenantId: string,
    attendanceMode?: AbsensiMode
  ): Promise<GerbangServiceResponse<GerbangTapData>> {
    const processingInfo: GerbangProcessingInfo = {
      start_time: new Date(),
      tenant_id: tenantId,
      user_id: userId,
      mode: attendanceMode || AbsensiMode.SIMPLE,
      validation_steps: ['bypass_initiated'],
      processing_steps: [],
    };

    try {
      // 1. Validate Student
      const siswa = await gerbangDb.siswa.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [
            { id: input.siswa_id },
            { nisn: input.siswa_id },
            { nis: input.siswa_id },
            { no_rfid: input.siswa_id }
          ]
        },
        include: { Kelas: true }
      });

      if (!siswa) {
        throw new Error('Siswa not found');
      }

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      const tapTime = new Date();

      // 2. Check Existing Record
      const existing = await gerbangDb.absenGerbangSiswa.findFirst({
        where: {
          tenant_id: tenantId,
          siswa_id: input.siswa_id,
          waktu_tap: { gte: startOfDay, lte: endOfDay }
        },
        select: { id: true, created_at: true }
      });

      let record;
      if (existing) {
        record = await gerbangDb.absenGerbangSiswa.update({
          where: { id_created_at: { id: existing.id, created_at: existing.created_at } },
          data: {
            status: 'HADIR',
            is_terlambat: false,
            poin_kehadiran: ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU,
            // verification_method: 'MANUAL_BYPASS', // Field might not exist in schema yet, skipping
          }
        });
        // Note: We might want to append note to existing log, but schema limits.
      } else {
        // Fix: Ensure SesiGerbang exists
        const sessionInfo = await getOrCreateSessionInfo(tenantId);
        
        record = await gerbangDb.absenGerbangSiswa.create({
          data: {
            tenant_id: tenantId,
            sesi_gerbang_id: sessionInfo.id, // Added required relation
            siswa_id: input.siswa_id,
            status: 'HADIR',
            is_terlambat: false,
            poin_kehadiran: ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU,
            waktu_tap: tapTime,
            arah: JenisTap.GERBANG_DATANG,
            verification_method: 'MANUAL', // Using standard enum if MANUAL_BYPASS not avail
            // catatan: input.note // Check schema if catatan exists on AbsenGerbangSiswa
          } as any 
        });
      }

      // 3. Log Activity
      await gerbangDb.activityLog.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          action: 'GERBANG_BYPASS',
          entity: 'AbsenGerbangSiswa',
          entity_id: record.id,
          metadata: JSON.stringify({
            siswa_id: input.siswa_id,
            rfid: (siswa as any).no_rfid || 'BYPASS',
            arah: JenisTap.GERBANG_DATANG,
            device_id: 'MANUAL_BYPASS',
            status: 'SUCCESS',
            pesan: `Bypass Terlambat: ${input.note || '-'}`
          })
        }
      });

      // 4. Trigger Notification (PRESENT)
      await emitDomainEvent({
        event_type: 'attendance.tap',
        tenant_id: tenantId,
        source_service: 'attendance',
        payload: {
          tenant_id: tenantId,
          student_id: input.siswa_id,
          device_id: 'MANUAL_BYPASS',
          tap_time: tapTime.toISOString(),
          source: 'GERBANG_BYPASS',
          related_id: record.id,
          status: 'HADIR',
          arah: JenisTap.GERBANG_DATANG,
          note: input.note,
          notification_hint: 'STUDENT_PRESENT',
        },
      });

      // 5. Build Response
      void markGatePresent(tenantId, input.siswa_id);
      return {
        success: true,
        message: 'Bypass berhasil. Siswa dicatat HADIR.',
        data: {
          id: record.id,
          siswa_id: siswa.id,
          nama_siswa: siswa.nama_siswa,
          nis: siswa.nis,
          kelas: siswa.Kelas?.nama_kelas || '-',
          waktu_tap: record.waktu_tap ? record.waktu_tap.toISOString() : new Date().toISOString(),
          status: 'HADIR',
          arah: JenisTap.GERBANG_DATANG,
          is_terlambat: false
        } as any,
        metadata: {
          processing_info: processingInfo,
          mode_features: getModeFeatures(processingInfo.mode as AbsensiMode),
          integration_status: await getIntegrationStatus(tenantId, processingInfo.mode as AbsensiMode),
        }
      };

    } catch (error: any) {
      console.error('[GerbangService] Bypass failed:', error);
      return buildErrorResponse({
        message: error.message || 'Bypass failed',
        details: error
      } as any, processingInfo);
    }
  }

  /**
   * Enhanced tap method with comprehensive dual mode support
   */
  async tap(input: GerbangTapInput, userId: string, tenantId: string, attendanceMode?: AbsensiMode): Promise<GerbangServiceResponse<GerbangTapData>> {
    const processingInfo: GerbangProcessingInfo = {
      start_time: new Date(),
      tenant_id: tenantId,
      user_id: userId,
      mode: attendanceMode || AbsensiMode.SIMPLE,
      validation_steps: [],
      processing_steps: [],
    };

    try {
      const t0 = Date.now();
      // Step 1: Validate and normalize input
      const validationResult = await this.validateTapInput(input, tenantId, attendanceMode);
      processingInfo.validation_steps!.push(...validationResult.validation_steps);
      const t1 = Date.now();
      
      if (!validationResult.success) {
        logTapPerformance(tenantId, {
          validateMs: t1 - t0,
          duplicateMs: 0,
          modeValidationMs: 0,
          transactionMs: 0,
          responseMs: 0,
          totalMs: Date.now() - t0,
          duplicate: false,
        });
        return buildErrorResponse(validationResult.error! as any, processingInfo);
      }

      const { siswa, guru, isGuru = false, tenantMode, sessionInfo } = validationResult.data! as any;
      processingInfo.mode = tenantMode;

      const tapTime = resolveTapTime(input, sessionInfo);

      const t2 = t1;

      // Step 3: Mode-specific business logic validation
      const modeValidation = await this.validateModeSpecificRules(isGuru ? guru : siswa, tenantMode, sessionInfo, tapTime, isGuru);
      const t3 = Date.now();
      processingInfo.processing_steps!.push('mode_validation_completed');
      
      if (!modeValidation.success) {
        logTapPerformance(tenantId, {
          validateMs: t1 - t0,
          duplicateMs: 0,
          modeValidationMs: t3 - t2,
          transactionMs: 0,
          responseMs: 0,
          totalMs: Date.now() - t0,
          duplicate: false,
        });
        return buildErrorResponse(modeValidation.error! as any, processingInfo);
      }

      // Step 4: Process the tap transaction
      const tapTx = await processTapTransaction({ input, siswa, guru, isGuru, userId, tenantId, tenantMode, sessionInfo, tapTime });
      const t4 = Date.now();
      processingInfo.processing_steps!.push('tap_transaction_completed');

      if (tapTx.isDuplicate) {
        await emitDomainEvent({
          event_type: 'attendance.tap' as any,
          tenant_id: tenantId,
          source_service: 'attendance',
          payload: {
            tenant_id: tenantId,
            student_id: isGuru ? undefined : (siswa?.id || input.siswa_id),
            guru_id: isGuru ? guru?.id : undefined,
            device_id: input.device_id,
            tap_time: new Date().toISOString(),
            source: 'GERBANG',
            related_id: tapTx.record?.id,
            status: tapTx.record?.status,
            arah: input.arah,
            duplicate: true,
            original_tap: tapTx.record?.waktu_tap,
            notification_hint: isGuru ? 'TEACHER_MULTI_SCAN' : 'STUDENT_MULTI_SCAN',
          },
        });

        logTapPerformance(tenantId, {
          validateMs: t1 - t0,
          duplicateMs: 0,
          modeValidationMs: t3 - t2,
          transactionMs: t4 - t3,
          responseMs: 0,
          totalMs: Date.now() - t0,
          duplicate: true,
        });
        return buildDuplicateResponse(tapTx.record!, tenantMode, processingInfo);
      }

       // Step 5: Build comprehensive response
      if (!isGuru && input.arah === JenisTap.GERBANG_DATANG) {
        void markGatePresent(tenantId, siswa?.id || input.siswa_id!);
      }
      const responseData = await buildTapResponseData(tapTx.record, siswa, tenantMode, sessionInfo, input, guru);
      const t5 = Date.now();
      processingInfo.end_time = new Date();
      processingInfo.processing_steps!.push('response_built');

      const totalMs = Date.now() - t0;
      logTapPerformance(tenantId, {
        validateMs: t1 - t0,
        duplicateMs: t2 - t1,
        modeValidationMs: t3 - t2,
        transactionMs: t4 - t3,
        responseMs: t5 - t4,
        totalMs,
        duplicate: false,
      });
      attendanceMetricsAggregator.record(tenantId, 'GATE', totalMs);

      return {
        success: true,
        message: getTapSuccessMessage(input.arah, tenantMode),
        data: responseData,
        metadata: {
          processing_info: processingInfo,
          mode_features: getModeFeatures(tenantMode),
          integration_status: await getIntegrationStatus(tenantId, tenantMode),
        },
      };

    } catch (error) {
      console.error('Error in gerbang tap:', error);
      processingInfo.end_time = new Date();
      processingInfo.processing_steps!.push('error_occurred');
      const startTimeMs = processingInfo.start_time ? processingInfo.start_time.getTime() : Date.now();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const totalMs = Date.now() - startTimeMs;
      logTapPerformance(tenantId, {
        validateMs: 0,
        duplicateMs: 0,
        modeValidationMs: 0,
        transactionMs: 0,
        responseMs: 0,
        totalMs,
        duplicate: false,
      });
      return buildErrorResponse({
        error_type: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        details: { error: errorMessage },
      }, processingInfo);
    }
  }

  /**
   * Face verification (1:1) + tap creation
   */
  async faceVerifyTap(input: FaceVerifyInput, userId: string, tenantId: string, attendanceMode?: AbsensiMode): Promise<GerbangServiceResponse<GerbangTapData>> {
    const processingInfo: GerbangProcessingInfo = {
      start_time: new Date(),
      tenant_id: tenantId,
      user_id: userId,
      mode: attendanceMode || AbsensiMode.SIMPLE,
      validation_steps: [],
      processing_steps: [],
    };
    try {
      if (!input.arah || !input.image_base64) {
        return buildErrorResponse({
          error_type: 'VALIDATION_ERROR',
          message: 'Missing required fields: arah, image_base64',
          details: { missing_fields: ['arah', 'image_base64'] },
        }, processingInfo);
      }
      if (![JenisTap.GERBANG_DATANG, JenisTap.GERBANG_PULANG].includes(input.arah)) {
        return buildErrorResponse({
          error_type: 'INVALID_DIRECTION',
          message: 'Invalid arah for gerbang',
          details: { arah: input.arah },
        }, processingInfo);
      }

      // Resolve mode & student
      let tenantMode = attendanceMode;
      if (!tenantMode) {
        const tenant = await gerbangDb.tenant.findUnique({ where: { id: tenantId }, select: { absensi_mode: true } } as any);
        if (!tenant) {
          return buildErrorResponse({ error_type: 'TENANT_NOT_FOUND', message: 'Tenant not found' } as any, processingInfo);
        }
        tenantMode = (tenant as any).absensi_mode;
      }
      const siswa: any = await gerbangDb.siswa.findFirst({ where: { id: input.siswa_id, tenant_id: tenantId } as any, include: { Kelas: { select: { nama_kelas: true } } } as any } as any);
      if (!siswa) {
        return buildErrorResponse({ error_type: 'STUDENT_NOT_FOUND', message: 'Student not found', details: { siswa_id: input.siswa_id } } as any, processingInfo);
      }
      if (siswa.status !== 'AKTIF') {
        return buildErrorResponse({ 
          error_type: 'VALIDATION_ERROR', 
          message: 'Siswa tidak aktif', 
          details: { status: siswa.status } 
        } as any, processingInfo);
      }

      // Get or create today's session
      const sessionInfo = await getOrCreateSessionInfo(tenantId);

      let identifiedSiswaId = input.siswa_id;
      let matchedSiswa = siswa;
      let matchScore = 1.0; 
      // Higher Default Thresholds (More Secure)
      let threshold = parseFloat(process.env.FACE_VERIFY_THRESHOLD || '0.85');
      let isIdentification = false;

      // 1:N Identification Mode (siswa_id is missing)
      if (!identifiedSiswaId) {
        isIdentification = true;
        processingInfo.processing_steps!.push('face_identification_started');
        
        const templates = await gerbangDb.siswaFaceTemplate.findMany({
          where: { tenant_id: tenantId },
        });

        if (templates.length === 0) {
          return buildErrorResponse({
            error_type: 'VALIDATION_ERROR',
            message: 'Tidak ada template wajah terdaftar di sekolah ini',
          } as any, processingInfo);
        }

        // Strict AI Browser Enforcement
        let inputEmbed: number[] | null | undefined = input.embedding;
        
        if (!inputEmbed || inputEmbed.length === 0) {
          return buildErrorResponse({
            error_type: 'VALIDATION_ERROR',
            message: 'Data wajah (embedding) dari browser tidak ditemukan.',
            details: { help: 'Pastikan Browser AI aktif dan model telah dimuat di sisi klien.' }
          } as any, processingInfo);
        }

        let bestDistance = Infinity;
        let bestTemplate = null;

        for (const t of templates) {
          const storedVec = this.decodeEmbedding(t.embedding as Buffer);
          const currentDistance = this.euclideanDistance(storedVec, inputEmbed);
          if (currentDistance < bestDistance) {
            bestDistance = currentDistance;
            bestTemplate = t;
          }
        }

        // Standard Distance Threshold - 0.45 is strict (standard is 0.6)
        threshold = parseFloat(process.env.FACE_IDENTIFY_DISTANCE || '0.50');

        console.log(`[FACE_ID] Attempt: bestDistance=${bestDistance.toFixed(4)}, threshold=${threshold}, hits=${templates.length}`);

        if (bestDistance > threshold) {
          return buildErrorResponse({
            error_type: 'FACE_NOT_RECOGNIZED',
            message: 'Wajah tidak dikenali',
            details: { distance: bestDistance, threshold, mode: 'STRICT' }
          } as any, processingInfo);
        }

        identifiedSiswaId = bestTemplate!.siswa_id;
        matchScore = bestDistance; // using distance as score proxy for internal passing
        
        // Load the identified student
        matchedSiswa = await gerbangDb.siswa.findFirst({ 
          where: { id: identifiedSiswaId, tenant_id: tenantId } as any, 
          include: { Kelas: { select: { nama_kelas: true } } } as any 
        } as any);

        if (!matchedSiswa) {
          return buildErrorResponse({ error_type: 'STUDENT_NOT_FOUND', message: 'Siswa teridentifikasi tidak ditemukan' } as any, processingInfo);
        }
      } else {
        // 1:1 Verification Mode
        processingInfo.processing_steps!.push('face_verification_started');
        
        // Load template for specific student
        const template = await gerbangDb.siswaFaceTemplate.findFirst({
          where: { tenant_id: tenantId, siswa_id: identifiedSiswaId },
        });
        if (!template) {
          return buildErrorResponse({
            error_type: 'VALIDATION_ERROR',
            message: 'Template wajah belum tersedia untuk siswa ini',
            details: { siswa_id: identifiedSiswaId },
          } as any, processingInfo);
        }

        // Strict AI Browser Enforcement
        let inputEmbed: number[] | null | undefined = input.embedding;

        if (!inputEmbed || inputEmbed.length === 0) {
          return buildErrorResponse({
            error_type: 'VALIDATION_ERROR',
            message: 'Data wajah dari browser hilang.',
            details: { help: 'Modul Gerbang sekarang mewajibkan pemrosesan di sisi klien (Browser AI).' }
          } as any, processingInfo);
        }

        const storedVec = this.decodeEmbedding(template.embedding as Buffer);
        matchScore = this.euclideanDistance(storedVec, inputEmbed);
      }

      // Final Check (STRICT MODE ONLY - REMOVED FALLBACK)
      const verified = matchScore <= threshold; // Using Euclidean Distance (lower is closer/better)
      
      // Liveness Detection (New Requirement)
      const livenessScore = parseFloat(String(input.liveness_score || '1.0'));
      const livenessThreshold = parseFloat(process.env.FACE_LIVENESS_THRESHOLD || '0.70');
      const isLive = livenessScore >= livenessThreshold;

      if (!verified || !isLive) {
        console.warn(`[FACE_DENIED] Unrecognized face attempt: distance=${matchScore.toFixed(4)}, liveness=${livenessScore.toFixed(4)}, target_id=${identifiedSiswaId}`);
        processingInfo.end_time = new Date();
        return buildErrorResponse({
          error_type: !verified ? 'FACE_NOT_RECOGNIZED' : 'FACE_SPOOFING_DETECTED',
          message: !verified 
            ? `Verifikasi wajah tidak cocok (jarak: ${matchScore.toFixed(4)}, batas: ${threshold}).`
            : `Terdeteksi upaya spoofing wajah (liveness score: ${livenessScore.toFixed(4)}, batas: ${livenessThreshold}).`,
          details: { distance: matchScore, liveness: livenessScore, threshold, verified, isLive }
        } as any, processingInfo);
      }

      // Duplicate check for identified/verified student
      const dup = await this.checkDuplicateTap({ siswa_id: identifiedSiswaId!, arah: input.arah }, tenantId, sessionInfo);
      if (dup.isDuplicate) {
        return buildDuplicateResponse(dup.existingRecord!, tenantMode!, processingInfo);
      }

      // Proceed to create absen record
      const activeYear = await gerbangDb.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } } as any);
      const kelasId = matchedSiswa.kelas_id;
      const kelasNama = matchedSiswa.Kelas?.nama_kelas || null;
      const tingkatData = kelasId ? await gerbangDb.kelas.findUnique({ where: { id: kelasId } as any, select: { tingkat: true, jam_masuk: true, jam_pulang: true } as any } as any) : null;

      // --- NEW ATTENDANCE RULES LOGIC (FACE VERIFY) ---
      const tenantConfig = await gerbangDb.tenant.findUnique({
        where: { id: tenantId },
        select: { jam_masuk_default: true, jam_pulang_default: true, toleransi_keterlambatan_menit: true }
      } as any);

      const today = new Date();
      const specialEvent = await gerbangDb.absensiKejadianKhusus.findFirst({
        where: {
          tenant_id: tenantId,
          tanggal: today
        }
      } as any);

      const ruleConfig = resolveAttendanceConfig(
        tenantConfig || { jam_masuk_default: '07:00', jam_pulang_default: '14:00', toleransi_keterlambatan_menit: 15 },
        tingkatData ? { jam_masuk: tingkatData.jam_masuk, jam_pulang: tingkatData.jam_pulang } : null,
        specialEvent
      );

      const statusResult = calculateAttendanceStatus(
        input.arah === JenisTap.GERBANG_DATANG ? today : null,
        input.arah === JenisTap.GERBANG_PULANG ? today : null,
        ruleConfig
      );

      const isLate = statusResult.status === 'TERLAMBAT';
      const lateMinutes = statusResult.menitTerlambat;

      const absenRecord = await gerbangDb.absenGerbangSiswa.create({
        data: {
          tenant_id: tenantId,
          sesi_gerbang_id: sessionInfo.id,
          siswa_id: identifiedSiswaId!,
          arah: input.arah,
          status: AbsenStatus.HADIR,
          is_terlambat: isLate,
          menit_keterlambatan: isLate ? lateMinutes : 0,
          poin_kehadiran: isLate ? ATTENDANCE_POINTS.HADIR_TERLAMBAT : ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU,
          waktu_tap: today,
          created_at: new Date(),
          kelas_id_snapshot: kelasId || null,
          kelas_nama_snapshot: kelasNama || null,
          tingkat_snapshot: tingkatData?.tingkat ?? null,
          tahun_pelajaran_id_snapshot: activeYear?.id || null,
          verification_method: isIdentification ? 'FACE_1_N_IDENTIFY' : 'FACE_1_1_VERIFY',
          verification_score: matchScore,
          verification_threshold: threshold,
          verification_result: verified,
        },
      });

      if (input.arah === JenisTap.GERBANG_DATANG) {
        void markGatePresent(tenantId, identifiedSiswaId!);
      }

      // --- EMIT SOCKET EVENT FOR REAL-TIME SYNC ---
      try {
        const payload = {
            tenant_id: String(tenantId),
            sesi_gerbang_id: String(sessionInfo.id || ''),
            siswa_id: String(identifiedSiswaId),
            arah: input.arah,
            waktu_tap: absenRecord.waktu_tap || new Date().toISOString(),
            status: AbsenStatus.HADIR,
            record_id: String(absenRecord.id),
            source: 'FACE_SCAN',
            image_stream: input.image_base64 // Stream image to dashboard V2
        };
        const redis = getRedisConnection();
        await (redis as any).publish('events:gerbang_tap_update', JSON.stringify(payload));
      } catch (e) {
        console.warn('[GerbangService] Failed to emit face tap socket event:', e);
      }

      const responseData = await buildTapResponseData(absenRecord, matchedSiswa, tenantMode!, sessionInfo, { siswa_id: identifiedSiswaId!, arah: input.arah } as any);
      processingInfo.end_time = new Date();
      return {
        success: true,
        message: 'Verifikasi wajah berhasil & tap dicatat',
        data: responseData,
        metadata: {
          processing_info: processingInfo,
          mode_features: getModeFeatures(tenantMode!),
          integration_status: await getIntegrationStatus(tenantId, tenantMode!),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return buildErrorResponse({
        error_type: 'INTERNAL_SERVER_ERROR',
        message: 'Face verify failed',
        details: { error: errorMessage },
      } as any, processingInfo);
    }
  }

  async faceEnroll(input: FaceEnrollInput, userId: string, tenantId: string): Promise<GerbangServiceResponse<{ siswa_id: string; embedding_type: string }>> {
    const processingInfo: GerbangProcessingInfo = {
      start_time: new Date(),
      tenant_id: tenantId,
      user_id: userId,
      validation_steps: [],
      processing_steps: [],
    };
    try {
      if (!input.siswa_id || !input.image_base64) {
        return buildErrorResponse({
          error_type: 'VALIDATION_ERROR',
          message: 'Missing required fields: siswa_id, image_base64',
          details: { missing_fields: ['siswa_id', 'arah'] },
        } as any, processingInfo);
      }
      const siswa = await gerbangDb.siswa.findFirst({ where: { id: input.siswa_id, tenant_id: tenantId } as any } as any);
      if (!siswa) {
        return buildErrorResponse({ error_type: 'STUDENT_NOT_FOUND', message: 'Student not found' } as any, processingInfo);
      }
      
      let embedArr: number[] | null = input.embedding || [];

      if (!embedArr || embedArr.length === 0) {
        return buildErrorResponse({
          error_type: 'VALIDATION_ERROR',
          message: 'Pendaftaran wajah wajib menggunakan data dari Browser AI.',
        } as any, processingInfo);
      }

      const embeddingType = 'FACEAPI_128';
      const buf = Buffer.from(JSON.stringify(embedArr), 'utf-8');
      
      let template = await gerbangDb.siswaFaceTemplate.upsert({
        where: { tenant_id_siswa_id_embedding_type: { tenant_id: tenantId, siswa_id: input.siswa_id, embedding_type: embeddingType } },
        update: { embedding: buf, model_name: 'face-api.js', source: 'WEB' },
        create: { tenant_id: tenantId, siswa_id: input.siswa_id, embedding: buf, embedding_type: embeddingType, model_name: 'face-api.js', source: 'WEB' },
      } as any);

      return {
        success: true,
        message: 'Template wajah siswa berhasil direkam',
        data: { siswa_id: input.siswa_id, embedding_type: template.embedding_type },
        metadata: { processing_info: processingInfo },
      };
    } catch (error: any) {
      console.error('[FACE_ENROLL] internal error', error);
      return buildErrorResponse({
        error_type: 'INTERNAL_SERVER_ERROR',
        message: 'Face enroll failed',
        details: { error: error.message },
      } as any, processingInfo);
    }
  }

  async embeddingProviderHealth(): Promise<GerbangServiceResponse<{ ok: boolean; status?: number; message?: string }>> {
    return { success: true, message: 'CLIENT_ONLY', data: { ok: true, status: 200 } };
  }
  /**
   * Comprehensive input validation with mode awareness
   */
  private async validateTapInput(
    input: GerbangTapInput, 
    tenantId: string, 
    attendanceMode?: AbsensiMode
  ): Promise<{
    success: boolean;
    data?: { siswa: any; tenantMode: AbsensiMode; sessionInfo: any };
    error?: GerbangErrorDetails;
    validation_steps: string[];
  }> {
    const validation_steps: string[] = [];

    // Validate basic input
    if (!input.siswa_id || !input.arah) {
      validation_steps.push('basic_input_validation_failed');
      return {
        success: false,
        error: {
          error_type: 'VALIDATION_ERROR',
          message: 'Missing required fields: siswa_id and arah',
          details: { missing_fields: ['siswa_id', 'arah'] },
        },
        validation_steps,
      };
    }
    validation_steps.push('basic_input_validation_passed');

    // Validate and get tenant mode
    let tenantMode = attendanceMode;
    if (!tenantMode) {
      const tenant = await gerbangDb.tenant.findUnique({
        where: { id: tenantId },
        select: { absensi_mode: true },
      } as any);

      if (!tenant) {
        validation_steps.push('tenant_validation_failed');
        return {
          success: false,
          error: {
            error_type: 'TENANT_NOT_FOUND',
            message: 'Tenant not found',
            details: { tenant_id: tenantId },
          },
          validation_steps,
        };
      }
      tenantMode = (tenant as any).absensi_mode;
    }
    validation_steps.push('tenant_mode_validated');

    // Validate student or guru
    const rawId = input.siswa_id ? String(input.siswa_id).trim() : '';
    const cleanId = rawId.replace(/^0+/, '');

    let siswa = await gerbangDb.siswa.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [
          { id: rawId },
          { nisn: rawId },
          { nis: rawId },
          { no_rfid: rawId },
          ...(cleanId && cleanId !== rawId ? [{ nisn: cleanId }, { nis: cleanId }, { no_rfid: cleanId }] : [])
        ]
      },
      include: { Kelas: { select: { nama_kelas: true } } },
    } as any);

    let isGuru = false;
    let guru = null;

    if (!siswa) {
      // Check if it's a Guru / Staff
      guru = await gerbangDb.guru.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [
            { id: rawId },
            { nip: rawId },
            { no_rfid: rawId },
            ...(cleanId && cleanId !== rawId ? [{ nip: cleanId }, { no_rfid: cleanId }] : [])
          ]
        }
      });
      if (guru) {
        isGuru = true;
      } else {
        validation_steps.push('student_validation_failed');
        return {
          success: false,
          error: {
            error_type: 'STUDENT_NOT_FOUND',
            message: 'Student/Teacher not found or does not belong to this tenant',
            details: { id: input.siswa_id, tenant_id: tenantId },
          },
          validation_steps,
        };
      }
    }

    if (siswa && siswa.status !== 'AKTIF') {
      validation_steps.push('student_inactive');
      return {
        success: false,
        error: {
          error_type: 'VALIDATION_ERROR',
          message: 'Siswa tidak aktif',
          details: { status: siswa.status },
        },
        validation_steps,
      };
    }
    validation_steps.push('user_validation_passed');

    // Get or create session info
    const sessionInfo = await getOrCreateSessionInfo(tenantId);
    validation_steps.push('session_info_retrieved');

    return {
      success: true,
      data: { siswa, guru, isGuru, tenantMode: (tenantMode || AbsensiMode.SIMPLE) as AbsensiMode, sessionInfo } as any,
      validation_steps,
    };
  }

  /**
   * Check for duplicate taps with enhanced logic
   */
  private async checkDuplicateTap(
    input: GerbangTapInput, 
    tenantId: string, 
    _sessionInfo: any
  ): Promise<{ isDuplicate: boolean; existingRecord?: any }> {
    const cfg = await systemConfigService.getActive(tenantId);
    const tz = String(cfg?.timezone || '').trim();
    const offsetStr = tz === 'Asia/Makassar' ? '+08:00' : (tz === 'Asia/Jayapura' ? '+09:00' : '+07:00');
    const offsetHours = offsetStr === '+09:00' ? 9 : (offsetStr === '+08:00' ? 8 : 7);
    const dayStr = new Date(new Date().getTime() + offsetHours * 60 * 60 * 1000).toISOString().split('T')[0];
    const startOfDay = new Date(`${dayStr}T00:00:00.000${offsetStr}`);
    const endOfDay = new Date(`${dayStr}T23:59:59.999${offsetStr}`);

    const existingRecord = await gerbangDb.absenGerbangSiswa.findFirst({
      where: {
        tenant_id: tenantId,
        siswa_id: input.siswa_id,
        arah: input.arah,
        waktu_tap: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        SesiGerbang: {
          select: { tanggal: true, waktu_mulai: true, waktu_selesai: true },
        },
        Siswa: {
          select: { 
            id: true,
            nama_siswa: true, 
            nis: true,
            Kelas: { select: { nama_kelas: true } }
          }
        }
      },
    } as any);

    return {
      isDuplicate: !!existingRecord,
      existingRecord,
    };
  }

  private async validateModeSpecificRules(
    user: any,
    tenantMode: AbsensiMode,
    sessionInfo: any,
    tapTime: Date,
    isGuru = false
  ): Promise<{ success: boolean; error?: GerbangErrorDetails }> {
    const now = tapTime;
    const sessionStart = new Date(sessionInfo.waktu_mulai);
    const sessionEnd = new Date(sessionInfo.waktu_selesai);

    if (now < sessionStart || now > sessionEnd) {
      return {
        success: false,
        error: {
          error_type: 'VALIDATION_ERROR',
          message: 'Tap is outside of session time window',
          details: {
            current_time: now.toISOString(),
            session_start: sessionStart.toISOString(),
            session_end: sessionEnd.toISOString(),
          },
        },
      };
    }

    if (isGuru) {
      return { success: true };
    }

    // Mode-specific validations
    if (isMultiSesiMode(tenantMode)) {
      // In MULTI_SESI mode, validate integration prerequisites
      const integrationValidation = await this.validateMultiSesiIntegration(user);
      if (!integrationValidation.success) {
        return integrationValidation;
      }
    }

    return { success: true };
  }

  /**
   * MULTI_SESI mode integration validation
   */
  private async validateMultiSesiIntegration(
    siswa: any
  ): Promise<{ success: boolean; error?: GerbangErrorDetails }> {
    // Check if there are active activity sessions that might be affected
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const activeActivitySessions = await gerbangDb.sesiAbsensi.findMany({
      where: {
        tenant_id: siswa.tenant_id,
        tanggal: { gte: startOfDay, lte: endOfDay },
        waktu_selesai: { gte: new Date() },
      },
    } as any);

    // Log integration context for monitoring
    if (String(process.env.LOG_LEVEL || '').toLowerCase() === 'debug') {
      console.log(`MULTI_SESI integration check: Found ${activeActivitySessions.length} active activity sessions`);
    }

    return { success: true };
  }

  async getOrCreateSession(tenantId: string) {
    return getOrCreateSessionInfo(tenantId);
  }

  async getSessionsForDate(tenantId: string, date?: Date): Promise<GerbangServiceResponse<{ sessions: any[]; date: string }>> {
    return getSessionsForDate(tenantId, date);
  }

  async getStudentCurrentStatus(tenantId: string, siswaId: string): Promise<GerbangServiceResponse<any>> {
    return getStudentCurrentStatus(tenantId, siswaId);
  }

  async markManualAbsence(
    tenantId: string,
    siswaId: string,
    status: string,
    userId: string,
    source: 'MANUAL_PETUGAS' | 'PARENT_APP',
    keterangan?: string,
  ): Promise<GerbangServiceResponse<any>> {
    return markManualAbsenceHelper({
      tenantId,
      siswaId,
      status,
      userId,
      source,
      keterangan,
      getOrCreateSession: getOrCreateSessionInfo,
    });
  }
  private euclideanDistance(vec1: number[], vec2: number[]): number {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
        const diff = vec1[i] - vec2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private decodeEmbedding(buf: Buffer): number[] {
    try {
      if (!buf) return [];
      
      // If the buffer looks like a JSON string, parse it
      const str = buf.toString('utf8');
      if (str.trim().startsWith('[')) {
        return JSON.parse(str);
      }
      
      // Fallback: treat as float32 array (standard binary embedding)
      const byteLength = buf.length;
      const floatCount = byteLength / 4;
      const arr = new Float32Array(floatCount);
      for (let i = 0; i < floatCount; i++) {
        arr[i] = buf.readFloatLE(i * 4);
      }
      return Array.from(arr);
    } catch (e) {
      console.warn('Gagal decode embedding buffer:', e);
      return [];
    }
  }

  /**
   * Sync offline taps from IoT devices (Store and Forward)
   */
  async syncOfflineTaps(tenantId: string, taps: any[]) {
    const results = {
      success: 0,
      failed: 0,
      details: [] as any[]
    };

    for (const tap of taps) {
      try {
        // Process each tap as a standard tap but with the original timestamp
        const input: GerbangTapInput = {
          siswa_id: tap.siswa_id,
          rfid: tap.rfid,
          arah: tap.arah as JenisTap,
          device_id: tap.device_id || 'OFFLINE_SYNC',
        };

        // Custom logic for offline sync: use tap.timestamp instead of now
        const tapTime = tap.timestamp ? new Date(tap.timestamp) : new Date();
        
        // We bypass standard tap logic to use historical time
        const res = await this.processOfflineTap(tenantId, input, tapTime);
        
        results.success++;
        results.details.push({ id: tap.id, status: 'SUCCESS', record_id: res.id });
      } catch (err) {
        results.failed++;
        results.details.push({ id: tap.id, status: 'FAILED', error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    return results;
  }

  private async processOfflineTap(tenantId: string, input: GerbangTapInput, tapTime: Date) {
    // Basic implementation of offline tap processing
    // Similar to tap() but handles historical time
    return await gerbangDb.$transaction(async (tx) => {
        const siswa = await tx.siswa.findFirst({
            where: input.rfid ? { no_rfid: input.rfid, tenant_id: tenantId } : { id: input.siswa_id ? input.siswa_id : undefined, tenant_id: tenantId }
        });
        if (!siswa) throw new Error('Student not found');

        const session = await getOrCreateSessionInfo(tenantId);
        
        return await tx.absenGerbangSiswa.create({
            data: {
                tenant_id: tenantId,
                sesi_gerbang_id: session.id,
                siswa_id: siswa.id,
                arah: input.arah,
                status: AbsenStatus.HADIR,
                waktu_tap: tapTime,
                verification_method: 'OFFLINE_SYNC',
                created_at: new Date()
            }
        });
    });
  }
}

export const gerbangService = new GerbangService();
