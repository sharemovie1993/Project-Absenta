import { InfraMonitoringController } from '../controllers/infra-monitoring.controller';
import { requireCapability } from '@/middlewares/requireCapability';

export async function infraMonitoringRoutes(fastify: any) {
  const controller = new InfraMonitoringController();

  fastify.get('/jobs', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.listJobs.bind(controller),
  });

  fastify.get('/jobs/:name', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.getJob.bind(controller),
  });

  fastify.post('/jobs/:name/run', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.runJob.bind(controller),
  });

  fastify.get('/queues', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.listQueues.bind(controller),
  });

  fastify.post('/queues/:name/pause', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.pauseQueue.bind(controller),
  });

  fastify.post('/queues/:name/resume', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.resumeQueue.bind(controller),
  });

  fastify.get('/health', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.getHealth.bind(controller),
  });

  fastify.get('/workers', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.listWorkers.bind(controller),
  });

  fastify.get('/worker-nodes', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.listWorkerNodes.bind(controller),
  });

  fastify.get('/cluster/nodes', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.clusterNodes.bind(controller),
  });

  fastify.get('/cluster/queues', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.clusterQueues.bind(controller),
  });

  fastify.get('/queue-pressure', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.queuePressure.bind(controller),
  });

  fastify.get('/queue-forecast', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.queueForecast.bind(controller),
  });

  fastify.get('/cluster/workers', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.clusterWorkers.bind(controller),
  });

  fastify.get('/cluster/autoscaler-events', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.autoscalerEvents.bind(controller),
  });

  fastify.post('/workers/start', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.startWorker.bind(controller),
  });

  fastify.post('/workers/stop', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.stopWorker.bind(controller),
  });

  fastify.post('/workers/restart', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.restartWorker.bind(controller),
  });

  fastify.post('/workers/action', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.workerAction.bind(controller),
  });

  fastify.post('/diagnostic-load', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: controller.diagnosticLoad.bind(controller),
  });
}
