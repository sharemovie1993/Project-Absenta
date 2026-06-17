import { PointService } from './point.service';
import { MemberService } from '../member/member.service';
import { requireCapability } from '@/middlewares/requireCapability';
import { mockTenant } from '../../../utils/mocks';

const getTenantId = (req: any) => {
    return (req.user?.tenant_id || req.user?.tenantId) || mockTenant.id;
};

export default async function pointRoutes(fastify: any) {
    // GET /points/my-history
    fastify.get('/my-history', { preHandler: [requireCapability('cooperative.points.view')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const userId = req.user?.id || req.user?.userId;
            
            const member = await MemberService.getMemberByUserId(tenantId, userId);
            if (!member) {
                return reply.code(404).send({ message: 'Anda bukan anggota koperasi aktif.' });
            }
            
            const history = await PointService.getHistory(tenantId, member.id);
            const balance = await PointService.getBalance(tenantId, member.id);
            
            return {
                success: true,
                balance,
                data: history
            };
        } catch (error: any) {
            reply.code(500).send({ message: error.message || 'Gagal memuat riwayat poin' });
        }
    });

    // POST /points/redeem
    fastify.post('/redeem', { preHandler: [requireCapability('cooperative.points.view')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const userId = req.user?.id || req.user?.userId;
            const { points } = req.body as any;
            
            if (!points || typeof points !== 'number') {
                return reply.code(400).send({ message: 'Jumlah poin penukaran wajib diisi.' });
            }
            
            const member = await MemberService.getMemberByUserId(tenantId, userId);
            if (!member) {
                return reply.code(404).send({ message: 'Anda bukan anggota koperasi aktif.' });
            }
            
            const result = await PointService.redeemPoints(tenantId, member.id, points);
            return {
                success: true,
                message: `Klaim voucher diskon Rp ${Number(result.voucher.discount).toLocaleString('id-ID')} berhasil!`,
                data: result
            };
        } catch (error: any) {
            reply.code(400).send({ message: error.message || 'Gagal menukarkan poin' });
        }
    });
}
