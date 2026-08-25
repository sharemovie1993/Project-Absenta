// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MemberService } from './member.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function memberRoutes(fastify: any) {
    
    // Helper to get tenant
    const getTenantId = (req: any) => {
        return req.dataScope?.tenantId || req.user?.tenant_id || req.user?.tenantId || mockTenant.id;
    };

    // GET /members/next-number
    fastify.get('/next-number', { preHandler: [requireCapability('cooperative.members.create')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const nextMemberNo = await MemberService.getNextMemberNo(tenantId);
            return { nextMemberNo };
        } catch (error) {
        appLogger.error({ err: error }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to generate next member number'  });
        }
    });

    // GET /members/me — Cek status keanggotaan koperasi user yang sedang login
    // Dapat diakses oleh GURU/SISWA dengan capability cooperative.dashboard.view.overview
    // Mengembalikan data member jika terdaftar, atau { data: null } jika belum
    fastify.get('/me', { preHandler: [requireCapability('cooperative.dashboard.view.overview')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const userId = req.user?.id;
            if (!userId) return reply.code(401).send({ message: 'Unauthorized' });

            const member = await MemberService.getMemberByUserId(tenantId, userId);
            return { success: true, data: member ?? null };
        } catch (error) {
        appLogger.error({ err: error }, 'Cooperative route error');
            // Jika user bukan anggota atau terjadi error, kembalikan null (bukan error 4xx)
            return { success: true, data: null };
        }
    });

    // GET /members
    fastify.get('/', { preHandler: [requireCapability('cooperative.members.view.list'), determineDataScope()] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const members = await MemberService.getMembers({
              tenantId,
              kelasIds: req.dataScope?.kelasIds,
              unitIds: req.dataScope?.unitIds,
              tenantWide: req.dataScope?.tenantWide
            });
            return members;
        } catch (error) {
        appLogger.error({ err: error }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to fetch members'  });
        }
    });

    // GET /members/:id
    fastify.get('/:id', { preHandler: [requireCapability('cooperative.members.view.detail'), determineDataScope()] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const member = await MemberService.getMemberById(req.params.id, {
              tenantId,
              kelasIds: req.dataScope?.kelasIds,
              unitIds: req.dataScope?.unitIds,
              tenantWide: req.dataScope?.tenantWide
            });
            if (!member) return reply.code(404).send({ message: 'Member not found' });
            return member;
        } catch (error) {
        appLogger.error({ err: error }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to fetch member'  });
        }
    });

    // POST /members
    fastify.post('/', { preHandler: [requireCapability('cooperative.members.create')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const member = await MemberService.createMember(tenantId, req.body);
            reply.code(201).send(member);
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            const msg = error.message || '';
            if (
                msg.includes('already exists') ||
                msg.includes('already a member') ||
                msg.includes('is required') ||
                msg.includes('registered')
            ) {
                reply.code(400).send({ message: msg });
            } else {
                reply.status(500).send({ success: false, message: 'Failed to create member', details: msg  });
            }
        }
    });

    // POST /members/bulk
    fastify.post('/bulk', { preHandler: [requireCapability('cooperative.members.create')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { rows } = req.body as { rows: any[] };
            if (!Array.isArray(rows)) {
                return reply.code(400).send({ message: 'Payload rows harus berupa array' });
            }
            const results = await MemberService.importBulkMembers(tenantId, rows);
            return results;
        } catch (error) {
        appLogger.error({ err: error }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to import bulk members'  });
        }
    });

    // GET /members/non-members
    fastify.get('/non-members', { preHandler: [requireCapability('cooperative.members.create')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { type, search, kelasId } = req.query as { type?: string; search?: string; kelasId?: string };
            
            if (type !== 'STUDENT' && type !== 'TEACHER') {
                return reply.code(400).send({ message: 'Tipe harus STUDENT atau TEACHER' });
            }

            const nonMembers = await MemberService.getNonMembers(tenantId, type, { search, kelasId });
            return nonMembers;
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to fetch non-members', details: error.message  });
        }
    });

    // POST /members/bulk-create
    fastify.post('/bulk-create', { preHandler: [requireCapability('cooperative.members.create')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { type, ids } = req.body as { type: 'STUDENT' | 'TEACHER'; ids: string[] };
            
            if (type !== 'STUDENT' && type !== 'TEACHER') {
                return reply.code(400).send({ message: 'Tipe harus STUDENT atau TEACHER' });
            }

            if (!Array.isArray(ids) || ids.length === 0) {
                return reply.code(400).send({ message: 'Payload ids harus berupa array yang tidak kosong' });
            }

            const results = await MemberService.createBulkMembers(tenantId, type, ids);
            return results;
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            reply.code(400).send({ message: error.message || 'Failed to bulk create members' });
        }
    });

    // PUT /members/:id
    fastify.put('/:id', { preHandler: [requireCapability('cooperative.members.update')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const member = await MemberService.updateMember(req.params.id, tenantId, req.body);
            return member;
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            const msg = error.message || '';
            if (msg === 'Member not found') {
                reply.code(404).send({ message: 'Member not found' });
            } else if (
                msg.includes('already exists') ||
                msg.includes('already a member') ||
                msg.includes('is required') ||
                msg.includes('registered')
            ) {
                reply.code(400).send({ message: msg });
            } else {
                reply.status(500).send({ success: false, message: 'Failed to update member', details: msg  });
            }
        }
    });

    // POST /members/:id/terminate
    fastify.post('/:id/terminate', { preHandler: [requireCapability('cooperative.members.delete')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const payout = await MemberService.terminateMember(req.params.id, tenantId, req.user?.id);
            return payout;
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            if (error.message === 'Member not found') {
                reply.code(404).send({ message: 'Member not found' });
            } else if (error.message.includes('terminated') || error.message.includes('inactive')) {
                reply.code(400).send({ message: error.message });
            } else {
                reply.status(500).send({ success: false, message: error.message || 'Failed to terminate member'  });
            }
        }
    });

    // DELETE /members/:id
    fastify.delete('/:id', { preHandler: [requireCapability('cooperative.members.delete')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            await MemberService.deleteMember(req.params.id, tenantId);
            reply.code(204).send();
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            if (error.message === 'Member not found') {
                reply.code(404).send({ message: 'Member not found' });
            } else {
                reply.status(500).send({ success: false, message: 'Failed to delete member'  });
            }
        }
    });
}



