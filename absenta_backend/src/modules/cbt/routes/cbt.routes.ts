import { CbtBankSoalController } from '../controllers/cbt-bank-soal.controller';
import { CbtJadwalController } from '../controllers/cbt-jadwal.controller';
import { CbtTestEngineController } from '../controllers/cbt-test-engine.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

const cbtGuruExempt = {
  exemptRoles: ['ADMIN', 'SUPERADMIN', 'KURIKULUM', 'GURU', 'WALIKELAS'] as any[],
};

const cbtStudentExempt = {
  exemptRoles: ['ADMIN', 'SUPERADMIN', 'SISWA'] as any[],
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
}
