import { pembinaKegiatanEskulController } from './pembina-kegiatan-eskul.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function pembinaKegiatanEskulRoutes(fastify: any) {
  // GET /api/attendance/pembina-kegiatan-eskul/guru-picker?search=
  fastify.get('/guru-picker', {
    preHandler: [requireCapability('kesiswaan.schedules.view.list'), determineDataScope()]
  }, pembinaKegiatanEskulController.getGuruList);

  // GET /api/attendance/pembina-kegiatan-eskul/:jenisKegiatanId
  fastify.get('/:jenisKegiatanId', {
    preHandler: [requireCapability('kesiswaan.schedules.view.list'), determineDataScope()]
  }, pembinaKegiatanEskulController.getPembinas);

  // POST /api/attendance/pembina-kegiatan-eskul/:jenisKegiatanId/add
  fastify.post('/:jenisKegiatanId/add', {
    preHandler: [requireCapability('kesiswaan.schedules.create'), determineDataScope()]
  }, pembinaKegiatanEskulController.addPembinas);

  // DELETE /api/attendance/pembina-kegiatan-eskul/member/:pembinaId
  fastify.delete('/member/:pembinaId', {
    preHandler: [requireCapability('kesiswaan.schedules.delete'), determineDataScope()]
  }, pembinaKegiatanEskulController.removePembina);
}
