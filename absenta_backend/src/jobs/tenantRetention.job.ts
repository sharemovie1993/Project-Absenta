import { prisma } from '../utils/prisma';
import { appLogger } from '../utils/app-logger';
import { observabilityService } from '../modules/observability/services/observability.service';
import { defineCronJob } from '../infra/jobEngine';
import { BackupService } from '../modules/backup/services/backup.service';

const TENANT_RETENTION_DAYS = parseInt(process.env.TENANT_RETENTION_DAYS || '30', 10);

export default defineCronJob({
  name: 'tenantRetention',
  schedule: '0 0 * * *', // tengah malam setiap hari
  envFlag: 'TENANT_RETENTION_ENABLED',
  async run() {
    const correlationId = `cron-tenant-retention-${new Date().toISOString().slice(0, 10)}`;
    const backupService = new BackupService(prisma);

    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - TENANT_RETENTION_DAYS);

    const tenantsToDelete = await prisma.tenant.findMany({
      where: {
        status: 'PENDING_DELETION',
        deletion_requested_at: { lt: retentionCutoff },
      },
      select: { id: true, name: true, domain: true },
    });

    appLogger.info(
      { correlation_id: correlationId, count: tenantsToDelete.length },
      'tenantRetention.cycle_started'
    );

    for (const tenant of tenantsToDelete) {
      try {
        appLogger.info(
          { correlation_id: correlationId, tenant_id: tenant.id },
          'Creating cold archive backup before deletion'
        );
        await backupService.createSnapshot(tenant.id);

        await prisma.tenant.delete({ where: { id: tenant.id } });

        observabilityService.logEvent({
          event_type: 'TENANT_DELETED',
          domain: 'INFRA',
          severity: 'WARNING',
          entity_type: 'TENANT',
          entity_id: tenant.id,
          tenant_id: 'system',
          correlation_id: correlationId,
          metadata: {
            tenant_name: tenant.name,
            domain: tenant.domain,
            reason: 'retention_policy_expired',
          },
        });

        appLogger.info(
          { correlation_id: correlationId, tenant_id: tenant.id },
          'Tenant deleted permanently'
        );
      } catch (err: any) {
        appLogger.error(
          { correlation_id: correlationId, tenant_id: tenant.id, error: err.message },
          'Failed to delete tenant'
        );
      }
    }

    appLogger.info(
      { correlation_id: correlationId, processed: tenantsToDelete.length },
      'tenantRetention.cycle_completed'
    );
  },
});
