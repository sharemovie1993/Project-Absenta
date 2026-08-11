import { gerbangTapEngineService } from './gerbang-tap-engine.service';
import { gerbangFaceService } from './gerbang-face.service';
import { gerbangSyncService } from './gerbang-sync.service';
import { GerbangTapInput, FaceVerifyInput, FaceEnrollInput } from '../types/gerbang.types';
import { AbsensiMode } from '../../../../constants/enums';

/**
 * GerbangService (Facade Pattern)
 * Clean Architecture Delegate for Gate Attendance Module.
 * Completely cleaned up from legacy monolithic code while maintaining 100% Backward Compatibility.
 */
export class GerbangService {
  private static instance: GerbangService;

  public static getInstance(): GerbangService {
    if (!GerbangService.instance) {
      GerbangService.instance = new GerbangService();
    }
    return GerbangService.instance;
  }

  // --- Domain 1: Tap Engine ---
  async tap(input: GerbangTapInput, userId: string, tenantId: string, attendanceMode?: AbsensiMode): Promise<any> {
    return gerbangTapEngineService.tap(input, userId, tenantId, attendanceMode);
  }

  async getStudentCurrentStatus(tenantId: string, siswaId: string): Promise<any> {
    return gerbangTapEngineService.getStudentCurrentStatus(tenantId, siswaId);
  }

  async getOrCreateSession(tenantId: string): Promise<any> {
    return gerbangTapEngineService.getOrCreateSession(tenantId);
  }

  async getSessionsForDate(tenantId: string, date?: Date): Promise<any> {
    return gerbangTapEngineService.getSessionsForDate(tenantId, date);
  }

  async bypassLate(payload: any, userId?: string, tenantId?: string, attendanceMode?: any): Promise<any> {
    return gerbangTapEngineService.bypassLate(payload, userId, tenantId, attendanceMode);
  }

  async markManualAbsence(
    tenantId: string,
    siswaId: string,
    status: string,
    userId: string,
    source?: any,
    keterangan?: string
  ): Promise<any> {
    return gerbangTapEngineService.markManualAbsence(tenantId, siswaId, status, userId, source, keterangan);
  }

  // --- Domain 2: AI Face Recognition ---
  async faceVerifyTap(input: FaceVerifyInput, userId: string, tenantId: string, attendanceMode?: AbsensiMode): Promise<any> {
    return gerbangFaceService.faceVerifyTap(input, userId, tenantId, attendanceMode);
  }

  async faceEnroll(input: FaceEnrollInput, userId: string, tenantId: string): Promise<any> {
    return gerbangFaceService.faceEnroll(input, userId, tenantId);
  }

  async embeddingProviderHealth(): Promise<any> {
    return gerbangFaceService.embeddingProviderHealth();
  }

  // --- Domain 3: IoT Offline Sync ---
  async syncOfflineTaps(tenantId: string, taps: any[]): Promise<any> {
    return gerbangSyncService.syncOfflineTaps(tenantId, taps);
  }

  async processOfflineTap(tenantId: string, input: GerbangTapInput, tapTime: Date): Promise<any> {
    return gerbangSyncService.processOfflineTap(tenantId, input, tapTime);
  }
}

export const gerbangService = GerbangService.getInstance();
