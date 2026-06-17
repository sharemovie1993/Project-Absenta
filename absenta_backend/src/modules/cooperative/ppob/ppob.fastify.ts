// @ts-nocheck
import { FastifyInstance, FastifyRequest } from 'fastify';
import { PPOBService } from './ppob.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

const getTenantId = (req: any) => {
    return ((req.user as any)?.tenant_id || (req.user as any)?.tenantId) || mockTenant.id;
};

export default async function ppobRoutes(fastify: any) {
    // Get all PPOB Products
    fastify.get('/', { preHandler: [requireCapability('cooperative.ppob.view.products')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const products = await PPOBService.getProducts(tenantId);
        return reply.send({ data: products });
    });

    // Create PPOB Product (Admin)
    fastify.post('/', { preHandler: [requireCapability('cooperative.ppob.manage.products')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const data = req.body as any;
        const product = await PPOBService.createProduct(tenantId, data);
        return reply.send({ message: 'PPOB Product created', data: product });
    });

    // Create Transaction
    fastify.post('/transaction', { preHandler: [requireCapability('cooperative.ppob.transact')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const data = req.body as any;
        try {
            const transaction = await PPOBService.createTransaction(tenantId, data);
            return reply.send({ message: 'Transaction created', data: transaction });
        } catch (error: any) {
            return reply.status(400).send({ message: error.message });
        }
    });
}



