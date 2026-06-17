// @ts-nocheck
import { FastifyInstance, FastifyRequest } from 'fastify';
import { TicketService } from './ticket.service';
import { MemberService } from '../member/member.service';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

const getTenantId = (req: any) => {
    return ((req.user as any)?.tenant_id || (req.user as any)?.tenantId) || mockTenant.id;
};

export default async function ticketRoutes(fastify: any) {
    // Get all tickets
    fastify.get('/', { preHandler: [requireCapability(['cooperative.tickets.view.list', 'cooperative.tickets.create'])] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const userId = req.user?.id || req.user?.userId;

        // Check if user has management capability
        const authResult = await authorizationService.isUserAuthorized(String(userId), ['cooperative.tickets.view.list'], { user: req.user });
        const hasListPermission = authResult.allowed;

        let memberId: string | undefined = undefined;
        if (!hasListPermission) {
            const member = await MemberService.getMemberByUserId(tenantId, userId);
            if (!member) {
                return reply.status(403).send({ message: 'User is not an active cooperative member' });
            }
            memberId = member.id;
        }

        const tickets = await TicketService.getTickets(tenantId, memberId);
        return reply.send({ data: tickets });
    });

    // Get ticket details
    fastify.get('/:id', { preHandler: [requireCapability(['cooperative.tickets.view.detail', 'cooperative.tickets.create'])] }, async (req: any, reply: any) => {
        const { id } = req.params as any;
        const tenantId = getTenantId(req);
        const userId = req.user?.id || req.user?.userId;

        try {
            const ticket = await TicketService.getTicketById(id);
            const authResult = await authorizationService.isUserAuthorized(String(userId), ['cooperative.tickets.view.list'], { user: req.user });
            const hasListPermission = authResult.allowed;

            if (!hasListPermission) {
                const member = await MemberService.getMemberByUserId(tenantId, userId);
                if (!member || ticket.memberId !== member.id) {
                    return reply.status(403).send({ message: 'Forbidden: You do not have permission to view this ticket.' });
                }
            }

            return reply.send({ data: ticket });
        } catch (error: any) {
            return reply.status(404).send({ message: error.message });
        }
    });

    // Create ticket
    fastify.post('/', { preHandler: [requireCapability('cooperative.tickets.create')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const data = req.body as any;
        const userId = req.user?.id || req.user?.userId;

        const authResult = await authorizationService.isUserAuthorized(String(userId), ['cooperative.tickets.view.list'], { user: req.user });
        const hasListPermission = authResult.allowed;

        if (!hasListPermission) {
            // Anggota biasa wajib terdaftar sebagai anggota koperasi aktif
            const member = await MemberService.getMemberByUserId(tenantId, userId);
            if (!member) {
                return reply.status(403).send({ message: 'User is not an active cooperative member' });
            }
            data.memberId = member.id;
        } else if (!data.memberId) {
            // Pengurus/Manajer tidak wajib terdaftar sebagai anggota koperasi.
            // Namun, jika mereka memiliki data keanggotaan aktif, asosiasikan ke tiket.
            const member = await MemberService.getMemberByUserId(tenantId, userId);
            if (member) {
                data.memberId = member.id;
            } else {
                data.memberId = null;
            }
        }

        const ticket = await TicketService.createTicket(tenantId, data);
        return reply.send({ message: 'Ticket created', data: ticket });
    });

    // Reply to ticket
    fastify.post('/:id/reply', { preHandler: [requireCapability(['cooperative.tickets.reply', 'cooperative.tickets.create'])] }, async (req: any, reply: any) => {
        const { id } = req.params as any;
        const { content } = req.body as any;
        const tenantId = getTenantId(req);
        const userId = req.user?.id || req.user?.userId;

        try {
            const ticket = await TicketService.getTicketById(id);
            const authResult = await authorizationService.isUserAuthorized(String(userId), ['cooperative.tickets.view.list'], { user: req.user });
            const hasListPermission = authResult.allowed;

            let isStaff = false;
            if (hasListPermission) {
                isStaff = true;
            } else {
                const member = await MemberService.getMemberByUserId(tenantId, userId);
                if (!member || ticket.memberId !== member.id) {
                    return reply.status(403).send({ message: 'Forbidden: You do not have permission to reply to this ticket.' });
                }
            }

            const message = await TicketService.replyTicket(id, content, isStaff);
            return reply.send({ message: 'Reply added', data: message });
        } catch (error: any) {
            return reply.status(404).send({ message: error.message });
        }
    });

    // Update ticket status
    fastify.patch('/:id/status', { preHandler: [requireCapability('cooperative.tickets.update.status')] }, async (req: any, reply: any) => {
        const { id } = req.params as any;
        const { status } = req.body as any;
        const ticket = await TicketService.updateStatus(id, status);
        return reply.send({ message: 'Status updated', data: ticket });
    });
}



