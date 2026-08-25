import { programKeahlianController } from '../controllers/program-keahlian.controller';
import { determineDataScope } from '@/middlewares/dataScope';
import { requireCapability } from '@/middlewares/requireCapability';

export default async function programKeahlianRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [requireCapability('academic.programs.view'), determineDataScope()]
  }, programKeahlianController.getAll);

  fastify.get('/:id', {
    preHandler: [requireCapability('academic.programs.view'), determineDataScope()]
  }, programKeahlianController.getById);

  fastify.post('/', {
    preHandler: [requireCapability('academic.programs.manage'), determineDataScope()]
  }, programKeahlianController.create);

  fastify.put('/:id', {
    preHandler: [requireCapability('academic.programs.manage'), determineDataScope()]
  }, programKeahlianController.update);

  fastify.delete('/:id', {
    preHandler: [requireCapability('academic.programs.manage'), determineDataScope()]
  }, programKeahlianController.remove);
}
