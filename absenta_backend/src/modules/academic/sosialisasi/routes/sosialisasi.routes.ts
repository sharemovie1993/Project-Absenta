import { SosialisasiController } from '../controllers/sosialisasi.controller';
import { determineDataScope } from '../../../../middlewares/dataScope';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { RoleName } from '../../../../constants/enums';

export async function sosialisasiRoutes(fastify: any) {
  // Ambil sesi rapat aktif & daftar hadir
  fastify.get(
    '/session',
    {
      preHandler: [determineDataScope()],
    },
    SosialisasiController.getActiveSession
  );

  // Simpan / update metadata sesi rapat & notulen
  fastify.post(
    '/session',
    {
      preHandler: [
        determineDataScope(),
        requireCapability('core.sekolah.update.profile', { exemptRoles: [RoleName.ADMIN, RoleName.SUPERADMIN, RoleName.GURU] }),
      ],
    },
    SosialisasiController.updateSession
  );

  // Panitia menandai kehadiran seorang guru
  fastify.post(
    '/attend',
    {
      preHandler: [
        determineDataScope(),
        requireCapability('core.sekolah.update.profile', { exemptRoles: [RoleName.ADMIN, RoleName.SUPERADMIN, RoleName.GURU] }),
      ],
    },
    SosialisasiController.recordAttendance
  );

  // Reset sesi baru
  fastify.post(
    '/reset',
    {
      preHandler: [
        determineDataScope(),
        requireCapability('core.sekolah.update.profile', { exemptRoles: [RoleName.ADMIN, RoleName.SUPERADMIN] }),
      ],
    },
    SosialisasiController.resetSession
  );
}

export async function publicSosialisasiRoutes(fastify: any) {
  // Verifikasi info sesi via QR token
  fastify.get('/verify-session', { config: { skipAuth: true, public: true } }, SosialisasiController.publicVerifySession);

  // Konfirmasi kehadiran mandiri oleh guru saat scan QR
  fastify.post('/self-attend', { config: { skipAuth: true, public: true } }, SosialisasiController.publicSelfAttend);
}
