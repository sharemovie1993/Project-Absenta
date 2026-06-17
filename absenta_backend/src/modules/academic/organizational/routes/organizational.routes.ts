import { determineDataScope } from '@/middlewares/dataScope';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalService } from '../services/organizational.service';

export async function organizationalRoutes(fastify: any) {
  fastify.get('/organizational-positions', {
    preHandler: [requireCapability('academic.structures.view.list'), determineDataScope()],
    handler: async (request: any, reply: any) => {
      const tenantId = request.dataScope?.tenantId;
      if (!tenantId) return reply.status(400).send({ success: false, message: 'Tenant ID is required' });
      const data = await organizationalService.listPositions(String(tenantId));
      return { success: true, data };
    },
  });

  fastify.post('/organizational-positions', {
    preHandler: [requireCapability('academic.structures.create'), determineDataScope()],
    handler: async (request: any, reply: any) => {
      const tenantId = request.dataScope?.tenantId;
      if (!tenantId) return reply.status(400).send({ success: false, message: 'Tenant ID is required' });
      try {
        const created = await organizationalService.createPosition(String(tenantId), request.body || {});
        return { success: true, data: created };
      } catch (e: any) {
        return reply.status(400).send({ success: false, message: e?.message || 'Bad Request' });
      }
    },
  });

  fastify.put('/organizational-positions/:id', {
    preHandler: [requireCapability('academic.structures.update'), determineDataScope()],
    handler: async (request: any, reply: any) => {
      const tenantId = request.dataScope?.tenantId;
      if (!tenantId) return reply.status(400).send({ success: false, message: 'Tenant ID is required' });

      const id = String(request.params?.id || '').trim();
      try {
        const updated = await organizationalService.updatePosition(String(tenantId), id, request.body || {});
        return { success: true, data: updated };
      } catch (e: any) {
        const msg = e?.message || 'Bad Request';
        const code = msg === 'Position not found' ? 404 : 400;
        return reply.status(code).send({ success: false, message: msg });
      }
    },
  });

  fastify.delete('/organizational-positions/:id', {
    preHandler: [requireCapability('academic.structures.delete'), determineDataScope()],
    handler: async (request: any, reply: any) => {
      const tenantId = request.dataScope?.tenantId;
      if (!tenantId) return reply.status(400).send({ success: false, message: 'Tenant ID is required' });

      const id = String(request.params?.id || '').trim();
      try {
        await organizationalService.deletePosition(String(tenantId), id);
        return { success: true };
      } catch (e: any) {
        const msg = e?.message || 'Bad Request';
        const code = msg === 'Position not found' ? 404 : 400;
        return reply.status(code).send({ success: false, message: msg });
      }
    },
  });

  fastify.put('/organizational-positions/:id/capabilities', {
    preHandler: [requireCapability('academic.structures.update'), determineDataScope()],
    handler: async (request: any, reply: any) => {
      const tenantId = request.dataScope?.tenantId;
      if (!tenantId) return reply.status(400).send({ success: false, message: 'Tenant ID is required' });

      const positionId = String(request.params?.id || '').trim();
      try {
        const final = await organizationalService.updatePositionCapabilities(
          String(tenantId),
          positionId,
          (request.body || {}).capabilities
        );
        return { success: true, data: final };
      } catch (e: any) {
        const msg = e?.message || 'Bad Request';
        const code = msg === 'Position not found' ? 404 : 400;
        return reply.status(code).send({ success: false, message: msg });
      }
    },
  });

  fastify.post('/organizational-assignments', {
    preHandler: [requireCapability('academic.structures.update'), determineDataScope()],
    handler: async (request: any, reply: any) => {
      const tenantId = request.dataScope?.tenantId;
      if (!tenantId) return reply.status(400).send({ success: false, message: 'Tenant ID is required' });
      try {
        const data = await organizationalService.createOrUpdateAssignment(String(tenantId), request.body || {});
        return { success: true, data };
      } catch (e: any) {
        const msg = e?.message || 'Bad Request';
        const code = msg === 'Position not found' || msg === 'User not found' ? 404 : 400;
        return reply.status(code).send({ success: false, message: msg });
      }
    },
  });

  fastify.delete('/organizational-assignments/:id', {
    preHandler: [requireCapability('academic.structures.update'), determineDataScope()],
    handler: async (request: any, reply: any) => {
      const tenantId = request.dataScope?.tenantId;
      if (!tenantId) return reply.status(400).send({ success: false, message: 'Tenant ID is required' });

      const id = String(request.params?.id || '').trim();
      try {
        await organizationalService.deleteAssignment(String(tenantId), id);
        return { success: true };
      } catch (e: any) {
        const msg = e?.message || 'Bad Request';
        const code = msg === 'Assignment not found' ? 404 : 400;
        return reply.status(code).send({ success: false, message: msg });
      }
    },
  });
}
