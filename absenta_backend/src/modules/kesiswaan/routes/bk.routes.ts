import { BkController } from '../controllers/bk.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware, elevatedScopeMiddleware } from '@/middlewares/organizationalScope';

export async function bkRoutes(fastify: any) {
  // === Dashboard BK Stats ===
  fastify.get('/dashboard-stats', {
    preHandler: [
      requireCapability('affairs.violations.view.list'),
      organizationalScopeMiddleware
    ]
  }, BkController.getDashboardStats);

  // === Kategori Jenis Prestasi ===
  fastify.post('/jenis-prestasi', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      elevatedScopeMiddleware
    ]
  }, BkController.createJenisPrestasi);

  fastify.put('/jenis-prestasi/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.updateJenisPrestasi);

  fastify.delete('/jenis-prestasi/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.deleteJenisPrestasi);

  fastify.get('/jenis-prestasi', {
    preHandler: [
      requireCapability('affairs.violations.view.list'),
      organizationalScopeMiddleware
    ]
  }, BkController.getAllJenisPrestasi);

  // === Catatan Prestasi Siswa ===
  fastify.post('/prestasi', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      elevatedScopeMiddleware
    ]
  }, BkController.createPrestasiSiswa);

  fastify.put('/prestasi/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.updatePrestasiSiswa);

  fastify.delete('/prestasi/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.deletePrestasiSiswa);

  fastify.get('/prestasi', {
    preHandler: [
      requireCapability('affairs.violations.view.list'),
      organizationalScopeMiddleware
    ]
  }, BkController.getAllPrestasiSiswa);

  // === Catatan Konseling Siswa ===
  fastify.post('/konseling', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      elevatedScopeMiddleware
    ]
  }, BkController.createKonseling);

  fastify.put('/konseling/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.updateKonseling);

  fastify.delete('/konseling/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.deleteKonseling);

  fastify.get('/konseling', {
    preHandler: [
      requireCapability('affairs.violations.view.list'),
      organizationalScopeMiddleware
    ]
  }, BkController.getAllKonseling);

  // === Pemanggilan Orang Tua ===
  fastify.post('/pemanggilan', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      elevatedScopeMiddleware
    ]
  }, BkController.createPemanggilan);

  fastify.put('/pemanggilan/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.updatePemanggilan);

  fastify.delete('/pemanggilan/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.deletePemanggilan);

  fastify.get('/pemanggilan', {
    preHandler: [
      requireCapability('affairs.violations.view.list'),
      organizationalScopeMiddleware
    ]
  }, BkController.getAllPemanggilan);

  // === Home Visit ===
  fastify.post('/home-visit', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      elevatedScopeMiddleware
    ]
  }, BkController.createHomeVisit);

  fastify.put('/home-visit/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.updateHomeVisit);

  fastify.delete('/home-visit/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.deleteHomeVisit);

  fastify.get('/home-visit', {
    preHandler: [
      requireCapability('affairs.violations.view.list'),
      organizationalScopeMiddleware
    ]
  }, BkController.getAllHomeVisits);

  // === Asesmen Siswa ===
  fastify.post('/asesmen', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      elevatedScopeMiddleware
    ]
  }, BkController.createAsesmen);

  fastify.put('/asesmen/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.updateAsesmen);

  fastify.delete('/asesmen/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.deleteAsesmen);

  fastify.get('/asesmen', {
    preHandler: [
      requireCapability('affairs.violations.view.list'),
      organizationalScopeMiddleware
    ]
  }, BkController.getAllAsesmen);

  // === Rujukan Kasus ===
  fastify.post('/rujukan', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      elevatedScopeMiddleware
    ]
  }, BkController.createRujukan);

  fastify.put('/rujukan/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.updateRujukan);

  fastify.delete('/rujukan/:id', {
    preHandler: [
      requireCapability('affairs.violations.report'),
      organizationalScopeMiddleware
    ]
  }, BkController.deleteRujukan);

  fastify.get('/rujukan', {
    preHandler: [
      requireCapability('affairs.violations.view.list'),
      organizationalScopeMiddleware
    ]
  }, BkController.getAllRujukan);
}
