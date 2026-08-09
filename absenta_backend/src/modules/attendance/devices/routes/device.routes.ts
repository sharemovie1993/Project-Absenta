import { deviceController } from '../controllers/device.controller';
import { determineDataScope } from '@/middlewares/dataScope';

export const deviceRoutes = async (fastify: any) => {
  // Device Management (Admin/Staff only)
  fastify.get('/', {
    preHandler: [determineDataScope()]
  }, deviceController.getDevices);
  fastify.get('/:id', {
    preHandler: [determineDataScope()]
  }, deviceController.getDeviceDetail);
  fastify.post('/', {
    preHandler: [determineDataScope()]
  }, deviceController.createDevice);
  fastify.put('/:id', {
    preHandler: [determineDataScope()]
  }, deviceController.updateDevice);
  fastify.delete('/:id', {
    preHandler: [determineDataScope()]
  }, deviceController.deleteDevice);

  // Heartbeat (IoT/Hardware) - Possibly unsecured or secured with Device Token
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
