import { AbsensiMode, JenisTap } from '@/constants/enums';
import type {
  GerbangErrorDetails,
  GerbangIntegrationStatus,
  GerbangModeFeatures,
  GerbangProcessingInfo,
  GerbangServiceResponse,
  GerbangTapData,
  GerbangTapInput,
} from '../types/gerbang.types';
import { isMultiSesiMode, isSimpleMode } from '../types/gerbang.types';

export function resolveTapTime(input: GerbangTapInput, sessionInfo: any): Date {
  const now = new Date();
  const sessionStart = new Date(sessionInfo.waktu_mulai);
  const sessionEnd = new Date(sessionInfo.waktu_selesai);
  let tapTime = now;
  const anyInput = input as any;
  const isOffline = !!anyInput.is_offline_sync;
  const rawTap = anyInput.waktu_tap;
  if (isOffline && rawTap) {
    const candidate = new Date(String(rawTap));
    if (!isNaN(candidate.getTime())) {
      const maxSkewMs = 60 * 60 * 1000;
      const minAllowed = new Date(sessionStart.getTime() - maxSkewMs);
      const maxAllowed = new Date(sessionEnd.getTime() + maxSkewMs);
      if (candidate >= minAllowed && candidate <= maxAllowed) {
        tapTime = candidate;
      }
    }
  }
  return tapTime;
}

export async function buildTapResponseData(
  tapResult: any,
  siswa: any,
  tenantMode: AbsensiMode,
  sessionInfo: any,
  input: GerbangTapInput,
  guru?: any
): Promise<GerbangTapData> {
  const isGuru = !!guru;
  const baseData: GerbangTapData = {
    id: tapResult.id,
    tenant_id: tapResult.tenant_id,
    sesi_gerbang_id: tapResult.sesi_gerbang_id,
    siswa_id: isGuru ? undefined : tapResult.siswa_id,
    guru_id: isGuru ? tapResult.guru_id : undefined,
    arah: tapResult.arah,
    status: tapResult.status,
    waktu_tap: tapResult.waktu_tap,
    created_at: tapResult.created_at,
    updated_at: tapResult.updated_at,
    attendance_mode: tenantMode,
    siswa_info: isGuru ? undefined : {
      id: siswa.id,
      nama: siswa.nama_siswa,
      nis: siswa.nis || null,
      foto_url: siswa.foto_url || null,
      nama_kelas: siswa.Kelas?.nama_kelas || null,
    },
    guru_info: isGuru ? {
      id: guru.id,
      nama: guru.nama_guru,
      nip: guru.nip || null,
      jenis_ptk: guru.jenis_ptk || 'PENDIDIK',
    } : undefined,
    session_info: {
      sesi_gerbang_id: sessionInfo.id,
      tanggal: sessionInfo.tanggal,
    },
    tap_info: {
      arah: input.arah,
      waktu_tap: tapResult.waktu_tap,
      device_id: input.device_id || null,
      rfid: input.rfid || null,
    },
  } as any;

  return baseData;
}

export function logTapPerformance(
  tenantId: string,
  metrics: {
    validateMs: number;
    duplicateMs: number;
    modeValidationMs: number;
    transactionMs: number;
    responseMs: number;
    totalMs: number;
    duplicate: boolean;
  },
): void {
  try {
    const thresholdGateMs = 300;
    const isPeakHour = () => {
      const now = new Date();
      const hour = now.getHours();
      return (hour >= 6 && hour < 9) || (hour >= 11 && hour < 14);
    };
    console.log('[ATTENDANCE_GATE_TAP_METRIC]', {
      tenant_id: tenantId,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
    if (isPeakHour() && metrics.totalMs > thresholdGateMs) {
      console.warn('[ATTENDANCE_LATENCY_ALERT]', {
        tenant_id: tenantId,
        source: 'GATE',
        total_ms: metrics.totalMs,
        threshold_ms: thresholdGateMs,
        timestamp: new Date().toISOString(),
      });
    }
  } catch {}
}

export function buildErrorResponse(error: GerbangErrorDetails, processingInfo: GerbangProcessingInfo): GerbangServiceResponse<any> {
  return {
    success: false,
    message: (error as any).message || (error as any).description || 'An error occurred',
    error: error,
    metadata: {
      processing_info: processingInfo,
      error_context: {
        timestamp: new Date().toISOString(),
        error_type: (error as any).error_type,
      },
    },
  };
}

export function buildDuplicateResponse(
  existingRecord: any,
  tenantMode: AbsensiMode,
  processingInfo: GerbangProcessingInfo,
): GerbangServiceResponse<any> {
  const siswa = existingRecord?.Siswa || {};
  return {
    success: true,
    message: 'DATA SUDAH TERTAUT - Absensi Anda hari ini sudah dicatat sebelumnya',
    data: {
      existing_record: existingRecord,
      siswa_info: {
        id: siswa.id,
        nama: siswa.nama_siswa || siswa.nama,
        nis: siswa.nis || null,
        foto_url: siswa.foto_url || null,
        nama_kelas: (siswa as any).Kelas?.nama_kelas || null,
      },
      attendance_mode: tenantMode,
      duplicate_detected: true,
    },
    metadata: {
      processing_info: processingInfo,
      mode_features: getModeFeatures(tenantMode),
    },
  };
}

export function getTapSuccessMessage(arah: JenisTap, tenantMode: AbsensiMode): string {
  const direction = arah === JenisTap.GERBANG_DATANG ? 'masuk' : 'keluar';
  const modeText = isMultiSesiMode(tenantMode) ? ' (mode multi-sesi)' : ' (mode sederhana)';
  return `Tap gerbang ${direction} berhasil dicatat${modeText}`;
}

export function getModeFeatures(tenantMode: AbsensiMode): GerbangModeFeatures {
  if (isSimpleMode(tenantMode)) {
    return {
      simple_mode: true,
      multi_sesi_mode: false,
      supports_kegiatan_integration: false,
    };
  } else {
    return {
      simple_mode: false,
      multi_sesi_mode: true,
      supports_kegiatan_integration: true,
    };
  }
}

import { getTenantTimezone } from '../../../../utils/timezone.utils';

export async function getIntegrationStatus(tenantId: string, tenantMode: AbsensiMode): Promise<GerbangIntegrationStatus> {
  if (isSimpleMode(tenantMode)) {
    return {
      gerbang_module: 'active' as const,
      kegiatan_integration: 'disabled' as const,
      prerequisite_for_kegiatan: false,
    };
  }

  const tz = await getTenantTimezone(tenantId);
  void tz;

  return {
    gerbang_module: 'active' as const,
    kegiatan_integration: 'enabled' as const,
    prerequisite_for_kegiatan: true,
  };
}

