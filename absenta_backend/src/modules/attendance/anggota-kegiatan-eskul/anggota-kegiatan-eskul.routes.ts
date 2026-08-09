import { anggotaKegiatanEskulController } from './anggota-kegiatan-eskul.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function anggotaKegiatanEskulRoutes(fastify: any) {
  // GET /api/attendance/anggota-kegiatan-eskul/siswa-picker?search=&kelas_id=
  fastify.get('/siswa-picker', {
    preHandler: [requireCapability('kesiswaan.schedules.view.list'), determineDataScope()]
  }, anggotaKegiatanEskulController.getSiswaAkademikList);

  // GET /api/attendance/anggota-kegiatan-eskul/:jenisKegiatanId
  fastify.get('/:jenisKegiatanId', {
    preHandler: [requireCapability('kesiswaan.schedules.view.list'), determineDataScope()]
  }, anggotaKegiatanEskulController.getMembers);

  // POST /api/attendance/anggota-kegiatan-eskul/:jenisKegiatanId/add
  fastify.post('/:jenisKegiatanId/add', {
    preHandler: [requireCapability('kesiswaan.schedules.create'), determineDataScope()]
  }, anggotaKegiatanEskulController.addMembers);

  // DELETE /api/attendance/anggota-kegiatan-eskul/member/:anggotaId
  fastify.delete('/member/:anggotaId', {
    preHandler: [requireCapability('kesiswaan.schedules.delete'), determineDataScope()]
  }, anggotaKegiatanEskulController.removeMember);
}
