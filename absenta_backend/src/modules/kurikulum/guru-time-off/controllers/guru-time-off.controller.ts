import { guruTimeOffService } from '../services/guru-time-off.service';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export class GuruTimeOffController {
  async getByGuru(request: any, reply: any): Promise<ApiResponse> {
    try {
      const user = request.user;
      if (!user) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }

      const { guru_id } = request.query || {};
      if (!guru_id) {
        reply.status(400);
        return { success: false, message: 'guru_id is required' };
      }

      const data = await guruTimeOffService.getTimeOffByGuru(user.tenantId, guru_id);
      reply.status(200);
      return { success: true, message: 'Time-off list retrieved', data };
    } catch (error: any) {
      reply.status(500);
      return { success: false, message: error.message || 'Failed to fetch time-off' };
    }
  }

  async getAllTenant(request: any, reply: any): Promise<ApiResponse> {
    try {
      const user = request.user;
      if (!user) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }

      const data = await guruTimeOffService.getAllTenantTimeOffs(user.tenantId);
      reply.status(200);
      return { success: true, message: 'All tenant time-offs retrieved', data };
    } catch (error: any) {
      reply.status(500);
      return { success: false, message: error.message || 'Failed to fetch all time-offs' };
    }
  }

  async save(request: any, reply: any): Promise<ApiResponse> {
    try {
      const user = request.user;
      if (!user) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }

      const { guru_id, time_offs } = request.body || {};
      if (!guru_id) {
        reply.status(400);
        return { success: false, message: 'guru_id is required' };
      }

      const data = await guruTimeOffService.saveGuruTimeOffs(user.tenantId, {
        guru_id,
        time_offs: time_offs || []
      });

      reply.status(200);
      return { success: true, message: 'Time-off preferences saved successfully', data };
    } catch (error: any) {
      reply.status(500);
      return { success: false, message: error.message || 'Failed to save time-off' };
    }
  }

  async delete(request: any, reply: any): Promise<ApiResponse> {
    try {
      const user = request.user;
      if (!user) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }

      const { id } = request.params;
      const res = await guruTimeOffService.deleteTimeOff(user.tenantId, id);
      reply.status(200);
      return { success: true, message: 'Time-off record deleted', data: res };
    } catch (error: any) {
      reply.status(500);
      return { success: false, message: error.message || 'Failed to delete time-off' };
    }
  }
}

export const guruTimeOffController = new GuruTimeOffController();
