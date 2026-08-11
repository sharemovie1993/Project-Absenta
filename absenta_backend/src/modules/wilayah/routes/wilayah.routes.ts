import { wilayahController } from '../controllers/wilayah.controller';

export async function wilayahRoutes(fastify: any) {
  fastify.get('/provinsi', wilayahController.getProvinsi);
  fastify.get('/kabupaten', wilayahController.getKabupaten);
  fastify.get('/kecamatan', wilayahController.getKecamatan);
  fastify.get('/kelurahan', wilayahController.getKelurahan);
  fastify.get('/kodepos', wilayahController.getKodePos);
  fastify.post('/sync', wilayahController.syncWilayah);
}
