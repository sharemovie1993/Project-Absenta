import { UkkSklController } from '../controllers/ukk-skl.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function ukkSklRoutes(fastify: any) {
  // UKK (Uji Kompetensi Keahlian) - Dapat diakses oleh Manajemen Akademik, Hubin, dan Kaprog
  fastify.post(
    '/ukk',
    {
      preHandler: [
        requireCapability([
          'academic.manage.academic',
          'hubin.pkl.manage',
          'academic.teaching.rekap',
          'academic.students.view.list',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.upsertUkk
  );

  fastify.get(
    '/ukk',
    {
      preHandler: [
        requireCapability([
          'academic.subjects.view.list',
          'academic.students.view.list',
          'hubin.pkl.manage',
          'academic.manage.academic',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.getUkk
  );

  fastify.delete(
    '/ukk/:id',
    {
      preHandler: [
        requireCapability([
          'academic.manage.academic',
          'hubin.pkl.manage',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.deleteUkk
  );

  // UKK Settings (Judul Penugasan, Skema, Unit Kompetensi)
  fastify.get(
    '/ukk/settings',
    {
      preHandler: [
        requireCapability([
          'academic.subjects.view.list',
          'academic.students.view.list',
          'hubin.pkl.manage',
          'academic.manage.academic',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.getUkkSettings
  );

  // Rekap semua tahun ajaran untuk satu jurusan
  fastify.get(
    '/ukk/settings/all',
    {
      preHandler: [
        requireCapability([
          'academic.subjects.view.list',
          'academic.students.view.list',
          'hubin.pkl.manage',
          'academic.manage.academic',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.getAllUkkSettingsSummary
  );

  // Master Katalog SKKNI Cloud dari Server Lisensi (dengan smart offline caching)
  fastify.get(
    '/ukk/skkni-cloud/katalog',
    {
      preHandler: [
        requireCapability([
          'academic.subjects.view.list',
          'academic.students.view.list',
          'hubin.pkl.manage',
          'academic.manage.academic',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.getCloudSkkniKatalog
  );

  fastify.get(
    '/ukk/skkni-cloud/rumpun',
    {
      preHandler: [
        requireCapability([
          'academic.subjects.view.list',
          'academic.students.view.list',
          'hubin.pkl.manage',
          'academic.manage.academic',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.getCloudSkkniRumpun
  );

  fastify.post(
    '/ukk/settings',
    {
      preHandler: [
        requireCapability([
          'academic.manage.academic',
          'hubin.pkl.manage',
          'academic.teaching.rekap',
          'academic.students.view.list',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.saveUkkSettings
  );

  // Pra-UKK Jadwal & Ploting
  fastify.get(
    '/ukk/jadwal',
    {
      preHandler: [
        requireCapability([
          'academic.subjects.view.list',
          'academic.students.view.list',
          'hubin.pkl.manage',
          'academic.manage.academic',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.getUkkJadwal
  );

  fastify.post(
    '/ukk/jadwal',
    {
      preHandler: [
        requireCapability([
          'academic.manage.academic',
          'hubin.pkl.manage',
          'academic.teaching.rekap',
          'academic.students.view.list',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.saveUkkJadwal
  );

  // UKK Berita Acara & Dokumentasi
  fastify.get(
    '/ukk/berita-acara',
    {
      preHandler: [
        requireCapability([
          'academic.subjects.view.list',
          'academic.students.view.list',
          'hubin.pkl.manage',
          'academic.manage.academic',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.getUkkBeritaAcara
  );

  fastify.post(
    '/ukk/berita-acara',
    {
      preHandler: [
        requireCapability([
          'academic.manage.academic',
          'hubin.pkl.manage',
          'academic.teaching.rekap',
          'academic.students.view.list',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.saveUkkBeritaAcara
  );

  // UKK RAB Alat & Bahan Praktik (Integrasi Sarpras)
  fastify.get(
    '/ukk/rab',
    {
      preHandler: [
        requireCapability([
          'academic.subjects.view.list',
          'academic.students.view.list',
          'hubin.pkl.manage',
          'academic.manage.academic',
          'sarpras.inventory.view.list',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.getUkkRab
  );

  fastify.post(
    '/ukk/rab',
    {
      preHandler: [
        requireCapability([
          'academic.manage.academic',
          'hubin.pkl.manage',
          'academic.teaching.rekap',
          'academic.students.view.list',
          'sarpras.inventory.manage',
        ]),
        determineDataScope(),
      ],
    },
    UkkSklController.saveUkkRab
  );

  // SKL (Surat Keterangan Lulus)
  fastify.post('/skl', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, UkkSklController.upsertSkl);
  fastify.get('/skl', { preHandler: [requireCapability('academic.students.view.list'), determineDataScope()]}, UkkSklController.getSkl);
  fastify.delete('/skl/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, UkkSklController.deleteSkl);
}
