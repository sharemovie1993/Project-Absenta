import { registerInvoicePublicRoutes } from './routes/public.routes';
import { invoiceRoutes } from './routes/invoice.routes';

export default async function invoicePlugin(fastify: any) {
  // 1. Register Public Routes (idempotent)
  // Jika rute publik sudah ada, lewati pendaftaran publik saja; tetap daftar rute protected
  const hasPublic = fastify.hasRoute && fastify.hasRoute({ method: 'GET', url: '/invoice/public/:token' });
  if (!hasPublic) {
    await fastify.register(registerInvoicePublicRoutes, { prefix: '/invoice/public' });
    // Compatibility alias for environments that only proxy /api/*
    await fastify.register(registerInvoicePublicRoutes, { prefix: '/api/invoice/public' });
  } else {
    fastify.log.info('Public invoice routes already registered; skipping public registration only');
  }

  // 2. Register Protected Routes (selalu daftar)
  // Route: /api/invoice/...
  await fastify.register(async (subFastify: any) => {
    // Register the actual routes
    await subFastify.register(invoiceRoutes);
  }, { prefix: '/api/invoice' });
}
