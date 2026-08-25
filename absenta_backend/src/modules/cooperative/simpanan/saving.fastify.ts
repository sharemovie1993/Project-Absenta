// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SavingService } from './saving.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { z } from 'zod';
import {
    createSavingSchema,
    processSavingTransactionSchema
} from '../services/cooperative-validation.schema';

export default async function savingRoutes(fastify: any) {
    
    const getTenantId = (req: any) => {
        return (req.user?.tenant_id || req.user?.tenantId) || mockTenant.id;
    };

    // GET /savings
    fastify.get('/', { preHandler: [requireCapability(['cooperative.savings.view.list', 'cooperative.savings.view.history'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const user = req.user;
            
            const authResult = await authorizationService.isUserAuthorized(String(user.id), ['cooperative.savings.view.list'], { user });
            const isOperator = authResult.allowed || user?.role?.name?.toUpperCase() === 'SUPERADMIN';
            
            const options: any = {};
            const isPersonal = req.query?.personal === 'true' || req.query?.personal === true;
            if ((isPersonal || !isOperator) && user?.id) {
                options.userId = user.id;
            }
            
            const savings = await SavingService.getSavings(tenantId, options);
            return savings;
        } catch (error) {
        appLogger.error({ err: error }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to fetch savings'  });
        }
    });


    // POST /savings — buat rekening simpanan baru (gunakan categoryId bukan enum type)
    fastify.post('/', { preHandler: [requireCapability('cooperative.savings.create')] }, async (req: any, reply: any) => {
        try {
            const parsed = createSavingSchema.parse(req.body);
            const { memberId, categoryId, initialAmount } = parsed;
            const saving = await SavingService.createSaving(memberId, categoryId, initialAmount);
            reply.code(201).send(saving);
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            if (error instanceof z.ZodError) {
                return reply.code(400).send({
                    message: error.errors.map(e => e.message).join(', '),
                    errors: error.errors
                });
            }
            if (error.message.includes('tidak ditemukan') || error.message.includes('not found')) {
                reply.code(404).send({ message: error.message });
            } else if (error.message.includes('sudah ada')) {
                reply.code(409).send({ message: error.message });
            } else {
                reply.status(500).send({ success: false, message: 'Gagal membuat rekening simpanan.'  });
            }
        }
    });

    // POST /savings/transaction
    fastify.post('/transaction', { preHandler: [requireCapability(['cooperative.savings.deposit', 'cooperative.savings.withdraw'])] }, async (req: any, reply: any) => {
        try {
            const parsed = processSavingTransactionSchema.parse(req.body);
            const { savingId, amount, type, description } = parsed;
            const transaction = await SavingService.processTransaction(savingId, amount, type, description, req.user?.id);
            reply.code(201).send(transaction);
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            if (error instanceof z.ZodError) {
                return reply.code(400).send({
                    message: error.errors.map(e => e.message).join(', '),
                    errors: error.errors
                });
            }
            fastify.log.error({ err: error }, 'Error processing saving transaction');
            // Kembalikan pesan error aktual agar frontend bisa menampilkan feedback yang tepat
            const msg = error?.message || 'Gagal memproses transaksi';
            if (msg.includes('tidak diperbolehkan') || msg.includes('Self-Transaction')) {
                reply.code(403).send({ message: msg });
            } else if (msg.includes('Saldo tidak mencukupi') || msg.includes('Insufficient')) {
                reply.code(400).send({ message: msg });
            } else if (msg.includes('tidak ditemukan') || msg.includes('not found')) {
                reply.code(404).send({ message: msg });
            } else if (msg.includes('tidak aktif') || msg.includes('Account code')) {
                reply.code(422).send({ message: msg });
            } else {
                reply.code(500).send({ message: msg });
            }
        }
    });

    // GET /savings/transactions
    fastify.get('/transactions', { preHandler: [requireCapability('cooperative.savings.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { startDate, endDate } = req.query as any;
            const transactions = await SavingService.getTransactions(tenantId, { startDate, endDate });
            return transactions;
        } catch (error) {
        appLogger.error({ err: error }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to fetch saving transactions'  });
        }
    });

    // GET /savings/:id
    fastify.get('/:id', { preHandler: [requireCapability(['cooperative.savings.view.detail', 'cooperative.savings.view.history'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const user = req.user;
            const saving = await SavingService.getSavingById(req.params.id, tenantId);
            
            // Security check: regular member can only view their own saving account
            const authResult = await authorizationService.isUserAuthorized(String(user.id), ['cooperative.savings.view.detail'], { user });
            const isOperator = authResult.allowed || user?.role?.name?.toUpperCase() === 'SUPERADMIN';
            if (!isOperator && saving.member.userId !== user?.id) {
                return reply.status(403).send({ success: false, message: 'Forbidden: You can only view your own saving account'  });
            }
            
            return saving;
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            if (error.message === 'Saving account not found') {
                reply.code(404).send({ message: 'Saving account not found' });
            } else {
                reply.status(500).send({ success: false, message: 'Failed to fetch saving details'  });
            }
        }
    });
    // GET /savings/me/insights — tren bulanan + status iuran bulan ini (member view)
    fastify.get('/me/insights', { preHandler: [requireCapability('cooperative.savings.view.history')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const userId   = req.user?.id;
            if (!userId) return reply.code(401).send({ message: 'Unauthorized' });
            const data = await SavingService.getMemberSavingInsights(String(userId), tenantId);
            return reply.send(data);
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            fastify.log.error({ err: error }, 'Error fetching member saving insights');
            return reply.code(500).send({ message: error.message || 'Gagal mengambil insight simpanan.' });
        }
    });
}
