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

  // SKL (Surat Keterangan Lulus)
  fastify.post('/skl', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, UkkSklController.upsertSkl);
  fastify.get('/skl', { preHandler: [requireCapability('academic.students.view.list'), determineDataScope()]}, UkkSklController.getSkl);
  fastify.delete('/skl/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, UkkSklController.deleteSkl);
}
