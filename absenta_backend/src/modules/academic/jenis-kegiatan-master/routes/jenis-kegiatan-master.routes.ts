import { jenisKegiatanMasterController } from '../controllers/jenis-kegiatan-master.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '../../../../middlewares/dataScope';
import { RoleName } from '../../../../constants/enums';

export default async function jenisKegiatanMasterRoutes(fastify: any) {
  fastify.get('/grouped', {
    preHandler: [
      requireCapability('academic.activities.types.view', { exemptRoles: [RoleName.SISWA] }),
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jenisKegiatanMasterController.getGrouped(request, reply);
  });

  fastify.get('/', {
    preHandler: [
      requireCapability('academic.activities.types.view', { exemptRoles: [RoleName.SISWA] }),
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jenisKegiatanMasterController.getAll(request, reply);
  });


  fastify.get('/:id', {
    preHandler: [
      requireCapability('academic.activities.types.view'),
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jenisKegiatanMasterController.getById(request, reply);
  });

  fastify.post('/', {
    preHandler: [
      requireCapability('academic.activities.types.manage'),
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jenisKegiatanMasterController.create(request, reply);
  });

  fastify.put('/:id', {
    preHandler: [
      requireCapability('academic.activities.types.manage'),
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jenisKegiatanMasterController.update(request, reply);
  });

  fastify.delete('/:id', {
    preHandler: [
      requireCapability('academic.activities.types.manage'),
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jenisKegiatanMasterController.remove(request, reply);
  });
}
