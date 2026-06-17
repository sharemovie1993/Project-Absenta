import { HubinController } from '../controllers/hubin.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';

export async function hubinRoutes(fastify: any) {
  const controller = new HubinController();

  // --- MITRA ---
  fastify.get('/mitra', { preHandler: [requireCapability(['hubin.partners.manage', 'hubin.guidance.manage', 'hubin.pkl.view.list']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getMitra(req, reply));
  fastify.post('/mitra', { preHandler: [requireCapability('hubin.partners.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.createMitra(req, reply));
  fastify.put('/mitra/:id', { preHandler: [requireCapability(['hubin.partners.manage', 'hubin.guidance.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updateMitra(req, reply));
  fastify.delete('/mitra/:id', { preHandler: [requireCapability('hubin.partners.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.deleteMitra(req, reply));

  // --- PENEMPATAN ---
  fastify.get('/penempatan', { preHandler: [requireCapability('hubin.pkl.view.list'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getPenempatan(req, reply));
  fastify.get('/penempatan/me', { preHandler: [requireCapability('hubin.view.pkl'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getMyPenempatan(req, reply));
  fastify.post('/penempatan', { preHandler: [requireCapability('hubin.partners.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.createPenempatan(req, reply));
  fastify.put('/penempatan/:id/nilai', { preHandler: [requireCapability(['hubin.partners.manage', 'hubin.guidance.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updatePenilaian(req, reply));
  fastify.post('/penempatan/:id/kunjungan', { preHandler: [requireCapability(['hubin.partners.manage', 'hubin.guidance.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.addKunjungan(req, reply));
  fastify.delete('/penempatan/:id', { preHandler: [requireCapability('hubin.partners.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.deletePenempatan(req, reply));

  // --- ABSENSI ---
  fastify.get('/absensi/:siswaPklId', { preHandler: [requireCapability('hubin.view.pkl'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getAbsensiSiswa(req, reply));
  fastify.post('/absensi/check-in', { preHandler: [requireCapability('hubin.view.pkl'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.checkIn(req, reply));
  fastify.post('/absensi/check-out', { preHandler: [requireCapability('hubin.view.pkl'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.checkOut(req, reply));
  fastify.put('/absensi/:siswaPklId/logbook', { preHandler: [requireCapability(['hubin.view.pkl', 'hubin.logbook.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updateLogbook(req, reply));
  fastify.put('/absensi/:id/verify', { preHandler: [requireCapability(['hubin.partners.manage', 'hubin.absensi.verify']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.verifyAbsensi(req, reply));

  // --- JURNAL & PORTOFOLIO PKL ---
  fastify.post('/penempatan/:id/jurnal-akhir', { preHandler: [requireCapability('hubin.view.pkl'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.submitJurnalPortofolio(req, reply));
  fastify.put('/penempatan/:id/jurnal-akhir/review', { preHandler: [requireCapability(['hubin.partners.manage', 'hubin.guidance.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.reviewJurnalPortofolio(req, reply));

  // --- SETTINGS & GOOGLE DRIVE UPLOAD ---
  fastify.get('/settings', { preHandler: [requireCapability('hubin.partners.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getSettings(req, reply));
  fastify.put('/settings', { preHandler: [requireCapability('hubin.partners.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updateSettings(req, reply));
  fastify.post('/upload', { preHandler: [requireCapability('hubin.view.pkl'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.uploadPklPhoto(req, reply));
  fastify.delete('/upload', { preHandler: [requireCapability('hubin.view.pkl'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.deletePklPhoto(req, reply));
}
