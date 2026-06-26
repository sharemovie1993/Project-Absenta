import { HubinController } from '../controllers/hubin.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';

export async function hubinRoutes(fastify: any) {
  const controller = new HubinController();

  // --- MITRA ---
  fastify.get('/mitra', { preHandler: [requireCapability(['hubin.partners.manage', 'hubin.guidance.manage', 'hubin.pkl.view.list', 'hubin.mou.view.list']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getMitra(req, reply));
  fastify.post('/mitra', { preHandler: [requireCapability('hubin.partners.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.createMitra(req, reply));
  fastify.put('/mitra/:id', { preHandler: [requireCapability(['hubin.partners.manage', 'hubin.guidance.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updateMitra(req, reply));
  fastify.delete('/mitra/:id', { preHandler: [requireCapability('hubin.partners.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.deleteMitra(req, reply));

  // --- PENEMPATAN ---
  fastify.get('/penempatan', { preHandler: [requireCapability('hubin.pkl.view.list'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getPenempatan(req, reply));
  fastify.get('/penempatan/me', { preHandler: [requireCapability('hubin.self.pkl'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getMyPenempatan(req, reply));
  fastify.post('/penempatan', { preHandler: [requireCapability('hubin.pkl.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.createPenempatan(req, reply));
  fastify.post('/penempatan/bulk', { preHandler: [requireCapability('hubin.pkl.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.bulkCreatePenempatan(req, reply));
  fastify.put('/penempatan/:id', { preHandler: [requireCapability('hubin.pkl.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updatePenempatan(req, reply));
  fastify.put('/penempatan/:id/nilai', { preHandler: [requireCapability(['hubin.pkl.manage', 'hubin.guidance.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updatePenilaian(req, reply));
  fastify.post('/penempatan/:id/kunjungan', { preHandler: [requireCapability(['hubin.pkl.manage', 'hubin.guidance.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.addKunjungan(req, reply));
  fastify.delete('/penempatan/:id', { preHandler: [requireCapability('hubin.pkl.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.deletePenempatan(req, reply));

  // --- ABSENSI ---
  fastify.get('/absensi/:siswaPklId', { preHandler: [requireCapability(['hubin.self.pkl', 'hubin.absensi.view.history', 'hubin.pkl.view.list']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getAbsensiSiswa(req, reply));
  fastify.post('/absensi/check-in', { preHandler: [requireCapability('hubin.self.pkl'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.checkIn(req, reply));
  fastify.post('/absensi/check-out', { preHandler: [requireCapability('hubin.self.pkl'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.checkOut(req, reply));
  fastify.put('/absensi/:siswaPklId/logbook', { preHandler: [requireCapability(['hubin.self.logbook', 'hubin.logbook.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updateLogbook(req, reply));
  fastify.put('/absensi/:id/verify', { preHandler: [requireCapability('hubin.absensi.verify'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.verifyAbsensi(req, reply));

  // --- JURNAL & PORTOFOLIO PKL ---
  fastify.post('/penempatan/:id/jurnal-akhir', { preHandler: [requireCapability('hubin.self.pkl'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.submitJurnalPortofolio(req, reply));
  fastify.put('/penempatan/:id/jurnal-akhir/review', { preHandler: [requireCapability(['hubin.pkl.manage', 'hubin.guidance.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.reviewJurnalPortofolio(req, reply));

  // --- SETTINGS & GOOGLE DRIVE UPLOAD ---
  fastify.get('/settings', { preHandler: [requireCapability('hubin.partners.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getSettings(req, reply));
  fastify.put('/settings', { preHandler: [requireCapability('hubin.partners.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updateSettings(req, reply));
  fastify.post('/upload', { preHandler: [requireCapability(['hubin.self.pkl', 'hubin.pkl.manage', 'hubin.guidance.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.uploadPklPhoto(req, reply));
  fastify.delete('/upload', { preHandler: [requireCapability(['hubin.self.pkl', 'hubin.pkl.manage', 'hubin.guidance.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.deletePklPhoto(req, reply));

  // --- MOU HISTORY ---
  fastify.get('/mitra/:mitraId/mou', { preHandler: [requireCapability(['hubin.mou.view.list', 'hubin.partners.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getMoUHistory(req, reply));
  fastify.post('/mitra/:mitraId/mou', { preHandler: [requireCapability('hubin.mou.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.createMoUHistory(req, reply));
  fastify.delete('/mou/:id', { preHandler: [requireCapability('hubin.mou.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.deleteMoUHistory(req, reply));

  // --- BKK LOWONGAN ---
  fastify.get('/bkk/lowongan', { preHandler: [requireCapability(['hubin.bkk.manage', 'hubin.self.bkk', 'hubin.pkl.view.list', 'hubin.partners.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getLowongan(req, reply));
  fastify.post('/bkk/lowongan', { preHandler: [requireCapability('hubin.bkk.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.createLowongan(req, reply));
  fastify.put('/bkk/lowongan/:id', { preHandler: [requireCapability('hubin.bkk.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updateLowongan(req, reply));
  fastify.delete('/bkk/lowongan/:id', { preHandler: [requireCapability('hubin.bkk.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.deleteLowongan(req, reply));

  // --- BKK LAMARAN ---
  fastify.get('/bkk/lamaran', { preHandler: [requireCapability(['hubin.lamaran.manage', 'hubin.self.bkk', 'hubin.partners.manage']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getLamaran(req, reply));
  fastify.post('/bkk/lamaran', { preHandler: [requireCapability('hubin.self.bkk'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.createLamaran(req, reply));
  fastify.put('/bkk/lamaran/:id/status', { preHandler: [requireCapability('hubin.lamaran.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updateLamaranStatus(req, reply));
  fastify.post('/bkk/lamaran/:id/interview', { preHandler: [requireCapability('hubin.lamaran.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.scheduleInterview(req, reply));
  fastify.get('/bkk/lamaran/:id/timeline', { preHandler: [requireCapability(['hubin.lamaran.manage', 'hubin.self.bkk']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getLamaranTimeline(req, reply));
  fastify.delete('/bkk/lamaran/:id', { preHandler: [requireCapability('hubin.lamaran.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.deleteLamaran(req, reply));

  // --- TRACER STUDY ---
  fastify.get('/tracer', { preHandler: [requireCapability(['hubin.tracer.view', 'hubin.partners.manage', 'hubin.pkl.view.list', 'hubin.self.tracer']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getTracerStudy(req, reply));
  fastify.post('/tracer', { preHandler: [requireCapability('hubin.self.tracer'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.submitTracerStudy(req, reply));
  fastify.get('/tracer/stats', { preHandler: [requireCapability(['hubin.tracer.view', 'hubin.partners.manage', 'hubin.pkl.view.list']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getTracerStats(req, reply));

  // --- TEFA ---
  fastify.get('/tefa', { preHandler: [requireCapability(['hubin.tefa.manage', 'hubin.partners.manage', 'hubin.pkl.view.list']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getTefaOrders(req, reply));
  fastify.post('/tefa', { preHandler: [requireCapability('hubin.tefa.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.createTefaOrder(req, reply));
  fastify.put('/tefa/:id', { preHandler: [requireCapability('hubin.tefa.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.updateTefaOrder(req, reply));
  fastify.delete('/tefa/:id', { preHandler: [requireCapability('hubin.tefa.manage'), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.deleteTefaOrder(req, reply));

  // --- UMPAN AKTIVITAS ---
  fastify.get('/activity/recent', { preHandler: [requireCapability(['hubin.partners.manage', 'hubin.pkl.view.list']), organizationalScopeMiddleware] }, (req: any, reply: any) => controller.getRecentActivity(req, reply));
}
