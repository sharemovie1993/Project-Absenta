import { billingService, CreateBillingInput, UpdateBillingInput } from '../services/billing.service';
import { InvoiceStatus } from '@prisma/client';
import { runRecurringBillingCycle } from '@/jobs/recurringBilling.job';
import { emitDomainEvent } from '@/infra/event-bus';

export const billingController = {
  async getAllBillings(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { status, tenant_id, search } = request.query;
      
      // Validate status if provided
      let statusFilter: InvoiceStatus | 'UNPAID' | undefined;
      const validStatuses = [...Object.values(InvoiceStatus), 'UNPAID'] as string[];
      
      if (status && validStatuses.includes(status)) {
        statusFilter = status as InvoiceStatus | 'UNPAID';
      }

      const billings = await billingService.getAllBillings(scope, statusFilter, search, tenant_id);

      reply.status(200);
      return {
        success: true,
        message: 'Billings retrieved successfully',
        data: billings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve billings';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async runRecurringScheduler(_request: any, reply: any) {
    try {
      // Access control handled by route middleware (SUPERADMIN only)
      await runRecurringBillingCycle();
      reply.status(200);
      return {
        success: true,
        message: 'Recurring billing cycle triggered successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to trigger recurring billing cycle';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getBillingById(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { id } = request.params;

      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Billing ID is required',
        };
      }

      const billing = await billingService.getBillingById(scope, id);

      if (!billing) {
        reply.status(404);
        return {
          success: false,
          message: 'Billing record not found',
        };
      }

      reply.status(200);
      return {
        success: true,
        message: 'Billing retrieved successfully',
        data: billing,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve billing';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getBillingsBySubscription(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { subscription_id } = request.params;

      if (!subscription_id) {
        reply.status(400);
        return {
          success: false,
          message: 'Subscription ID is required',
        };
      }

      const billings = await billingService.getBillingsBySubscription(scope, subscription_id);

      reply.status(200);
      return {
        success: true,
        message: 'Subscription billings retrieved successfully',
        data: billings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve subscription billings';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async createBilling(request: any, reply: any) {
    try {
      // Access control is handled by route middleware (SUPERADMIN only)
      
      const { subscription_id, amount, billing_date, due_date, payment_method, payment_reference } = request.body;

      // Validate required fields
      if (!subscription_id || amount === undefined || !billing_date || !due_date) {
        reply.status(400);
        return {
          success: false,
          message: 'Missing required fields: subscription_id, amount, billing_date, due_date',
        };
      }

      // Validate and parse dates
      const billingDate = new Date(billing_date);
      const dueDate = new Date(due_date);

      if (isNaN(billingDate.getTime()) || isNaN(dueDate.getTime())) {
        reply.status(400);
        return {
          success: false,
          message: 'Invalid date format',
        };
      }

      // Validate amount
      if (typeof amount !== 'number' || amount <= 0) {
        reply.status(400);
        return {
          success: false,
          message: 'Amount must be a positive number',
        };
      }

      const billingInput: CreateBillingInput = {
        subscription_id,
        amount,
        billing_date: billingDate,
        due_date: dueDate,
        payment_method,
        payment_reference,
        correlation_id: request.correlationId,
      };

      const billing = await billingService.createBilling(billingInput);

      reply.status(201);
      return {
        success: true,
        message: 'Billing created successfully',
        data: billing,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create billing';
      
      if (errorMessage.includes('not found') || errorMessage.includes('must be')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async generateSimpleBilling(request: any, reply: any) {
    try {
      // Access control handled by route middleware (SUPERADMIN only)
      const { subscription_id, amount, billing_date, due_date } = request.body;

      // Basic validation
      if (!subscription_id || amount === undefined || !billing_date || !due_date) {
        reply.status(400);
        return {
          success: false,
          message: 'Missing required fields: subscription_id, amount, billing_date, due_date',
        };
      }

      const billing = await billingService.createBilling({
        subscription_id,
        amount,
        billing_date: new Date(billing_date),
        due_date: new Date(due_date),
        correlation_id: request.correlationId,
      });

      await emitDomainEvent({
        event_type: 'billing.invoice.requested',
        tenant_id: billing.Subscription?.tenant_id || null,
        source_service: 'billing',
        payload: {
          tenant_id: billing.Subscription?.tenant_id || null,
          subscription_id: billing.subscription_id,
          billing_id: billing.id,
          timestamp: new Date().toISOString(),
          invoice_data: { due_date: new Date(due_date).toISOString() },
          send: false,
          correlation_id: request.correlationId || null,
        },
      });

      reply.status(201);
      return {
        success: true,
        message: 'Billing created and invoice requested successfully',
        data: { billing, invoice: null, queued: true },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate billing and invoice';
      if (errorMessage.includes('not found') || errorMessage.includes('must be')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async updateBilling(request: any, reply: any) {
    try {
      // Access control handled by route middleware (SUPERADMIN only)
      const { id } = request.params;
      
      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Billing ID is required',
        };
      }

      const { amount, billing_date, charge_type, payment_method, payment_reference } = request.body;

      const updateInput: UpdateBillingInput = {};
      
      if (amount !== undefined) {
        if (typeof amount !== 'number' || amount <= 0) {
          reply.status(400);
          return {
            success: false,
            message: 'Amount must be a positive number',
          };
        }
        updateInput.amount = amount;
      }
      
      // status now belongs to Invoice, not Billing
      
      if (payment_method !== undefined) updateInput.payment_method = payment_method;
      if (payment_reference !== undefined) updateInput.payment_reference = payment_reference;
      if (charge_type !== undefined) updateInput.charge_type = charge_type;
      
      if (billing_date !== undefined) {
        const billingDate = new Date(billing_date);
        if (isNaN(billingDate.getTime())) {
          reply.status(400);
          return {
            success: false,
            message: 'Invalid billing_date format',
          };
        }
        updateInput.billing_date = billingDate;
      }
      
      // due_date and paid_at now belong to Invoice

      const billing = await billingService.updateBilling(id, updateInput);

      reply.status(200);
      return {
        success: true,
        message: 'Billing updated successfully',
        data: billing,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update billing';
      
      if (errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('must be')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async markAsPaid(request: any, reply: any) {
    try {
      void request;
      return reply.status(403).send({
        success: false,
        message: 'Only payment webhook may mark billing as paid',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark billing as paid';
      
      if (errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('already marked')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async markAsOverdue(request: any, reply: any) {
    try {
      // Access control handled by route middleware (SUPERADMIN only)
      const { id } = request.params;
      
      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Billing ID is required',
        };
      }

      const billing = await billingService.markAsOverdue(id);

      reply.status(200);
      return {
        success: true,
        message: 'Billing marked as overdue successfully',
        data: billing,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark billing as overdue';
      
      if (errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('Cannot mark')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async checkOverdueBillings(_request: any, reply: any) {
    try {
      // Access control handled by route middleware (SUPERADMIN only)
      const overdueBillings = await billingService.checkOverdueBillings();

      reply.status(200);
      return {
        success: true,
        message: `Found and updated ${overdueBillings.length} overdue billings`,
        data: overdueBillings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check overdue billings';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getBillingStats(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { tenant_id } = request.query;
      
      const stats = await billingService.getBillingStats(scope, tenant_id);

      reply.status(200);
      return {
        success: true,
        message: 'Billing statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve billing statistics';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async generateMonthlyBilling(request: any, reply: any) {
    try {
      // Access control via route middleware (SUPERADMIN only)
      
      const { subscription_id, month, year } = request.body;

      // Validate required fields
      if (!subscription_id || !month || !year) {
        reply.status(400);
        return {
          success: false,
          message: 'Missing required fields: subscription_id, month, year',
        };
      }

      // Validate month and year
      if (typeof month !== 'number' || month < 1 || month > 12) {
        reply.status(400);
        return {
          success: false,
          message: 'Month must be a number between 1 and 12',
        };
      }

      if (typeof year !== 'number' || year < 2020 || year > 2100) {
        reply.status(400);
        return {
          success: false,
          message: 'Year must be a valid number',
        };
      }

      const billing = await billingService.generateMonthlyBilling(subscription_id, month, year);

      reply.status(201);
      return {
        success: true,
        message: 'Monthly billing generated successfully',
        data: billing,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate monthly billing';
      
      if (errorMessage.includes('not found') || errorMessage.includes('not active') || errorMessage.includes('already exists')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async generateInvoice(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params; // billing_id
      const invoiceData = request.body || {};

      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Billing ID is required',
        };
      }

      // Get billing to check permissions
      const billing = await billingService.getBillingById(request.dataScope, id);

      if (!billing) {
        reply.status(404);
        return {
          success: false,
          message: 'Billing record not found',
        };
      }

      // Check permissions
      // Already enforced by getBillingById with DataScope
      const tenant_id = billing.Subscription?.tenant_id || '';

      // Block ADMIN generating invoice for TRIAL subscription
      if (user.roleName === 'ADMIN' && String(billing.Subscription?.status) === 'TRIAL') {
        reply.status(403);
        return {
          success: false,
          message: 'Admins cannot generate invoice for TRIAL subscription',
        };
      }

      await emitDomainEvent({
        event_type: 'billing.invoice.requested',
        tenant_id: tenant_id || null,
        source_service: 'billing',
        payload: {
          tenant_id: tenant_id || null,
          subscription_id: billing.subscription_id,
          billing_id: id,
          timestamp: new Date().toISOString(),
          invoice_data: invoiceData,
          send: false,
          requested_by: { user_id: user?.id || null, role: user?.roleName || null, tenant_id: user?.tenant_id || null },
          correlation_id: request.correlationId || null,
        },
      });

      reply.status(201);
      return {
        success: true,
        message: 'Invoice requested successfully',
        data: { billing_id: id, queued: true },
      };
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      
      const errorMessage = error.message || 'Failed to generate invoice';
      
      if (errorMessage.includes('tidak ditemukan') || errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('sudah dibuat') || errorMessage.includes('already exists')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async deleteBilling(request: any, reply: any) {
    try {
      // Access control handled by route middleware (SUPERADMIN only)
      const { id } = request.params;
      
      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Billing ID is required',
        };
      }

      await billingService.deleteBilling(id);

      reply.status(200);
      return {
        success: true,
        message: 'Billing deleted successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete billing';
      
      if (errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('Cannot delete')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },
};
