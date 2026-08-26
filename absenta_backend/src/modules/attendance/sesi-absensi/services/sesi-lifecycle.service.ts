import { SesiCreatorService } from './sub/sesi-creator.service';
import { SesiQueryService } from './sub/sesi-query.service';
import { SesiMutatorService } from './sub/sesi-mutator.service';

export class SesiLifecycleService {
  private static instance: SesiLifecycleService;
  private creator = new SesiCreatorService();
  private query = new SesiQueryService();
  private mutator = new SesiMutatorService();

  public static getInstance(): SesiLifecycleService {
    if (!SesiLifecycleService.instance) {
      SesiLifecycleService.instance = new SesiLifecycleService();
    }
    return SesiLifecycleService.instance;
  }

  static aggregateSessionStats(sessions: any[]) {
    return SesiQueryService.aggregateSessionStats(sessions);
  }

  async create(...args: any[]) { return (this.creator as any).create(...args); }
  async list(...args: any[]) { return (this.query as any).list(...args); }
  async listByTanggal(...args: any[]) { return (this.query as any).listByTanggal(...args); }
  async updateStatus(...args: any[]) { return (this.mutator as any).updateStatus(...args); }
  async update(...args: any[]) { return (this.mutator as any).update(...args); }
  async remove(...args: any[]) { return (this.mutator as any).remove(...args); }
}

export const sesiLifecycleService = SesiLifecycleService.getInstance();
