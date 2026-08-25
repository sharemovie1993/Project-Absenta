import { wilayahController } from '../controllers/wilayah.controller';
import { determineDataScope } from '@/middlewares/dataScope';
import { requireCapability } from '@/middlewares/requireCapability';

export async function wilayahRoutes(fastify: any) {
  fastify.get('/provinsi', { preHandler: [determineDataScope()] }, wilayahController.getProvinsi);
  fastify.get('/kabupaten', { preHandler: [determineDataScope()] }, wilayahController.getKabupaten);
  fastify.get('/kecamatan', { preHandler: [determineDataScope()] }, wilayahController.getKecamatan);
  fastify.get('/kelurahan', { preHandler: [determineDataScope()] }, wilayahController.getKelurahan);
  fastify.get('/kodepos', { preHandler: [determineDataScope()] }, wilayahController.getKodePos);
  fastify.post('/sync', { preHandler: [requireCapability('system.wilayah.manage'), determineDataScope()] }, wilayahController.syncWilayah);
}
