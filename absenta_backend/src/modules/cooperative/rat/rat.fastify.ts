// @ts-nocheck
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RatService } from './rat.service';
import { requireCapability } from '@/middlewares/requireCapability';
import { appLogger } from '../../../utils/app-logger';
import { mockTenant } from '../../../utils/mocks';
import { prisma } from '../../../utils/prisma';

// ─── ZOD VALIDATION SCHEMAS ────────────────────────────────────────────────
const createMeetingSchema = z.object({
  title: z.string().min(3, 'Judul rapat minimal 3 karakter').max(150, 'Judul rapat maksimal 150 karakter'),
  date: z.string().optional(),
  meetingDate: z.string().optional(),
  meetingType: z.enum(['RAT', 'RAPAT_LUAR_BIASA', 'RAPAT_PENGURUS']).optional(),
  fiscalYear: z.coerce.number().int().min(2000).max(2100).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional().nullable(),
  location: z.string().optional(),
  description: z.string().optional().nullable(),
  lpjDocumentUrl: z.string().optional().nullable(),
  auditDocumentUrl: z.string().optional().nullable(),
  agendas: z.array(z.object({
    order: z.number().int().optional(),
    title: z.string().min(1, 'Judul agenda wajib diisi'),
    presenter: z.string().optional().nullable(),
    durationMin: z.number().int().optional(),
  })).optional(),
}).refine(data => Boolean(data.date || data.meetingDate), {
  message: 'Jadwal pelaksanaan rapat wajib diisi',
  path: ['date'],
});

const updateMeetingStatusSchema = z.object({
  status: z.enum([
    'DRAFT',
    'SCHEDULED',
    'REGISTRATION_OPEN',
    'QUORUM_REACHED',
    'IN_SESSION',
    'ADJOURNED',
    'RATIFIED',
    'CLOSED',
  ]),
});

const recordAttendanceSchema = z.object({
  memberId: z.string().uuid().optional(),
  identifier: z.string().optional(),
  rfid: z.string().optional(),
  method: z.enum(['ONLINE_SELF', 'RFID_SCAN', 'MANUAL_OPERATOR', 'ONLINE', 'RFID', 'MANUAL']).optional(),
});

const createVotingSessionSchema = z.object({
  title: z.string().min(3, 'Judul pemungutan suara minimal 3 karakter').max(150),
  description: z.string().optional().nullable(),
  category: z.enum(['RESOLUTION', 'ELECTIONS', 'AMENDMENT']).optional(),
  agendaId: z.string().uuid().optional().nullable(),
  options: z.array(z.union([
    z.string().min(1),
    z.object({
      label: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional().nullable(),
    })
  ])).min(2, 'Minimal harus terdapat 2 opsi pilihan pemungutan suara'),
});

const updateVotingSessionStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'TALLIED']),
});

const castVoteSchema = z.object({
  optionId: z.string().min(1, 'Opsi suara wajib dipilih'),
});

const createResolutionSchema = z.object({
  title: z.string().min(3, 'Judul ketetapan minimal 3 karakter').max(150),
  content: z.string().min(5, 'Ringkasan isi ketetapan minimal 5 karakter'),
  number: z.string().optional(),
});

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

  // 3. GET /:id/quorum - Kuorum Real-time
  fastify.get(
    '/:id/quorum',
    {
      preHandler: [
        requireCapability(['cooperative.rat.manage', 'cooperative.rat.view', 'cooperative.rat.vote']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const meeting = await RatService.getMeetingById(req.params.id, tenantId);
        return { success: true, data: meeting.quorumStats };
      } catch (error: any) {
        reply.status(404).send({ success: false, message: error.message || 'Data kuorum tidak ditemukan' });
      }
    }
  );

  // 4. POST / - Buat Sidang RAT Baru
  fastify.post(
    '/',
    { preHandler: [requireCapability('cooperative.rat.manage')] },
    async (req: any, reply: any) => {
      try {
        const parseResult = createMeetingSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Validasi data sidang gagal',
            errors: parseResult.error.issues,
          });
        }

        const tenantId = getTenantId(req);
        const operatorId = req.user?.id || req.user?.userId;
        const normalizedData = {
          ...parseResult.data,
          date: parseResult.data.date || parseResult.data.meetingDate,
          fiscalYear: parseResult.data.fiscalYear || parseResult.data.year || new Date().getFullYear(),
          location: parseResult.data.location || parseResult.data.description || 'Aula Sekolah & Daring Web Absenta',
        };
        const meeting = await RatService.createMeeting(tenantId, normalizedData, operatorId);
        broadcastRatEvent(req, 'RAT_MEETING_CREATED', { meetingId: meeting.id, title: meeting.title });
        reply.code(201).send({ success: true, data: meeting });
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to create RAT meeting');
        reply.status(400).send({ success: false, message: error.message || 'Gagal membuat sidang RAT' });
      }
    }
  );

  // 5. PUT /:id/status - Update Status Sidang RAT
  fastify.put(
    '/:id/status',
    { preHandler: [requireCapability('cooperative.rat.manage')] },
    async (req: any, reply: any) => {
      try {
        const parseResult = updateMeetingStatusSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Status sidang tidak valid',
          });
        }

        const tenantId = getTenantId(req);
        const meeting = await RatService.updateMeetingStatus(req.params.id, tenantId, parseResult.data.status);
        broadcastRatEvent(req, 'RAT_STATUS_UPDATED', { meetingId: meeting.id, status: meeting.status });
        return { success: true, data: meeting };
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to update RAT meeting status');
        reply.status(400).send({ success: false, message: error.message || 'Gagal mengubah status sidang' });
      }
    }
  );

  // 6. POST /:id/attendance - Catat Presensi Kehadiran Peserta (Tap RFID / Ketik Manual / Online)
  fastify.post(
    '/:id/attendance',
    {
      preHandler: [
        requireCapability(['cooperative.rat.manage', 'cooperative.rat.vote']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const parseResult = recordAttendanceSchema.safeParse(req.body || {});
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Data presensi tidak valid',
          });
        }

        const tenantId = getTenantId(req);
        let memberId = parseResult.data.memberId;
        const queryTerm = parseResult.data.rfid || parseResult.data.identifier;

        // Jika lookup via RFID atau nomor anggota / identitas
        if (!memberId && queryTerm) {
          const resolved = await RatService.resolveMember(tenantId, queryTerm);
          if (!resolved) {
            return reply.status(404).send({
              success: false,
              message: `Anggota dengan kartu / identitas "${queryTerm}" tidak ditemukan atau berstatus non-aktif.`,
            });
          }
          memberId = resolved.id;
        }

        // Jika anggota mempresensikan dirinya sendiri (portal mandiri)
        if (!memberId) {
          memberId = await getMemberId(req, tenantId);
        }

        if (!memberId) {
          return reply.status(403).send({
            success: false,
            message: 'Profil anggota aktif tidak ditemukan.',
          });
        }

        let method = parseResult.data.method;
        if (!method) {
          if (parseResult.data.rfid) {
            method = 'RFID_SCAN';
          } else if (parseResult.data.identifier) {
            method = 'MANUAL_OPERATOR';
          } else {
            method = 'ONLINE_SELF';
          }
        }

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
          attendance: result.attendance,
          member: result.member,
        });

        return reply.send(result);
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to record attendance');
        reply.status(400).send({ success: false, message: error.message || 'Gagal mencatat kehadiran' });
      }
    }
  );

  // 6b. GET /:id/attendance/search-members - Cari anggota aktif untuk terminal presensi
  fastify.get(
    '/:id/attendance/search-members',
    {
      preHandler: [
        requireCapability(['cooperative.rat.manage', 'cooperative.rat.view']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const query = (req.query?.q || req.query?.query || '') as string;
        const members = await RatService.searchMembersForAttendance(req.params.id, tenantId, query);
        return { success: true, data: members };
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to search members for RAT attendance');
        reply.status(500).send({ success: false, message: error.message || 'Gagal mencari data anggota' });
      }
    }
  );

  // 7. GET /:id/attendance/me - Cek Status Presensi Saya
  fastify.get(
    '/:id/attendance/me',
    {
      preHandler: [
        requireCapability(['cooperative.rat.manage', 'cooperative.rat.vote', 'cooperative.rat.view']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const memberId = await getMemberId(req, tenantId);
        if (!memberId) {
          return { success: true, data: { hasAttended: false, attendance: null } };
        }

        const attendance = await prisma.coopMeetingAttendance.findUnique({
          where: {
            meetingId_memberId: {
              meetingId: req.params.id,
              memberId,
            },
          },
        });

        return {
          success: true,
          data: {
            hasAttended: Boolean(attendance),
            attendance,
          },
        };
      } catch (error: any) {
        reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  // 8. POST /:id/voting-sessions - Buat Sesi Pemungutan Suara (e-Voting)
  fastify.post(
    '/:id/voting-sessions',
    { preHandler: [requireCapability('cooperative.rat.manage')] },
    async (req: any, reply: any) => {
      try {
        const parseResult = createVotingSessionSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Data sesi voting tidak valid',
            errors: parseResult.error.issues,
          });
        }

        const tenantId = getTenantId(req);
        const session = await RatService.createVotingSession(req.params.id, tenantId, parseResult.data);
        broadcastRatEvent(req, 'RAT_VOTING_OPENED', { meetingId: req.params.id, sessionId: session.id });
        reply.code(201).send({ success: true, data: session });
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to create voting session');
        reply.status(400).send({ success: false, message: error.message || 'Gagal membuat sesi voting' });
      }
    }
  );

  // 9. PUT /voting-sessions/:sessionId/status - Buka / Kunci Sesi Voting
  fastify.put(
    '/voting-sessions/:sessionId/status',
    { preHandler: [requireCapability('cooperative.rat.manage')] },
    async (req: any, reply: any) => {
      try {
        const parseResult = updateVotingSessionStatusSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Status sesi voting tidak valid',
          });
        }

        const tenantId = getTenantId(req);
        const session = await RatService.updateVotingSessionStatus(req.params.sessionId, tenantId, parseResult.data.status);
        broadcastRatEvent(req, 'RAT_VOTING_STATUS_CHANGED', { sessionId: session.id, status: session.status });
        return { success: true, data: session };
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to update voting status');
        reply.status(400).send({ success: false, message: error.message || 'Gagal mengubah status voting' });
      }
    }
  );

  // 10. POST /voting-sessions/:sessionId/vote - Kirim Suara Anggota (One Member One Vote)
  fastify.post(
    '/voting-sessions/:sessionId/vote',
    { preHandler: [requireCapability('cooperative.rat.vote')] },
    async (req: any, reply: any) => {
      try {
        const parseResult = castVoteSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Opsi suara tidak valid',
          });
        }

        const tenantId = getTenantId(req);
        const memberId = await getMemberId(req, tenantId);

        if (!memberId) {
          return reply.status(403).send({
            success: false,
            message: 'Hanya anggota aktif terdaftar yang berhak memberikan suara.',
          });
        }

        const result = await RatService.castVote(
          req.params.sessionId,
          tenantId,
          memberId,
          parseResult.data.optionId
        );
        broadcastRatEvent(req, 'RAT_BALLOT_CAST', { sessionId: req.params.sessionId });

        return reply.send(result);
      } catch (error: any) {
        appLogger.error({ err: error }, 'Failed to cast ballot');
        const isConflict = error.message?.includes('Hak suara Anda telah digunakan');
        reply.status(isConflict ? 409 : 400).send({
          success: false,
          message: error.message || 'Gagal mengirimkan suara',
        });
      }
    }
  );

  // 11. GET /voting-sessions/:sessionId/my-vote - Cek Status Suara Pemilih Sendiri
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

  // 12. GET /voting-sessions/:sessionId/results - Rekapitulasi Hasil Suara
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

  // 13. POST /:id/resolutions - Pengesahan Risalah / Ketetapan RAT
  fastify.post(
    '/:id/resolutions',
    { preHandler: [requireCapability('cooperative.rat.manage')] },
    async (req: any, reply: any) => {
      try {
        const parseResult = createResolutionSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Data ketetapan tidak valid',
          });
        }

        const tenantId = getTenantId(req);
        const resolution = await RatService.createResolution(req.params.id, tenantId, parseResult.data);
        broadcastRatEvent(req, 'RAT_RESOLUTION_ADOPTED', { meetingId: req.params.id, resolutionId: resolution.id });
        reply.code(201).send({ success: true, data: resolution });
      } catch (error: any) {
        reply.status(400).send({ success: false, message: error.message || 'Gagal membuat ketetapan putusan' });
      }
    }
  );
}
