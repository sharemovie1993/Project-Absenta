import fp from 'fastify-plugin';

export const serviceFeatureGuard = fp(async (fastify: any) => {
  fastify.addHook('preHandler', async (_request: any, _reply: any) => {
    // [DISABLED] SaaS Feature Entitlement Guard dinonaktifkan sepenuhnya
    return;
  });
});


