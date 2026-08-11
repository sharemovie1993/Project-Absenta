import { gerbangService } from './gerbang.service';
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

  async faceVerifyTap(input: FaceVerifyInput, userId: string, tenantId: string, attendanceMode?: AbsensiMode): Promise<GerbangServiceResponse<GerbangTapData>> {
    return gerbangService.faceVerifyTap(input, userId, tenantId, attendanceMode);
  }

  async faceEnroll(input: FaceEnrollInput, userId: string, tenantId: string) {
    return gerbangService.faceEnroll(input, userId, tenantId);
  }

  async embeddingProviderHealth() {
    return gerbangService.embeddingProviderHealth();
  }
}

export const gerbangFaceService = GerbangFaceService.getInstance();
