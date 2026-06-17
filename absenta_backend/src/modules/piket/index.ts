import { piketRoutes } from './routes/piket.routes';

export async function piketModule(fastify: any) {
  await fastify.register(piketRoutes);
}
