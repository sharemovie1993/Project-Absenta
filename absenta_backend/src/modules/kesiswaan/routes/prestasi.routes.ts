import { PrestasiController } from '../controllers/prestasi.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware, elevatedScopeMiddleware } from '../../../middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';

export async function prestasiRoutes(fastify: any) {
  // === Kategori Jenis Prestasi ===
  fastify.post('/jenis-prestasi', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      elevatedScopeMiddleware,
      determineDataScope(),
  ]
  }, PrestasiController.createJenisPrestasi);

  fastify.put('/jenis-prestasi/:id', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, PrestasiController.updateJenisPrestasi);

  fastify.delete('/jenis-prestasi/:id', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, PrestasiController.deleteJenisPrestasi);

  fastify.get('/jenis-prestasi', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.view'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, PrestasiController.getAllJenisPrestasi);

  fastify.post('/jenis-prestasi/seed', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      elevatedScopeMiddleware,
      determineDataScope(),
  ]
  }, PrestasiController.seedDefaults);

  // === Catatan Prestasi Siswa ===
  fastify.post('/prestasi', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      elevatedScopeMiddleware,
      determineDataScope(),
  ]
  }, PrestasiController.createPrestasiSiswa);

  fastify.put('/prestasi/:id', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, PrestasiController.updatePrestasiSiswa);

  fastify.delete('/prestasi/:id', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.manage'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, PrestasiController.deletePrestasiSiswa);
  fastify.get('/prestasi', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.view'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, PrestasiController.getAllPrestasiSiswa);

  fastify.get('/prestasi/leaderboard', {
    preHandler: [
      requireCapability('kesiswaan.prestasi.view'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, PrestasiController.getLeaderboard);
}
