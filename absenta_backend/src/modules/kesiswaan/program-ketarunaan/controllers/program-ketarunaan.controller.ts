import { programKetarunaanService } from '../services/program-ketarunaan.service';
import { DataScope } from '../../../../types/fastify';

export const programKetarunaanController = {
  async getGuardStatus(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const data = await programKetarunaanService.getGuardStatus(scope.tenantId);
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async getSesiHariIni(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const data = await programKetarunaanService.getSesiHariIni(scope.tenantId, request.query);
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async getPendamping(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const res = await programKetarunaanService.getPendamping(scope.tenantId, request.query || {});
      return reply.send({ success: true, ...res });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async tapPendamping(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const res = await programKetarunaanService.tapPendamping(scope.tenantId, request.body);
      return reply.send(res);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async getStats(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const data = await programKetarunaanService.getStats(scope.tenantId, request.query);
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async getLaporanTim(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const data = await programKetarunaanService.getLaporanTim(scope.tenantId, request.query || {});
      return reply.send({ success: true, ...data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async getLaporanKelas(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const data = await programKetarunaanService.getLaporanKelas(scope.tenantId, request.query || {});
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },
};
