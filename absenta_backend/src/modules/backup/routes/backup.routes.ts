import { BackupController } from '../controllers/backup.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { restoreProgressRoutes } from '../restore.progress.routes';
import { determineDataScope } from '@/middlewares/dataScope';

export async function backupRoutes(fastify: any) {
    fastify.get('/admin/backups', { preHandler: [requireCapability("academic.backups.view.list"), determineDataScope()] }, BackupController.list);
    fastify.get('/admin/backups/:id/download', { preHandler: [requireCapability("academic.backups.view.list"), determineDataScope()] }, BackupController.download);
    fastify.post('/admin/backups/:id/restore', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.restore);
    fastify.post('/admin/backups/:id/clone', { preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.cloneFromArchive);
    fastify.post('/admin/backups/create-snapshot', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.createManualSnapshot);
    fastify.post('/admin/backups/factory-reset', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.factoryResetToFreshBaseline);

    // Tenant One-Click .absenta Bundle endpoints (Academic & Settings)
    fastify.get('/academic/backup/export', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/academic/backup/export', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/academic/backup/import', { bodyLimit: 2147483648, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.importBundle);
    fastify.post('/academic/backup/purge-tenant', { preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.purgeTenantData);
    fastify.post('/academic/backup/export-bundle', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/academic/backup/inspect-bundle', { bodyLimit: 2147483648, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.inspectBundle);
    fastify.post('/academic/backup/import-bundle', { bodyLimit: 2147483648, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.importBundle);

    // Settings Backup Aliases
    fastify.get('/settings/backup/export', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/settings/backup/export', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/settings/backup/import', { bodyLimit: 2147483648, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.importBundle);
    fastify.post('/settings/backup/purge-tenant', { preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.purgeTenantData);
    fastify.post('/settings/backup/export-bundle', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/settings/backup/inspect-bundle', { bodyLimit: 2147483648, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.inspectBundle);
    fastify.post('/settings/backup/import-bundle', { bodyLimit: 2147483648, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.importBundle);
    
    // One-Click Migration Bundle (.absenta) endpoints (Admin & SuperAdmin)
    fastify.post('/admin/backups/export-bundle', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/admin/backups/inspect-bundle', { bodyLimit: 2147483648, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.inspectBundle);
    fastify.post('/admin/backups/import-bundle', { bodyLimit: 2147483648, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.importBundle);

    // Asynchronous Background Job Endpoints (Mitigasi Timeout & Skala Enterprise)
    fastify.post('/academic/backup/export-async', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.startExportJob);
    fastify.post('/academic/backup/import-async', { bodyLimit: 2147483648, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.startRestoreJob);
    fastify.get('/academic/backup/jobs/:id/status', { preHandler: [determineDataScope()] }, BackupController.getJobStatus);
    fastify.get('/academic/backup/jobs/:id/download', { preHandler: [determineDataScope()] }, BackupController.downloadJobResult);
    fastify.get('/academic/backup/jobs/:id/stream', { preHandler: [determineDataScope()] }, BackupController.streamJobProgress);

    fastify.post('/settings/backup/export-async', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.startExportJob);
    fastify.post('/settings/backup/import-async', { bodyLimit: 2147483648, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.startRestoreJob);

    fastify.post('/admin/backups/export-async', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.startExportJob);
    fastify.post('/admin/backups/import-async', { bodyLimit: 2147483648, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.startRestoreJob);
    fastify.get('/admin/backups/jobs/:id/status', { preHandler: [determineDataScope()] }, BackupController.getJobStatus);
    fastify.get('/admin/backups/jobs/:id/download', { preHandler: [determineDataScope()] }, BackupController.downloadJobResult);
    fastify.get('/admin/backups/jobs/:id/stream', { preHandler: [determineDataScope()] }, BackupController.streamJobProgress);

    // Replication & Storage Mirroring Endpoints (SuperAdmin)
    fastify.get('/admin/backups/replication/config', { preHandler: [requireCapability("academic.backups.view.list"), determineDataScope()] }, BackupController.getReplicationConfig);
    fastify.post('/admin/backups/replication/config', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.saveReplicationConfig);
    fastify.post('/admin/backups/replication/test', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.testReplicationConnection);
    fastify.get('/admin/backups/replication/status', { preHandler: [requireCapability("academic.backups.view.list"), determineDataScope()] }, BackupController.getReplicationStatus);
    fastify.post('/admin/backups/replication/sync', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.triggerReplicationSync);

    // SSE Endpoint (Must be registered)
    fastify.register(restoreProgressRoutes, { prefix: '/admin/backups' }); 

}
