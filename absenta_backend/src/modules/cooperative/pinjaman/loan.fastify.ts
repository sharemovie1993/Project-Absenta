// @ts-nocheck
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LoanService } from './loan.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { prisma } from '../../../utils/prisma';

export default async function loanRoutes(fastify: any) {

    const getTenantId = (req: any) => {
        return (req.user?.tenant_id || req.user?.tenantId) || mockTenant.id;
    };

    // GET /loans
    fastify.get('/', { preHandler: [requireCapability('cooperative.loans.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const loans = await LoanService.getLoans(tenantId);
            return loans;
        } catch (error) {
            reply.code(500).send({ error: 'Failed to fetch loans' });
        }
    });

    // POST /loans
    fastify.post('/', { preHandler: [requireCapability('cooperative.loans.apply')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { memberId, amount, interestRate, duration } = req.body as any;
            
            // Security check: regular member can only apply for their own member account
            const user = req.user;
            const authResult = await authorizationService.isUserAuthorized(String(user.id), ['cooperative.loans.approve', 'cooperative.loans.repay'], { user });
            const isOperator = authResult.allowed || user?.role?.name?.toUpperCase() === 'SUPERADMIN';
            
            if (!isOperator) {
                const member = await prisma.member.findFirst({
                    where: { tenantId, userId: user.id }
                });
                if (!member || member.id !== memberId) {
                    return reply.code(403).send({ error: 'Forbidden: You can only apply for loans under your own member account' });
                }
            }

            const loan = await LoanService.createLoan(memberId, Number(amount), Number(interestRate), Number(duration));
            reply.code(201).send(loan);
        } catch (error: any) {
            if (error.message?.startsWith('LOAN_RESTRICTION:')) {
                // Validasi aturan bisnis koperasi: kembalikan 400 dengan pesan deskriptif
                // Ambil teks pesan setelah prefix "LOAN_RESTRICTION:ACTIVE: " atau "LOAN_RESTRICTION:PENDING: "
                const cleanMessage = error.message.replace(/^LOAN_RESTRICTION:(ACTIVE|PENDING):\s*/, '');
                reply.code(400).send({ message: cleanMessage });
            } else if (error.message?.includes('not found')) {
                reply.code(404).send({ message: error.message });
            } else {
                reply.code(500).send({ error: 'Failed to create loan' });
            }
        }
    });

    // GET /loans/me
    fastify.get('/me', { preHandler: [requireCapability('cooperative.loans.apply')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const userId = req.user?.id;
            if (!userId) return [];
            
            const loans = await LoanService.getLoansByUserId(tenantId, userId);
            return loans;
        } catch (error) {
            reply.code(500).send({ error: 'Failed to fetch personal loans' });
        }
    });

    // GET /loans/:id
    fastify.get('/:id', { preHandler: [requireCapability(['cooperative.loans.view.detail', 'cooperative.loans.apply'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const user = req.user;
            const loan = await LoanService.getLoanById(req.params.id, tenantId);
            
            // Security check: regular member can only view their own loan details
            const authResult = await authorizationService.isUserAuthorized(String(user.id), ['cooperative.loans.view.detail'], { user });
            const isOperator = authResult.allowed || user?.role?.name?.toUpperCase() === 'SUPERADMIN';
            if (!isOperator && loan.member.userId !== user?.id) {
                return reply.code(403).send({ error: 'Forbidden: You can only view your own loan account' });
            }
            
            return loan;
        } catch (error: any) {
            if (error.message === 'Loan not found') {
                reply.code(404).send({ message: 'Loan not found' });
            } else {
                reply.code(500).send({ error: 'Failed to fetch loan details' });
            }
        }
    });

    // POST /loans/pay-installment
    fastify.post('/pay-installment', { preHandler: [requireCapability('cooperative.loans.repay')] }, async (req: any, reply: any) => {
        try {
            const { installmentId } = req.body as any;
            const updatedInstallment = await LoanService.payInstallment(installmentId);
            return updatedInstallment;
        } catch (error: any) {
            if (error.message === 'Installment not found') {
                reply.code(404).send({ message: 'Installment not found' });
            } else if (error.message === 'Installment already paid') {
                reply.code(400).send({ message: 'Installment already paid' });
            } else {
                reply.code(500).send({ error: 'Failed to pay installment' });
            }
        }
    });

    // PUT /loans/:id/status
    fastify.put('/:id/status', { preHandler: [requireCapability(['cooperative.loans.approve', 'cooperative.loans.reject'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { status } = req.body as any;
            const loan = await LoanService.updateLoanStatus(req.params.id, status, tenantId, req.user?.id);
            return loan;
        } catch (error: any) {
            if (error.message?.includes('Self-Approval')) {
                reply.code(400).send({ message: error.message });
            } else {
                reply.code(500).send({ error: 'Failed to update loan status' });
            }
        }
    });
}



