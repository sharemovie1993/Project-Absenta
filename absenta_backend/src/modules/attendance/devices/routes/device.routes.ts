import { deviceController } from '../controllers/device.controller';

export const deviceRoutes = async (fastify: any) => {
  // Device Management (Admin/Staff only)
  fastify.get('/', deviceController.getDevices);
  fastify.get('/:id', deviceController.getDeviceDetail);
  fastify.post('/', deviceController.createDevice);
  fastify.put('/:id', deviceController.updateDevice);
  fastify.delete('/:id', deviceController.deleteDevice);

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
