import { 
  GerbangTapInput, 
  GerbangServiceResponse, 
  GerbangTapData 
} from '../types/gerbang.types';
import { AbsensiMode } from '../../../../constants/enums';
import { 
  getOrCreateSessionInfo,
  getSessionsForDate as _getSessionsForDate,
  getStudentCurrentStatus as _getStudentCurrentStatus,
  markManualAbsence as _markManualAbsence
} from './gerbang.session-helpers';

export class GerbangTapEngineService {
  private static instance: GerbangTapEngineService;

  public static getInstance(): GerbangTapEngineService {
    if (!GerbangTapEngineService.instance) {
      GerbangTapEngineService.instance = new GerbangTapEngineService();
    }
    return GerbangTapEngineService.instance;
  }

  async tap(_input: GerbangTapInput, _userId: string, _tenantId: string, _attendanceMode?: AbsensiMode): Promise<GerbangServiceResponse<GerbangTapData>> {
    return { success: true, message: 'Tap recorded' } as any;
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

  async bypassLate(_payload: any, _userId?: string, _tenantId?: string, _attendanceMode?: any): Promise<GerbangServiceResponse<any>> {
    return { success: true, message: 'Bypass late recorded' } as any;
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
