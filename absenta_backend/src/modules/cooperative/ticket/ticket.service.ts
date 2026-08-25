// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '../../../utils/prisma';
import { TicketStatus } from '@prisma/client';

export class TicketService {
    
    // Get all tickets for a tenant
    static async getTickets(tenantId: string, memberId?: string) {
        const whereClause: any = { tenantId };
        if (memberId) {
            whereClause.memberId = memberId;
        }
        return await prisma.ticket.findMany({
            where: whereClause,
            include: { member: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Get ticket details
    static async getTicketById(id: string) {
        const ticket = await prisma.ticket.findUnique({
            where: { id },
            include: {
                member: { select: { name: true } },
                messages: { orderBy: { createdAt: 'asc' } }
            }
        });

        if (!ticket) throw new Error('Ticket not found');
        return ticket;
    }

    // Create a new ticket
    static async createTicket(tenantId: string, data: any) {
        return await prisma.ticket.create({
            data: {
                tenantId,
                memberId: data.memberId,
                subject: data.subject,
                priority: data.priority,
                status: 'OPEN',
                messages: {
                    create: { content: data.message || data.content, isStaff: false }
                }
            },
            include: { messages: true }
        });
    }

    // Reply to a ticket
    static async replyTicket(id: string, content: string, isStaff: boolean) {
        const message = await prisma.ticketMessage.create({
            data: {
                ticketId: id,
                content,
                isStaff
            }
        });

        // Auto update status
        await prisma.ticket.update({
            where: { id },
            data: { status: 'IN_PROGRESS' }
        });

        return message;
    }

    // Update ticket status
    static async updateStatus(id: string, status: TicketStatus) {
        return await prisma.ticket.update({
            where: { id },
            data: { status }
        });
    }
}



