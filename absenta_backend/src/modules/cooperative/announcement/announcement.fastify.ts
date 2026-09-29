// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { AnnouncementService } from './announcement.service';
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

export default async function announcementRoutes(fastify: FastifyInstance) {
    const getTenantId = (req: any) => {
        return (req.user?.tenant_id || req.user?.tenantId) || mockTenant.id;
    };

    const broadcastCoopAnnouncement = (req: any, type: string, payload: any = {}) => {
        const io = req.server?.io || fastify.io;
        if (io) {
            const broadcastPayload = {
                type,
                ...payload,
                timestamp: new Date().toISOString()
            };
            const tenantId = getTenantId(req);
            if (tenantId) {
                io.to(`tenant:${tenantId}`).emit('coop_announcement_update', broadcastPayload);
            }
            io.emit('coop_announcement_update', broadcastPayload);
        }
    };

    fastify.get('/', { preHandler: [requireCapability('cooperative.announcements.view.list')] }, async (req, reply) => {
        try {
            const tenantId = getTenantId(req);
            const announcements = await AnnouncementService.getAnnouncements(tenantId);
            return reply.status(200).send({ success: true, message: 'Daftar pengumuman berhasil dimuat', data: announcements });
        } catch (error: any) {
            appLogger.error({ err: error }, 'Error fetching announcements');
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    fastify.post('/', { preHandler: [requireCapability('cooperative.announcements.create')] }, async (req, reply) => {
        try {
            const tenantId = getTenantId(req);
            const announcement = await AnnouncementService.createAnnouncement(tenantId, req.body);
            broadcastCoopAnnouncement(req, 'ANNOUNCEMENT_CREATED', { id: announcement.id, title: announcement.title });
            return reply.status(201).send({ success: true, message: 'Pengumuman berhasil dibuat', data: announcement });
        } catch (error: any) {
            appLogger.error({ err: error }, 'Error creating announcement');
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    fastify.delete('/:id', { preHandler: [requireCapability('cooperative.announcements.delete')] }, async (req, reply) => {
        try {
            const tenantId = getTenantId(req);
            await AnnouncementService.deleteAnnouncement(req.params.id, tenantId);
            broadcastCoopAnnouncement(req, 'ANNOUNCEMENT_DELETED', { id: req.params.id });
            return reply.status(200).send({ success: true, message: 'Pengumuman berhasil dihapus' });
        } catch (error: any) {
            appLogger.error({ err: error }, 'Error deleting announcement');
            return reply.status(500).send({ success: false, message: error.message });
        }
    });
}
