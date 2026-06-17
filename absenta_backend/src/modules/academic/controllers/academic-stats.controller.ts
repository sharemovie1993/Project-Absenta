// Using any types for Fastify request/reply to avoid generic type complexity
import { AcademicStatsService } from '../services/academic-stats.service';

export class AcademicStatsController {
  private academicStatsService: AcademicStatsService;

  constructor() {
    this.academicStatsService = new AcademicStatsService();
  }

  /**
   * Get Academic Statistics
   * GET /academic/stats
   */
  async getAcademicStats(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const dataScope = (request as any).dataScope; // { kelasIds, tenantWide, tenantId, ... }
      
      const stats = await this.academicStatsService.getAcademicStats(tenantId, dataScope);
      
      return reply.status(200).send({
        success: true,
        message: 'Academic statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error getting academic stats:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get academic statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}