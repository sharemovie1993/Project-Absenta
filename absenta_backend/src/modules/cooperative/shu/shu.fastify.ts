import { ShuService } from './shu.service';
import { requireCapability } from '@/middlewares/requireCapability';

export async function shuRoutes(fastify: any) {
    // ── Konfigurasi SHU ────────────────────────────────────────────────────

    // GET /cooperative/shu/config
    fastify.get('/shu/config', {
        preHandler: requireCapability('cooperative.shu.view.report'),
    }, async (req: any, reply: any) => {
        const data = await ShuService.getConfig(req.tenantId);
        return reply.send({ success: true, data });
    });

    // PUT /cooperative/shu/config
    fastify.put('/shu/config', {
        preHandler: requireCapability('cooperative.shu.manage'),
    }, async (req: any, reply: any) => {
        const data = await ShuService.updateConfig(req.tenantId, req.body);
        return reply.send({ success: true, data });
    });

    // ── Periode SHU ────────────────────────────────────────────────────────

    // GET /cooperative/shu/periods
    fastify.get('/shu/periods', {
        preHandler: requireCapability('cooperative.shu.view.report'),
    }, async (req: any, reply: any) => {
        const data = await ShuService.getPeriods(req.tenantId);
        return reply.send({ success: true, data });
    });

    // POST /cooperative/shu/periods
    fastify.post('/shu/periods', {
        preHandler: requireCapability('cooperative.shu.manage'),
    }, async (req: any, reply: any) => {
        const data = await ShuService.createPeriod(req.tenantId, req.body);
        return reply.code(201).send({ success: true, data });
    });

    // GET /cooperative/shu/periods/:id
    fastify.get('/shu/periods/:id', {
        preHandler: requireCapability('cooperative.shu.view.report'),
    }, async (req: any, reply: any) => {
        const data = await ShuService.getPeriodDetail(req.params.id, req.tenantId);
        return reply.send({ success: true, data });
    });

    // DELETE /cooperative/shu/periods/:id — Hapus periode SHU
    fastify.delete('/shu/periods/:id', {
        preHandler: requireCapability('cooperative.shu.manage'),
    }, async (req: any, reply: any) => {
        try {
            await ShuService.deletePeriod(req.params.id, req.tenantId);
            return reply.send({ success: true, message: 'Periode SHU berhasil dihapus' });
        } catch (error: any) {
            return reply.code(400).send({ success: false, message: error.message });
        }
    });

    // POST /cooperative/shu/periods/:id/sync — Sync ulang Laba-Rugi ke periode
    fastify.post('/shu/periods/:id/sync', {
        preHandler: requireCapability('cooperative.shu.manage'),
    }, async (req: any, reply: any) => {
        try {
            const data = await ShuService.syncPeriodFinancials(req.params.id, req.tenantId);
            return reply.send({ success: true, data });
        } catch (error: any) {
            return reply.code(400).send({ success: false, message: error.message });
        }
    });

    // POST /cooperative/shu/periods/:id/calculate — Bendahara hitung SHU
    fastify.post('/shu/periods/:id/calculate', {
        preHandler: requireCapability('cooperative.shu.calculate'),
    }, async (req: any, reply: any) => {
        try {
            const data = await ShuService.calculateShu(req.params.id, req.tenantId);
            return reply.send({ success: true, data });
        } catch (error: any) {
            if (error.message?.startsWith('SHU_RESTRICTION:')) {
                // Ambil pesan bersih dari error bisnis
                const cleanMessage = error.message.replace(/^SHU_RESTRICTION:NEGATIVE:\s*/, '');
                return reply.code(400).send({ success: false, message: cleanMessage });
            }
            return reply.code(500).send({ success: false, message: error.message });
        }
    });

    // POST /cooperative/shu/periods/:id/approve — Ketua setujui
    fastify.post('/shu/periods/:id/approve', {
        preHandler: requireCapability('cooperative.shu.approve'),
    }, async (req: any, reply: any) => {
        const userId = String(req.user?.id ?? '');
        const data = await ShuService.approvePeriod(req.params.id, req.tenantId, userId);
        return reply.send({ success: true, data });
    });

    // POST /cooperative/shu/periods/:id/distribute — Bendahara distribusikan
    fastify.post('/shu/periods/:id/distribute', {
        preHandler: requireCapability('cooperative.savings.deposit'),
    }, async (req: any, reply: any) => {
        const data = await ShuService.distributeShu(req.params.id, req.tenantId);
        return reply.send({ success: true, data });
    });

    // ── Riwayat SHU Anggota ───────────────────────────────────────────────

    // GET /cooperative/shu/my-history — anggota lihat SHU sendiri
    fastify.get('/shu/my-history', {
        preHandler: requireCapability('cooperative.savings.view.history'),
    }, async (req: any, reply: any) => {
        const userId = String(req.user?.id ?? '');
        const data = await ShuService.getMyShuHistory(req.tenantId, userId);
        return reply.send({ success: true, data });
    });
}
