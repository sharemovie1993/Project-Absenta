// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MemberService } from './member.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';
import {
    createMemberSchema,
    updateMemberSchema,
    bulkCreateMembersSchema
} from '../services/cooperative-validation.schema';

export default async function memberRoutes(fastify: any) {
    
    // Helper to get tenant
    const getTenantId = (req: any) => {
        return req.dataScope?.tenantId || req.user?.tenant_id || req.user?.tenantId || mockTenant.id;
    };

    // GET /members/next-number
    fastify.get('/next-number', { preHandler: [requireCapability('cooperative.members.create')] }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const nextMemberNo = await MemberService.getNextMemberNo(tenantId);
            appLogger.info({ action: 'GET_NEXT_MEMBER_NO', tenantId, durationMs: Date.now() - startTime }, 'Next member number generated');
            return { nextMemberNo };
        } catch (error) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to generate next member number'  });
        }
    });

    // GET /members/me — Cek status keanggotaan koperasi user yang sedang login
    fastify.get('/me', { preHandler: [requireCapability('cooperative.dashboard.view.overview')] }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const userId = req.user?.id;
            if (!userId) return reply.code(401).send({ message: 'Unauthorized' });

            const member = await MemberService.getMemberByUserId(tenantId, userId);
            appLogger.info({ action: 'GET_MEMBER_ME', tenantId, userId, durationMs: Date.now() - startTime }, 'Member profile retrieved');
            return { success: true, data: member ?? null };
        } catch (error) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, 'Cooperative route error');
            return { success: true, data: null };
        }
    });

    // GET /members
    fastify.get('/', { preHandler: [requireCapability('cooperative.members.view.list'), determineDataScope()] }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const members = await MemberService.getMembers({
              tenantId,
              kelasIds: req.dataScope?.kelasIds,
              unitIds: req.dataScope?.unitIds,
              tenantWide: req.dataScope?.tenantWide
            });
            appLogger.info({ action: 'GET_MEMBERS_LIST', tenantId, count: members?.length || 0, durationMs: Date.now() - startTime }, 'Members list fetched');
            return members;
        } catch (error) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to fetch members'  });
        }
    });

    // GET /members/:id
    fastify.get('/:id', { preHandler: [requireCapability('cooperative.members.view.detail'), determineDataScope()] }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const member = await MemberService.getMemberById(req.params.id, {
              tenantId,
              kelasIds: req.dataScope?.kelasIds,
              unitIds: req.dataScope?.unitIds,
              tenantWide: req.dataScope?.tenantWide
            });
            if (!member) return reply.code(404).send({ message: 'Member not found' });
            appLogger.info({ action: 'GET_MEMBER_DETAIL', tenantId, memberId: req.params.id, durationMs: Date.now() - startTime }, 'Member detail fetched');
            return member;
        } catch (error) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to fetch member'  });
        }
    });

    // POST /members (dengan Idempotency Key Guard, Rate Limit, & Realtime Broadcast)
    fastify.post('/', {
        config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
        preHandler: [requireCapability('cooperative.members.create')]
    }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const parsedBody = createMemberSchema.parse(req.body);
            const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || parsedBody.idempotencyKey) as string | undefined;
            const member = await MemberService.createMember(tenantId, parsedBody, idempotencyKey);

            // Broadcast event realtime ke WebSocket klien
            const io = req.server?.io || fastify.io;
            if (io) {
                const broadcastPayload = {
                    type: 'MEMBER_CREATED',
                    memberId: member?.id,
                    memberNo: member?.memberNo,
                    timestamp: new Date().toISOString()
                };
                io.to(`tenant:${tenantId}`).emit('coop_member_update', broadcastPayload);
                io.emit('coop_member_update', broadcastPayload);
            }

            appLogger.info({ action: 'CREATE_MEMBER', tenantId, memberId: member?.id, durationMs: Date.now() - startTime }, 'Member successfully created');
            reply.code(201).send(member);
        } catch (error: any) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, 'Cooperative route error');
            if (error.name === 'ZodError') {
                return reply.code(400).send({
                    success: false,
                    message: error.errors?.[0]?.message || 'Data member tidak valid',
                    details: error.errors
                });
            }
            const msg = error.message || '';
            if (
                msg.includes('already exists') ||
                msg.includes('already a member') ||
                msg.includes('is required') ||
                msg.includes('registered') ||
                msg.includes('PIN harus')
            ) {
                reply.code(400).send({ message: msg });
            } else {
                reply.status(500).send({ success: false, message: 'Failed to create member', details: msg  });
            }
        }
    });

    // POST /members/bulk (Rate limited)
    fastify.post('/bulk', {
        config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
        preHandler: [requireCapability('cooperative.members.create')]
    }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const { rows } = req.body as { rows: any[] };
            if (!Array.isArray(rows)) {
                return reply.code(400).send({ message: 'Payload rows harus berupa array' });
            }
            const results = await MemberService.importBulkMembers(tenantId, rows);
            appLogger.info({ action: 'IMPORT_BULK_MEMBERS', tenantId, successCount: results.successCount, failCount: results.failCount, durationMs: Date.now() - startTime }, 'Bulk members imported');
            return results;
        } catch (error) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to import bulk members'  });
        }
    });

    // GET /members/non-members
    fastify.get('/non-members', { preHandler: [requireCapability('cooperative.members.create')] }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const { type, search, kelasId } = req.query as { type?: string; search?: string; kelasId?: string };
            
            if (type !== 'STUDENT' && type !== 'TEACHER') {
                return reply.code(400).send({ message: 'Tipe harus STUDENT atau TEACHER' });
            }

            const sanitizedSearch = search ? String(search).slice(0, 100).trim() : undefined;
            const nonMembers = await MemberService.getNonMembers(tenantId, type, { search: sanitizedSearch, kelasId });
            appLogger.info({ action: 'GET_NON_MEMBERS', tenantId, type, count: nonMembers?.length || 0, durationMs: Date.now() - startTime }, 'Non-members list fetched');
            return nonMembers;
        } catch (error: any) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to fetch non-members', details: error.message  });
        }
    });

    // POST /members/bulk-create (dengan Idempotency Key Guard, Rate Limit, & Realtime Broadcast)
    fastify.post('/bulk-create', {
        config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
        preHandler: [requireCapability('cooperative.members.create')]
    }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const parsed = bulkCreateMembersSchema.parse(req.body);
            const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || parsed.idempotencyKey) as string | undefined;

            const results = await MemberService.createBulkMembers(tenantId, parsed.type, parsed.ids, idempotencyKey);

            // Broadcast event realtime ke WebSocket klien
            const io = req.server?.io || fastify.io;
            if (io) {
                const broadcastPayload = {
                    type: 'MEMBERS_BULK_CREATED',
                    count: parsed.ids.length,
                    memberType: parsed.type,
                    timestamp: new Date().toISOString()
                };
                io.to(`tenant:${tenantId}`).emit('coop_member_update', broadcastPayload);
                io.emit('coop_member_update', broadcastPayload);
            }

            appLogger.info({ action: 'BULK_CREATE_MEMBERS', tenantId, count: parsed.ids.length, type: parsed.type, durationMs: Date.now() - startTime }, 'Bulk members registered');
            return results;
        } catch (error: any) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, 'Cooperative route error');
            if (error.name === 'ZodError') {
                return reply.code(400).send({
                    success: false,
                    message: error.errors?.[0]?.message || 'Data bulk create tidak valid',
                    details: error.errors
                });
            }
            reply.code(400).send({ message: error.message || 'Failed to bulk create members' });
        }
    });

    // PUT /members/:id (Rate limited)
    fastify.put('/:id', {
        config: { rateLimit: { max: 40, timeWindow: '1 minute' } },
        preHandler: [requireCapability('cooperative.members.update')]
    }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const parsedBody = updateMemberSchema.parse(req.body);
            const member = await MemberService.updateMember(req.params.id, tenantId, parsedBody);

            // Broadcast event realtime ke WebSocket klien
            const io = req.server?.io || fastify.io;
            if (io) {
                const broadcastPayload = {
                    type: 'MEMBER_UPDATED',
                    memberId: req.params.id,
                    timestamp: new Date().toISOString()
                };
                io.to(`tenant:${tenantId}`).emit('coop_member_update', broadcastPayload);
                io.emit('coop_member_update', broadcastPayload);
            }

            appLogger.info({ action: 'UPDATE_MEMBER', tenantId, memberId: req.params.id, durationMs: Date.now() - startTime }, 'Member updated successfully');
            return member;
        } catch (error: any) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, 'Cooperative route error');
            if (error.name === 'ZodError') {
                return reply.code(400).send({
                    success: false,
                    message: error.errors?.[0]?.message || 'Data update member tidak valid',
                    details: error.errors
                });
            }
            const msg = error.message || '';
            if (msg === 'Member not found') {
                reply.code(404).send({ message: 'Member not found' });
            } else if (
                msg.includes('already exists') ||
                msg.includes('already a member') ||
                msg.includes('is required') ||
                msg.includes('registered') ||
                msg.includes('PIN harus')
            ) {
                reply.code(400).send({ message: msg });
            } else {
                reply.status(500).send({ success: false, message: 'Failed to update member', details: msg  });
            }
        }
    });

    // POST /members/:id/terminate (Strict Rate Limiting for destructive liquidation)
    fastify.post('/:id/terminate', {
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
        preHandler: [requireCapability('cooperative.members.delete')]
    }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const payout = await MemberService.terminateMember(req.params.id, tenantId, req.user?.id);

            // Broadcast event realtime ke WebSocket klien
            const io = req.server?.io || fastify.io;
            if (io) {
                const broadcastPayload = {
                    type: 'MEMBER_TERMINATED',
                    memberId: req.params.id,
                    timestamp: new Date().toISOString()
                };
                io.to(`tenant:${tenantId}`).emit('coop_member_update', broadcastPayload);
                io.emit('coop_member_update', broadcastPayload);
            }

            appLogger.info({ action: 'TERMINATE_MEMBER', tenantId, memberId: req.params.id, totalPayout: payout?.total, durationMs: Date.now() - startTime }, 'Member terminated and liquidated');
            return payout;
        } catch (error: any) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, 'Cooperative route error');
            if (error.message === 'Member not found') {
                reply.code(404).send({ message: 'Member not found' });
            } else if (error.message.includes('terminated') || error.message.includes('inactive')) {
                reply.code(400).send({ message: error.message });
            } else {
                reply.status(500).send({ success: false, message: error.message || 'Failed to terminate member'  });
            }
        }
    });

    // DELETE /members/:id (Rate limited)
    fastify.delete('/:id', {
        config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
        preHandler: [requireCapability('cooperative.members.delete')]
    }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            await MemberService.deleteMember(req.params.id, tenantId);

            // Broadcast event realtime ke WebSocket klien
            const io = req.server?.io || fastify.io;
            if (io) {
                const broadcastPayload = {
                    type: 'MEMBER_DELETED',
                    memberId: req.params.id,
                    timestamp: new Date().toISOString()
                };
                io.to(`tenant:${tenantId}`).emit('coop_member_update', broadcastPayload);
                io.emit('coop_member_update', broadcastPayload);
            }

            appLogger.info({ action: 'DELETE_MEMBER', tenantId, memberId: req.params.id, durationMs: Date.now() - startTime }, 'Member deleted');
            reply.code(204).send();
        } catch (error: any) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, 'Cooperative route error');
            if (error.message === 'Member not found') {
                reply.code(404).send({ message: 'Member not found' });
            } else {
                reply.status(500).send({ success: false, message: 'Failed to delete member'  });
            }
        }
    });
}



