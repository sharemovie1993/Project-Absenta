import { BpbkController } from '../controllers/bpbk.controller';
import { BullyingReportController } from '../controllers/bullying-report.controller';
import { BkKonsultasiController } from '../controllers/bk-konsultasi.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware, elevatedScopeMiddleware } from '@/middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';

export async function bpbkRoutes(fastify: any) {
  // === Dashboard BK Stats ===
  fastify.get('/dashboard-stats', {
    preHandler: [
      requireCapability('bk.cases.view.list'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getDashboardStats);

  // === Kasus BK (Parent Entity) ===
  fastify.post('/cases', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      elevatedScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.createKasusBK);

  fastify.put('/cases/:id', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.updateKasusBK);

  fastify.delete('/cases/:id', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.deleteKasusBK);

  fastify.post('/cases/:id/close', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.closeKasusBK);

  fastify.post('/cases/:id/reopen', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.reopenKasusBK);

  fastify.post('/cases/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.restoreKasusBK);

  fastify.get('/cases/:id', {
    preHandler: [
      requireCapability('bk.cases.view.detail'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getKasusBKById);

  fastify.get('/cases', {
    preHandler: [
      requireCapability('bk.cases.view.list'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getAllKasusBK);

  // === Catatan Konseling Siswa ===
  fastify.post('/konseling', {
    preHandler: [
      requireCapability('bk.counseling.manage'),
      elevatedScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.createKonseling);

  fastify.put('/konseling/:id', {
    preHandler: [
      requireCapability('bk.counseling.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.updateKonseling);

  fastify.delete('/konseling/:id', {
    preHandler: [
      requireCapability('bk.counseling.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.deleteKonseling);

  fastify.post('/konseling/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.restoreKonseling);

  fastify.get('/konseling', {
    preHandler: [
      requireCapability('bk.counseling.view.list'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getAllKonseling);

  // === Pemanggilan Orang Tua ===
  fastify.post('/pemanggilan', {
    preHandler: [
      requireCapability('bk.summons.manage'),
      elevatedScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.createPemanggilan);

  fastify.put('/pemanggilan/:id', {
    preHandler: [
      requireCapability('bk.summons.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.updatePemanggilan);

  fastify.post('/pemanggilan/:id/send-whatsapp-parent', {
    preHandler: [
      requireCapability('bk.summons.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.sendWhatsAppParent);

  fastify.delete('/pemanggilan/:id', {
    preHandler: [
      requireCapability('bk.summons.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.deletePemanggilan);

  fastify.post('/pemanggilan/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.restorePemanggilan);

  fastify.get('/pemanggilan', {
    preHandler: [
      requireCapability('bk.summons.view.list'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getAllPemanggilan);

  // === Home Visit ===
  fastify.post('/home-visit', {
    preHandler: [
      requireCapability('bk.homevisit.manage'),
      elevatedScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.createHomeVisit);

  fastify.put('/home-visit/:id', {
    preHandler: [
      requireCapability('bk.homevisit.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.updateHomeVisit);

  fastify.delete('/home-visit/:id', {
    preHandler: [
      requireCapability('bk.homevisit.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.deleteHomeVisit);

  fastify.post('/home-visit/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.restoreHomeVisit);

  fastify.get('/home-visit', {
    preHandler: [
      requireCapability('bk.homevisit.view.list'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getAllHomeVisits);

  // === Asesmen Siswa ===
  fastify.post('/asesmen', {
    preHandler: [
      requireCapability('bk.assessment.manage'),
      elevatedScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.createAsesmen);

  fastify.put('/asesmen/:id', {
    preHandler: [
      requireCapability('bk.assessment.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.updateAsesmen);

  fastify.delete('/asesmen/:id', {
    preHandler: [
      requireCapability('bk.assessment.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.deleteAsesmen);

  fastify.post('/asesmen/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.restoreAsesmen);

  fastify.get('/asesmen', {
    preHandler: [
      requireCapability('bk.assessment.view.list'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getAllAsesmen);

  // === Rujukan Kasus ===
  fastify.post('/rujukan', {
    preHandler: [
      requireCapability('bk.referrals.manage'),
      elevatedScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.createRujukan);

  fastify.put('/rujukan/:id', {
    preHandler: [
      requireCapability('bk.referrals.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.updateRujukan);

  fastify.delete('/rujukan/:id', {
    preHandler: [
      requireCapability('bk.referrals.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.deleteRujukan);

  fastify.post('/rujukan/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.restoreRujukan);

  fastify.get('/rujukan', {
    preHandler: [
      requireCapability('bk.referrals.view.list'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getAllRujukan);

  // === Reporting and Analytics ===
  fastify.get('/reports', {
    preHandler: [
      requireCapability('bk.reports.view'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getReports);

  fastify.get('/reports/student-risk-trend/:siswaId', {
    preHandler: [
      requireCapability('bk.reports.view'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getStudentRiskTrend);

  fastify.get('/reports/walikelas', {
    preHandler: [
      requireCapability('bk.cases.view.list'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getWaliKelasReports);
  fastify.get('/audit-logs', {
    preHandler: [
      requireCapability('bk.audit.view'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getAuditLogs);

  // === Kalender BK & Kustomisasi EWS ===
  fastify.get('/calendar', {
    preHandler: [
      requireCapability('bk.cases.view.list'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getCalendarEvents);

  fastify.get('/ews/weights', {
    preHandler: [
      requireCapability('bk.cases.view.list'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.getEwsWeights);

  fastify.post('/ews/weights', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BpbkController.updateEwsWeights);

  // === Anonymous Bullying Reporting (Whistleblowing) ===
  fastify.post('/bullying-reports', {
    preHandler: [determineDataScope()]
  }, BullyingReportController.createReport);

  fastify.get('/bullying-reports', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BullyingReportController.getReports);

  fastify.put('/bullying-reports/:id/status', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BullyingReportController.updateStatus);

  // === BK Consultation Bookings (Sisi Guru BK) ===
  fastify.get('/bookings', {
    preHandler: [
      requireCapability('bk.cases.view.list'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BkKonsultasiController.getAll);

  fastify.put('/bookings/:id/status', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware,
    determineDataScope(),
  ]
  }, BkKonsultasiController.updateStatus);
}

