// @ts-nocheck
import { FastifyInstance, FastifyRequest } from 'fastify';
import { AnnouncementService } from './announcement.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

const getTenantId = (req: any) => {
    return ((req.user as any)?.tenant_id || (req.user as any)?.tenantId) || mockTenant.id;
};

export default async function announcementRoutes(fastify: any) {
    // Get all announcements
    fastify.get('/', { preHandler: [requireCapability('cooperative.announcements.view.list')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const announcements = await AnnouncementService.getAnnouncements(tenantId);
        return reply.send({ data: announcements });
    });

    // Create announcement
    fastify.post('/', { preHandler: [requireCapability('cooperative.announcements.create')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const data = req.body as any;
        const announcement = await AnnouncementService.createAnnouncement(tenantId, data);
        return reply.send({ message: 'Announcement created', data: announcement });
    });

    // Delete announcement
    fastify.delete('/:id', { preHandler: [requireCapability('cooperative.announcements.delete')] }, async (req: any, reply: any) => {
        const { id } = req.params as any;
        await AnnouncementService.deleteAnnouncement(id);
        return reply.send({ message: 'Announcement deleted' });
    });
}



