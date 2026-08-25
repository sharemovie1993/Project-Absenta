// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { PPOBService } from './ppob.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';
import { z } from 'zod';
import {
    createPpobProductSchema,
    createPpobTransactionSchema
} from '../services/cooperative-validation.schema';

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
        try {
            const tenantId = getTenantId(req);
            const parsed = createPpobProductSchema.parse(req.body);
            const product = await PPOBService.createProduct(tenantId, parsed);
            return reply.send({ message: 'PPOB Product created', data: product });
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    message: error.errors.map(e => e.message).join(', '),
                    errors: error.errors
                });
            }
            return reply.status(500).send({ message: error.message || 'Failed to create PPOB product' });
        }
    });

    // Create Transaction
    fastify.post('/transaction', { preHandler: [requireCapability('cooperative.ppob.transact')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const parsed = createPpobTransactionSchema.parse(req.body);
            const transaction = await PPOBService.createTransaction(tenantId, parsed);
            return reply.send({ message: 'Transaction created', data: transaction });
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    message: error.errors.map(e => e.message).join(', '),
                    errors: error.errors
                });
            }
            return reply.status(400).send({ message: error.message });
        }
    });
}



