// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { AnnouncementService } from './announcement.service';
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { mockTenant } from '../../../utils/mocks';

export default async function announcementRoutes(fastify: FastifyInstance) {
    const getTenantId = (req: any) => {
        return (req.user?.tenant_id || req.user?.tenantId) || mockTenant.id;
    };

    fastify.get('/', async (req, reply) => {
        try {
            const tenantId = getTenantId(req);
            const announcements = await AnnouncementService.getAnnouncements(tenantId);
            return reply.status(200).send({ success: true, message: 'Daftar pengumuman berhasil dimuat', data: announcements });
        } catch (error: any) {
            appLogger.error({ err: error }, 'Error fetching announcements');
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    fastify.post('/', async (req, reply) => {
        try {
            const tenantId = getTenantId(req);
            const announcement = await AnnouncementService.createAnnouncement(tenantId, req.body);
            return reply.status(201).send({ success: true, message: 'Pengumuman berhasil dibuat', data: announcement });
        } catch (error: any) {
            appLogger.error({ err: error }, 'Error creating announcement');
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    fastify.delete('/:id', async (req, reply) => {
        try {
            const tenantId = getTenantId(req);
            await AnnouncementService.deleteAnnouncement(req.params.id, tenantId);
            return reply.status(200).send({ success: true, message: 'Pengumuman berhasil dihapus' });
        } catch (error: any) {
            appLogger.error({ err: error }, 'Error deleting announcement');
            return reply.status(500).send({ success: false, message: error.message });
        }
    });
}
