import { sendResponse, sendError } from '../../../utils/response';
import { prisma } from '../../../utils/prisma';
import { z } from 'zod';
import { mockTenant } from '../../../utils/mocks';

const createBullyingReportSchema = z.object({
  victim_name: z.string().max(255).optional().nullable(),
  reporter_class: z.string().max(100).optional().nullable(),
  details: z.string().min(5, 'Detail laporan perundungan minimal 5 karakter'),
  incident_date: z.coerce.date({
    errorMap: () => ({ message: 'Tanggal kejadian tidak valid' })
  })
});

const updateReportStatusSchema = z.object({
  status: z.enum(['BARU', 'DIPROSES', 'SELESAI'], {
    errorMap: () => ({ message: 'Status tidak valid (BARU, DIPROSES, SELESAI)' })
  })
});

export class BullyingReportController {
  // POST /bpbk/bullying-reports (Anonymous submission, public)
  static async createReport(req: any, reply: any) {
    try {
      const tenant_id = req.user?.tenant_id || req.user?.tenantId || mockTenant.id;
      const parsedBody = createBullyingReportSchema.parse(req.body);
      
      const report = await prisma.bullyingReport.create({
        data: {
          tenant_id,
          victim_name: parsedBody.victim_name || null,
          reporter_class: parsedBody.reporter_class || null,
          details: parsedBody.details,
          incident_date: parsedBody.incident_date,
          status: 'BARU'
        }
      });

      return sendResponse(reply, 201, true, 'Laporan perundungan anonim berhasil dikirim', report);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map(e => e.message).join(', '), error);
      }
      return sendError(reply, 500, 'Gagal mengirimkan laporan perundungan', error);
    }
  }

  // GET /bpbk/bullying-reports (Staff/BK only)
  static async getReports(req: any, reply: any) {
    try {
      const tenant_id = req.user?.tenant_id || req.user?.tenantId;
      if (!tenant_id) {
        return sendError(reply, 400, 'Tenant ID tidak ditemukan');
      }

      const reports = await prisma.bullyingReport.findMany({
        where: { tenant_id },
        orderBy: { created_at: 'desc' }
      });

      return sendResponse(reply, 200, true, 'Daftar laporan perundungan berhasil diambil', reports);
    } catch (error: any) {
      return sendError(reply, 500, 'Gagal mengambil daftar laporan perundungan', error);
    }
  }

  // PUT /bpbk/bullying-reports/:id/status (Staff/BK only)
  static async updateStatus(req: any, reply: any) {
    try {
      const tenant_id = req.user?.tenant_id || req.user?.tenantId;
      const { id } = req.params;
      const parsedBody = updateReportStatusSchema.parse(req.body);

      const existing = await prisma.bullyingReport.findFirst({
        where: { id, tenant_id }
      });

      if (!existing) {
        return sendError(reply, 404, 'Laporan perundungan tidak ditemukan');
      }

      const updated = await prisma.bullyingReport.update({
        where: { id },
        data: { status: parsedBody.status }
      });

      return sendResponse(reply, 200, true, 'Status laporan perundungan berhasil diperbarui', updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map(e => e.message).join(', '), error);
      }
      return sendError(reply, 500, 'Gagal memperbarui status laporan perundungan', error);
    }
  }
}
