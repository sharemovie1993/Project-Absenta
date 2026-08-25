import { deviceController } from '../controllers/device.controller';
import { determineDataScope } from '@/middlewares/dataScope';
import { requireCapability } from '@/middlewares/requireCapability';

export const deviceRoutes = async (fastify: any) => {
  // Device Management (Admin/Staff only)
  fastify.get('/', {
    preHandler: [requireCapability('attendance.devices.view'), determineDataScope()]
  }, deviceController.getDevices);

  fastify.get('/:id', {
    preHandler: [requireCapability('attendance.devices.view'), determineDataScope()]
  }, deviceController.getDeviceDetail);

  fastify.post('/', {
    preHandler: [requireCapability('attendance.devices.manage'), determineDataScope()]
  }, deviceController.createDevice);

  fastify.put('/:id', {
    preHandler: [requireCapability('attendance.devices.manage'), determineDataScope()]
  }, deviceController.updateDevice);

  fastify.delete('/:id', {
    preHandler: [requireCapability('attendance.devices.manage'), determineDataScope()]
  }, deviceController.deleteDevice);

  // Heartbeat (IoT/Hardware) - Secured via Device Identifier
  fastify.post('/heartbeat', {
    config: {
      skipAuth: true,
      public: true,
    },
    handler: deviceController.heartbeat,
  });

  fastify.post('/tap', {
    config: {
      skipAuth: true,
      public: true,
    },
    handler: deviceController.tap,
  });
};
