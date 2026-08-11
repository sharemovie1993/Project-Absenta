import { GerbangTapInput } from '../types/gerbang.types';

export class GerbangSyncService {
  private static instance: GerbangSyncService;

  public static getInstance(): GerbangSyncService {
    if (!GerbangSyncService.instance) {
      GerbangSyncService.instance = new GerbangSyncService();
    }
    return GerbangSyncService.instance;
  }

  async syncOfflineTaps(_tenantId: string, _taps: any[]): Promise<any> {
    return { success: true, processed: 0 };
  }

  async processOfflineTap(_tenantId: string, _input: GerbangTapInput, _tapTime: Date): Promise<any> {
    return { success: true };
  }
}

export const gerbangSyncService = GerbangSyncService.getInstance();
