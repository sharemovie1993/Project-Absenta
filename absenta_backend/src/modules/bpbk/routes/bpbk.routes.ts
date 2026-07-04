import { BpbkController } from '../controllers/bpbk.controller';
import { BullyingReportController } from '../controllers/bullying-report.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware, elevatedScopeMiddleware } from '@/middlewares/organizationalScope';

export async function bpbkRoutes(fastify: any) {
  // === Dashboard BK Stats ===
  fastify.get('/dashboard-stats', {
    preHandler: [
      requireCapability('bk.cases.view.list'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getDashboardStats);

  // === Kasus BK (Parent Entity) ===
  fastify.post('/cases', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      elevatedScopeMiddleware
    ]
  }, BpbkController.createKasusBK);

  fastify.put('/cases/:id', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.updateKasusBK);

  fastify.delete('/cases/:id', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.deleteKasusBK);

  fastify.post('/cases/:id/close', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.closeKasusBK);

  fastify.post('/cases/:id/reopen', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.reopenKasusBK);

  fastify.post('/cases/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.restoreKasusBK);

  fastify.get('/cases/:id', {
    preHandler: [
      requireCapability('bk.cases.view.detail'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getKasusBKById);

  fastify.get('/cases', {
    preHandler: [
      requireCapability('bk.cases.view.list'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getAllKasusBK);

  // === Catatan Konseling Siswa ===
  fastify.post('/konseling', {
    preHandler: [
      requireCapability('bk.counseling.manage'),
      elevatedScopeMiddleware
    ]
  }, BpbkController.createKonseling);

  fastify.put('/konseling/:id', {
    preHandler: [
      requireCapability('bk.counseling.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.updateKonseling);

  fastify.delete('/konseling/:id', {
    preHandler: [
      requireCapability('bk.counseling.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.deleteKonseling);

  fastify.post('/konseling/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.restoreKonseling);

  fastify.get('/konseling', {
    preHandler: [
      requireCapability('bk.counseling.view.list'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getAllKonseling);

  // === Pemanggilan Orang Tua ===
  fastify.post('/pemanggilan', {
    preHandler: [
      requireCapability('bk.summons.manage'),
      elevatedScopeMiddleware
    ]
  }, BpbkController.createPemanggilan);

  fastify.put('/pemanggilan/:id', {
    preHandler: [
      requireCapability('bk.summons.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.updatePemanggilan);

  fastify.post('/pemanggilan/:id/send-whatsapp-parent', {
    preHandler: [
      requireCapability('bk.summons.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.sendWhatsAppParent);

  fastify.delete('/pemanggilan/:id', {
    preHandler: [
      requireCapability('bk.summons.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.deletePemanggilan);

  fastify.post('/pemanggilan/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.restorePemanggilan);

  fastify.get('/pemanggilan', {
    preHandler: [
      requireCapability('bk.summons.view.list'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getAllPemanggilan);

  // === Home Visit ===
  fastify.post('/home-visit', {
    preHandler: [
      requireCapability('bk.homevisit.manage'),
      elevatedScopeMiddleware
    ]
  }, BpbkController.createHomeVisit);

  fastify.put('/home-visit/:id', {
    preHandler: [
      requireCapability('bk.homevisit.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.updateHomeVisit);

  fastify.delete('/home-visit/:id', {
    preHandler: [
      requireCapability('bk.homevisit.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.deleteHomeVisit);

  fastify.post('/home-visit/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.restoreHomeVisit);

  fastify.get('/home-visit', {
    preHandler: [
      requireCapability('bk.homevisit.view.list'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getAllHomeVisits);

  // === Asesmen Siswa ===
  fastify.post('/asesmen', {
    preHandler: [
      requireCapability('bk.assessment.manage'),
      elevatedScopeMiddleware
    ]
  }, BpbkController.createAsesmen);

  fastify.put('/asesmen/:id', {
    preHandler: [
      requireCapability('bk.assessment.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.updateAsesmen);

  fastify.delete('/asesmen/:id', {
    preHandler: [
      requireCapability('bk.assessment.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.deleteAsesmen);

  fastify.post('/asesmen/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.restoreAsesmen);

  fastify.get('/asesmen', {
    preHandler: [
      requireCapability('bk.assessment.view.list'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getAllAsesmen);

  // === Rujukan Kasus ===
  fastify.post('/rujukan', {
    preHandler: [
      requireCapability('bk.referrals.manage'),
      elevatedScopeMiddleware
    ]
  }, BpbkController.createRujukan);

  fastify.put('/rujukan/:id', {
    preHandler: [
      requireCapability('bk.referrals.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.updateRujukan);

  fastify.delete('/rujukan/:id', {
    preHandler: [
      requireCapability('bk.referrals.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.deleteRujukan);

  fastify.post('/rujukan/:id/restore', {
    preHandler: [
      requireCapability('bk.recyclebin.restore'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.restoreRujukan);

  fastify.get('/rujukan', {
    preHandler: [
      requireCapability('bk.referrals.view.list'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getAllRujukan);

  // === Reporting and Analytics ===
  fastify.get('/reports', {
    preHandler: [
      requireCapability('bk.reports.view'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getReports);

  fastify.get('/reports/student-risk-trend/:siswaId', {
    preHandler: [
      requireCapability('bk.reports.view'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getStudentRiskTrend);

  fastify.get('/reports/walikelas', {
    preHandler: [
      requireCapability('bk.cases.view.list'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getWaliKelasReports);
  fastify.get('/audit-logs', {
    preHandler: [
      requireCapability('bk.audit.view'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getAuditLogs);

  // === Kalender BK & Kustomisasi EWS ===
  fastify.get('/calendar', {
    preHandler: [
      requireCapability('bk.cases.view.list'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getCalendarEvents);

  fastify.get('/ews/weights', {
    preHandler: [
      requireCapability('bk.cases.view.list'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.getEwsWeights);

  fastify.post('/ews/weights', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware
    ]
  }, BpbkController.updateEwsWeights);

  // === Anonymous Bullying Reporting (Whistleblowing) ===
  fastify.post('/bullying-reports', BullyingReportController.createReport);

  fastify.get('/bullying-reports', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware
    ]
  }, BullyingReportController.getReports);

  fastify.put('/bullying-reports/:id/status', {
    preHandler: [
      requireCapability('bk.cases.manage'),
      organizationalScopeMiddleware
    ]
  }, BullyingReportController.updateStatus);
}

