import { BahanAjarController } from '../controllers/bahan-ajar.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function bahanAjarRoutes(fastify: any) {
  const guruExempt = { exemptRoles: ['GURU', 'ADMIN', 'SUPERADMIN', 'KURIKULUM', 'STAFF'] as any[] };

  // 1. List Presets (Global Platform Library)
  fastify.get(
    '/presets',
    {
      preHandler: [
        requireCapability(['academic.teaching.view', 'academic.structures.view.list'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return BahanAjarController.listPresets(request, reply);
    }
  );

  // 2. Get Single Preset by ID
  fastify.get(
    '/presets/:id',
    {
      preHandler: [
        requireCapability(['academic.teaching.view', 'academic.structures.view.list'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return BahanAjarController.getPresetById(request, reply);
    }
  );

  // 3. Get Reader Content by Perangkat ID
  fastify.get(
    '/reader/:id',
    {
      preHandler: [
        requireCapability(['academic.teaching.view', 'academic.structures.view.list'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return BahanAjarController.getReaderContent(request, reply);
    }
  );

  // 4. Save Structured Content to PerangkatAjar
  fastify.post(
    '/reader/:id',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structures.view.list'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return BahanAjarController.saveStructuredKonten(request, reply);
    }
  );

  // 5. Import Preset to personal PerangkatAjar
  fastify.post(
    '/presets/:id/import',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structures.view.list'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return BahanAjarController.importPreset(request, reply);
    }
  );
}
