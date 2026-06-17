import { StrukturKurikulumController } from '../controllers/struktur-kurikulum.controller';

export default async function strukturKurikulumRoutes(fastify: any) {
  fastify.get('/', StrukturKurikulumController.getAll);
  fastify.post('/', StrukturKurikulumController.upsert);
  fastify.delete('/:id', StrukturKurikulumController.delete);
}
