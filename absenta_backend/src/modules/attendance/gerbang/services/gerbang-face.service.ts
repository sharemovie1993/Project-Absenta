import { FaceVerifyInput, FaceEnrollInput, GerbangServiceResponse, GerbangTapData } from '../types/gerbang.types';
import { AbsensiMode } from '../../../../constants/enums';

export class GerbangFaceService {
  private static instance: GerbangFaceService;

  public static getInstance(): GerbangFaceService {
    if (!GerbangFaceService.instance) {
      GerbangFaceService.instance = new GerbangFaceService();
    }
    return GerbangFaceService.instance;
  }

  async faceVerifyTap(_input: FaceVerifyInput, _userId: string, _tenantId: string, _attendanceMode?: AbsensiMode): Promise<GerbangServiceResponse<GerbangTapData>> {
    return { success: true, message: 'Face verified' } as any;
  }

  async faceEnroll(_input: FaceEnrollInput, _userId: string, _tenantId: string): Promise<any> {
    return { success: true, message: 'Face enrolled' };
  }

  async embeddingProviderHealth(): Promise<any> {
    return { success: true, status: 'HEALTHY' };
  }
}

export const gerbangFaceService = GerbangFaceService.getInstance();
