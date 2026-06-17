import { billingController } from '../controllers/billing.controller';
import { determineDataScope } from '../../../middlewares/dataScope';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function billingRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [requireCapability('billing.invoices.view.list'), determineDataScope()],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          tenant_id: { type: 'string' },
          search: { type: 'string' }
        }
      }
    },
    handler: billingController.getAllBillings.bind(billingController),
  });

  fastify.get('/stats', {
    preHandler: [requireCapability('billing.reports.view.summary'), determineDataScope()],
    handler: billingController.getBillingStats.bind(billingController),
  });

  fastify.get('/subscription/:subscription_id', {
    preHandler: [requireCapability('billing.billings.view.list'), determineDataScope()],
    handler: billingController.getBillingsBySubscription.bind(billingController),
  });

  fastify.get('/:id', {
    preHandler: [requireCapability('billing.billings.view.detail'), determineDataScope()],
    handler: billingController.getBillingById.bind(billingController),
  });

  fastify.post('/', {
    preHandler: [requireCapability('billing.invoices.generate'), determineDataScope()],
    handler: billingController.createBilling.bind(billingController),
  });

  fastify.post('/generate', {
    preHandler: [requireCapability('billing.invoices.generate'), determineDataScope()],
    handler: billingController.generateSimpleBilling.bind(billingController),
  });

  fastify.post('/generate-monthly', {
    preHandler: [requireCapability('billing.invoices.generate'), determineDataScope()],
    handler: billingController.generateMonthlyBilling.bind(billingController),
  });

  fastify.put('/:id', {
    preHandler: [requireCapability('billing.invoices.generate'), determineDataScope()],
    handler: billingController.updateBilling.bind(billingController),
  });

  fastify.post('/:id/mark-paid', {
    preHandler: [requireCapability('billing.invoices.pay'), determineDataScope()],
    handler: billingController.markAsPaid.bind(billingController),
  });

  fastify.post('/:id/mark-overdue', {
    preHandler: [requireCapability('billing.invoices.pay'), determineDataScope()],
    handler: billingController.markAsOverdue.bind(billingController),
  });

  fastify.post('/check-overdue', {
    preHandler: [requireCapability('billing.invoices.generate'), determineDataScope()],
    handler: billingController.checkOverdueBillings.bind(billingController),
  });

  fastify.post('/run-recurring', {
    preHandler: [requireCapability('billing.invoices.generate'), determineDataScope()],
    handler: billingController.runRecurringScheduler.bind(billingController),
  });

  fastify.post('/:id/generate-invoice', {
    preHandler: [requireCapability('billing.invoices.generate'), determineDataScope()],
    handler: billingController.generateInvoice.bind(billingController),
  });

  fastify.delete('/:id', {
    preHandler: [requireCapability('billing.invoices.cancel'), determineDataScope()],
    handler: billingController.deleteBilling.bind(billingController),
  });
}
