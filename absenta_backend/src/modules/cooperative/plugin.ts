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
    fastify.register(require('./settings/settings.fastify').default, { prefix: '/settings' });

    // Health Check for Plugin
    fastify.get('/health', { preHandler: [requireCapability('cooperative.dashboard.view.overview')] }, async () => {
        return { status: 'ok', module: 'cooperative' };
    });
};

export default cooperativePlugin;
