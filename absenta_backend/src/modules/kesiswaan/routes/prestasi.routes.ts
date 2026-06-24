import { PrestasiController } from '../controllers/prestasi.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware, elevatedScopeMiddleware } from '../../../middlewares/organizationalScope';

export async function prestasiRoutes(fastify: any) {
  // === Kategori Jenis Prestasi ===
  fastify.post('/jenis-prestasi', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      elevatedScopeMiddleware
    ]
  }, PrestasiController.createJenisPrestasi);

  fastify.put('/jenis-prestasi/:id', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      organizationalScopeMiddleware
    ]
  }, PrestasiController.updateJenisPrestasi);

  fastify.delete('/jenis-prestasi/:id', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      organizationalScopeMiddleware
    ]
  }, PrestasiController.deleteJenisPrestasi);

  fastify.get('/jenis-prestasi', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.view'),
      organizationalScopeMiddleware
    ]
  }, PrestasiController.getAllJenisPrestasi);

  // === Catatan Prestasi Siswa ===
  fastify.post('/prestasi', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      elevatedScopeMiddleware
    ]
  }, PrestasiController.createPrestasiSiswa);

  fastify.put('/prestasi/:id', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      organizationalScopeMiddleware
    ]
  }, PrestasiController.updatePrestasiSiswa);

  fastify.delete('/prestasi/:id', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      organizationalScopeMiddleware
    ]
  }, PrestasiController.deletePrestasiSiswa);

  fastify.get('/prestasi', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.view'),
      organizationalScopeMiddleware
    ]
  }, PrestasiController.getAllPrestasiSiswa);
}
