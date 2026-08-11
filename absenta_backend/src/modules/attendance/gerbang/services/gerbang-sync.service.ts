import { gerbangService } from './gerbang.service';
import { GerbangTapInput } from '../types/gerbang.types';

export class GerbangSyncService {
  private static instance: GerbangSyncService;

  public static getInstance(): GerbangSyncService {
    if (!GerbangSyncService.instance) {
      GerbangSyncService.instance = new GerbangSyncService();
    }
    return GerbangSyncService.instance;
  }

  async syncOfflineTaps(tenantId: string, taps: any[]) {
    return gerbangService.syncOfflineTaps(tenantId, taps);
  }

  async processOfflineTap(tenantId: string, input: GerbangTapInput, tapTime: Date) {
    return gerbangService.processOfflineTap(tenantId, input, tapTime);
  }
}

export const gerbangSyncService = GerbangSyncService.getInstance();
