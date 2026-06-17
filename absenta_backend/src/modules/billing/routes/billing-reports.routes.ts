import { billingReportsController } from '../controllers/billing-reports.controller';
import { determineDataScope } from '../../../middlewares/dataScope';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function billingReportsRoutes(fastify: any) {
  fastify.addHook('preHandler', determineDataScope());

  const preHandlers = [requireCapability('billing.subscriptions.view.list')];

  fastify.get('/revenue', { preHandler: preHandlers }, billingReportsController.getRevenueReport);
  fastify.get('/payment-gateways', { preHandler: preHandlers }, billingReportsController.getPaymentGatewayStats);
  fastify.get('/subscription-trends', { preHandler: preHandlers }, billingReportsController.getSubscriptionTrends);
  fastify.get('/revenue-breakdown', { preHandler: preHandlers }, billingReportsController.getRevenueBreakdown);

  fastify.post('/generate', { preHandler: preHandlers }, billingReportsController.generateReport);
  fastify.get('/export', { preHandler: preHandlers }, billingReportsController.exportReport);
  fastify.post('/schedule', { preHandler: preHandlers }, billingReportsController.scheduleReport);
}

