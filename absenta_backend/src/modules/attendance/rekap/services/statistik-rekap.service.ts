import { rekapImplService } from './rekap-impl.service';
import { DataScope } from '../../../../types/fastify';

export class StatistikRekapService {
  private static instance: StatistikRekapService;

  public static getInstance(): StatistikRekapService {
    if (!StatistikRekapService.instance) {
      StatistikRekapService.instance = new StatistikRekapService();
    }
    return StatistikRekapService.instance;
  }

  async getStatistikHarian(tanggal: string, tenantId: string, tahunPelajaranId?: string, scope?: DataScope) {
    return rekapImplService.getStatistikHarian(tanggal, tenantId, tahunPelajaranId, scope);
  }

  async getLeaderboard(tenantId: string, limit: number = 10) {
    return rekapImplService.getLeaderboard(tenantId, limit);
  }

  async getLeaderboardGuru(tenantId: string, limit: number = 50, jenisPtk: string = 'PENDIDIK') {
    return rekapImplService.getLeaderboardGuru(tenantId, limit, jenisPtk);
  }

  async logActivity(userId: string, tenantId: string, action: string, entityId?: string) {
    return rekapImplService.logActivity(userId, tenantId, action, entityId);
  }
}

export const statistikRekapService = StatistikRekapService.getInstance();
