import { programKeahlianController } from '../controllers/program-keahlian.controller';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function programKeahlianRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [determineDataScope()]
  }, programKeahlianController.getAll);
  fastify.get('/:id', {
    preHandler: [determineDataScope()]
  }, programKeahlianController.getById);
  fastify.post('/', {
    preHandler: [determineDataScope()]
  }, programKeahlianController.create);
  fastify.put('/:id', {
    preHandler: [determineDataScope()]
  }, programKeahlianController.update);
  fastify.delete('/:id', {
    preHandler: [determineDataScope()]
  }, programKeahlianController.remove);
}
