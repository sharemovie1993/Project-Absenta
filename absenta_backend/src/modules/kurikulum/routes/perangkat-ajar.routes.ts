import { PerangkatAjarController } from '../controllers/perangkat-ajar.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function perangkatAjarRoutes(fastify: any) {
  const guruExempt = { exemptRoles: ['GURU', 'ADMIN', 'SUPERADMIN', 'KURIKULUM'] as any[] };

  // Guru mengunggah perangkat ajar
  fastify.post('/perangkat', { preHandler: [requireCapability('academic.schedules.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.upload);
  
  // Wakasek Kurikulum memverifikasi / merespon unggahan perangkat ajar
  fastify.post('/perangkat/:id/review', { preHandler: [requireCapability('academic.manage.academic', guruExempt), determineDataScope()]}, PerangkatAjarController.review);
  
  // Mengambil daftar perangkat ajar (staf/guru)
  fastify.get('/perangkat', { preHandler: [requireCapability('academic.teaching.view', guruExempt), determineDataScope()]}, PerangkatAjarController.getList);
  // Mengambil detail perangkat ajar
  fastify.get('/perangkat/:id', { preHandler: [requireCapability('academic.teaching.view', guruExempt), determineDataScope()]}, PerangkatAjarController.getDetail);

  // Mengunduh berkas perangkat ajar secara aman
  fastify.get('/perangkat/:id/download', { preHandler: [requireCapability('academic.teaching.view', guruExempt), determineDataScope()]}, PerangkatAjarController.download);
  
  // Menghapus perangkat ajar
  fastify.delete('/perangkat/:id', { preHandler: [requireCapability('academic.schedules.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.delete);
  fastify.post('/perangkat/bulk-delete', { preHandler: [requireCapability('academic.schedules.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.bulkDelete);


  // Bank Perangkat Ajar Platform (Global Library & Claim)
  fastify.get('/perangkat/library', { preHandler: [requireCapability('academic.teaching.view', guruExempt), determineDataScope()]}, PerangkatAjarController.getLibraryTemplates);
  fastify.post('/perangkat/library', { preHandler: [requireCapability('superadmin.tenants.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.createLibraryTemplate);
  fastify.put('/perangkat/library/:id', { preHandler: [requireCapability('superadmin.tenants.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.updateLibraryTemplate);
  fastify.delete('/perangkat/library/:id', { preHandler: [requireCapability('superadmin.tenants.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.deleteLibraryTemplate);
  fastify.post('/perangkat/claim', { preHandler: [requireCapability('academic.schedules.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.claimLibraryTemplate);


  // AI-powered generation & editor saving & preset topics
  fastify.get('/perangkat/topik-presets', { preHandler: [requireCapability('academic.teaching.view', guruExempt), determineDataScope()]}, PerangkatAjarController.getTopikPresets);
  fastify.post('/perangkat/topik-presets', { preHandler: [requireCapability('superadmin.tenants.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.createTopikPreset);
  fastify.put('/perangkat/topik-presets/:id', { preHandler: [requireCapability('superadmin.tenants.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.updateTopikPreset);
  fastify.delete('/perangkat/topik-presets/:id', { preHandler: [requireCapability('superadmin.tenants.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.deleteTopikPreset);

  fastify.post('/perangkat/generate-ai', { preHandler: [requireCapability('academic.schedules.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.generateAI);
  fastify.post('/perangkat/save-editor', { preHandler: [requireCapability('academic.schedules.manage', guruExempt), determineDataScope()]}, PerangkatAjarController.saveEditor);
}




