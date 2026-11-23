import { wilayahController } from '../controllers/wilayah.controller';
import { determineDataScope } from '@/middlewares/dataScope';
import { requireCapability } from '@/middlewares/requireCapability';

export async function wilayahRoutes(fastify: any) {
  fastify.get('/provinsi', { preHandler: [determineDataScope()] }, wilayahController.getProvinsi);
  fastify.get('/kabupaten', { preHandler: [determineDataScope()] }, wilayahController.getKabupaten);
  fastify.get('/kecamatan', { preHandler: [determineDataScope()] }, wilayahController.getKecamatan);
  fastify.get('/kelurahan', { preHandler: [determineDataScope()] }, wilayahController.getKelurahan);
  fastify.get('/kodepos', { preHandler: [determineDataScope()] }, wilayahController.getKodePos);
  fastify.get('/stats', { preHandler: [determineDataScope()] }, wilayahController.getStats);
  fastify.get('/next-code', { preHandler: [determineDataScope()] }, wilayahController.getNextCode);
  fastify.get('/manage', { preHandler: [determineDataScope()] }, wilayahController.listManageWilayah);
  fastify.post('/manage', { preHandler: [requireCapability('system.wilayah.manage'), determineDataScope()] }, wilayahController.createWilayah);
  fastify.put('/manage/:kode', { preHandler: [requireCapability('system.wilayah.manage'), determineDataScope()] }, wilayahController.updateWilayah);
  fastify.delete('/manage/:kode', { preHandler: [requireCapability('system.wilayah.manage'), determineDataScope()] }, wilayahController.deleteWilayah);
  fastify.post('/sync', { preHandler: [requireCapability('system.wilayah.manage'), determineDataScope()] }, wilayahController.syncWilayah);
}
