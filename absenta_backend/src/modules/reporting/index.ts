import { ModuleCapability } from '../../constants/capabilities';
import { reportingRoutes } from './routes/reporting.routes';

export async function reportingModule(fastify: any) {
  await fastify.register(async (subFastify: any) => {
    // Apply 'REPORTING' capability requirement to all routes in this module
    subFastify.addHook('onRoute', (routeOptions: any) => {
      if (!routeOptions.config) {
        routeOptions.config = {};
      }
      // Only set if not already set (allows override)
      if (!routeOptions.config.capability) {
        routeOptions.config.capability = ModuleCapability.REPORTING;
      }
    });

    await subFastify.register(reportingRoutes);
  }, { prefix: '/reports' });
}

export { FinancialService } from './services/financial.service';
export { ReportingController } from './controllers/reporting.controller';