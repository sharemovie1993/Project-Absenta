import { transitionController } from '../controllers/transition.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '../../../../middlewares/dataScope';

export default async function transitionRoutes(fastify: any) {
  fastify.post(
    '/preview',
    {
      preHandler: [
        requireCapability('academic.transitions.manage'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return transitionController.preview(request, reply);
    }
  );

  fastify.post(
    '/execute',
    {
      preHandler: [
        requireCapability('academic.transitions.manage'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return transitionController.execute(request, reply);
    }
  );
}
