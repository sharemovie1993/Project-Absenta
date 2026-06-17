import { billingDashboardController } from '../controllers/billing-dashboard.controller';
import { determineDataScope } from '../../../middlewares/dataScope';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function billingDashboardRoutes(fastify: any) {
  fastify.addHook('preHandler', determineDataScope());

  const billingDashboardPreHandlers = [
    requireCapability('billing.subscriptions.view.list')
  ];

  fastify.get('/health/summary', {
    preHandler: [requireCapability("billing.monitoring.view.live.status")],
    schema: {
      description: 'Get aggregated billing health summary for dashboard',
      tags: ['Billing Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                active_without_paid_invoice_count: { type: 'number' },
                paid_not_applied_count: { type: 'number' },
                invalid_invoice_period_count: { type: 'number' },
                webhook_failures_last_1h: { type: 'number' },
                reconciliation_fix_count_last_1h: { type: 'number' },
              }
            }
          }
        }
      }
    }
  }, billingDashboardController.getBillingHealthSummary);

  // Financial metrics endpoint
  fastify.get('/metrics/financial', {
    preHandler: billingDashboardPreHandlers,
    schema: {
      description: 'Get financial metrics for billing dashboard',
      tags: ['Billing Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                total_revenue: { type: 'number' },
                monthly_revenue: { type: 'number' },
                daily_revenue: { type: 'number' },
                total_billings: { type: 'number' },
                paid_billings: { type: 'number' },
                overdue_billings: { type: 'number' },
                pending_billings: { type: 'number' },
                revenue_growth: { type: 'number' },
                payment_success_rate: { type: 'number' },
                failed_payments: { type: 'number' },
                active_subscriptions: { type: 'number' },
                subscription_growth: { type: 'number' },
                average_revenue_per_user: { type: 'number' },
                churn_rate: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, billingDashboardController.getFinancialMetrics);

  // Dashboard notifications endpoint
  fastify.get('/notifications', {
    preHandler: billingDashboardPreHandlers,
    schema: {
      description: 'Get billing-related notifications',
      tags: ['Billing Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  title: { type: 'string' },
                  message: { type: 'string' },
                  tenant_id: { type: 'string' },
                  is_read: { type: 'boolean' },
                  amount: { type: 'number' },
                  due_date: { type: 'string', format: 'date-time' },
                  tenant_name: { type: 'string' },
                  plan_name: { type: 'string' },
                  priority: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      }
    }
  }, billingDashboardController.getDashboardNotifications);

  fastify.patch('/notifications/:notificationId/read', {
    preHandler: billingDashboardPreHandlers,
    schema: {
      description: 'Mark billing dashboard notification as read',
      tags: ['Billing Dashboard'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['notificationId'],
        properties: {
          notificationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, billingDashboardController.markNotificationAsRead);

  fastify.patch('/notifications/mark-all-read', {
    preHandler: billingDashboardPreHandlers,
    schema: {
      description: 'Mark all billing dashboard notifications as read',
      tags: ['Billing Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, billingDashboardController.markAllNotificationsAsRead);

  // Recent activities endpoint
  fastify.get('/recent-activities', {
    preHandler: billingDashboardPreHandlers,
    schema: {
      description: 'Get recent billing activities',
      tags: ['Billing Dashboard'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  subscription_id: { type: 'string' },
                  amount: { type: 'number' },
                  billing_date: { type: 'string', format: 'date-time' },
                  status: { type: 'string' },
                  invoice_number: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  Invoice: { type: 'object', additionalProperties: true },
                  Subscription: { type: 'object', additionalProperties: true }
                },
                additionalProperties: true
              }
            }
          }
        }
      }
    }
  }, billingDashboardController.getRecentActivities);

  // Revenue chart data endpoint
  fastify.get('/revenue-chart', {
    preHandler: billingDashboardPreHandlers,
    schema: {
      description: 'Get revenue chart data for the last N months',
      tags: ['Billing Dashboard'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          months: { type: 'number', default: 6 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string' },
                  revenue: { type: 'number' },
                  paid_revenue: { type: 'number' },
                  billings: { type: 'number' },
                  paid_billings: { type: 'number' },
                  year: { type: 'number' },
                  month_number: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, billingDashboardController.getRevenueChartData);
}
