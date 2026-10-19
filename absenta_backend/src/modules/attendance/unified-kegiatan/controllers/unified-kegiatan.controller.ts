import { unifiedKegiatanService } from '../services/unified-kegiatan.service';
import { DataScope } from '../../../../types/fastify';

export const unifiedKegiatanController = {
  async getGuardStatus(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const jenis = (request.query as any)?.jenis_kegiatan || 'KETARUNAAN';
      const data = await unifiedKegiatanService.getGuardStatus(scope.tenantId, jenis);
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

      const data = await unifiedKegiatanService.getSesiHariIni(scope.tenantId, request.query);
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

      const res = await unifiedKegiatanService.getPendamping(scope.tenantId, request.query || {});
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

      const res = await unifiedKegiatanService.tapPendamping(scope.tenantId, request.body);
      return reply.send(res);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async tapPendampingRfid(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const res = await unifiedKegiatanService.tapPendampingByRfid(scope.tenantId, request.body);
      return reply.send(res);
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async getStats(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const data = await unifiedKegiatanService.getStats(scope.tenantId, request.query);
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

      const data = await unifiedKegiatanService.getLaporanTim(scope.tenantId, request.query || {});
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

      const data = await unifiedKegiatanService.getLaporanKelas(scope.tenantId, request.query || {});
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },
};
