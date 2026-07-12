import { mapelController } from '../controllers/mapel.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '../../../../middlewares/dataScope';
import { RoleName } from '../../../../constants/enums';

export default async function mapelRoutes(fastify: any) {
  // GET /mapel/export - Export to Excel
  fastify.get('/export', {
    preHandler: [
        requireCapability('academic.subjects.view.list'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return mapelController.exportToExcel(request, reply);
  });

  // GET /mapel/import/template - Get import template
  fastify.get('/import/template', {
    preHandler: [
        requireCapability('academic.subjects.create'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return mapelController.getImportTemplate(request, reply);
  });

  // POST /mapel/import - Import from Excel
  fastify.post('/import', {
    preHandler: [
        requireCapability('academic.subjects.create'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return mapelController.importFromExcel(request, reply);
  });

  // GET /mapel - Get all mapel
  fastify.get(
    '/',
    {
      preHandler: [
        requireCapability('academic.subjects.view.list', { exemptRoles: [RoleName.SISWA] }),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return mapelController.getAllMapel(request, reply);
    }
  );

  fastify.get(
    '/tingkat/:tingkat',
    {
      preHandler: [
        requireCapability('academic.subjects.view.list', { exemptRoles: [RoleName.SISWA] }),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return mapelController.getMapelByTingkat(request, reply);
    }
  );

  fastify.get(
    '/:id',
    {
      preHandler: [
        requireCapability('academic.subjects.view.detail', { exemptRoles: [RoleName.SISWA] }),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return mapelController.getMapelById(request, reply);
    }
  );

  fastify.post(
    '/',
    {
      preHandler: [
        requireCapability('academic.subjects.create'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return mapelController.createMapel(request, reply);
    }
  );

  fastify.put(
    '/:id',
    {
      preHandler: [
        requireCapability('academic.subjects.update'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return mapelController.updateMapel(request, reply);
    }
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [
        requireCapability('academic.subjects.delete'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return mapelController.deleteMapel(request, reply);
    }
  );

  fastify.post(
    '/initialize-preset',
    {
      preHandler: [
        requireCapability('academic.subjects.create'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return mapelController.initializePreset(request, reply);
    }
  );

  // GET /presets - Get all global presets (superadmin only)
  fastify.get(
    '/presets',
    {
      preHandler: [
        requireCapability('superadmin.tenants.manage'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return mapelController.getGlobalPresets(request, reply);
    }
  );

  // POST /presets - Create new global preset (superadmin only)
  fastify.post(
    '/presets',
    {
      preHandler: [
        requireCapability('superadmin.tenants.manage'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return mapelController.createGlobalPreset(request, reply);
    }
  );

  // PUT /presets/:id - Update global preset (superadmin only)
  fastify.put(
    '/presets/:id',
    {
      preHandler: [
        requireCapability('superadmin.tenants.manage'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return mapelController.updateGlobalPreset(request, reply);
    }
  );

  // DELETE /presets/:id - Delete global preset (superadmin only)
  fastify.delete(
    '/presets/:id',
    {
      preHandler: [
        requireCapability('superadmin.tenants.manage'),
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return mapelController.deleteGlobalPreset(request, reply);
    }
  );
}
