// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireCapability } from '@/middlewares/requireCapability';
import { RatMinuteService } from './rat.minute.service';

const getTenantId = (req: any): string => {
  return req.headers['x-tenant-id'] as string || req.user?.tenantId || req.tenantId || '';
};

// Zod Validation Schemas
const createMinuteSchema = z.object({
  agendaId: z.string().uuid().optional().nullable(),
  timeRecord: z.string().max(50).optional().nullable(),
  speakerName: z.string().max(255).optional().nullable(),
  speakerRole: z.string().max(100).optional().nullable(),
  category: z.enum(['OPENING', 'DISCUSSION', 'SUGGESTION', 'OBJECTION', 'CONCLUSION', 'ANNOUNCEMENT']).default('DISCUSSION'),
  topic: z.string().min(2, 'Topik bahasan minimal 2 karakter').max(255),
  content: z.string().min(3, 'Isi notulensi minimal 3 karakter'),
  actionItem: z.string().optional().nullable(),
  isPublic: z.boolean().default(true),
});

const updateMinuteSchema = z.object({
  agendaId: z.string().uuid().optional().nullable(),
  timeRecord: z.string().max(50).optional().nullable(),
  speakerName: z.string().max(255).optional().nullable(),
  speakerRole: z.string().max(100).optional().nullable(),
  category: z.string().optional(),
  topic: z.string().min(2).max(255).optional(),
  content: z.string().min(3).optional(),
  actionItem: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
});

export default async function ratMinuteRoutes(fastify: FastifyInstance) {
  // 1. GET /:meetingId/minutes - Ambil daftar notulensi
  fastify.get(
    '/:meetingId/minutes',
    {
      preHandler: [
        requireCapability(['cooperative.rat.view', 'cooperative.rat.manage', 'cooperative.rat.vote']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { meetingId } = req.params;
        const agendaId = req.query?.agendaId;

        const minutes = await RatMinuteService.getMeetingMinutes(meetingId, tenantId, agendaId);
        return reply.code(200).send({ success: true, data: minutes });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message || 'Gagal memuat notulensi sidang' });
      }
    }
  );

  // 2. POST /:meetingId/minutes - Tambah notulensi sidang baru
  fastify.post(
    '/:meetingId/minutes',
    {
      preHandler: [requireCapability('cooperative.rat.manage')],
    },
    async (req: any, reply: any) => {
      try {
        const parseResult = createMinuteSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Data notulensi tidak valid',
          });
        }

        const tenantId = getTenantId(req);
        const { meetingId } = req.params;
        const authorId = req.user?.id || req.user?.userId || null;

        const minute = await RatMinuteService.createMeetingMinute(meetingId, tenantId, {
          ...parseResult.data,
          authorId,
        });

        return reply.code(201).send({ success: true, data: minute });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message || 'Gagal menyimpan notulensi sidang' });
      }
    }
  );

  // 3. PUT /minutes/:minuteId - Perbarui notulensi sidang
  fastify.put(
    '/minutes/:minuteId',
    {
      preHandler: [requireCapability('cooperative.rat.manage')],
    },
    async (req: any, reply: any) => {
      try {
        const parseResult = updateMinuteSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Data pembaharuan notulensi tidak valid',
          });
        }

        const tenantId = getTenantId(req);
        const { minuteId } = req.params;

        const minute = await RatMinuteService.updateMeetingMinute(minuteId, tenantId, parseResult.data);
        return reply.code(200).send({ success: true, data: minute });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message || 'Gagal memperbarui notulensi sidang' });
      }
    }
  );

  // 4. DELETE /minutes/:minuteId - Hapus butir notulensi sidang
  fastify.delete(
    '/minutes/:minuteId',
    {
      preHandler: [requireCapability('cooperative.rat.manage')],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { minuteId } = req.params;

        const result = await RatMinuteService.deleteMeetingMinute(minuteId, tenantId);
        return reply.code(200).send(result);
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message || 'Gagal menghapus notulensi sidang' });
      }
    }
  );

  // 5. GET /:meetingId/proceedings-document - Agregasi Berita Acara & Risalah Lengkap Sidang
  fastify.get(
    '/:meetingId/proceedings-document',
    {
      preHandler: [
        requireCapability(['cooperative.rat.view', 'cooperative.rat.manage', 'cooperative.rat.vote']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { meetingId } = req.params;

        const docData = await RatMinuteService.getProceedingsDocument(meetingId, tenantId);
        return reply.code(200).send({ success: true, data: docData });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message || 'Gagal menyusun dokumen risalah sidang' });
      }
    }
  );
}
