import { PrepChecklistService } from '../services/prep-checklist.service';

export class PrepChecklistController {
  private prepChecklistService: PrepChecklistService;

  constructor() {
    this.prepChecklistService = new PrepChecklistService();
  }

  /**
   * Get Academic New Year Preparation Checklist
   * GET /academic/prep-checklist
   */
  async getChecklist(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const checklistData = await this.prepChecklistService.getChecklist(tenantId);

      return reply.status(200).send({
        success: true,
        message: 'New year preparation checklist retrieved successfully',
        data: checklistData
      });
    } catch (error) {
      console.error('Error getting preparation checklist:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get preparation checklist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
