import { academicPlenoController } from '../controllers/academic-pleno.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '../../../../middlewares/dataScope';

export default async function academicPlenoRoutes(fastify: any) {
  // ═══════════════════════════════════════════════════════════════════
  // SESSIONS
  // ═══════════════════════════════════════════════════════════════════

  // List sessions
  fastify.get(
    '/sessions',
    {
      preHandler: [
        requireCapability('academic.pleno.view'),
        determineDataScope(),
      ],
    },
    academicPlenoController.listSessions.bind(academicPlenoController)
  );

  // Create session
  fastify.post(
    '/sessions',
    {
      preHandler: [
        requireCapability('academic.pleno.manage'),
        determineDataScope(),
      ],
    },
    academicPlenoController.createSession.bind(academicPlenoController)
  );

  // Get session detail
  fastify.get(
    '/sessions/:id',
    {
      preHandler: [
        requireCapability('academic.pleno.view'),
        determineDataScope(),
      ],
    },
    academicPlenoController.getSessionDetail.bind(academicPlenoController)
  );

  // Update session
  fastify.patch(
    '/sessions/:id',
    {
      preHandler: [
        requireCapability('academic.pleno.manage'),
        determineDataScope(),
      ],
    },
    academicPlenoController.updateSession.bind(academicPlenoController)
  );

  // Start session
  fastify.post(
    '/sessions/:id/start',
    {
      preHandler: [
        requireCapability('academic.pleno.manage'),
        determineDataScope(),
      ],
    },
    academicPlenoController.startSession.bind(academicPlenoController)
  );

  // Pause session
  fastify.post(
    '/sessions/:id/pause',
    {
      preHandler: [
        requireCapability('academic.pleno.manage'),
        determineDataScope(),
      ],
    },
    academicPlenoController.pauseSession.bind(academicPlenoController)
  );

  // Finalize session
  fastify.post(
    '/sessions/:id/finalize',
    {
      preHandler: [
        requireCapability('academic.pleno.finalize'),
        determineDataScope(),
      ],
    },
    academicPlenoController.finalizeSession.bind(academicPlenoController)
  );

  // ═══════════════════════════════════════════════════════════════════
  // ATTENDANCE (PRESENSI DEWAN GURU)
  // ═══════════════════════════════════════════════════════════════════

  // List attendance
  fastify.get(
    '/sessions/:id/attendance',
    {
      preHandler: [
        requireCapability('academic.pleno.view'),
        determineDataScope(),
      ],
    },
    academicPlenoController.listAttendance.bind(academicPlenoController)
  );

  // Tap presence / self attendance
  fastify.post(
    '/sessions/:id/attendance/tap',
    {
      preHandler: [
        requireCapability('academic.pleno.attend'),
        determineDataScope(),
      ],
    },
    academicPlenoController.tapAttendance.bind(academicPlenoController)
  );

  // Bulk invite active teachers
  fastify.post(
    '/sessions/:id/attendance/bulk-invite',
    {
      preHandler: [
        requireCapability('academic.pleno.manage'),
        determineDataScope(),
      ],
    },
    academicPlenoController.bulkInviteAttendance.bind(academicPlenoController)
  );

  // ═══════════════════════════════════════════════════════════════════
  // ROMBELS & TRIAGE
  // ═══════════════════════════════════════════════════════════════════

  // List rombels in session
  fastify.get(
    '/sessions/:id/rombels',
    {
      preHandler: [
        requireCapability('academic.pleno.view'),
        determineDataScope(),
      ],
    },
    academicPlenoController.listRombels.bind(academicPlenoController)
  );

  // Trigger smart auto-triage engine
  fastify.post(
    '/sessions/:id/rombels/calculate-triage',
    {
      preHandler: [
        requireCapability('academic.pleno.manage'),
        determineDataScope(),
      ],
    },
    academicPlenoController.calculateTriage.bind(academicPlenoController)
  );

  // Get candidates in rombel
  fastify.get(
    '/sessions/:id/rombels/:rombelId/candidates',
    {
      preHandler: [
        requireCapability('academic.pleno.view'),
        determineDataScope(),
      ],
    },
    academicPlenoController.getRombelCandidates.bind(academicPlenoController)
  );

  // Aklamasi batch approve green candidates in rombel
  fastify.post(
    '/sessions/:id/rombels/:rombelId/batch-approve-green',
    {
      preHandler: [
        requireCapability('academic.pleno.manage'),
        determineDataScope(),
      ],
    },
    academicPlenoController.batchApproveGreen.bind(academicPlenoController)
  );

  // ═══════════════════════════════════════════════════════════════════
  // STUDENT DOSSIER 360 & INDIVIDUAL DECISIONS
  // ═══════════════════════════════════════════════════════════════════

  // Get student 360 dossier
  fastify.get(
    '/sessions/:id/students/:siswaId/dossier',
    {
      preHandler: [
        requireCapability('academic.pleno.view'),
        determineDataScope(),
      ],
    },
    academicPlenoController.getStudentDossier.bind(academicPlenoController)
  );

  // Record student decision
  fastify.post(
    '/sessions/:id/students/:siswaId/decide',
    {
      preHandler: [
        requireCapability('academic.pleno.manage'),
        determineDataScope(),
      ],
    },
    academicPlenoController.decideStudent.bind(academicPlenoController)
  );

  // ═══════════════════════════════════════════════════════════════════
  // MINUTES OF MEETING (RISALAH / NOTULENSI)
  // ═══════════════════════════════════════════════════════════════════

  // List minutes
  fastify.get(
    '/sessions/:id/minutes',
    {
      preHandler: [
        requireCapability('academic.pleno.view'),
        determineDataScope(),
      ],
    },
    academicPlenoController.listMinutes.bind(academicPlenoController)
  );

  // Create minute
  fastify.post(
    '/sessions/:id/minutes',
    {
      preHandler: [
        requireCapability('academic.pleno.manage'),
        determineDataScope(),
      ],
    },
    academicPlenoController.createMinute.bind(academicPlenoController)
  );

  // ═══════════════════════════════════════════════════════════════════
  // TRANSITION SYNC & BAP EXPORT
  // ═══════════════════════════════════════════════════════════════════

  // Sync finalized decisions to class transition
  fastify.post(
    '/sessions/:id/sync-to-transition',
    {
      preHandler: [
        requireCapability('academic.pleno.finalize'),
        determineDataScope(),
      ],
    },
    academicPlenoController.syncToTransition.bind(academicPlenoController)
  );

  // Export official BAP data
  fastify.get(
    '/sessions/:id/export-bap',
    {
      preHandler: [
        requireCapability('academic.pleno.view'),
        determineDataScope(),
      ],
    },
    academicPlenoController.exportBap.bind(academicPlenoController)
  );
}
