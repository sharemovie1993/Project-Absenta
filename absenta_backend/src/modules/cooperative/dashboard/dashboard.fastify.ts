// @ts-nocheck
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../../../utils/prisma';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

const getTenantId = (req: any) => {
    return ((req.user as any)?.tenant_id || (req.user as any)?.tenantId) || mockTenant.id;
};

export default async function dashboardRoutes(fastify: any) {
    // Get Dashboard Stats
    fastify.get('/stats', { preHandler: [requireCapability('cooperative.dashboard.view.overview')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        
        // Count Members
        const totalMembers = await prisma.member.count({ where: { tenantId } });

        // Sum Savings
        const savingsAgg = await prisma.saving.aggregate({
            _sum: { amount: true },
            where: { member: { tenantId } }
        });
        const totalSavings = Number(savingsAgg._sum.amount || 0);

        // Sum Loans
        const loansAgg = await prisma.loan.aggregate({
            _sum: { amount: true },
            where: { member: { tenantId } }
        });
        const totalLoans = Number(loansAgg._sum.amount || 0);

        // Count Due Installments (simplified)
        const dueInstallments = await prisma.installment.count({
            where: { 
                loan: { member: { tenantId } },
                status: 'UNPAID',
                dueDate: { lt: new Date() }
            }
        });

        return reply.send({
            data: {
                totalMembers,
                totalSavings,
                totalLoans,
                dueInstallments
            }
        });
    });
}



