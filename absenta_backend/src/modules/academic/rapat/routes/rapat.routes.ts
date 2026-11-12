import { RapatController } from '../controllers/rapat.controller';
import { determineDataScope } from '../../../../middlewares/dataScope';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { RoleName } from '../../../../constants/enums';

export async function rapatRoutes(fastify: any) {
  // Ambil daftar rapat dengan filter & pagination
  fastify.get(
    '/',
    {
      preHandler: [determineDataScope()],
    },
    RapatController.listRapat
  );

  // Ambil sesi rapat yang sedang berstatus BERLANGSUNG (untuk banner dashboard)
  fastify.get(
    '/active',
    {
      preHandler: [determineDataScope()],
    },
    RapatController.getActiveMeeting
  );

  // Ambil detail rapat & peserta
  fastify.get(
    '/:id',
    {
      preHandler: [determineDataScope()],
    },
    RapatController.getRapatDetail
  );

  // Buat agenda rapat baru (Admin, Kurikulum, Kepsek, TU)
  fastify.post(
    '/',
    {
      preHandler: [
        determineDataScope(),
        requireCapability('core.sekolah.update.profile', {
          exemptRoles: [RoleName.ADMIN, RoleName.SUPERADMIN, RoleName.GURU],
        }),
      ],
    },
    RapatController.createRapat
  );

  // Update rapat / notulen / status
  fastify.put(
    '/:id',
    {
      preHandler: [
        determineDataScope(),
        requireCapability('core.sekolah.update.profile', {
          exemptRoles: [RoleName.ADMIN, RoleName.SUPERADMIN, RoleName.GURU],
        }),
      ],
    },
    RapatController.updateRapat
  );

  // Hapus rapat
  fastify.delete(
    '/:id',
    {
      preHandler: [
        determineDataScope(),
        requireCapability('core.sekolah.update.profile', {
          exemptRoles: [RoleName.ADMIN, RoleName.SUPERADMIN],
        }),
      ],
    },
    RapatController.deleteRapat
  );

  // Catat kehadiran peserta (Panitia / Manual toggle)
  fastify.post(
    '/:id/attend',
    {
      preHandler: [
        determineDataScope(),
        requireCapability('core.sekolah.update.profile', {
          exemptRoles: [RoleName.ADMIN, RoleName.SUPERADMIN, RoleName.GURU],
        }),
      ],
    },
    RapatController.recordAttendance
  );

  // Data Berita Acara & Daftar Hadir resmi (True WYSIWYG PDF)
  fastify.get(
    '/:id/berita-acara',
    {
      preHandler: [determineDataScope()],
    },
    RapatController.getBeritaAcaraData
  );
}

export async function publicRapatRoutes(fastify: any) {
  // Presensi mandiri via scan QR rapat (Bisa diakses guru / siswa / orang tua tanpa login penuh atau via portal)
  fastify.post(
    '/self-attend',
    { config: { skipAuth: true, public: true } },
    RapatController.publicSelfAttend
  );
}
