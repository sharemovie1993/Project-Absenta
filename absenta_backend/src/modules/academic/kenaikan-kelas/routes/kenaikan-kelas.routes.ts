import { kenaikanKelasController } from '../controllers/kenaikan-kelas.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '../../../../middlewares/dataScope';

export default async function kenaikanKelasRoutes(fastify: any) {
  fastify.post(
    '/preview',
    {
      preHandler: [
        requireCapability('academic.promotions.manage'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return kenaikanKelasController.preview(request, reply);
    }
  );

  fastify.post(
    '/run',
    {
      preHandler: [
        requireCapability('academic.promotions.manage'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return kenaikanKelasController.run(request, reply);
    }
  );
}
