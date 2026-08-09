import { sekolahController } from '../controllers/sekolah.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function sekolahRoutes(fastify: any) {
  // Authentication and tenant middleware are registered at plugin level in main.ts

  fastify.get('/lookup-npsn/:npsn', {
    preHandler: [determineDataScope()],
    schema: {
      params: {
        type: 'object',
        required: ['npsn'],
        properties: {
          npsn: { type: 'string', pattern: '^\\d{8}$' },
        },
      },
    },
    config: {
      skipAuth: true,
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
    handler: sekolahController.lookupNpsn.bind(sekolahController),
  });

  fastify.get('/me', {
    preHandler: [
      async (request: any, reply: any) => {
        const role = request.user?.roleName || request.user?.role?.name;
        if (role === 'SISWA' || role === 'GURU') {
          return;
        }
        await requireCapability('core.sekolah.view.profile')(request, reply);
      },
      determineDataScope(),
  ],
    handler: sekolahController.getCurrent.bind(sekolahController),
  });

  fastify.post('/', {
    preHandler: [requireCapability('core.sekolah.update.profile'), determineDataScope()],
    handler: sekolahController.create.bind(sekolahController),
  });

  fastify.put('/me', {
    preHandler: [determineDataScope()],
    handler: sekolahController.update.bind(sekolahController),
  });

  fastify.put('/', {
    preHandler: [determineDataScope()],
    handler: sekolahController.update.bind(sekolahController),
  });
}
