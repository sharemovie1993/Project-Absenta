// @ts-nocheck
import { DashboardController } from '../../controllers/dashboard.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function dashboardAnalyticsRoutes(fastify: any) {
  const dashboardController = new DashboardController();
  fastify.get('/stats', {
    preHandler: [requireCapability("dashboard.view.financial.summary"), determineDataScope()],
    schema: {
      description: 'Get dashboard analytics statistics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                totalUsers: { type: 'number' },
                totalBilling: { type: 'number' },
                totalPayments: { type: 'number' },
                totalRevenue: { type: 'number' },
                userGrowth: { type: 'number' },
                billingGrowth: { type: 'number' },
                paymentGrowth: { type: 'number' },
                revenueGrowth: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getDashboardStats.bind(dashboardController));

  /**
   * 7️⃣ Recent Payments
   * GET /dashboard/recent-payments
   */
  fastify.get('/recent-payments', {
    preHandler: [requireCapability("dashboard.view.financial.summary"), determineDataScope()],
    schema: {
      description: 'Get recent payments for analytics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  billingId: { type: 'string' },
                  amount: { type: 'number' },
                  status: { type: 'string' },
                  paymentTime: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getRecentPayments.bind(dashboardController));

  /**
   * 8️⃣ Payment Chart Data
   * GET /dashboard/payment-chart
   */
  fastify.get('/payment-chart', {
    preHandler: [requireCapability("dashboard.view.financial.summary"), determineDataScope()],
    schema: {
      description: 'Get payment chart data for analytics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string' },
                  amount: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getPaymentChart.bind(dashboardController));

  /**
   * 9️⃣ Effective Capabilities per Guru
   * GET /dashboard/guru/:guruId/capabilities
   */
  fastify.get('/guru/:guruId/capabilities', {
    preHandler: [requireCapability(['academic.teachers.view.detail', 'academic.teachers.update']), determineDataScope()],
    schema: {
      description: 'Get effective capabilities for a guru based on active structures',
      tags: ['Dashboard'],
      params: {
        type: 'object',
        required: ['guruId'],
        properties: {
          guruId: {
            type: 'string',
            description: 'Guru ID'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                guru: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    nama_guru: { type: 'string' },
                    tenant_id: { type: 'string' }
                  }
                },
                structures: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      struktur_id: { type: 'string' },
                      kode: { type: 'string' },
                      nama: { type: 'string' },
                      start_date: { type: 'string', format: 'date-time' },
                      end_date: { type: ['string', 'null'], format: 'date-time' },
                      is_active: { type: 'boolean' },
                      capabilities: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                },
                capabilities: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getGuruCapabilities.bind(dashboardController));

  // Recent tenant registrations (SUPERADMIN only)
  // Hubin Stats
}
