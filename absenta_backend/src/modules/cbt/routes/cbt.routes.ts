import { CbtBankSoalController } from '../controllers/cbt-bank-soal.controller';
import { CbtJadwalController } from '../controllers/cbt-jadwal.controller';
import { CbtTestEngineController } from '../controllers/cbt-test-engine.controller';
import { CbtSettingsController } from '../controllers/cbt-settings.controller';
import { DenahSpasialController } from '../../sarpras/controllers/denah-spasial.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

const cbtGuruExempt = {
  exemptRoles: ['ADMIN', 'SUPERADMIN', 'KURIKULUM', 'GURU', 'WALIKELAS'] as any[],
};

const cbtStudentExempt = {
  exemptRoles: ['ADMIN', 'SUPERADMIN', 'SISWA'] as any[],
};

const cbtDenahViewExempt = {
  exemptRoles: ['ADMIN', 'SUPERADMIN', 'KURIKULUM', 'GURU', 'WALIKELAS', 'SISWA'] as any[],
};

export async function cbtRoutes(fastify: any) {
  // ==========================================
  // 1. BANK SOAL ROUTES
  // ==========================================
  fastify.get('/bank-soal', {
    preHandler: [requireCapability('cbt.bank.view', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.list);

  fastify.get('/bank-soal/:id', {
    preHandler: [requireCapability('cbt.bank.view', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.getById);

  fastify.post('/bank-soal', {
    preHandler: [requireCapability('cbt.bank.manage', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.create);

  fastify.put('/bank-soal/:id', {
    preHandler: [requireCapability('cbt.bank.manage', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.update);

  fastify.delete('/bank-soal/:id', {
    preHandler: [requireCapability('cbt.bank.manage', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.delete);

  fastify.post('/bank-soal/:id/duplicate', {
    preHandler: [requireCapability('cbt.bank.manage', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.duplicate);

  // ==========================================
  // 2. BUTIR SOAL ROUTES
  // ==========================================
  fastify.get('/bank-soal/:id/soal', {
    preHandler: [requireCapability('cbt.bank.view', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.listQuestions);

  fastify.post('/bank-soal/:id/soal', {
    preHandler: [requireCapability('cbt.bank.manage', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.createQuestion);

  fastify.post('/bank-soal/:id/soal/bulk-import', {
    preHandler: [requireCapability('cbt.bank.manage', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.bulkImportQuestions);

  fastify.post('/bank-soal/parse-google-form', {
    preHandler: [requireCapability('cbt.bank.manage', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.parseGoogleForm);

  fastify.put('/soal/:questionId', {
    preHandler: [requireCapability('cbt.bank.manage', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.updateQuestion);

  fastify.delete('/soal/:questionId', {
    preHandler: [requireCapability('cbt.bank.manage', cbtGuruExempt), determineDataScope()],
  }, CbtBankSoalController.deleteQuestion);

  // ==========================================
  // 3. JADWAL UJIAN & SESI ROUTES
  // ==========================================
  fastify.get('/jadwal', {
    preHandler: [requireCapability('cbt.jadwal.view', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.list);

  fastify.get('/jadwal/:id', {
    preHandler: [requireCapability('cbt.jadwal.view', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.getById);

  fastify.post('/jadwal', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.create);

  fastify.post('/jadwal/bulk-create', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.bulkCreate);

  fastify.patch('/jadwal/bulk-plotting', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.bulkUpdatePlotting);

  fastify.put('/jadwal/:id', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.update);

  fastify.post('/jadwal/:id/regenerate-token', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.regenerateToken);

  fastify.post('/jadwal/:id/activate', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.activate);

  fastify.post('/jadwal/:id/pause', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.pause);

  fastify.post('/jadwal/:id/complete', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.complete);

  // Live Proctor & Participant Monitoring
  fastify.get('/jadwal/:id/peserta', {
    preHandler: [requireCapability('cbt.sesi.monitor', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.getPesertaList);

  fastify.post('/jadwal/:id/peserta/:siswaId/reset', {
    preHandler: [requireCapability('cbt.sesi.monitor', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.resetPeserta);

  fastify.post('/jadwal/:id/transfer-rapor', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtJadwalController.transferToRapor);

  // ==========================================
  // 4. STUDENT EXAM ENGINE ROUTES
  // ==========================================
  fastify.get('/engine/my-exams', {
    preHandler: [requireCapability('cbt.exam.take', cbtStudentExempt), determineDataScope()],
  }, CbtTestEngineController.getMyExams);

  fastify.post('/engine/verify-token', {
    preHandler: [requireCapability('cbt.exam.take', cbtStudentExempt), determineDataScope()],
  }, CbtTestEngineController.verifyToken);

  fastify.post('/engine/start', {
    preHandler: [requireCapability('cbt.exam.take', cbtStudentExempt), determineDataScope()],
  }, CbtTestEngineController.startSession);

  fastify.post('/engine/jadwal/:jadwalId/sync', {
    preHandler: [requireCapability('cbt.exam.take', cbtStudentExempt), determineDataScope()],
  }, CbtTestEngineController.syncAnswers);

  fastify.post('/engine/jadwal/:jadwalId/violation', {
    preHandler: [requireCapability('cbt.exam.take', cbtStudentExempt), determineDataScope()],
  }, CbtTestEngineController.recordViolation);

  fastify.post('/engine/jadwal/:jadwalId/submit', {
    preHandler: [requireCapability('cbt.exam.take', cbtStudentExempt), determineDataScope()],
  }, CbtTestEngineController.submitFinal);

  // ==========================================
  // 5. DENAH SPASIAL RUANG UJIAN (CBT)
  // ==========================================
  fastify.get('/denah', {
    preHandler: [requireCapability(['cbt.jadwal.manage', 'sarpras.denah.view', 'cbt.denah.view'], cbtDenahViewExempt), determineDataScope()],
  }, DenahSpasialController.list);

  fastify.get('/denah/:id', {
    preHandler: [requireCapability(['cbt.jadwal.manage', 'sarpras.denah.view', 'cbt.denah.view'], cbtDenahViewExempt), determineDataScope()],
  }, DenahSpasialController.getById);

  fastify.post('/denah', {
    preHandler: [requireCapability(['cbt.jadwal.manage', 'sarpras.denah.manage', 'cbt.denah.manage'], cbtGuruExempt), determineDataScope()],
  }, DenahSpasialController.create);

  fastify.put('/denah/:id', {
    preHandler: [requireCapability(['cbt.jadwal.manage', 'sarpras.denah.manage', 'cbt.denah.manage'], cbtGuruExempt), determineDataScope()],
  }, DenahSpasialController.update);

  fastify.delete('/denah/:id', {
    preHandler: [requireCapability(['cbt.jadwal.manage', 'sarpras.denah.manage', 'cbt.denah.manage'], cbtGuruExempt), determineDataScope()],
  }, DenahSpasialController.delete);

  fastify.post('/denah/:id/clone', {
    preHandler: [requireCapability(['cbt.jadwal.manage', 'sarpras.denah.manage', 'cbt.denah.manage'], cbtGuruExempt), determineDataScope()],
  }, DenahSpasialController.clone);

  // ==========================================
  // 6. CBT EVENT SETTINGS & HIERARCHY ROUTES
  // ==========================================
  fastify.get('/settings/events', {
    preHandler: [requireCapability('cbt.jadwal.view', cbtGuruExempt), determineDataScope()],
  }, CbtSettingsController.getEventsSummary);

  fastify.post('/settings/events', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtSettingsController.upsertEvent);

  fastify.post('/settings/events/set-active', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtSettingsController.setActiveEvent);

  fastify.delete('/settings/events/:id', {
    preHandler: [requireCapability('cbt.jadwal.manage', cbtGuruExempt), determineDataScope()],
  }, CbtSettingsController.deleteEvent);
}
