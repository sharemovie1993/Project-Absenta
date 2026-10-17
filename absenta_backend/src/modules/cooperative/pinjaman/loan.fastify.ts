// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LoanService } from './loan.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { prisma } from '../../../utils/prisma';
import { z } from 'zod';
import {
    createLoanSchema,
    payInstallmentSchema,
    updateLoanStatusSchema
} from '../services/cooperative-validation.schema';

export default async function loanRoutes(fastify: any) {

    const getTenantId = (req: any) => {
        return (req.user?.tenant_id || req.user?.tenantId) || mockTenant.id;
    };

    // GET /loans
    fastify.get('/', { preHandler: [requireCapability(['cooperative.loans.view.list', 'cooperative.loans.apply', 'cooperative.store.orders.manage'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const user = req.user;

            const authResult = await authorizationService.isUserAuthorized(String(user.id), ['cooperative.loans.view.list', 'cooperative.store.orders.manage'], { user });
            const isOperator = authResult.allowed || user?.role?.name?.toUpperCase() === 'SUPERADMIN' || user?.capabilities?.includes('cooperative.store.orders.manage');

            const isPersonal = req.query?.personal === 'true' || req.query?.personal === true;
            if (isPersonal || !isOperator) {
                const loans = await LoanService.getLoansByUserId(tenantId, user.id);
                return loans;
            }

            const memberId = req.query?.memberId as string | undefined;
            const loans = await LoanService.getLoans(tenantId, memberId);
            return loans;
        } catch (error) {
            appLogger.error({ err: error }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to fetch loans'  });
        }
    });

    // GET /loans/manage (Alias for operator view)
    fastify.get('/manage', { preHandler: [requireCapability(['cooperative.loans.view.list', 'cooperative.loans.approve', 'cooperative.store.orders.manage'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const memberId = req.query?.memberId as string | undefined;
            const loans = await LoanService.getLoans(tenantId, memberId);
            return loans;
        } catch (error) {
            appLogger.error({ err: error }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to fetch loans'  });
        }
    });

    // POST /loans
    fastify.post('/', { preHandler: [requireCapability('cooperative.loans.apply')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || req.body?.idempotencyKey) as string | undefined;
            const parsed = createLoanSchema.parse(req.body);
            let { memberId, amount, interestRate, duration, autoApprove, notes } = parsed;
            
            // Security check: regular member can only apply for their own member account
            const user = req.user;
            const authResult = await authorizationService.isUserAuthorized(String(user.id), ['cooperative.loans.approve', 'cooperative.loans.repay'], { user });
            const isOperator = authResult.allowed || user?.role?.name?.toUpperCase() === 'SUPERADMIN';
            
            // Auto-resolve memberId jika tidak dikirim atau string kosong (pengajuan personal)
            if (!memberId || memberId.trim() === '') {
                const selfMember = await prisma.member.findFirst({
                    where: { tenantId, userId: user.id }
                });
                if (!selfMember) {
                    return reply.status(400).send({ 
                        success: false, 
                        message: isOperator 
                            ? 'Silakan pilih anggota koperasi terlebih dahulu.' 
                            : 'Akun keanggotaan koperasi Anda tidak ditemukan atau belum aktif.' 
                    });
                }
                memberId = selfMember.id;
            }

            let effectiveInterestRate = interestRate;

            if (!isOperator) {
                const member = await prisma.member.findFirst({
                    where: { tenantId, userId: user.id }
                });
                if (!member || member.id !== memberId) {
                    return reply.status(403).send({ success: false, message: 'Forbidden: You can only apply for loans under your own member account'  });
                }

                // Security & Business Rule Hardening:
                // Anggota koperasi tidak boleh menentukan suku bunga sendiri.
                // Suku bunga resmi selalu ditarik dari Pengaturan Koperasi (tabel Config).
                const configRate = await prisma.config.findFirst({
                    where: { tenant_id: tenantId, key: 'cooperative_default_interest_rate' }
                });
                if (configRate?.value && !isNaN(Number(configRate.value))) {
                    effectiveInterestRate = Number(configRate.value);
                } else {
                    effectiveInterestRate = 1.5; // Fallback default ketentuan koperasi
                }
            }

            const shouldAutoApprove = Boolean(isOperator && autoApprove);
            const loan = await LoanService.createLoan(
                memberId, 
                amount, 
                effectiveInterestRate, 
                duration, 
                idempotencyKey, 
                shouldAutoApprove, 
                tenantId, 
                user.id,
                notes
            );

            // Broadcast event realtime ke WebSocket klien
            const io = req.server?.io || fastify.io;
            if (io) {
                const broadcastPayload = {
                    type: shouldAutoApprove ? 'LOAN_APPROVED' : 'LOAN_CREATED',
                    loanId: loan?.id,
                    memberId,
                    timestamp: new Date().toISOString()
                };
                io.to(`tenant:${tenantId}`).emit('coop_loan_update', broadcastPayload);
                io.emit('coop_loan_update', broadcastPayload);
            }

            reply.code(201).send(loan);
        } catch (error: any) {
            appLogger.error({ err: error }, 'Cooperative route error');
            if (error instanceof z.ZodError) {
                return reply.code(400).send({
                    message: error.errors.map(e => e.message).join(', '),
                    errors: error.errors
                });
            }
            if (error.message?.startsWith('LOAN_RESTRICTION:')) {
                // Validasi aturan bisnis koperasi: kembalikan 400 dengan pesan deskriptif
                const cleanMessage = error.message.replace(/^LOAN_RESTRICTION:(ACTIVE|PENDING):\s*/, '');
                reply.code(400).send({ message: cleanMessage });
            } else if (
                error.message?.includes('tidak diperbolehkan') || 
                error.message?.includes('wajib diisi') || 
                error.message?.includes('harus lebih dari') ||
                error.message?.includes('tidak boleh negatif') ||
                error.message?.includes('bilangan bulat')
            ) {
                reply.code(400).send({ message: error.message });
            } else if (error.message?.includes('not found') || error.message?.includes('tidak ditemukan')) {
                reply.code(404).send({ message: error.message });
            } else {
                reply.status(500).send({ success: false, message: error.message || 'Failed to create loan' });
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
        appLogger.error({ err: error }, 'Cooperative route error');
            reply.status(500).send({ success: false, message: 'Failed to fetch personal loans'  });
        }
    });

    // GET /loans/student-metrics
    fastify.get('/student-metrics', { preHandler: [requireCapability('cooperative.loans.apply')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const userId = req.user?.id;
            if (!userId) {
                return reply.send({ success: true, data: null });
            }
            const metrics = await LoanService.getStudentMetrics(tenantId, userId);
            return reply.send({ success: true, data: metrics });
        } catch (error) {
            appLogger.error({ err: error }, 'Failed to fetch student metrics');
            reply.status(500).send({ success: false, message: 'Failed to fetch student metrics' });
        }
    });

    // GET /loans/operator-metrics
    fastify.get('/operator-metrics', { preHandler: [requireCapability('cooperative.loans.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const metrics = await LoanService.getOperatorMetrics(tenantId);
            return reply.send({ success: true, data: metrics });
        } catch (error) {
            appLogger.error({ err: error }, 'Failed to fetch operator metrics');
            reply.status(500).send({ success: false, message: 'Failed to fetch operator metrics' });
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
                return reply.status(403).send({ success: false, message: 'Forbidden: You can only view your own loan account'  });
            }
            
            return loan;
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            if (error.message === 'Loan not found') {
                reply.code(404).send({ message: 'Loan not found' });
            } else {
                reply.status(500).send({ success: false, message: 'Failed to fetch loan details'  });
            }
        }
    });

    // POST /loans/pay-installment
    fastify.post('/pay-installment', { preHandler: [requireCapability('cooperative.loans.repay')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || req.body?.idempotencyKey) as string | undefined;
            const parsed = payInstallmentSchema.parse(req.body);
            const updatedInstallment = await LoanService.payInstallment(parsed.installmentId, idempotencyKey);

            // Broadcast event realtime ke WebSocket klien
            const io = req.server?.io || fastify.io;
            if (io) {
                const broadcastPayload = {
                    type: 'INSTALLMENT_PAID',
                    installmentId: parsed.installmentId,
                    loanId: updatedInstallment?.loanId,
                    timestamp: new Date().toISOString()
                };
                io.to(`tenant:${tenantId}`).emit('coop_loan_update', broadcastPayload);
                io.emit('coop_loan_update', broadcastPayload);
            }

            return updatedInstallment;
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            if (error instanceof z.ZodError) {
                return reply.code(400).send({
                    message: error.errors.map(e => e.message).join(', '),
                    errors: error.errors
                });
            }
            if (error.message === 'Installment not found') {
                reply.code(404).send({ message: 'Installment not found' });
            } else if (error.message === 'Installment already paid') {
                reply.code(400).send({ message: 'Installment already paid' });
            } else {
                reply.status(500).send({ success: false, message: 'Failed to pay installment'  });
            }
        }
    });

    // Handler pembaruan status pinjaman (bisa dipanggil via PUT maupun PATCH)
    const handleUpdateLoanStatus = async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const parsed = updateLoanStatusSchema.parse(req.body);
            const loan = await LoanService.updateLoanStatus(
                req.params.id, 
                parsed.status, 
                tenantId, 
                req.user?.id, 
                parsed.rejectionReason
            );

            // Broadcast event realtime ke WebSocket klien
            const io = req.server?.io || fastify.io;
            if (io) {
                const broadcastPayload = {
                    type: 'LOAN_STATUS_UPDATED',
                    loanId: req.params.id,
                    status: parsed.status,
                    rejectionReason: parsed.rejectionReason,
                    timestamp: new Date().toISOString()
                };
                io.to(`tenant:${tenantId}`).emit('coop_loan_update', broadcastPayload);
                io.emit('coop_loan_update', broadcastPayload);
            }

            return loan;
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            if (error instanceof z.ZodError) {
                return reply.code(400).send({
                    message: error.errors.map(e => e.message).join(', '),
                    errors: error.errors
                });
            }
            if (error.message?.includes('Self-Approval')) {
                reply.code(400).send({ message: error.message });
            } else {
                reply.status(500).send({ success: false, message: 'Failed to update loan status'  });
            }
        }
    };

    // PUT /loans/:id/status
    fastify.put('/:id/status', { preHandler: [requireCapability(['cooperative.loans.approve', 'cooperative.loans.reject'])] }, handleUpdateLoanStatus);
    
    // PATCH /loans/:id/status (Dukungan alias untuk kompatibilitas REST client)
    fastify.patch('/:id/status', { preHandler: [requireCapability(['cooperative.loans.approve', 'cooperative.loans.reject'])] }, handleUpdateLoanStatus);
}



