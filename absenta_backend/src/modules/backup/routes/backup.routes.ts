import { BackupController } from '../controllers/backup.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { restoreProgressRoutes } from '../restore.progress.routes';
import { determineDataScope } from '@/middlewares/dataScope';

export async function backupRoutes(fastify: any) {
    fastify.get('/admin/backups', { preHandler: [requireCapability("academic.backups.view.list"), determineDataScope()] }, BackupController.list);
    fastify.get('/admin/backups/:id/download', { preHandler: [requireCapability("academic.backups.view.list"), determineDataScope()] }, BackupController.download);
    fastify.post('/admin/backups/:id/restore', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.restore);

    // Academic Tenant Export & Import endpoints
    fastify.get('/academic/backup/export', { preHandler: [requireCapability("academic.backups.create"), determineDataScope()] }, BackupController.exportTenantData);
    fastify.post('/academic/backup/import', { preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.importTenantData);
    fastify.post('/academic/backup/purge-tenant', { preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, BackupController.purgeTenantData);
    
    // SSE Endpoint (Must be registered)
    fastify.register(restoreProgressRoutes, { prefix: '/admin/backups' }); 
}
