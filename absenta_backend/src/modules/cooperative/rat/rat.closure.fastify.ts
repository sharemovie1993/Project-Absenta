// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireCapability } from '@/middlewares/requireCapability';
import { RatClosureService } from './rat.closure.service';

const getTenantId = (req: any): string => {
  return (req.headers['x-tenant-id'] as string) || req.user?.tenantId || req.tenantId || '';
};

// Zod Validation Schemas
const closeMeetingSchema = z.object({
  closedBy: z.string().min(2, 'Nama pimpinan sidang minimal 2 karakter').max(200),
  closingNotes: z.string().max(2000).optional().nullable(),
  proceedingsDocNo: z.string().max(100).optional().nullable(),
});

export default async function ratClosureRoutes(fastify: FastifyInstance) {
  // 1. GET /:meetingId/closure-readiness - Cek kesiapan penutupan sidang RAT
  fastify.get(
    '/:meetingId/closure-readiness',
    {
      preHandler: [
        requireCapability(['cooperative.rat.view', 'cooperative.rat.manage']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { meetingId } = req.params;

        const result = await RatClosureService.checkClosureReadiness(meetingId, tenantId);
        return reply.code(200).send({ success: true, data: result });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Gagal memverifikasi kesiapan penutupan sidang RAT',
        });
      }
    }
  );

  // 2. POST /:meetingId/close - Tutup Sidang Resmi & Penguncian Data (Ketuk Palu)
  fastify.post(
    '/:meetingId/close',
    {
      preHandler: [
        requireCapability(['cooperative.rat.manage']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { meetingId } = req.params;
        const body = closeMeetingSchema.parse(req.body || {});

        const result = await RatClosureService.closeMeeting(meetingId, tenantId, body);
        return reply.code(200).send(result);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(422).send({
            success: false,
            message: 'Validasi gagal',
            errors: error.issues,
          });
        }
        return reply.status(400).send({
          success: false,
          message: error.message || 'Gagal melakukan penutupan sidang RAT',
        });
      }
    }
  );

  // 3. POST /:meetingId/distribute-shu - Eksekusi Otomatis Distribusi SHU Pasca-RAT
  fastify.post(
    '/:meetingId/distribute-shu',
    {
      preHandler: [
        requireCapability(['cooperative.rat.manage', 'cooperative.shu.distribute']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { meetingId } = req.params;
        const operatorId = req.user?.id || req.user?.userId || null;

        const result = await RatClosureService.distributeMeetingShu(meetingId, tenantId, operatorId);
        return reply.code(200).send(result);
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Gagal mendistribusikan SHU pasca-sidang RAT',
        });
      }
    }
  );

  // 4. GET /:meetingId/official-dossier - Unduh / Ambil Berkas Bundel Dokumen Dinas RAT
  fastify.get(
    '/:meetingId/official-dossier',
    {
      preHandler: [
        requireCapability(['cooperative.rat.view', 'cooperative.rat.manage']),
      ],
    },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { meetingId } = req.params;

        const result = await RatClosureService.getOfficialDossierData(meetingId, tenantId);
        return reply.code(200).send({ success: true, data: result });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Gagal memuat berkas bundel dokumen dinas RAT',
        });
      }
    }
  );
}
