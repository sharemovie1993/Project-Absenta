// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '../../../utils/prisma';
import { LoanStatus, PaymentStatus } from '@prisma/client';
import { AccountingService } from '../laporan/accounting.service';

// State machine: transisi status yang diizinkan
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
    PENDING:  ['APPROVED', 'REJECTED'],
    APPROVED: ['PAID', 'BAD_DEBT'],
    REJECTED: [],
    PAID:     [],
    BAD_DEBT: [],
};

export class LoanService {

    // Get loans by user_id
    static async getLoansByUserId(tenantId: string, userId: string) {
        const member = await prisma.member.findFirst({ where: { tenantId, userId } });
        if (!member) return [];
        return this.getLoans(tenantId, member.id);
    }

    // Get all loans for a tenant
    static async getLoans(tenantId: string, memberId?: string) {
        const whereClause: any = { member: { tenantId } };
        if (memberId) whereClause.memberId = memberId;

        const loans = await prisma.loan.findMany({
            where: whereClause,
            include: {
                member: {
                    include: {
                        Siswa: { select: { nama_siswa: true } },
                        Guru:  { select: { nama_guru:  true } },
                        User:  { select: { full_name:  true } },
                    },
                },
                installments: { orderBy: { dueDate: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return loans.map(loan => ({
            ...loan,
            member: {
                ...loan.member,
                name: loan.member.Siswa?.nama_siswa || loan.member.Guru?.nama_guru || loan.member.User?.full_name || 'Unknown',
            },
        }));
    }

    // Create a new loan application
    static async createLoan(memberId: string, amount: number, interestRate: number, duration: number) {
        // [GUARD: Validasi input dasar]
        if (!memberId)        throw new Error('memberId wajib diisi.');
        if (amount <= 0)      throw new Error('Jumlah pinjaman harus lebih dari 0.');
        if (interestRate < 0) throw new Error('Suku bunga tidak boleh negatif.');
        if (duration <= 0 || !Number.isInteger(duration)) throw new Error('Tenor harus bilangan bulat positif.');

        // [LAPIS 1: Single Active Loan Rule]
        const existingActiveLoan = await prisma.loan.findFirst({
            where: { memberId, status: 'APPROVED' }
        });
        if (existingActiveLoan) {
            throw new Error(
                'LOAN_RESTRICTION:ACTIVE: Anggota masih memiliki pinjaman aktif yang sedang berjalan dan belum lunas. ' +
                'Sesuai dengan ketentuan operasional koperasi (prinsip kehati-hatian KSP), pengajuan pinjaman baru hanya dapat ' +
                'dilakukan setelah seluruh cicilan pinjaman yang berjalan diselesaikan.'
            );
        }

        // [LAPIS 2: Single Pending Rule]
        const existingPendingLoan = await prisma.loan.findFirst({
            where: { memberId, status: 'PENDING' }
        });
        if (existingPendingLoan) {
            throw new Error(
                'LOAN_RESTRICTION:PENDING: Anggota masih memiliki pengajuan pinjaman yang sedang dalam proses peninjauan oleh pengurus koperasi (status: MENUNGGU). ' +
                'Pengajuan pinjaman baru tidak dapat dilakukan hingga pengajuan sebelumnya mendapatkan keputusan (disetujui atau ditolak).'
            );
        }

        // Hitung jadwal cicilan
        const totalInterest     = Number(amount) * (Number(interestRate) / 100);
        const totalAmount       = Number(amount) + totalInterest;
        const baseInstallment   = Math.floor(totalAmount / Number(duration)); // Bulatkan ke bawah
        const lastInstallment   = totalAmount - baseInstallment * (Number(duration) - 1); // Sisa ke cicilan terakhir

        const today = new Date();

        return prisma.$transaction(async (tx: any) => {
            const loan = await tx.loan.create({
                data: { memberId, amount, interestRate, duration, status: 'PENDING' }
            });

            const installments = [];
            for (let i = 1; i <= Number(duration); i++) {
                const dueDate = new Date(today);
                dueDate.setMonth(today.getMonth() + i);
                installments.push({
                    loanId: loan.id,
                    amount: i === Number(duration) ? lastInstallment : baseInstallment, // Cicilan terakhir menanggung selisih rounding
                    dueDate,
                    status: 'UNPAID' as PaymentStatus,
                });
            }

            await tx.installment.createMany({ data: installments });

            return tx.loan.findUnique({
                where: { id: loan.id },
                include: { installments: true },
            });
        });
    }

    // Get loan details
    static async getLoanById(loanId: string, tenantId: string) {
        const loan = await prisma.loan.findFirst({
            where: { id: loanId, member: { tenantId } },
            include: {
                member: {
                    include: {
                        Siswa: { select: { nama_siswa: true } },
                        Guru:  { select: { nama_guru:  true } },
                        User:  { select: { full_name:  true } },
                    },
                },
                installments: { orderBy: { dueDate: 'asc' } },
            },
        });
        if (!loan) throw new Error('Loan not found');

        const savings = await prisma.saving.findMany({
            where: { memberId: loan.memberId },
            include: { category: true },
        });
        const totalSavings = savings.reduce((sum, s) => sum + Number(s.amount), 0);
        const savingsBreakdown = savings.map(s => ({
            categoryName: s.category.name,
            code:         s.category.code,
            amount:       Number(s.amount),
            color:        s.category.color,
        }));

        const loanHistory = await prisma.loan.findMany({
            where: { memberId: loan.memberId, NOT: { id: loanId } },
            select: { id: true, amount: true, status: true, createdAt: true },
        });

        return {
            ...loan,
            member: {
                ...loan.member,
                name: loan.member.Siswa?.nama_siswa || loan.member.Guru?.nama_guru || loan.member.User?.full_name || 'Unknown',
                totalSavings,
                savingsBreakdown,
                loanHistory: loanHistory.map(l => ({ ...l, amount: Number(l.amount) })),
            },
        };
    }

    // Approve or Reject Loan (dengan state machine)
    static async updateLoanStatus(loanId: string, status: LoanStatus, tenantId: string, operatorUserId?: string) {
        const loan = await this.getLoanById(loanId, tenantId);

        // [GUARD 1: Validasi transisi status]
        const currentStatus = loan.status as string;
        const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
        if (!allowed.includes(status)) {
            throw new Error(
                `Transisi status tidak valid: ${currentStatus} → ${status}. ` +
                `Status yang diizinkan dari ${currentStatus}: [${allowed.join(', ') || 'tidak ada'}].`
            );
        }

        // [GUARD 2: Anti-Self-Approval]
        if (operatorUserId && loan.member.userId === operatorUserId) {
            throw new Error('Operator tidak diperbolehkan menyetujui atau menolak pengajuan pinjaman milik sendiri (Self-Approval Prevention).');
        }

        // Pre-warm Chart of Accounts SEBELUM $transaction (mencegah deadlock)
        if (status === 'APPROVED') {
            await AccountingService.getOrCreateDefaultAccounts(tenantId);
        }

        return prisma.$transaction(async (tx: any) => {
            const updatedLoan = await tx.loan.update({
                where: { id: loanId },
                data: { status },
            });

            if (status === 'APPROVED') {
                const amount = Number(loan.amount);

                // Penyaluran Pinjaman:
                // Debit: 1020 (Piutang Anggota) — aset bertambah
                // Kredit: 1010 (Kas Koperasi)  — kas berkurang
                await AccountingService.createJournalEntry(
                    tenantId,
                    `Penyaluran Pinjaman Baru (${loan.member.memberNo})`,
                    `LN-DISB-${loan.id}`,
                    [
                        { accountCode: '1020', type: 'DEBIT',  amount },
                        { accountCode: '1010', type: 'CREDIT', amount },
                    ],
                    tx,
                );
            }

            return updatedLoan;
        });
    }

    // Pay installment (dengan anti-race condition)
    static async payInstallment(installmentId: string) {
        if (!installmentId) throw new Error('installmentId wajib diisi.');

        // Baca data awal untuk mendapatkan tenantId (di luar tx)
        const installmentData = await prisma.installment.findUnique({
            where: { id: installmentId },
            include: { loan: { include: { member: true } } },
        });
        if (!installmentData) throw new Error('Installment not found');
        if (installmentData.status === 'PAID') throw new Error('Installment already paid');

        const tenantId = installmentData.loan.member.tenantId;

        // Pre-warm Chart of Accounts SEBELUM $transaction
        await AccountingService.getOrCreateDefaultAccounts(tenantId);

        // Hitung komponen pokok dan bunga SEBELUM tx (tidak perlu dalam tx)
        const loanAmount      = Number(installmentData.loan.amount);
        const interestRate    = Number(installmentData.loan.interestRate);
        const duration        = Number(installmentData.loan.duration);
        const rawInstallment  = Number(installmentData.amount);
        const totalInstallment = Math.round(rawInstallment);

        const totalInterest           = loanAmount * (interestRate / 100);
        const interestPerInstallment  = Math.round(totalInterest / duration);
        const principalPerInstallment = totalInstallment - interestPerInstallment;

        return prisma.$transaction(async (tx: any) => {
            // [ANTI-RACE CONDITION: Update dengan filter status=UNPAID]
            // Jika ada request concurent, hanya satu yang bisa update (yang lain akan dapat 0 rows)
            const updated = await tx.installment.updateMany({
                where: { id: installmentId, status: 'UNPAID' }, // hanya update jika masih UNPAID
                data: { status: 'PAID', paidDate: new Date() },
            });

            // Jika tidak ada row yang terupdate, berarti sudah dibayar oleh request lain
            if (updated.count === 0) {
                throw new Error('Installment already paid');
            }

            // Ambil data installment yang baru diupdate (untuk return)
            const paidInstallment = await tx.installment.findUnique({ where: { id: installmentId } });

            // Cek apakah semua cicilan sudah lunas
            const unpaidCount = await tx.installment.count({
                where: { loanId: installmentData.loanId, status: { not: 'PAID' } },
            });

            if (unpaidCount === 0) {
                await tx.loan.update({
                    where: { id: installmentData.loanId },
                    data: { status: 'PAID' },
                });
            }

            // Catat Jurnal Akuntansi (Double-Entry — Standar KSP):
            // Debit  1010 (Kas Koperasi)               — total cicilan diterima
            // Kredit 1020 (Piutang Anggota)             — porsi pokok (mengurangi piutang)
            // Kredit 4020 (Pendapatan Bunga Pinjaman)   — porsi bunga (REVENUE)
            await AccountingService.createJournalEntry(
                tenantId,
                `Pembayaran Angsuran Bulanan (${installmentData.loan.member.memberNo})`,
                `LN-REP-${installmentId}`,
                [
                    { accountCode: '1010', type: 'DEBIT',  amount: totalInstallment },
                    { accountCode: '1020', type: 'CREDIT', amount: principalPerInstallment },
                    { accountCode: '4020', type: 'CREDIT', amount: interestPerInstallment },
                ],
                tx,
            );

            return paidInstallment;
        });
    }
}
