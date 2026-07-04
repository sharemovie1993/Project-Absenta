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

  /**
   * Get Yearly Comparison Statistics
   * GET /academic/stats/comparison
   */
  async getYearlyComparison(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }
      
      const comparison = await this.academicStatsService.getYearlyComparison(tenantId);
      
      return reply.status(200).send({
        success: true,
        message: 'Yearly comparison statistics retrieved successfully',
        data: comparison
      });
    } catch (error) {
      console.error('Error getting yearly comparison stats:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get yearly comparison statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}