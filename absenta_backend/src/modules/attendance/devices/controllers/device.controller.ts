import { deviceService } from '../services/device.service';
import { createDeviceSchema, updateDeviceSchema, heartbeatSchema, deviceTapSchema } from '../services/device.schema';
import { appLogger } from '@/utils/app-logger';

export const deviceController = {
  async getDevices(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id || request.dataScope?.tenantId;
      const { page, limit, search } = request.query as any;
      
      const result = await deviceService.getDevices(
        tenantId,
        parseInt(page) || 1,
        parseInt(limit) || 10,
        search || ''
      );
      
      return reply.status(200).send({ success: true, message: 'Daftar perangkat berhasil dimuat', ...result });
    } catch (e: any) {
      appLogger.error({ err: e }, 'Error getting devices');
      return reply.status(500).send({ success: false, message: e.message || 'Internal server error' });
    }
  },

  async getDeviceDetail(request: any, reply: any) {
    const tenantId = request.tenantId || request.user?.tenant_id || request.dataScope?.tenantId;
    const { id } = request.params as any;
    
    try {
      const data = await deviceService.getDeviceDetail(id, tenantId);
      return reply.status(200).send({ success: true, message: 'Detail perangkat ditemukan', data });
    } catch (e: any) {
      appLogger.warn({ err: e, id }, 'Device detail not found');
      return reply.status(404).send({ success: false, message: e.message });
    }
  },

  async createDevice(request: any, reply: any) {
    const tenantId = request.tenantId || request.user?.tenant_id || request.dataScope?.tenantId;
    
    try {
      const parsedBody = createDeviceSchema.parse(request.body);
      const result = await deviceService.createDevice(tenantId, parsedBody);
      appLogger.info({ device_id: result.device_id, tenantId }, 'Device created');
      return reply.status(201).send({ success: true, data: result, message: 'Perangkat berhasil didaftarkan' });
    } catch (e: any) {
      appLogger.error({ err: e }, 'Create device failed');
      return reply.status(400).send({ success: false, message: e.message });
    }
  },

  async updateDevice(request: any, reply: any) {
    const tenantId = request.tenantId || request.user?.tenant_id || request.dataScope?.tenantId;
    const { id } = request.params as any;
    
    try {
      const parsedBody = updateDeviceSchema.parse(request.body);
      const result = await deviceService.updateDevice(id, tenantId, parsedBody);
      return reply.status(200).send({ success: true, data: result, message: 'Data perangkat berhasil diperbarui' });
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },

  async deleteDevice(request: any, reply: any) {
    const tenantId = request.tenantId || request.user?.tenant_id || request.dataScope?.tenantId;
    const { id } = request.params as any;
    
    try {
      await deviceService.deleteDevice(id, tenantId);
      return reply.status(200).send({ success: true, message: 'Perangkat berhasil dihapus' });
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },

  async heartbeat(request: any, reply: any) {
    try {
      const parsedBody = heartbeatSchema.parse(request.body);
      const { device_id, battery, version } = parsedBody;
      const result = await deviceService.heartbeat(device_id, { battery, version });
      return reply.status(200).send({ success: true, message: 'Heartbeat recorded', data: result });
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },

  async tap(request: any, reply: any) {
    try {
      const parsedBody = deviceTapSchema.parse(request.body);
      const { device_id, rfid, battery, version } = parsedBody;
      const result = await deviceService.tap(device_id, { rfid, battery, version });
      return reply.status(200).send({ success: true, message: 'Tap recorded successfully', data: result });
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  },
};
