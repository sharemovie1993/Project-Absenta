import { EskulController } from '../controllers/eskul.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';
import { RoleName } from '../../../constants/enums';

export default async function eskulRoutes(fastify: any) {
  const readCaps = [
    'academic.teaching.view',
    'academic.homeroom.manage',
    'academic.manage.academic',
    'kesiswaan.schedules.view.list',
    'dashboard.view.kepsek',
  ];

  const writeCaps = [
    'academic.teaching.view',
    'academic.homeroom.manage',
    'academic.manage.academic',
    'kesiswaan.schedules.manage',
  ];

  // 1. Opsi Eskul (Pembina / Supervisi)
  fastify.get('/options', {
    preHandler: [
      requireCapability(readCaps, { exemptRoles: [RoleName.GURU] }),
      determineDataScope(),
    ],
  }, EskulController.getOptions);

  // 2. Matriks Anggota & Nilai Eskul
  fastify.get('/matrix', {
    preHandler: [
      requireCapability(readCaps, { exemptRoles: [RoleName.GURU] }),
      determineDataScope(),
    ],
  }, EskulController.getMatrix);

  // 3. Simpan Matriks Nilai Eskul
  fastify.post('/matrix', {
    preHandler: [
      requireCapability(writeCaps, { exemptRoles: [RoleName.GURU] }),
      determineDataScope(),
    ],
  }, EskulController.saveMatrix);

  // 4. Ringkasan Nilai Eskul untuk Wali Kelas
  fastify.get('/wali-overview', {
    preHandler: [
      requireCapability(['academic.homeroom.manage', 'academic.view.wali.kelas', 'academic.manage.academic', 'dashboard.view.kepsek'], { exemptRoles: [RoleName.GURU] }),
      determineDataScope(),
    ],
  }, EskulController.getWaliOverview);
}
