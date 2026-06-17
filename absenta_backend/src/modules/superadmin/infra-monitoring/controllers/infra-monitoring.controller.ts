import { InfraMonitoringService } from '../services/infra-monitoring.service';
import { isSystemSuperAdmin } from '../../../../utils/rbac';
import { isJobRunning, markJobEnd, tryStartJob } from '../../../../infra/jobRegistry';
import { observabilityService } from '../../../observability/services/observability.service';
import { auditLogService } from '../../../audit/services/audit-log.service';

export class InfraMonitoringController {
  private service: InfraMonitoringService;

  constructor() {
    this.service = new InfraMonitoringService();
  }

  async listJobs(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const data = await this.service.listJobs();
    reply.status(200);
    return { success: true, message: 'Jobs retrieved successfully', data };
  }

  async listWorkers(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const data = await this.service.listWorkers();
    reply.status(200);
    return { success: true, message: 'Workers retrieved successfully', data };
  }

  async listWorkerNodes(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const data = await this.service.listWorkerNodes();
    reply.status(200);
    return { success: true, message: 'Worker nodes retrieved successfully', data };
  }

  async clusterNodes(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const data = await this.service.listClusterNodes();
    reply.status(200);
    return { success: true, message: 'Cluster nodes retrieved successfully', data };
  }

  async clusterQueues(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const data = await this.service.listClusterQueues();
    reply.status(200);
    return { success: true, message: 'Cluster queues retrieved successfully', data };
  }

  async queuePressure(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const data = await this.service.listQueuePressure();
    reply.status(200);
    return { success: true, message: 'Queue pressure retrieved successfully', data };
  }

  async queueForecast(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const data = await this.service.listQueueForecast();
    reply.status(200);
    return { success: true, message: 'Queue forecast retrieved successfully', data };
  }

  async clusterWorkers(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const data = await this.service.listClusterWorkers();
    reply.status(200);
    return { success: true, message: 'Cluster workers retrieved successfully', data };
  }

  async autoscalerEvents(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const data = await this.service.listAutoscalerEvents();
    reply.status(200);
    return { success: true, message: 'Autoscaler events retrieved successfully', data };
  }

  async workerAction(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const rawBody = request.body || {};
    const action =
      typeof rawBody.action === 'string' && rawBody.action.trim().length > 0 ? String(rawBody.action).trim() : '';
    const workerType =
      typeof rawBody.workerType === 'string' && rawBody.workerType.trim().length > 0
        ? String(rawBody.workerType).trim()
        : '';
    const nodeId =
      typeof rawBody.nodeId === 'string' && rawBody.nodeId.trim().length > 0 ? String(rawBody.nodeId).trim() : '';
    if (!action || !workerType || !nodeId) {
      reply.status(400);
      return { success: false, code: 'INVALID_BODY', message: 'Expected body: { action, workerType, nodeId }' };
    }
    if (action !== 'start' && action !== 'stop' && action !== 'restart') {
      reply.status(400);
      return { success: false, code: 'INVALID_ACTION', message: 'Invalid action' };
    }
    try {
      const data = await this.service.workerAction({ action, workerType, nodeId });
      reply.status(200);
      return { success: true, message: 'Worker action published', data };
    } catch (e: any) {
      reply.status(400);
      return { success: false, message: e?.message || 'Failed to publish worker action' };
    }
  }

  async startWorker(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    try {
      console.log('[InfraWorkers] start payload:', request.body);
    } catch {}
    const rawBody = request.body || {};
    const nodeId =
      typeof rawBody.nodeId === 'string' && rawBody.nodeId.trim().length > 0
        ? rawBody.nodeId
        : typeof rawBody.node_id === 'string' && rawBody.node_id.trim().length > 0
        ? rawBody.node_id
        : null;
    const candidate = typeof rawBody.workerName === 'string' && rawBody.workerName.trim().length > 0
      ? rawBody.workerName
      : typeof rawBody.name === 'string' && rawBody.name.trim().length > 0
      ? rawBody.name
      : '';
    const workerName = String(candidate || '').trim();
    if (!workerName) {
      reply.status(400);
      return { success: false, code: 'INVALID_BODY', message: 'Expected body: { workerName: string }' };
    }
    try {
      await this.service.controlWorker('start', workerName, nodeId);
      auditLogService.logEvent({
        event_type: 'WORKER_START',
        severity: 'INFO',
        entity_type: 'WORKER',
        entity_id: workerName,
        tenant_id: 'system',
        user_id: request.user?.id ?? null,
        correlation_id: null,
        metadata: {},
      });
      reply.status(200);
      return { success: true, message: 'Worker started', data: { workerName } };
    } catch (e: any) {
      reply.status(400);
      return { success: false, message: e?.message || 'Failed to start worker' };
    }
  }

  async stopWorker(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    try {
      console.log('[InfraWorkers] stop payload:', request.body);
    } catch {}
    const rawBody = request.body || {};
    const nodeId =
      typeof rawBody.nodeId === 'string' && rawBody.nodeId.trim().length > 0
        ? rawBody.nodeId
        : typeof rawBody.node_id === 'string' && rawBody.node_id.trim().length > 0
        ? rawBody.node_id
        : null;
    const candidate = typeof rawBody.workerName === 'string' && rawBody.workerName.trim().length > 0
      ? rawBody.workerName
      : typeof rawBody.name === 'string' && rawBody.name.trim().length > 0
      ? rawBody.name
      : '';
    const workerName = String(candidate || '').trim();
    if (!workerName) {
      reply.status(400);
      return { success: false, code: 'INVALID_BODY', message: 'Expected body: { workerName: string }' };
    }
    try {
      await this.service.controlWorker('stop', workerName, nodeId);
      auditLogService.logEvent({
        event_type: 'WORKER_STOP',
        severity: 'WARNING',
        entity_type: 'WORKER',
        entity_id: workerName,
        tenant_id: 'system',
        user_id: request.user?.id ?? null,
        correlation_id: null,
        metadata: {},
      });
      reply.status(200);
      return { success: true, message: 'Worker stopped', data: { workerName } };
    } catch (e: any) {
      reply.status(400);
      return { success: false, message: e?.message || 'Failed to stop worker' };
    }
  }

  async restartWorker(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    try {
      console.log('[InfraWorkers] restart payload:', request.body);
    } catch {}
    const rawBody = request.body || {};
    const nodeId =
      typeof rawBody.nodeId === 'string' && rawBody.nodeId.trim().length > 0
        ? rawBody.nodeId
        : typeof rawBody.node_id === 'string' && rawBody.node_id.trim().length > 0
        ? rawBody.node_id
        : null;
    const candidate = typeof rawBody.workerName === 'string' && rawBody.workerName.trim().length > 0
      ? rawBody.workerName
      : typeof rawBody.name === 'string' && rawBody.name.trim().length > 0
      ? rawBody.name
      : '';
    const workerName = String(candidate || '').trim();
    if (!workerName) {
      reply.status(400);
      return { success: false, code: 'INVALID_BODY', message: 'Expected body: { workerName: string }' };
    }
    try {
      await this.service.controlWorker('restart', workerName, nodeId);
      auditLogService.logEvent({
        event_type: 'WORKER_RESTART',
        severity: 'INFO',
        entity_type: 'WORKER',
        entity_id: workerName,
        tenant_id: 'system',
        user_id: request.user?.id ?? null,
        correlation_id: null,
        metadata: {},
      });
      reply.status(200);
      return { success: true, message: 'Worker restarted', data: { workerName } };
    } catch (e: any) {
      reply.status(400);
      return { success: false, message: e?.message || 'Failed to restart worker' };
    }
  }

  async getJob(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    const name = request.params?.name as string;
    const job = await this.service.getJob(name);
    if (!job) {
      reply.status(404);
      return { success: false, code: 'JOB_NOT_FOUND', message: 'Job not found' };
    }
    reply.status(200);
    return { success: true, message: 'Job retrieved successfully', data: job };
  }

  async runJob(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    const name = request.params?.name as string;

    if (await isJobRunning(name)) {
      observabilityService.logEvent({
        event_type: 'INFRA_JOB_REJECTED_RUNNING',
        domain: 'INFRA',
        severity: 'WARNING',
        entity_type: 'JOB',
        entity_id: name,
        tenant_id: 'system',
        correlation_id: null,
        metadata: { job: name },
      });
      auditLogService.logEvent({
        event_type: 'INFRA_JOB_REJECTED_RUNNING',
        severity: 'WARNING',
        entity_type: 'JOB',
        entity_id: name,
        tenant_id: 'system',
        user_id: request.user?.id ?? null,
        correlation_id: null,
        metadata: {},
      });
      reply.status(409);
      return { success: false, code: 'JOB_ALREADY_RUNNING', message: 'Job already running' };
    }

    const startedAt = Date.now();
    const acquired = await tryStartJob(name);
    if (!acquired) {
      observabilityService.logEvent({
        event_type: 'INFRA_JOB_REJECTED_RUNNING',
        domain: 'INFRA',
        severity: 'WARNING',
        entity_type: 'JOB',
        entity_id: name,
        tenant_id: 'system',
        correlation_id: null,
        metadata: { job: name },
      });
      auditLogService.logEvent({
        event_type: 'INFRA_JOB_REJECTED_RUNNING',
        severity: 'WARNING',
        entity_type: 'JOB',
        entity_id: name,
        tenant_id: 'system',
        user_id: request.user?.id ?? null,
        correlation_id: null,
        metadata: {},
      });
      reply.status(409);
      return { success: false, code: 'JOB_ALREADY_RUNNING', message: 'Job already running' };
    }

    observabilityService.logEvent({
      event_type: 'INFRA_JOB_MANUAL_RUN',
      domain: 'INFRA',
      severity: 'INFO',
      entity_type: 'JOB',
      entity_id: name,
      tenant_id: 'system',
      correlation_id: null,
      metadata: { job: name },
    });

    auditLogService.logEvent({
      event_type: 'INFRA_JOB_MANUAL_RUN',
      severity: 'INFO',
      entity_type: 'JOB',
      entity_id: name,
      tenant_id: 'system',
      user_id: request.user?.id ?? null,
      correlation_id: null,
      metadata: {},
    });

    try {
      const { jobEngine } = await import('../../../../infra/jobEngine');
      await jobEngine.triggerJob(name);

      const durationMs = Date.now() - startedAt;
      await markJobEnd(name, durationMs);
      reply.status(200);
      return { success: true, message: 'Job executed successfully', data: { durationMs } };
    } catch (err: any) {
      const durationMs = Date.now() - startedAt;
      await markJobEnd(name, durationMs);
      reply.status(500);
      return { success: false, code: 'JOB_EXECUTION_FAILED', message: String(err?.message || err) };
    }
  }

  async listQueues(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const data = await this.service.listQueues();
    reply.status(200);
    return { success: true, message: 'Queues retrieved successfully', data };
  }

  async pauseQueue(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    const name = request.params?.name as string;
    const data = await this.service.pauseQueue(name);
    reply.status(200);
    return { success: true, message: 'Queue paused successfully', data };
  }

  async resumeQueue(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    const name = request.params?.name as string;
    const data = await this.service.resumeQueue(name);
    reply.status(200);
    return { success: true, message: 'Queue resumed successfully', data };
  }

  async diagnosticLoad(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    const count = Number(request.body?.count || request.query?.count || 15);
    const ms = Number(request.body?.ms || request.query?.ms || 5000);
    const data = await this.service.diagnosticLoad({ count, ms });
    reply.status(200);
    return { success: true, message: 'Diagnostic load enqueued', data };
  }

  async getHealth(request: any, reply: any) {
    if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
      reply.status(403);
      return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');
    const data = await this.service.getHealth();
    reply.status(200);
    return { success: true, message: 'Infra health retrieved successfully', data };
  }
}
