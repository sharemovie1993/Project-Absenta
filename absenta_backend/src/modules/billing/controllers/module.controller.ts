import { moduleService } from '../services/module.service';

export const moduleController = {
  async getPublicModules(_request: any, reply: any) {
    try {
      const modules = await moduleService.getAllModules(false);

      reply.status(200);
      return {
        success: true,
        message: 'Modules retrieved successfully',
        data: modules,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve modules';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getAllModules(request: any, reply: any) {
    try {
      const { include_inactive } = request.query;
      const includeInactive = include_inactive === 'true';
      const modules = await moduleService.getAllModules(includeInactive);

      reply.status(200);
      return {
        success: true,
        message: 'All modules retrieved successfully',
        data: modules,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve modules';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }
};
