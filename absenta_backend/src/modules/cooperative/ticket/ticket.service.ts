// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '../../../utils/prisma';
import { TicketStatus } from '@prisma/client';
import { activityLogService } from '../../activity/services/activity-log.service';

export class TicketService {
    
    // Get all tickets for a tenant
    static async getTickets(tenantId: string, memberId?: string) {
        const whereClause: any = { tenantId };
        if (memberId) {
            whereClause.memberId = memberId;
        }
        return await prisma.ticket.findMany({
            where: whereClause,
            include: { member: true, _count: { select: { messages: true } } },
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
    static async createTicket(tenantId: string, data: any, operatorId?: string | null) {
        if (!data.subject || !data.subject.trim()) {
            throw new Error('Subjek aduan wajib diisi.');
        }
        const initialContent = data.message || data.content;
        if (!initialContent || !initialContent.trim()) {
            throw new Error('Pesan aduan wajib diisi.');
        }

        const ticket = await prisma.ticket.create({
            data: {
                tenantId,
                memberId: data.memberId || null,
                subject: data.subject.trim(),
                priority: data.priority || 'MEDIUM',
                status: 'OPEN',
                messages: {
                    create: { content: initialContent.trim(), isStaff: false }
                }
            },
            include: { messages: true, member: true }
        });

        activityLogService.logEvent({
            event_type: 'COOP_TICKET_CREATED',
            tenant_id: tenantId,
            user_id: operatorId || null,
            entity: 'Ticket',
            entity_id: ticket.id,
            metadata: {
                subject: ticket.subject,
                priority: ticket.priority,
                description: `Membuat tiket aduan baru "${ticket.subject}" (Prioritas: ${ticket.priority})`
            }
        });

        return ticket;
    }

    // Reply to a ticket
    static async replyTicket(id: string, content: string, isStaff: boolean, operatorId?: string | null) {
        if (!content || !content.trim()) {
            throw new Error('Isi balasan aduan tidak boleh kosong.');
        }

        const ticket = await prisma.ticket.findUnique({ where: { id } });
        if (!ticket) throw new Error('Ticket not found');

        const message = await prisma.ticketMessage.create({
            data: {
                ticketId: id,
                content: content.trim(),
                isStaff
            }
        });

        // Auto update status to IN_PROGRESS if OPEN
        if (ticket.status === 'OPEN') {
            await prisma.ticket.update({
                where: { id },
                data: { status: 'IN_PROGRESS' }
            });
        }

        activityLogService.logEvent({
            event_type: 'COOP_TICKET_REPLIED',
            tenant_id: ticket.tenantId,
            user_id: operatorId || null,
            entity: 'TicketMessage',
            entity_id: message.id,
            metadata: {
                ticketId: id,
                isStaff,
                description: `Menambahkan balasan pada tiket "${ticket.subject}" (${isStaff ? 'Petugas' : 'Anggota'})`
            }
        });

        return message;
    }

    // Update ticket status
    static async updateStatus(id: string, status: TicketStatus, operatorId?: string | null) {
        const allowedStatuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'CLOSED'];
        if (!allowedStatuses.includes(status)) {
            throw new Error(`Status tiket tidak valid. Pilihan: ${allowedStatuses.join(', ')}`);
        }

        const ticket = await prisma.ticket.findUnique({ where: { id } });
        if (!ticket) throw new Error('Ticket not found');

        const updated = await prisma.ticket.update({
            where: { id },
            data: { status }
        });

        activityLogService.logEvent({
            event_type: 'COOP_TICKET_STATUS_UPDATED',
            tenant_id: ticket.tenantId,
            user_id: operatorId || null,
            entity: 'Ticket',
            entity_id: id,
            metadata: {
                oldStatus: ticket.status,
                newStatus: status,
                description: `Memperbarui status tiket "${ticket.subject}": ${ticket.status} → ${status}`
            }
        });

        return updated;
    }
}




