import { RoleName } from '@/constants/enums';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';
import { periodeOperasionalKbmController } from '../controllers/periode-kbm.controller';

const MANAGE_CAPABILITIES = [
  'academic.schedules.manage',
  'academic.schedules.create',
  'academic.schedules.update',
  'academic.manage.academic',
  'academic.years.update',
  'hubin.pkl.manage',
  'dashboard.view.hubin',
];

export async function periodeOperasionalKbmRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [
        requireCapability(
          [
            'academic.schedules.view.list',
            'attendance.schedules.view.list',
            'hubin.pkl.view.list',
            'dashboard.view.hubin',
          ],
          { exemptRoles: [RoleName.ADMIN, RoleName.GURU, RoleName.SISWA] }
        ),
        determineDataScope(),
      ],
    },
    periodeOperasionalKbmController.getAll
  );

  fastify.post(
    '/',
    {
      preHandler: [requireCapability(MANAGE_CAPABILITIES, { exemptRoles: [RoleName.ADMIN] }), determineDataScope()],
    },
    periodeOperasionalKbmController.create
  );

  fastify.put(
    '/:id',
    {
      preHandler: [requireCapability(MANAGE_CAPABILITIES, { exemptRoles: [RoleName.ADMIN] }), determineDataScope()],
    },
    periodeOperasionalKbmController.update
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [requireCapability(MANAGE_CAPABILITIES, { exemptRoles: [RoleName.ADMIN] }), determineDataScope()],
    },
    periodeOperasionalKbmController.delete
  );
}
