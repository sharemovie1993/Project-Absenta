import { pembinaKegiatanEskulController } from './pembina-kegiatan-eskul.controller';
import { requireCapability } from '@/middlewares/requireCapability';

export async function pembinaKegiatanEskulRoutes(fastify: any) {
  // GET /api/attendance/pembina-kegiatan-eskul/guru-picker?search=
  fastify.get('/guru-picker', {
    preHandler: [requireCapability('attendance.schedules.view.list')]
  }, pembinaKegiatanEskulController.getGuruList);

  // GET /api/attendance/pembina-kegiatan-eskul/:jenisKegiatanId
  fastify.get('/:jenisKegiatanId', {
    preHandler: [requireCapability('attendance.schedules.view.list')]
  }, pembinaKegiatanEskulController.getPembinas);

  // POST /api/attendance/pembina-kegiatan-eskul/:jenisKegiatanId/add
  fastify.post('/:jenisKegiatanId/add', {
    preHandler: [requireCapability('attendance.schedules.create')]
  }, pembinaKegiatanEskulController.addPembinas);

  // DELETE /api/attendance/pembina-kegiatan-eskul/member/:pembinaId
  fastify.delete('/member/:pembinaId', {
    preHandler: [requireCapability('attendance.schedules.delete')]
  }, pembinaKegiatanEskulController.removePembina);
}
