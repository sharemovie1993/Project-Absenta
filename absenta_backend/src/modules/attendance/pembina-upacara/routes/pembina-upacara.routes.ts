import { pembinaUpacaraController } from '../controllers/pembina-upacara.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';
import { RoleName } from '../../../../constants/enums';

export async function pembinaUpacaraRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [
      requireCapability(['attendance.schedules.view.list', 'academic.schedules.view.list'], {
        exemptRoles: [RoleName.SISWA, RoleName.GURU],
      }),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.getAll);

  fastify.get('/wa-config', {
    preHandler: [
      requireCapability(['attendance.schedules.view.list', 'academic.schedules.view.list']),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.getWaConfig);

  fastify.post('/wa-config', {
    preHandler: [
      requireCapability(['attendance.schedules.manage', 'academic.schedules.manage']),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.saveWaConfig);

  fastify.get('/wa-groups', {
    preHandler: [
      requireCapability(['attendance.schedules.manage', 'academic.schedules.manage']),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.getWaGroups);

  fastify.post('/test-wa', {
    preHandler: [
      requireCapability(['attendance.schedules.manage', 'academic.schedules.manage']),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.testSendWa);

  fastify.get('/candidate-groups', {
    preHandler: [
      requireCapability(['attendance.schedules.view.list', 'academic.schedules.view.list'], {
        exemptRoles: [RoleName.SISWA, RoleName.GURU],
      }),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.getCandidateGroups);

  fastify.get('/:id', {
    preHandler: [
      requireCapability(['attendance.schedules.view.list', 'academic.schedules.view.list'], {
        exemptRoles: [RoleName.SISWA, RoleName.GURU],
      }),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.getDetail);

  fastify.post('/', {
    preHandler: [
      requireCapability(['attendance.schedules.create', 'attendance.schedules.manage', 'academic.schedules.manage']),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.create);

  fastify.post('/auto-generate', {
    preHandler: [
      requireCapability(['attendance.schedules.create', 'attendance.schedules.manage', 'academic.schedules.manage']),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.autoGenerate);

  fastify.post('/bulk-delete', {
    preHandler: [
      requireCapability(['attendance.schedules.delete', 'attendance.schedules.manage', 'academic.schedules.manage']),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.bulkDelete);

  fastify.put('/:id', {
    preHandler: [
      requireCapability(['attendance.schedules.update', 'attendance.schedules.manage', 'academic.schedules.manage']),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.update);

  fastify.delete('/:id', {
    preHandler: [
      requireCapability(['attendance.schedules.delete', 'attendance.schedules.manage', 'academic.schedules.manage']),
      determineDataScope(),
    ],
  }, pembinaUpacaraController.delete);
}
