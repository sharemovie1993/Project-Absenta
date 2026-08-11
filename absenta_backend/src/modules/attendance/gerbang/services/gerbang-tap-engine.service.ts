import { gerbangService } from './gerbang.service';
import { GerbangTapInput, GerbangServiceResponse, GerbangTapData } from '../types/gerbang.types';
import { AbsensiMode } from '../../../../constants/enums';

export class GerbangTapEngineService {
  private static instance: GerbangTapEngineService;

  public static getInstance(): GerbangTapEngineService {
    if (!GerbangTapEngineService.instance) {
      GerbangTapEngineService.instance = new GerbangTapEngineService();
    }
    return GerbangTapEngineService.instance;
  }

  async tap(input: GerbangTapInput, userId: string, tenantId: string, attendanceMode?: AbsensiMode): Promise<GerbangServiceResponse<GerbangTapData>> {
    return gerbangService.tap(input, userId, tenantId, attendanceMode);
  }

  async getStudentCurrentStatus(tenantId: string, siswaId: string) {
    return gerbangService.getStudentCurrentStatus(tenantId, siswaId);
  }

  async getOrCreateSession(tenantId: string) {
    return gerbangService.getOrCreateSession(tenantId);
  }

  async getSessionsForDate(tenantId: string, date?: Date) {
    return gerbangService.getSessionsForDate(tenantId, date);
  }
}

export const gerbangTapEngineService = GerbangTapEngineService.getInstance();
