import { ReportingController } from '../controllers/reporting.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function reportingRoutes(fastify: any) {
  const reportingController = new ReportingController();

  // Generate financial report
  fastify.post('/financial/generate', {
    preHandler: [requireCapability('reports.financial.generate')],
    schema: {
      body: {
        type: 'object',
        required: ['periodStart', 'periodEnd'],
        properties: {
          periodStart: { type: 'string', format: 'date' },
          periodEnd: { type: 'string', format: 'date' },
        },
      },
    },
    handler: reportingController.generateFinancialReport.bind(reportingController),
  });

  // Get financial reports list
  fastify.get('/financial', {
    preHandler: [requireCapability('reports.financial.view.list')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100 },
        },
      },
    },
    handler: reportingController.getFinancialReports.bind(reportingController),
  });

  // Get dashboard statistics
  fastify.get('/dashboard/stats', {
    preHandler: [requireCapability('reports.dashboard.view.stats')],
    handler: reportingController.getDashboardStats.bind(reportingController),
  });

  // Export financial report
  fastify.get('/financial/export', {
    preHandler: [requireCapability('reports.financial.export')],
    schema: {
      querystring: {
        type: 'object',
        required: ['periodStart', 'periodEnd'],
        properties: {
          periodStart: { type: 'string', format: 'date' },
          periodEnd: { type: 'string', format: 'date' },
          format: { type: 'string', enum: ['json', 'csv'] },
        },
      },
    },
    handler: reportingController.exportFinancialReport.bind(reportingController),
  });

  // Get monthly report
  fastify.get('/financial/monthly/:year/:month', {
    preHandler: [requireCapability('reports.financial.view.monthly')],
    schema: {
      params: {
        type: 'object',
        required: ['year', 'month'],
        properties: {
          year: { type: 'string', pattern: '^[0-9]{4}$' },
          month: { type: 'string', pattern: '^(0?[1-9]|1[0-2])$' },
        },
      },
    },
    handler: reportingController.getMonthlyReport.bind(reportingController),
  });

  // Get yearly report
  fastify.get('/financial/yearly/:year', {
    preHandler: [requireCapability('reports.financial.view.yearly')],
    schema: {
      params: {
        type: 'object',
        required: ['year'],
        properties: {
          year: { type: 'string', pattern: '^[0-9]{4}$' },
        },
      },
    },
    handler: reportingController.getYearlyReport.bind(reportingController),
  });

  fastify.get('/owner/summary', {
    preHandler: [requireCapability('reports.owner.view.summary')],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                totalTenants: { type: 'number' },
                activeSubscriptions: { type: 'number' },
                invoice: {
                  type: 'object',
                  properties: {
                    paid: { type: 'object', properties: { count: { type: 'number' }, amount: { type: 'number' } } },
                    unpaid: { type: 'object', properties: { count: { type: 'number' }, amount: { type: 'number' } } },
                    overdue: { type: 'object', properties: { count: { type: 'number' }, amount: { type: 'number' } } }
                  }
                },
                revenue: {
                  type: 'object',
                  properties: {
                    month: { type: 'number' },
                    year: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },
    handler: reportingController.getOwnerSummary.bind(reportingController),
  });

  /**
   * Educational Reports
   */

  // Kesiswaan Report
  fastify.get('/kesiswaan', {
    preHandler: [requireCapability('reports.violation.view')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
      },
    },
    handler: reportingController.getKesiswaanReport.bind(reportingController),
  });

  // Hubin Report
  fastify.get('/hubin', {
    preHandler: [requireCapability('reports.hubin.view')],
    handler: reportingController.getHubinReport.bind(reportingController),
  });

  // Kurikulum Report
  fastify.get('/kurikulum', {
    preHandler: [requireCapability('reports.attendance.view')],
    schema: {
      querystring: {
        type: 'object',
        required: ['tahun_pelajaran_id'],
        properties: {
          tahun_pelajaran_id: { type: 'string' },
        },
      },
    },
    handler: reportingController.getKurikulumReport.bind(reportingController),
  });

  // --- PDF Reports (Reporting Engine) ---
  fastify.get('/pdf/certificate/:siswaId', {
    preHandler: [requireCapability('reports.violation.view')],
    handler: reportingController.printCertificate.bind(reportingController),
  });

  fastify.get('/pdf/certificate/class/:kelasId/zip', {
    preHandler: [requireCapability('reports.violation.view')],
    handler: reportingController.printCertificateClassZip.bind(reportingController),
  });

  fastify.get('/pdf/invoice/:invoiceNumber', {
    preHandler: [requireCapability('reports.financial.view.monthly')],
    handler: reportingController.printInvoice.bind(reportingController),
  });

  fastify.get('/pdf/supervision/:supervisionId', {
    preHandler: [requireCapability('curriculum.supervision.view.report')],
    handler: reportingController.printSupervision.bind(reportingController),
  });

  fastify.get('/pdf/izin-keluar/:izinId', {
    preHandler: [requireCapability('reports.violation.view')],
    handler: reportingController.printIzinKeluar.bind(reportingController),
  });

  fastify.get('/pdf/kesiswaan-bulanan', {
    preHandler: [requireCapability('reports.violation.view')],
    handler: reportingController.printKesiswaanBulanan.bind(reportingController),
  });
}
