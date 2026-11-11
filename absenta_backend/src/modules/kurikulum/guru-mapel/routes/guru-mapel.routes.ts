import { guruMapelController } from '../controllers/guru-mapel.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function guruMapelRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [
        requireCapability('academic.teaching.view'),
        organizationalScopeMiddleware,
        determineDataScope(),
  ]
    },
    async (request: any, reply: any) => {
      return guruMapelController.list(request, reply);
    }
  );

  fastify.post(
    '/',
    {
      preHandler: [
        requireCapability('academic.teaching.manage'),
        organizationalScopeMiddleware,
        determineDataScope(),
  ]
    },
    async (request: any, reply: any) => {
      return guruMapelController.create(request, reply);
    }
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [
        requireCapability('academic.teaching.manage'),
        organizationalScopeMiddleware,
        determineDataScope(),
  ]
    },
    async (request: any, reply: any) => {
      return guruMapelController.remove(request, reply);
    }
  );

  fastify.get(
    '/import/template',
    {
      preHandler: [requireCapability('academic.teaching.manage'), determineDataScope()]
    },
    async (request: any, reply: any) => {
      return guruMapelController.getImportTemplate(request, reply);
    }
  );

  fastify.post(
    '/import',
    {
      preHandler: [requireCapability('academic.teaching.manage'), determineDataScope()]
    },
    async (request: any, reply: any) => {
      return guruMapelController.importFromExcel(request, reply);
    }
  );

  fastify.post(
    '/sync-from-jadwal',
    {
      preHandler: [
        requireCapability('academic.teaching.manage'),
        organizationalScopeMiddleware,
        determineDataScope()
      ]
    },
    async (request: any, reply: any) => {
      return guruMapelController.syncFromJadwal(request, reply);
    }
  );

  // Kebijakan Multi-Tenant: Kunci pemecahan mode mapel tengah semester
  fastify.get(
    '/policy',
    {
      preHandler: [
        requireCapability(['academic.teaching.view', 'academic.teaching.manage', 'academic.structure.manage']),
        determineDataScope(),
      ],
    },
    async (request: any, reply: any) => guruMapelController.getPolicy(request, reply)
  );

  fastify.put(
    '/policy',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structure.manage']),
        determineDataScope(),
      ],
    },
    async (request: any, reply: any) => guruMapelController.setPolicy(request, reply)
  );

  // UnitPengajaran endpoints (terisolasi tenant_id + Tahun Pelajaran & Semester)
  fastify.get(
    '/units',
    {
      preHandler: [
        requireCapability(['academic.teaching.view', 'academic.schedules.view.list', 'academic.teaching.manage', 'cbt.bank.view']),
        determineDataScope(),
      ],
    },
    async (request: any, reply: any) => guruMapelController.listTenantUnits(request, reply)
  );

  fastify.post(
    '/units/copy-from-semester',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structure.manage']),
        organizationalScopeMiddleware,
        determineDataScope(),
      ],
    },
    async (request: any, reply: any) => guruMapelController.copyUnitsFromSemester(request, reply)
  );

  fastify.get(
    '/:id/units',
    {
      preHandler: [
        requireCapability(['academic.teaching.view', 'academic.teaching.manage', 'academic.structure.manage']),
        organizationalScopeMiddleware,
        determineDataScope(),
      ],
    },
    async (request: any, reply: any) => guruMapelController.getUnitsForGuruMapel(request, reply)
  );

  fastify.put(
    '/:id/mode',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structure.manage']),
        organizationalScopeMiddleware,
        determineDataScope(),
      ],
    },
    async (request: any, reply: any) => guruMapelController.switchMode(request, reply)
  );

  fastify.post(
    '/:id/units',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structure.manage']),
        organizationalScopeMiddleware,
        determineDataScope(),
      ],
    },
    async (request: any, reply: any) => guruMapelController.createUnit(request, reply)
  );

  fastify.post(
    '/:id/units/copy-to-classes',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structure.manage']),
        organizationalScopeMiddleware,
        determineDataScope(),
      ],
    },
    async (request: any, reply: any) => guruMapelController.copyUnitsToClasses(request, reply)
  );

  fastify.put(
    '/units/:unitId',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structure.manage']),
        organizationalScopeMiddleware,
        determineDataScope(),
      ],
    },
    async (request: any, reply: any) => guruMapelController.updateUnit(request, reply)
  );

  fastify.delete(
    '/units/:unitId',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structure.manage']),
        organizationalScopeMiddleware,
        determineDataScope(),
      ],
    },
    async (request: any, reply: any) => guruMapelController.removeUnit(request, reply)
  );
}
