import { CbtPublicController } from '../controllers/cbt-public.controller';

export async function publicCbtRoutes(fastify: any) {
  const publicConfig = {
    skipAuth: true,
    public: true,
    rateLimit: {
      max: 180,
      timeWindow: '1 minute',
    },
  };

  // Route dengan parameter explicit :tenantSlug
  fastify.get('/:tenantSlug/matriks-soal', { config: publicConfig }, CbtPublicController.getPublicMatrix);
  fastify.post('/:tenantSlug/nudge', { config: publicConfig }, CbtPublicController.recordPublicNudge);

  // Route berbasis Host / Domain Header / Default
  fastify.get('/matriks-soal', { config: publicConfig }, CbtPublicController.getPublicMatrix);
  fastify.post('/nudge', { config: publicConfig }, CbtPublicController.recordPublicNudge);
}
