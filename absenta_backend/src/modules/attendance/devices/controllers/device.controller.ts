import { deviceService } from '../services/device.service';

export const deviceController = {
  async getDevices(request: any) {
    const { tenant_id } = request.user;
    const { page, limit, search } = request.query as any;
    
    const result = await deviceService.getDevices(
      tenant_id,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      search || ''
    );
    
    return { success: true, ...result };
  },

  async getDeviceDetail(request: any, reply: any) {
    const { tenant_id } = request.user;
    const { id } = request.params as any;
    
    try {
      const data = await deviceService.getDeviceDetail(id, tenant_id);
      return { success: true, data };
    } catch (e: any) {
      return reply.status(404).send({ success: false, message: e.message });
    }
  },

  async createDevice(request: any, reply: any) {
    const { tenant_id } = request.user;
    const data = request.body as any;
    
    try {
      const result = await deviceService.createDevice(tenant_id, data);
      return { success: true, data: result, message: 'Perangkat berhasil didaftarkan' };
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },

  async updateDevice(request: any, reply: any) {
    const { tenant_id } = request.user;
    const { id } = request.params as any;
    const data = request.body as any;
    
    try {
      const result = await deviceService.updateDevice(id, tenant_id, data);
      return { success: true, data: result, message: 'Data perangkat berhasil diperbarui' };
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },

  async deleteDevice(request: any, reply: any) {
    const { tenant_id } = request.user;
    const { id } = request.params as any;
    
    try {
      await deviceService.deleteDevice(id, tenant_id);
      return { success: true, message: 'Perangkat berhasil dihapus' };
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },

  async heartbeat(request: any, reply: any) {
    const { device_id, battery, version } = request.body as any;
    
    if (!device_id) {
      return reply.status(400).send({ success: false, message: 'device_id is required' });
    }

    try {
      const result = await deviceService.heartbeat(device_id, { battery, version });
      return { success: true, data: result };
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },

  async tap(request: any, reply: any) {
    const { device_id, rfid, battery, version } = request.body as any;
    
    if (!device_id) {
      return reply.status(400).send({ success: false, message: 'device_id is required' });
    }

    try {
      const result = await deviceService.tap(device_id, { rfid, battery, version });
      return { success: true, ...result };
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },
};
