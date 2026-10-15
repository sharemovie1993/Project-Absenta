// @ts-nocheck
import { FastifyPluginAsync } from 'fastify';
import { ModuleCapability } from '../../constants/capabilities';
import { requireCapability } from '@/middlewares/requireCapability';

// Import Route Handlers
import memberRoutes from './member/member.fastify';
import savingRoutes from './simpanan/saving.fastify';
import { savingCategoryRoutes } from './simpanan/saving-category.fastify';
import loanRoutes from './pinjaman/loan.fastify';
import tokoRoutes from './toko/toko.fastify';
import ppobRoutes from './ppob/ppob.fastify';
import reportRoutes from './laporan/report.fastify';
import ticketRoutes from './ticket/ticket.fastify';
import voucherRoutes from './voucher/voucher.fastify';
import pointRoutes from './point/point.fastify';
import announcementRoutes from './announcement/announcement.fastify';
import dashboardRoutes from './dashboard/dashboard.fastify';
import { shuRoutes } from './shu/shu.fastify';
import supplierRoutes from './supplier/supplier.fastify';
import assetRoutes from './asset/asset.fastify';
import expenseRoutes from './expense/expense.fastify';
import ratRoutes from './rat/rat.fastify';
import ratMinuteRoutes from './rat/rat.minute.fastify';
import ratClosureRoutes from './rat/rat.closure.fastify';

export interface CooperativePluginOptions {
    prefix?: string;
}

const cooperativePlugin: FastifyPluginAsync<CooperativePluginOptions> = async (fastify, _opts) => {
    
    // Apply 'KOPERASI' capability requirement to all routes in this module
    fastify.addHook('onRoute', (routeOptions: any) => {
        if (!routeOptions.config) {
            routeOptions.config = {};
        }
        // Only set if not already set (allows override)
        if (!routeOptions.config.capability) {
            routeOptions.config.capability = ModuleCapability.KOPERASI;
        }
    });

    // Register Modules
    fastify.register(memberRoutes, { prefix: '/members' });
    fastify.register(savingRoutes, { prefix: '/savings' });
    fastify.register(savingCategoryRoutes, { prefix: '' });  // /cooperative/saving-categories
    fastify.register(shuRoutes, { prefix: '' });              // /cooperative/shu/*
    fastify.register(loanRoutes, { prefix: '/loans' });
    fastify.register(tokoRoutes, { prefix: '/toko' }); // Products & POS
    fastify.register(ppobRoutes, { prefix: '/ppob' });
    fastify.register(reportRoutes, { prefix: '/reports' });
    fastify.register(reportRoutes, { prefix: '/accounting' }); // Supplying fallback for frontend Accounting.tsx calls
    fastify.register(ticketRoutes, { prefix: '/tickets' });
    fastify.register(voucherRoutes, { prefix: '/vouchers' });
    fastify.register(pointRoutes, { prefix: '/points' });
    fastify.register(announcementRoutes, { prefix: '/announcements' });
    fastify.register(dashboardRoutes, { prefix: '/dashboard' });
    fastify.register(supplierRoutes, { prefix: '/suppliers' }); // Supplier management
    fastify.register(assetRoutes, { prefix: '/assets' }); // Fixed asset management
    fastify.register(expenseRoutes, { prefix: '/expenses' }); // Operating expenses & cash disbursement
    fastify.register(ratRoutes, { prefix: '/rat' }); // Rapat Anggota Tahunan (RAT) & e-Voting
    fastify.register(ratMinuteRoutes, { prefix: '/rat' }); // Notulensi & Risalah Sidang RAT
    fastify.register(ratClosureRoutes, { prefix: '/rat' }); // Penutupan Sidang Resmi & Distribusi SHU
    fastify.register(require('./settings/settings.fastify').default, { prefix: '/settings' });

    // Upload Product Image
    fastify.post('/upload-product-image', {
        preHandler: [requireCapability('cooperative.store.products.create')]
    }, async (request: any, reply: any) => {
        try {
            const { uploadController } = await import('../upload/controllers/upload.controller');
            const data = await request.file();
            if (!data) {
                return reply.status(400).send({ success: false, message: 'Tidak ada file yang diunggah' });
            }
            const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedMimeTypes.includes(data.mimetype)) {
                return reply.status(400).send({ success: false, message: 'Format gambar harus berupa JPG, PNG, atau WebP' });
            }
            const { UploadService } = await import('../upload/services/upload.service');
            const uploadService = new UploadService();
            const fileUrl = await uploadService.saveFile(data);
            return reply.send({
                success: true,
                message: 'Foto barang berhasil diunggah',
                data: {
                    imageUrl: fileUrl,
                    url: fileUrl,
                    filename: data.filename,
                    mimetype: data.mimetype
                }
            });
        } catch (error: any) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: 'Gagal mengunggah foto', error: error.message });
        }
    });

    // Health Check for Plugin
    fastify.get('/health', { preHandler: [requireCapability('cooperative.dashboard.view.overview')] }, async () => {
        return { status: 'ok', module: 'cooperative' };
    });
};

export default cooperativePlugin;
