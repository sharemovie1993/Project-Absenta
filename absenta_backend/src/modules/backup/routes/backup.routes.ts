import { BackupController } from '../controllers/backup.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { restoreProgressRoutes } from '../restore.progress.routes';

export async function backupRoutes(fastify: any) {
    fastify.get('/admin/backups', { preHandler: [requireCapability("academic.backups.view.list")] }, BackupController.list);
    fastify.get('/admin/backups/:id/download', { preHandler: [requireCapability("academic.backups.view.list")] }, BackupController.download);
    fastify.post('/admin/backups/:id/restore', { preHandler: [requireCapability("academic.backups.create")] }, BackupController.restore);
    
    // SSE Endpoint (Must be registered)
    // Note: SSE endpoints might need special handling for auth if using standard EventSource in browser which doesn't support headers easily.
    // For now, we protect it. Frontend can use EventSourcePolyfill or query param token if needed.
    // Assuming cookie-based auth or similar for now, or just same protection.
    fastify.register(restoreProgressRoutes, { prefix: '/admin/backups' }); 
}
