import { petugasService } from '../services/petugas.service';

export const petugasController = {
  async getAll(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { page, limit, search } = request.query as any;
      
      const result = await petugasService.getAll(scope, { 
        page: page ? parseInt(page) : 1, 
        limit: limit ? parseInt(limit) : 10, 
        search 
      });
      
      return reply.send({ success: true, message: 'Petugas list retrieved', ...result });
    } catch (error: any) {
      console.error('[PetugasController] Error:', error);
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async assign(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const input = request.body;
      
      const result = await petugasService.assign(input, scope);
      return reply.send({ success: true, message: 'Petugas assigned successfully', data: result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async unassign(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { id } = request.params as any;
      
      await petugasService.unassign(id, scope);
      return reply.send({ success: true, message: 'Petugas unassigned successfully' });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }
};
