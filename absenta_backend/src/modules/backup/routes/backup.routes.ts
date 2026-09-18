import { BackupController } from '../controllers/backup.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { restoreProgressRoutes } from '../restore.progress.routes';
import { determineDataScope } from '@/middlewares/dataScope';

export async function backupRoutes(fastify: any) {
    fastify.get('/admin/backups', { preHandler: [requireCapability("academic.backups.view.list"), determineDataScope()] }, BackupController.list);
    fastify.get('/admin/backups/:id/download', { preHandler: [requireCapability("academic.backups.view.list"), determineDataScope()] }, BackupController.download);
    fastify.post('/admin/backups/:id/restore', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.restore);
    fastify.post('/admin/backups/create-snapshot', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.createManualSnapshot);
    fastify.post('/admin/backups/factory-reset', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.factoryResetToFreshBaseline);

    // Tenant One-Click .absenta Bundle endpoints (Academic & Settings)
    fastify.get('/academic/backup/export', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/academic/backup/export', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/academic/backup/import', { bodyLimit: 209715200, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.importBundle);
    fastify.post('/academic/backup/purge-tenant', { preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.purgeTenantData);
    fastify.post('/academic/backup/export-bundle', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/academic/backup/inspect-bundle', { bodyLimit: 209715200, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.inspectBundle);
    fastify.post('/academic/backup/import-bundle', { bodyLimit: 209715200, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.importBundle);

    // Settings Backup Aliases
    fastify.get('/settings/backup/export', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/settings/backup/export', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/settings/backup/import', { bodyLimit: 209715200, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.importBundle);
    fastify.post('/settings/backup/purge-tenant', { preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.purgeTenantData);
    fastify.post('/settings/backup/export-bundle', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/settings/backup/inspect-bundle', { bodyLimit: 209715200, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.inspectBundle);
    fastify.post('/settings/backup/import-bundle', { bodyLimit: 209715200, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.importBundle);
    
    // One-Click Migration Bundle (.absenta) endpoints (Admin & SuperAdmin)
    fastify.post('/admin/backups/export-bundle', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportBundle);
    fastify.post('/admin/backups/inspect-bundle', { bodyLimit: 209715200, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.inspectBundle);
    fastify.post('/admin/backups/import-bundle', { bodyLimit: 209715200, preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.importBundle);

    // Replication & Storage Mirroring Endpoints (SuperAdmin)
    fastify.get('/admin/backups/replication/config', { preHandler: [requireCapability("academic.backups.view.list"), determineDataScope()] }, BackupController.getReplicationConfig);
    fastify.post('/admin/backups/replication/config', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.saveReplicationConfig);
    fastify.post('/admin/backups/replication/test', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.testReplicationConnection);
    fastify.get('/admin/backups/replication/status', { preHandler: [requireCapability("academic.backups.view.list"), determineDataScope()] }, BackupController.getReplicationStatus);
    fastify.post('/admin/backups/replication/sync', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.triggerReplicationSync);

    // SSE Endpoint (Must be registered)
    fastify.register(restoreProgressRoutes, { prefix: '/admin/backups' }); 

}
