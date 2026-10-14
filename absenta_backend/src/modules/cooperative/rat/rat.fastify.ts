// @ts-nocheck
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RatService } from './rat.service';
import { requireCapability } from '@/middlewares/requireCapability';
import { appLogger } from '../../../utils/app-logger';
import { mockTenant } from '../../../utils/mocks';
import { prisma } from '../../../utils/prisma';

export default async function ratRoutes(fastify: any) {
  const getTenantId = (req: any) => {
    return req.user?.tenant_id || req.user?.tenantId || mockTenant.id;
  };

  const getMemberId = async (req: any, tenantId: string) => {
    const userId = req.user?.id || req.user?.userId || req.user?.user_id;
    if (!userId) return null;

    const member = await prisma.member.findFirst({
      where: { tenantId, userId, status: 'ACTIVE' },
      select: { id: true },
    });

    return member?.id || null;
  };

  const broadcastRatEvent = (req: any, type: string, payload: any = {}) => {
    const io = req.server?.io || fastify.io;
    if (io) {
      const broadcastPayload = {
        type,
        ...payload,
        timestamp: new Date().toISOString(),
      };
      const tenantId = getTenantId(req);
      if (tenantId) {
        io.to(`tenant:${tenantId}`).emit('coop_rat_update', broadcastPayload);
      }
      io.emit('coop_rat_update', broadcastPayload);
      io.to('cooperative_workspace').emit('cooperative_sync', broadcastPayload);
    }
  };

  // 1. GET / - Daftar Sidang RAT
  fastify.get(
    '/',
    {
      preHandler: [
        requireCapability(['cooperative.rat.manage', 'cooperative.rat.view', 'cooperative.rat.vote']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const meetings = await RatService.getMeetings(tenantId);
        return { success: true, data: meetings };
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to fetch RAT meetings');
        reply.status(500).send({ success: false, message: error.message || 'Gagal memuat sidang RAT' });
      }
    }
  );

  // 2. GET /:id - Detail Sidang RAT & Kuorum
  fastify.get(
    '/:id',
    {
      preHandler: [
        requireCapability(['cooperative.rat.manage', 'cooperative.rat.view', 'cooperative.rat.vote']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const meeting = await RatService.getMeetingById(req.params.id, tenantId);
        return { success: true, data: meeting };
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to fetch RAT meeting detail');
        reply.status(404).send({ success: false, message: error.message || 'Sidang tidak ditemukan' });
      }
    }
  );

  // 3. POST / - Buat Sidang RAT Baru
  fastify.post(
    '/',
    { preHandler: [requireCapability('cooperative.rat.manage')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const operatorId = req.user?.id || req.user?.userId;
        const meeting = await RatService.createMeeting(tenantId, req.body, operatorId);
        broadcastRatEvent(req, 'RAT_MEETING_CREATED', { meetingId: meeting.id, title: meeting.title });
        reply.code(201).send({ success: true, data: meeting });
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to create RAT meeting');
        reply.status(400).send({ success: false, message: error.message || 'Gagal membuat sidang RAT' });
      }
    }
  );

  // 4. PUT /:id/status - Update Status Sidang RAT
  fastify.put(
    '/:id/status',
    { preHandler: [requireCapability('cooperative.rat.manage')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { status } = req.body;
        const meeting = await RatService.updateMeetingStatus(req.params.id, tenantId, status);
        broadcastRatEvent(req, 'RAT_STATUS_UPDATED', { meetingId: meeting.id, status: meeting.status });
        return { success: true, data: meeting };
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to update RAT meeting status');
        reply.status(400).send({ success: false, message: error.message || 'Gagal mengubah status sidang' });
      }
    }
  );

  // 5. POST /:id/attendance - Catat Presensi Kehadiran Peserta
  fastify.post(
    '/:id/attendance',
    {
      preHandler: [
        requireCapability(['cooperative.rat.manage', 'cooperative.rat.vote']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        let memberId = req.body.memberId;

        // Jika anggota mempresensikan dirinya sendiri
        if (!memberId) {
          memberId = await getMemberId(req, tenantId);
        }

        if (!memberId) {
          return reply.status(400).send({
            success: false,
            message: 'Profil anggota aktif Anda tidak ditemukan.',
          });
        }

        const method = req.body.method || 'ONLINE_SELF';
        const verifiedBy = req.user?.id || req.user?.userId;

        const result = await RatService.recordAttendance(
          req.params.id,
          tenantId,
          memberId,
          method,
          verifiedBy
        );

        broadcastRatEvent(req, 'RAT_ATTENDANCE_RECORDED', {
          meetingId: req.params.id,
          totalAttended: result.totalAttended,
          isQuorumReached: result.isQuorumReached,
        });

        return reply.send(result);
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to record attendance');
        reply.status(400).send({ success: false, message: error.message || 'Gagal mencatat kehadiran' });
      }
    }
  );

  // 6. POST /:id/voting-sessions - Buat Sesi Pemungutan Suara (e-Voting)
  fastify.post(
    '/:id/voting-sessions',
    { preHandler: [requireCapability('cooperative.rat.manage')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const session = await RatService.createVotingSession(req.params.id, tenantId, req.body);
        broadcastRatEvent(req, 'RAT_VOTING_OPENED', { meetingId: req.params.id, sessionId: session.id });
        reply.code(201).send({ success: true, data: session });
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to create voting session');
        reply.status(400).send({ success: false, message: error.message || 'Gagal membuat sesi voting' });
      }
    }
  );

  // 7. PUT /voting-sessions/:sessionId/status - Buka / Kunci Sesi Voting
  fastify.put(
    '/voting-sessions/:sessionId/status',
    { preHandler: [requireCapability('cooperative.rat.manage')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { status } = req.body;
        const session = await RatService.updateVotingSessionStatus(req.params.sessionId, tenantId, status);
        broadcastRatEvent(req, 'RAT_VOTING_STATUS_CHANGED', { sessionId: session.id, status: session.status });
        return { success: true, data: session };
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to update voting status');
        reply.status(400).send({ success: false, message: error.message || 'Gagal mengubah status voting' });
      }
    }
  );

  // 8. POST /voting-sessions/:sessionId/vote - Kirim Suara Anggota (One Member One Vote)
  fastify.post(
    '/voting-sessions/:sessionId/vote',
    { preHandler: [requireCapability('cooperative.rat.vote')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const memberId = await getMemberId(req, tenantId);

        if (!memberId) {
          return reply.status(403).send({
            success: false,
            message: 'Hanya anggota aktif terdaftar yang berhak memberikan suara.',
          });
        }

        const { optionId } = req.body;
        if (!optionId) {
          return reply.status(400).send({ success: false, message: 'Opsi pilihan suara wajib dipilih.' });
        }

        const result = await RatService.castVote(req.params.sessionId, tenantId, memberId, optionId);
        broadcastRatEvent(req, 'RAT_BALLOT_CAST', { sessionId: req.params.sessionId });

        return reply.send(result);
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to cast ballot');
        reply.status(400).send({ success: false, message: error.message || 'Gagal mengirimkan suara' });
      }
    }
  );

  // 9. GET /voting-sessions/:sessionId/my-vote - Cek Status Suara Pemilih Sendiri
  fastify.get(
    '/voting-sessions/:sessionId/my-vote',
    { preHandler: [requireCapability('cooperative.rat.vote')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const memberId = await getMemberId(req, tenantId);
        if (!memberId) {
          return { success: true, hasVoted: false };
        }

        const result = await RatService.checkMemberVoted(req.params.sessionId, tenantId, memberId);
        return { success: true, ...result };
      } catch (error: any) {
        reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  // 10. GET /voting-sessions/:sessionId/results - Rekapitulasi Hasil Suara
  fastify.get(
    '/voting-sessions/:sessionId/results',
    {
      preHandler: [
        requireCapability(['cooperative.rat.manage', 'cooperative.rat.view', 'cooperative.rat.vote']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const results = await RatService.getVotingResults(req.params.sessionId, tenantId);
        return { success: true, data: results };
      } catch (error: any) {
        reply.status(400).send({ success: false, message: error.message || 'Gagal memuat hasil voting' });
      }
    }
  );

  // 11. POST /:id/resolutions - Pengesahan Risalah / Ketetapan RAT
  fastify.post(
    '/:id/resolutions',
    { preHandler: [requireCapability('cooperative.rat.manage')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const resolution = await RatService.createResolution(req.params.id, tenantId, req.body);
        broadcastRatEvent(req, 'RAT_RESOLUTION_ADOPTED', { meetingId: req.params.id, resolutionId: resolution.id });
        reply.code(201).send({ success: true, data: resolution });
      } catch (error: any) {
        reply.status(400).send({ success: false, message: error.message || 'Gagal membuat ketetapan putusan' });
      }
    }
  );
}
