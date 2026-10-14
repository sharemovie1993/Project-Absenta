import { z } from 'zod';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance } from 'fastify';
import { VoucherService } from './voucher.service';
import { MemberService } from '../member/member.service';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

const getTenantId = (req: any) => {
    return ((req.user as any)?.tenant_id || (req.user as any)?.tenantId) || mockTenant.id;
};

// ─── ZOD SCHEMAS (Phase 3 Clean Code & Phase 5 Security Audit) ─────────────
const createVoucherBodySchema = z.object({
    code: z.string().min(2, 'Kode voucher minimal 2 karakter').max(50, 'Kode voucher maksimal 50 karakter'),
    discount: z.union([z.number(), z.string()]).transform((val) => Number(val)).refine((n) => !isNaN(n) && n > 0, 'Nominal diskon harus lebih besar dari 0'),
    description: z.string().max(255).optional().nullable(),
    validUntil: z.string().optional().nullable(),
    memberId: z.string().optional().nullable(),
});

const checkVoucherQuerySchema = z.object({
    code: z.string().min(1, 'Kode voucher wajib diisi.').max(50, 'Kode voucher maksimal 50 karakter'),
    memberId: z.string().max(100).optional().nullable(),
});

export default async function voucherRoutes(fastify: FastifyInstance | any) {
    const broadcastCoopUpdate = (req: any, type: string, payload: any = {}) => {
        const io = req.server?.io || fastify.io;
        if (io) {
            const broadcastPayload = {
                type,
                data: payload,
                timestamp: new Date().toISOString()
            };
            io.emit('cooperative_sync', broadcastPayload);
            io.to('cooperative_workspace').emit('cooperative_sync', broadcastPayload);
            io.emit('coop_voucher_update', broadcastPayload);
            io.to('cooperative_workspace').emit('coop_voucher_update', broadcastPayload);
        }
    };

    // Get all vouchers
    fastify.get('/', { preHandler: [requireCapability(['cooperative.vouchers.view.list', 'cooperative.points.view'])] }, async (req: any, reply: any) => {
        try {
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
            return reply.send({ success: true, data: vouchers });
        } catch (error: any) {
            appLogger.error({ err: error }, '[VoucherRoutes] Gagal mengambil daftar voucher');
            return reply.code(500).send({ success: false, message: error.message || 'Gagal memuat voucher' });
        }
    });

    // Create voucher
    fastify.post('/', { preHandler: [requireCapability('cooperative.vouchers.manage')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const parseResult = createVoucherBodySchema.safeParse(req.body);
            if (!parseResult.success) {
                return reply.code(400).send({
                    success: false,
                    message: parseResult.error.issues[0]?.message || 'Data pembuatan voucher tidak valid',
                    errors: parseResult.error.format()
                });
            }

            const voucher = await VoucherService.createVoucher(tenantId, parseResult.data);
            const userId = req.user?.id || req.user?.userId || req.user?.sub || 'system';
            appLogger.info({ tenantId, userId, voucherId: voucher.id, code: voucher.code }, '[Audit] Voucher promo koperasi berhasil dibuat');
            broadcastCoopUpdate(req, 'COOP_VOUCHER_CREATED', voucher);

            return reply.code(201).send({ success: true, message: 'Voucher berhasil dibuat', data: voucher });
        } catch (error: any) {
            appLogger.error({ err: error }, '[VoucherRoutes] Gagal membuat voucher');
            return reply.code(500).send({ success: false, message: error.message || 'Gagal membuat voucher' });
        }
    });

    // Validate / Check a voucher code
    fastify.get('/check', { preHandler: [requireCapability(['cooperative.store.orders.manage', 'cooperative.points.view'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const parseResult = checkVoucherQuerySchema.safeParse(req.query);
            if (!parseResult.success) {
                return reply.code(400).send({
                    success: false,
                    message: parseResult.error.issues[0]?.message || 'Parameter validasi voucher tidak valid'
                });
            }

            const { code, memberId } = parseResult.data;
            const voucher = await VoucherService.validateVoucher(tenantId, code, memberId);
            return {
                success: true,
                voucher
            };
        } catch (error: any) {
            appLogger.error({ err: error }, '[VoucherRoutes] Validasi voucher gagal');
            return reply.code(400).send({ success: false, message: error.message || 'Voucher tidak valid' });
        }
    });

    // Delete voucher
    fastify.delete('/:id', { preHandler: [requireCapability('cooperative.vouchers.manage')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { id } = req.params as any;
            await VoucherService.deleteVoucher(tenantId, id);
            const userId = req.user?.id || req.user?.userId || req.user?.sub || 'system';
            appLogger.info({ tenantId, userId, voucherId: id }, '[Audit] Voucher promo koperasi berhasil dihapus');
            broadcastCoopUpdate(req, 'COOP_VOUCHER_DELETED', { id });

            return reply.send({ success: true, message: 'Voucher berhasil dihapus' });
        } catch (error: any) {
            appLogger.error({ err: error }, '[VoucherRoutes] Gagal menghapus voucher');
            if (error.message === 'Voucher tidak ditemukan') {
                return reply.code(404).send({ success: false, message: error.message });
            }
            return reply.code(500).send({ success: false, message: error.message || 'Gagal menghapus voucher' });
        }
    });
}



