import { UniversalSearchService } from '../services/universal-search.service';

export class UniversalSearchController {
  private universalSearchService: UniversalSearchService;

  constructor() {
    this.universalSearchService = new UniversalSearchService();
  }

  async search(request: any, reply: any) {
    try {
      const { q, limit } = request.query;
      const scope = {
        ...(request.organizationalScope || {}),
        tenantId: request.organizationalScope?.tenantId || request.tenantId
      };
      
      const results = await this.universalSearchService.search(
        scope as any, 
        q, 
        limit ? parseInt(limit) : 15
      );

      return reply.status(200).send({
        success: true,
        data: results
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message
      });
    }
  }
}
