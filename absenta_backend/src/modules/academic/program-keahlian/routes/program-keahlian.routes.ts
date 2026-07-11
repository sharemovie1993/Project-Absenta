import { programKeahlianController } from '../controllers/program-keahlian.controller';

export default async function programKeahlianRoutes(fastify: any) {
  fastify.get('/', programKeahlianController.getAll);
  fastify.get('/:id', programKeahlianController.getById);
  fastify.post('/', programKeahlianController.create);
  fastify.put('/:id', programKeahlianController.update);
  fastify.delete('/:id', programKeahlianController.remove);
}
