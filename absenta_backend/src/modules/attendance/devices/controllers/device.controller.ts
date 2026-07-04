import { deviceService } from '../services/device.service';
import { createDeviceSchema, updateDeviceSchema, heartbeatSchema, deviceTapSchema } from '../services/device.schema';

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
    
    try {
      const parsedBody = createDeviceSchema.parse(request.body);
      const result = await deviceService.createDevice(tenant_id, parsedBody);
      return { success: true, data: result, message: 'Perangkat berhasil didaftarkan' };
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },

  async updateDevice(request: any, reply: any) {
    const { tenant_id } = request.user;
    const { id } = request.params as any;
    
    try {
      const parsedBody = updateDeviceSchema.parse(request.body);
      const result = await deviceService.updateDevice(id, tenant_id, parsedBody);
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
    try {
      const parsedBody = heartbeatSchema.parse(request.body);
      const { device_id, battery, version } = parsedBody;
      const result = await deviceService.heartbeat(device_id, { battery, version });
      return { success: true, data: result };
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },

  async tap(request: any, reply: any) {
    try {
      const parsedBody = deviceTapSchema.parse(request.body);
      const { device_id, rfid, battery, version } = parsedBody;
      const result = await deviceService.tap(device_id, { rfid, battery, version });
      return { success: true, ...result };
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },
};
