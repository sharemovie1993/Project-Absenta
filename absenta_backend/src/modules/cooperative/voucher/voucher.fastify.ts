// @ts-nocheck
import { FastifyInstance, FastifyRequest } from 'fastify';
import { VoucherService } from './voucher.service';
import { MemberService } from '../member/member.service';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

const getTenantId = (req: any) => {
    return ((req.user as any)?.tenant_id || (req.user as any)?.tenantId) || mockTenant.id;
};

export default async function voucherRoutes(fastify: any) {
    // Get all vouchers
    fastify.get('/', { preHandler: [requireCapability(['cooperative.vouchers.view.list', 'cooperative.points.view'])] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const userId = req.user?.id || req.user?.userId;
        
        let memberId: string | undefined = undefined;
        const authResult = await authorizationService.isUserAuthorized(String(userId), ['cooperative.vouchers.view.list', 'cooperative.vouchers.manage'], { user: req.user });
        const hasListPermission = authResult.allowed;
        
        if (!hasListPermission && userId) {
            const member = await MemberService.getMemberByUserId(tenantId, userId);
            if (member) {
                memberId = member.id;
            }
        }
        
        const vouchers = await VoucherService.getVouchers(tenantId, memberId);
        return reply.send({ data: vouchers });
    });

    // Create voucher
    fastify.post('/', { preHandler: [requireCapability('cooperative.vouchers.manage')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const data = req.body as any;
        const voucher = await VoucherService.createVoucher(tenantId, data);
        return reply.send({ message: 'Voucher created', data: voucher });
    });

    // Validate / Check a voucher code
    fastify.get('/check', { preHandler: [requireCapability(['cooperative.store.orders.manage', 'cooperative.points.view'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { code, memberId } = req.query as any;
            
            if (!code) {
                return reply.code(400).send({ message: 'Kode voucher wajib diisi.' });
            }
            
            const voucher = await VoucherService.validateVoucher(tenantId, code, memberId);
            return {
                success: true,
                voucher
            };
        } catch (error: any) {
            reply.code(400).send({ message: error.message || 'Voucher tidak valid' });
        }
    });

    // Delete voucher
    fastify.delete('/:id', { preHandler: [requireCapability('cooperative.vouchers.manage')] }, async (req: any, reply: any) => {
        const { id } = req.params as any;
        await VoucherService.deleteVoucher(id);
        return reply.send({ message: 'Voucher deleted' });
    });
}



