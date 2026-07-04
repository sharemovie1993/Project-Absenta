import { FinancialService } from '../services/financial.service';
import { GeneralReportService } from '../services/general-report.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { prisma } from '../../../utils/prisma';

export class ReportingController {
  private financialService: FinancialService;
  private generalService: GeneralReportService;

  constructor() {
    this.financialService = new FinancialService();
    this.generalService = new GeneralReportService();
  }

  async generateFinancialReport(request: any, reply: any) {
    try {
      const { periodStart, periodEnd } = request.body as {
        periodStart: string;
        periodEnd: string;
      };

      const tenantId = (request as any).tenantId;

      const startDate = new Date(periodStart);
      const endDate = new Date(periodEnd);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        reply.status(400).send({
          success: false,
          message: 'Invalid date format',
        });
        return;
      }

      if (startDate >= endDate) {
        reply.status(400).send({
          success: false,
          message: 'Start date must be before end date',
        });
        return;
      }

      const reportData = await this.financialService.generateFinancialReport(
        tenantId,
        startDate,
        endDate
      );

      reply.status(200).send({
        success: true,
        message: 'Financial report generated successfully',
        data: reportData,
      });
    } catch (error) {
      console.error('Generate financial report error:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async getFinancialReports(request: any, reply: any) {
    try {
      const { page = 1, limit = 20 } = request.query as {
        page?: number;
        limit?: number;
      };

      const tenantId = (request as any).tenantId;

      const result = await this.financialService.getFinancialReports(
        tenantId,
        page,
        limit
      );

      reply.status(200).send({
        success: true,
        message: 'Financial reports retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get financial reports error:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async getDashboardStats(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;

      const stats = await this.financialService.getDashboardStats(tenantId);

      reply.status(200).send({
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async exportFinancialReport(request: any, reply: any) {
    try {
      const { periodStart, periodEnd, format = 'json' } = request.query as {
        periodStart: string;
        periodEnd: string;
        format?: 'json' | 'csv';
      };

      const tenantId = (request as any).tenantId;

      const startDate = new Date(periodStart);
      const endDate = new Date(periodEnd);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        reply.status(400).send({
          success: false,
          message: 'Invalid date format',
        });
        return;
      }

      // Audit log for read-only access
      console.log(`[AUDIT] READ_ONLY access to exportFinancialReport by tenant ${tenantId}`);

      const reportData = await this.financialService.exportFinancialReport(
        tenantId,
        startDate,
        endDate,
        format
      );

      if (format === 'csv') {
        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="financial-report-${periodStart}-${periodEnd}.csv"`)
          .send(reportData);
      } else {
        reply.status(200).send({
          success: true,
          message: 'Financial report exported successfully',
          data: reportData,
        });
      }
    } catch (error) {
      console.error('Export financial report error:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async getMonthlyReport(request: any, reply: any) {
    try {
      const { year, month } = request.params as {
        year: string;
        month: string;
      };

      const tenantId = (request as any).tenantId;

      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        reply.status(400).send({
          success: false,
          message: 'Invalid year or month',
        });
        return;
      }

      const periodStart = new Date(yearNum, monthNum - 1, 1);
      const periodEnd = new Date(yearNum, monthNum, 0);

      // Read-only access (no save to DB)
      const reportData = await this.financialService.generateFinancialReport(
        tenantId,
        periodStart,
        periodEnd,
        false
      );

      reply.status(200).send({
        success: true,
        message: 'Monthly report generated successfully',
        data: reportData,
      });
    } catch (error) {
      console.error('Get monthly report error:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async getYearlyReport(request: any, reply: any) {
    try {
      const { year } = request.params as {
        year: string;
      };

      const tenantId = (request as any).tenantId;

      const yearNum = parseInt(year);

      if (isNaN(yearNum)) {
        reply.status(400).send({
          success: false,
          message: 'Invalid year',
        });
        return;
      }

      const periodStart = new Date(yearNum, 0, 1);
      const periodEnd = new Date(yearNum, 11, 31);

      // Read-only access (no save to DB)
      const reportData = await this.financialService.generateFinancialReport(
        tenantId,
        periodStart,
        periodEnd,
        false
      );

      reply.status(200).send({
        success: true,
        message: 'Yearly report generated successfully',
        data: reportData,
      });
    } catch (error) {
      console.error('Get yearly report error:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async getOwnerSummary(_request: any, reply: any) {
    try {
      const data = await this.financialService.getOwnerSummary();
      reply.status(200).send({
        success: true,
        message: 'Owner summary retrieved successfully',
        data,
      });
    } catch (error) {
      console.error('Get owner summary error:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Educational Reports
   */

  async getKesiswaanReport(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { startDate, endDate } = request.query as any;
      const data = await this.generalService.getKesiswaanReport(
        tenantId,
        new Date(startDate || '2000-01-01'),
        new Date(endDate || '2100-01-01')
      );
      reply.send({ success: true, data });
    } catch (error: any) {
      reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getHubinReport(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const data = await this.generalService.getHubinReport(tenantId);
      reply.send({ success: true, data });
    } catch (error: any) {
      reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getKurikulumReport(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { tahun_pelajaran_id } = request.query as any;
      if (!tahun_pelajaran_id) {
        return reply.status(400).send({ success: false, message: 'tahun_pelajaran_id is required' });
      }
      const data = await this.generalService.getKurikulumReport(tenantId, tahun_pelajaran_id);
      reply.send({ success: true, data });
    } catch (error: any) {
      reply.status(500).send({ success: false, message: error.message });
    }
  }

  async printCertificate(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { siswaId } = request.params;
      
      const pdfBuffer = await PdfGeneratorService.generateCertificatePdf(tenantId, siswaId);
      
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', 'inline; filename="certificate.pdf"');
      return reply.send(pdfBuffer);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async printCertificateClassZip(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { kelasId } = request.params;

      const students = await prisma.siswa.findMany({
        where: { kelas_id: kelasId, tenant_id: tenantId }
      });

      if (students.length === 0) {
        return reply.status(404).send({ success: false, message: 'Tidak ada siswa ditemukan di kelas ini' });
      }

      const AdmZip = require('adm-zip');
      const zip = new AdmZip();

      for (const s of students) {
        try {
          const pdfBuffer = await PdfGeneratorService.generateCertificatePdf(tenantId, s.id);
          const filename = `${s.nis}_${s.nama_siswa.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          zip.addFile(filename, pdfBuffer);
        } catch (err: any) {
          console.error(`[ZIP EXPORT ERROR] Failed for student ${s.id}:`, err.message);
        }
      }

      const zipBuffer = zip.toBuffer();
      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', `attachment; filename="sertifikat_kelas_${kelasId}.zip"`);
      return reply.send(zipBuffer);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async printInvoice(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { invoiceNumber } = request.params;
      
      const pdfBuffer = await PdfGeneratorService.generateInvoicePdf(tenantId, invoiceNumber);
      
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', 'inline; filename="invoice.pdf"');
      return reply.send(pdfBuffer);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async printSupervision(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { supervisionId } = request.params;
      
      const pdfBuffer = await PdfGeneratorService.generateSupervisionPdf(tenantId, supervisionId);
      
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', 'inline; filename="supervision_report.pdf"');
      return reply.send(pdfBuffer);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async printIzinKeluar(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { izinId } = request.params;
      
      const pdfBuffer = await PdfGeneratorService.generateIzinKeluarPdf(tenantId, izinId);
      
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', 'inline; filename="surat_izin_keluar.pdf"');
      return reply.send(pdfBuffer);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async printKesiswaanBulanan(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { month, year } = request.query;
      
      const m = Number(month) || new Date().getMonth() + 1;
      const y = Number(year) || new Date().getFullYear();

      const pdfBuffer = await PdfGeneratorService.generateKesiswaanBulananPdf(tenantId, m, y);
      
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', 'inline; filename="laporan_bulanan_kesiswaan.pdf"');
      return reply.send(pdfBuffer);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}
