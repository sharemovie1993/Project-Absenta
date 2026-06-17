import { prisma } from '../utils/prisma';
import { appLogger } from '../utils/app-logger';
import { defineCronJob } from '../infra/jobEngine';
import { LocalDiskStorage } from '../infra/storage/LocalDiskStorage';
import { BackupStatus } from '@prisma/client';
import { auditLogService } from '../modules/audit/services/audit-log.service';

export default defineCronJob({
  name: 'tenantBackupPurge',
  schedule: '0 3 * * *', // jam 03:00 setiap hari
  async run() {
    const storage = new LocalDiskStorage();
    const now = new Date();

    const expiredBackups = await prisma.tenantBackup.findMany({
      where: {
        expires_at: { lt: now },
        status: { not: BackupStatus.PURGED },
      },
    });

    for (const backup of expiredBackups) {
      try {
        await storage.delete(backup.file_path);
      } catch (e) {
        appLogger.error({ backup_id: backup.id, error: e }, 'Failed to delete backup file');
      }

      await prisma.tenantBackup.update({
        where: { id: backup.id },
        data: { status: BackupStatus.PURGED },
      });

      auditLogService.logEvent({
        event_type: 'TENANT_BACKUP_PURGED',
        severity: 'INFO',
        entity_type: 'TENANT_BACKUP',
        entity_id: backup.id,
        tenant_id: backup.tenant_id,
        metadata: { expires_at: backup.expires_at.toISOString() },
      });
    }

    appLogger.info({ purged: expiredBackups.length }, 'tenantBackupPurge.completed');
  },
});
