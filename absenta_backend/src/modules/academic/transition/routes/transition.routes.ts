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

  fastify.get(
    '/detect-missing-classes',
    {
      preHandler: [
        requireCapability('academic.transitions.manage'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return transitionController.detectMissingClasses(request, reply);
    }
  );

  fastify.post(
    '/create-next-grade-classes',
    {
      preHandler: [
        requireCapability('academic.transitions.manage'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return transitionController.createNextGradeClasses(request, reply);
    }
  );
}
