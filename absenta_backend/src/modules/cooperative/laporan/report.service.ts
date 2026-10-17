// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '../../../utils/prisma';
import { AccountType, JournalType } from '@prisma/client';
import { AccountingService } from './accounting.service';

// In-Memory Idempotency Cache (5 menit TTL) untuk bulk payroll posting & cancellation
const idempotencyCache = new Map<string, { data: any; timestamp: number }>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

const idempotencySweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of idempotencyCache.entries()) {
        if (now - value.timestamp > IDEMPOTENCY_TTL_MS) {
            idempotencyCache.delete(key);
        }
    }
}, 60 * 1000);

if (typeof idempotencySweepTimer?.unref === 'function') {
    idempotencySweepTimer.unref();
}

// In-Flight Payroll Mutex Lock per tenant & period
const payrollLocks = new Set<string>();

export class ReportService {
    
    /**
     * Get Trial Balance (Neraca Saldo) — Seluruh Akun (1-5) dengan Kolom Debit & Kredit SAK ETAP
     */
    static async getTrialBalance(tenantId: string, asOfDate?: Date) {
        const journalDateFilter = asOfDate 
            ? { journal: { date: { lte: asOfDate } } }
            : {};

        // Ambil seluruh akun non-header
        const accounts = await prisma.account.findMany({
            where: {
                tenantId,
                isHeader: { not: true },
            },
            include: {
                journalItems: {
                    where: journalDateFilter,
                    select: {
                        amount: true,
                        type: true,
                    }
                }
            },
            orderBy: {
                code: 'asc'
            }
        });

        const trialBalanceAccounts = accounts.map(acc => {
            let totalDebit = 0;
            let totalCredit = 0;

            acc.journalItems.forEach(item => {
                const amt = Number(item.amount || 0);
                if (item.type === 'DEBIT') totalDebit += amt;
                else if (item.type === 'CREDIT') totalCredit += amt;
            });

            let debitBalance = 0;
            let creditBalance = 0;

            // Aturan Saldo Normal Akuntansi:
            // Aktiva (1) & Beban (5): Saldo Normal DEBIT
            // Kewajiban (2), Ekuitas (3), Pendapatan (4): Saldo Normal KREDIT
            if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
                const net = totalDebit - totalCredit;
                if (net >= 0) {
                    debitBalance = Math.round(net);
                } else {
                    creditBalance = Math.round(Math.abs(net)); // Kontra-aset masuk Kredit
                }
            } else {
                const net = totalCredit - totalDebit;
                if (net >= 0) {
                    creditBalance = Math.round(net);
                } else {
                    debitBalance = Math.round(Math.abs(net)); // Kontra-liabilitas/ekuitas masuk Debit
                }
            }

            return {
                id: acc.id,
                code: acc.code,
                name: acc.name,
                type: acc.type,
                debit: debitBalance,
                credit: creditBalance,
                totalMutationDebit: totalDebit,
                totalMutationCredit: totalCredit,
            };
        });

        // Filter akun yang memiliki saldo atau mutasi agar neraca saldo bersih
        const activeAccounts = trialBalanceAccounts.filter(a => a.debit > 0 || a.credit > 0 || a.totalMutationDebit > 0 || a.totalMutationCredit > 0);

        const totalDebit = activeAccounts.reduce((sum, a) => sum + a.debit, 0);
        const totalCredit = activeAccounts.reduce((sum, a) => sum + a.credit, 0);
        const balanceCheck = Math.abs(totalDebit - totalCredit);
        const isBalanced = balanceCheck === 0;

        return {
            accounts: activeAccounts,
            summary: {
                totalDebit,
                totalCredit,
                balanceCheck,
                isBalanced,
                totalAccounts: activeAccounts.length
            }
        };
    }

    // Get Balance Sheet (Neraca) — format standar akuntansi (Aktiva = Pasiva)
    static async getBalanceSheet(tenantId: string, asOfDate?: Date) {
        const journalDateFilter = asOfDate 
            ? { journal: { date: { lte: asOfDate } } }
            : {};

        // Get all accounts with type ASSET, LIABILITY, EQUITY
        const accounts = await prisma.account.findMany({
            where: {
                tenantId: tenantId,
                type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
                isHeader: { not: true }
            },
            include: {
                journalItems: {
                    where: journalDateFilter,
                    select: {
                        amount: true,
                        type: true
                    }
                }
            }
        });

        // Calculate balances
        const reportData = accounts.map(account => {
            let balance = 0;
            account.journalItems.forEach(item => {
                const amount = Number(item.amount);
                
                // For Asset: Debit increases (+), Credit decreases (-)
                if (account.type === 'ASSET') {
                    if (item.type === 'DEBIT') balance += amount;
                    else balance -= amount;
                }
                // For Liability & Equity: Credit increases (+), Debit decreases (-)
                else {
                    if (item.type === 'CREDIT') balance += amount;
                    else balance -= amount;
                }
            });

            return {
                id: account.id,
                code: account.code,
                name: account.name,
                type: account.type,
                balance
            };
        });

        // Hitung Laba/Rugi (SHU) Berjalan dari Income Statement hingga tanggal ini
        let currentYearEarnings = 0;
        try {
            const incomeStmt = await this.getIncomeStatement(tenantId, undefined, asOfDate);
            currentYearEarnings = Math.round(Number(incomeStmt.summary?.netIncome || 0));
        } catch (e) {
            appLogger.warn({ err: e }, '[ReportService] Gagal menghitung current year earnings untuk neraca');
        }

        // Group by Type
        const assets = reportData.filter(a => a.type === 'ASSET');
        const liabilities = reportData.filter(a => a.type === 'LIABILITY');
        const equity = reportData.filter(a => a.type === 'EQUITY');

        // Jika ada Laba/Rugi berjalan dan belum ada akun penutup, sertakan ke baris Ekuitas
        if (currentYearEarnings !== 0) {
            equity.push({
                id: 'current-year-shu',
                code: '3099',
                name: 'Sisa Hasil Usaha (SHU) Berjalan',
                type: 'EQUITY',
                balance: currentYearEarnings
            });
        }

        const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
        const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);

        return {
            assets,
            liabilities,
            equity,
            summary: {
                totalAssets,
                totalLiabilities,
                totalEquity,
                totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
                currentYearEarnings,
                isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) === 0,
                balanceCheck: totalAssets - (totalLiabilities + totalEquity) // Should be 0
            }
        };
    }

    // Get Income Statement (Laba Rugi) — opsional filter rentang tanggal untuk SHU per periode
    static async getIncomeStatement(tenantId: string, startDate?: Date, endDate?: Date) {
        // Buat filter tanggal untuk jurnal (opsional)
        const journalDateFilter = (startDate && endDate)
            ? { journal: { date: { gte: startDate, lte: endDate } } }
            : {};

        // Get Revenue and Expense accounts
        const accounts = await prisma.account.findMany({
            where: {
                tenantId: tenantId,
                type: { in: ['REVENUE', 'EXPENSE'] },
                isHeader: { not: true }
            },
            include: {
                journalItems: {
                    where: journalDateFilter,
                    select: { amount: true, type: true }
                }
            }
        });

        const reportData = accounts.map(account => {
            let balance = 0;
            account.journalItems.forEach(item => {
                const amount = Number(item.amount);
                
                if (account.type === 'REVENUE') {
                    // Revenue: Credit increases (+), Debit decreases (-)
                    if (item.type === 'CREDIT') balance += amount;
                    else balance -= amount;
                } else {
                    // Expense: Debit increases (+), Credit decreases (-)
                    if (item.type === 'DEBIT') balance += amount;
                    else balance -= amount;
                }
            });

            return {
                id: account.id,
                code: account.code,
                name: account.name,
                type: account.type,
                balance
            };
        });

        const revenue = reportData.filter(a => a.type === 'REVENUE');
        const expense = reportData.filter(a => a.type === 'EXPENSE');

        const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0);
        const totalExpense = expense.reduce((sum, a) => sum + a.balance, 0);

        return {
            revenue,
            expense,
            summary: {
                totalRevenue,
                totalExpense,
                netIncome: totalRevenue - totalExpense
            }
        };
    }

    // Get Member Savings Report (Simpanan Anggota)
    static async getMemberSavingsReport(tenantId: string) {
        const members = await prisma.member.findMany({
            where: { tenantId },
            include: {
                Siswa: { select: { nama_siswa: true } },
                Guru: { select: { nama_guru: true } },
                User: { select: { full_name: true } },
                savings: {
                    select: { type: true, amount: true }
                }
            }
        });

        return members.map(member => {
            const savingsSummary = member.savings.reduce((acc: any, saving) => {
                acc[saving.type] = (acc[saving.type] || 0) + Number(saving.amount);
                acc.total += Number(saving.amount);
                return acc;
            }, { total: 0 });

            return {
                memberId: member.id,
                memberNo: member.memberNo,
                name: member.Siswa?.nama_siswa || member.Guru?.nama_guru || member.User?.full_name || 'Unknown',
                savings: savingsSummary
            };
        });
    }

    // Get all journal entries for a tenant
    static async getJournals(tenantId: string) {
        return await prisma.journal.findMany({
            where: {
                tenantId: tenantId
            },
            include: {
                items: {
                    include: {
                        account: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
    }

    /**
     * Buku Besar Detail per Akun (General Ledger Detail Drill-down)
     */
    static async getGeneralLedgerByAccount(tenantId: string, accountCode: string, startDate?: Date, endDate?: Date) {
        const account = await prisma.account.findFirst({
            where: { tenantId, code: accountCode }
        });

        if (!account) {
            throw new Error(`Akun dengan kode ${accountCode} tidak ditemukan`);
        }

        let openingBalance = 0;
        if (startDate) {
            const priorItems = await prisma.journalItem.findMany({
                where: {
                    accountId: account.id,
                    journal: {
                        tenantId,
                        date: { lt: startDate }
                    }
                },
                select: { amount: true, type: true }
            });

            for (const item of priorItems) {
                const amt = Number(item.amount || 0);
                if (account.type === 'ASSET' || account.type === 'EXPENSE') {
                    if (item.type === 'DEBIT') openingBalance += amt;
                    else openingBalance -= amt;
                } else {
                    if (item.type === 'CREDIT') openingBalance += amt;
                    else openingBalance -= amt;
                }
            }
        }

        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) dateFilter.lte = endDate;

        const journalWhere: any = { tenantId };
        if (Object.keys(dateFilter).length > 0) {
            journalWhere.date = dateFilter;
        }

        const items = await prisma.journalItem.findMany({
            where: {
                accountId: account.id,
                journal: journalWhere
            },
            include: {
                journal: true
            },
            orderBy: {
                journal: { date: 'asc' }
            }
        });

        let runningBalance = openingBalance;
        let totalDebit = 0;
        let totalCredit = 0;

        const entries = items.map(item => {
            const amt = Number(item.amount || 0);
            const isDebit = item.type === 'DEBIT';
            const debit = isDebit ? amt : 0;
            const credit = !isDebit ? amt : 0;

            totalDebit += debit;
            totalCredit += credit;

            if (account.type === 'ASSET' || account.type === 'EXPENSE') {
                runningBalance = runningBalance + debit - credit;
            } else {
                runningBalance = runningBalance + credit - debit;
            }

            return {
                id: item.id,
                journalId: item.journalId,
                date: item.journal.date,
                reference: item.journal.reference || '-',
                description: item.journal.description || '-',
                type: item.type,
                debit,
                credit,
                runningBalance
            };
        });

        return {
            account: {
                id: account.id,
                code: account.code,
                name: account.name,
                type: account.type,
            },
            openingBalance,
            totalDebit,
            totalCredit,
            endingBalance: runningBalance,
            entries
        };
    }

    /**
     * Laporan Arus Kas Koperasi (Statement of Cash Flows)
     */
    static async getCashFlowStatement(tenantId: string, startDate?: Date, endDate?: Date) {
        const cashAccounts = await prisma.account.findMany({
            where: {
                tenantId,
                isHeader: false,
                OR: [
                    { code: { in: ['1010', '1011'] } },
                    { code: { startsWith: '101' } },
                    { parent: { code: { in: ['1010', '1100'] } } },
                ]
            }
        });
        const cashAccountIds = cashAccounts.map(a => a.id);

        if (cashAccountIds.length === 0) {
            return {
                operating: { inflows: [], outflows: [], totalInflows: 0, totalOutflows: 0, net: 0 },
                investing: { inflows: [], outflows: [], totalInflows: 0, totalOutflows: 0, net: 0 },
                financing: { inflows: [], outflows: [], totalInflows: 0, totalOutflows: 0, net: 0 },
                netChangeInCash: 0,
                beginningCash: 0,
                endingCash: 0
            };
        }

        let beginningCash = 0;
        if (startDate) {
            const priorCashItems = await prisma.journalItem.findMany({
                where: {
                    accountId: { in: cashAccountIds },
                    journal: { tenantId, date: { lt: startDate } }
                },
                select: { amount: true, type: true }
            });
            for (const item of priorCashItems) {
                const amt = Number(item.amount || 0);
                if (item.type === 'DEBIT') beginningCash += amt;
                else beginningCash -= amt;
            }
        }

        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) dateFilter.lte = endDate;

        const journalWhere: any = {
            tenantId,
            items: {
                some: { accountId: { in: cashAccountIds } }
            }
        };
        if (Object.keys(dateFilter).length > 0) {
            journalWhere.date = dateFilter;
        }

        const journals = await prisma.journal.findMany({
            where: journalWhere,
            include: {
                items: {
                    include: { account: true }
                }
            },
            orderBy: { date: 'asc' }
        });

        const operatingInflows: any[] = [];
        const operatingOutflows: any[] = [];
        const investingOutflows: any[] = [];
        const financingInflows: any[] = [];
        const financingOutflows: any[] = [];

        for (const j of journals) {
            const cashItems = j.items.filter(i => cashAccountIds.includes(i.accountId));
            const nonCashItems = j.items.filter(i => !cashAccountIds.includes(i.accountId));

            if (nonCashItems.length === 0) continue;

            for (const cashItem of cashItems) {
                const amount = Number(cashItem.amount || 0);
                const isCashIn = cashItem.type === 'DEBIT';

                const counterpart = nonCashItems[0]?.account;
                const counterpartCode = counterpart?.code || '';
                const counterpartName = counterpart?.name || j.description || 'Transaksi Kas';

                if (counterpartCode.startsWith('15')) {
                    if (!isCashIn) {
                        investingOutflows.push({
                            date: j.date,
                            description: j.description,
                            reference: j.reference,
                            accountName: counterpartName,
                            amount
                        });
                    }
                } else if (counterpartCode.startsWith('20') || counterpartCode.startsWith('30')) {
                    if (isCashIn) {
                        financingInflows.push({
                            date: j.date,
                            description: j.description,
                            reference: j.reference,
                            accountName: counterpartName,
                            amount
                        });
                    } else {
                        financingOutflows.push({
                            date: j.date,
                            description: j.description,
                            reference: j.reference,
                            accountName: counterpartName,
                            amount
                        });
                    }
                } else {
                    if (isCashIn) {
                        operatingInflows.push({
                            date: j.date,
                            description: j.description,
                            reference: j.reference,
                            accountName: counterpartName,
                            amount
                        });
                    } else {
                        operatingOutflows.push({
                            date: j.date,
                            description: j.description,
                            reference: j.reference,
                            accountName: counterpartName,
                            amount
                        });
                    }
                }
            }
        }

        const totalOperatingIn = operatingInflows.reduce((s, i) => s + i.amount, 0);
        const totalOperatingOut = operatingOutflows.reduce((s, o) => s + o.amount, 0);
        const netOperating = totalOperatingIn - totalOperatingOut;

        const totalInvestingOut = investingOutflows.reduce((s, o) => s + o.amount, 0);
        const netInvesting = -totalInvestingOut;

        const totalFinancingIn = financingInflows.reduce((s, i) => s + i.amount, 0);
        const totalFinancingOut = financingOutflows.reduce((s, o) => s + o.amount, 0);
        const netFinancing = totalFinancingIn - totalFinancingOut;

        const netChangeInCash = netOperating + netInvesting + netFinancing;
        const endingCash = beginningCash + netChangeInCash;

        return {
            operating: {
                inflows: operatingInflows,
                outflows: operatingOutflows,
                totalInflows: totalOperatingIn,
                totalOutflows: totalOperatingOut,
                net: netOperating
            },
            investing: {
                inflows: [],
                outflows: investingOutflows,
                totalInflows: 0,
                totalOutflows: totalInvestingOut,
                net: netInvesting
            },
            financing: {
                inflows: financingInflows,
                outflows: financingOutflows,
                totalInflows: totalFinancingIn,
                totalOutflows: totalFinancingOut,
                net: netFinancing
            },
            netChangeInCash,
            beginningCash,
            endingCash
        };
    }

    // Get Payroll Deductions Report
    static async getPayrollDeductionsReport(tenantId: string, month: number, year: number) {
        // Cek apakah sudah pernah diposting untuk periode & tenant ini
        const reference = `PAYROLL-${tenantId}-${year}-${String(month).padStart(2, '0')}`;
        const alreadyPosted = await prisma.journal.findFirst({
            where: { reference, tenantId }
        });
        const isPosted = !!alreadyPosted;

        const members = await prisma.member.findMany({
            where: { 
                tenantId,
                status: 'ACTIVE',
                type: { not: 'STUDENT' } // Guru/Staf
            },
            include: {
                Siswa: { select: { nama_siswa: true } },
                Guru: { select: { nama_guru: true } },
                User: { select: { full_name: true } },
                savings: {
                    include: {
                        category: true,
                        transactions: {
                            where: {
                                type: 'DEPOSIT'
                            }
                        }
                    }
                },
                loans: {
                    where: {
                        status: 'APPROVED'
                    },
                    include: {
                        installments: {
                            orderBy: { dueDate: 'asc' }
                        }
                    }
                }
            }
        });

        const categories = await prisma.savingCategory.findMany({
            where: { tenantId, isActive: true }
        });

        const mappedData = members.map((member, idx) => {
            let installmentNo = null;
            let principalAmount = 0;
            let interestAmount = 0;
            
            // Look for installments due in this month/year
            const activeLoan = member.loans[0]; // Get the first active loan
            if (activeLoan) {
                const targetInstallmentIndex = activeLoan.installments.findIndex(inst => {
                    if (!inst.dueDate) return false;
                    const d = new Date(inst.dueDate);
                    return (d.getMonth() + 1) === month && d.getFullYear() === year;
                });
                
                if (targetInstallmentIndex !== -1) {
                    const targetInstallment = activeLoan.installments[targetInstallmentIndex];
                    installmentNo = targetInstallmentIndex + 1;
                    
                    const duration = activeLoan.duration;
                    const loanAmount = Number(activeLoan.amount);
                    const interestRate = Number(activeLoan.interestRate);
                    
                    principalAmount = Math.round(loanAmount / duration);
                    interestAmount = Math.round(loanAmount * (interestRate / 100));
                }
            }

            // Dynamically populate savings by category code
            const savings: Record<string, number> = {};
            let savingsTotal = 0;
            categories.forEach(cat => {
                let amount = Number(cat.defaultAmount || 0);

                // Conditional POKOK logic: Only deduct if the member has not paid it yet (historical calculation)
                if (cat.code === 'POKOK') {
                    const existingSaving = member.savings?.find(s => s.category?.code === 'POKOK');
                    if (existingSaving) {
                        const deposits = existingSaving.transactions || [];
                        let depositedBefore = 0;
                        let payrollDepositedDuring = 0;
                        let nonPayrollDepositedDuring = 0;

                        deposits.forEach(tx => {
                            if (tx.type === 'DEPOSIT') {
                                const txAmount = Number(tx.amount);
                                const txDate = new Date(tx.date);
                                const txYear = txDate.getFullYear();
                                const txMonth = txDate.getMonth() + 1;

                                const isPayrollTx = tx.description?.startsWith('Setoran Potongan Gaji');

                                if (txYear < year || (txYear === year && txMonth < month)) {
                                    depositedBefore += txAmount;
                                } else if (txYear === year && txMonth === month) {
                                    if (isPayrollTx) {
                                        payrollDepositedDuring += txAmount;
                                    } else {
                                        nonPayrollDepositedDuring += txAmount;
                                    }
                                }
                            }
                        });

                        if (depositedBefore > 0) {
                            amount = 0;
                        } else if (isPosted) {
                            amount = payrollDepositedDuring;
                        } else {
                            const alreadyPaidDuring = nonPayrollDepositedDuring > 0;
                            const hasExistingBalance = Number(existingSaving.amount) > 0;

                            if (alreadyPaidDuring || hasExistingBalance) {
                                amount = 0;
                            } else {
                                const joinDate = member.joinDate || member.createdAt;
                                const joinDateObj = new Date(joinDate);
                                const joinYear = joinDateObj.getFullYear();
                                const joinMonth = joinDateObj.getMonth() + 1;
                                const joinedOnOrBefore = joinYear < year || (joinYear === year && joinMonth <= month);
                                
                                amount = joinedOnOrBefore ? Number(cat.defaultAmount || 0) : 0;
                            }
                        }
                    } else {
                        if (isPosted) {
                            amount = 0;
                        } else {
                            const joinDate = member.joinDate || member.createdAt;
                            const joinDateObj = new Date(joinDate);
                            const joinYear = joinDateObj.getFullYear();
                            const joinMonth = joinDateObj.getMonth() + 1;
                            const joinedOnOrBefore = joinYear < year || (joinYear === year && joinMonth <= month);

                            amount = joinedOnOrBefore ? Number(cat.defaultAmount || 0) : 0;
                        }
                    }
                }

                savings[cat.code] = amount;
                savingsTotal += amount;
            });

            const totalDeduction = savingsTotal + principalAmount + interestAmount;

            return {
                no: idx + 1,
                memberNo: member.memberNo,
                name: member.Guru?.nama_guru || member.User?.full_name || member.Siswa?.nama_siswa || 'Unknown',
                savings,
                loan: {
                    installmentNo,
                    pokok: principalAmount,
                    jasa: interestAmount
                },
                total: totalDeduction
            };
        });

        const hasLoans = members.some(m => m.loans.length > 0);

        // Filter out categories that have 0 total deductions for all active members in this month
        const activeCategories = categories.filter(cat => 
            mappedData.some(item => (item.savings[cat.code] || 0) > 0)
        );

        return {
            savingCategories: activeCategories.map(c => ({ code: c.code, name: c.name })),
            hasLoans,
            isPosted,
            data: mappedData
        };
    }

    /** Memproses posting potongan gaji bulanan secara massal */
    static async postPayrollDeductions(tenantId: string, month: number, year: number, operatorUserId?: string, idempotencyKey?: string) {
        if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
            appLogger.info({ idempotencyKey, tenantId, month, year }, '[PAYROLL] Returning cached post result');
            return idempotencyCache.get(idempotencyKey)!.data;
        }

        const lockKey = `${tenantId}:${year}:${month}`;
        if (payrollLocks.has(lockKey)) {
            throw new Error(`Posting potongan gaji periode ${month}/${year} sedang berjalan dalam proses lain. Mohon tunggu.`);
        }

        payrollLocks.add(lockKey);

        try {
            const reference = `PAYROLL-${tenantId}-${year}-${String(month).padStart(2, '0')}`;
            
            // 1. Cek apakah sudah pernah diposting
            const alreadyPosted = await prisma.journal.findFirst({ where: { reference, tenantId } });
            if (alreadyPosted) {
                throw new Error('Potongan gaji untuk periode ini sudah pernah diposting.');
            }

        // 2. Ambil data potongan menggunakan logic yang sama
        const report = await this.getPayrollDeductionsReport(tenantId, month, year);
        if (report.data.length === 0) {
            throw new Error('Tidak ada data anggota aktif untuk diproses potongan.');
        }

        // 3. Pre-warm Chart of Accounts & dapatkan daftar kategori
        await AccountingService.getOrCreateDefaultAccounts(tenantId);
        
        const categories = await prisma.savingCategory.findMany({
            where: { tenantId, isActive: true }
        });

        // Resolve all account codes to ensure they exist in COA
        for (const cat of categories) {
            await AccountingService.resolveAccountId(tenantId, cat.accountCode, cat.name);
        }

        // 4. Jalankan posting dalam single database transaction
        const result = await prisma.$transaction(async (tx) => {
            let totalLoanPrincipal = 0;
            let totalLoanInterest = 0;
            const savingTotals: Record<string, number> = {};
            let grandTotalDeductions = 0;

            // Inisialisasi map total per kategori simpanan
            categories.forEach(cat => {
                savingTotals[cat.code] = 0;
            });

            // Loop untuk setiap anggota
            for (const item of report.data) {
                const member = await tx.member.findFirst({
                    where: { memberNo: item.memberNo, tenantId }
                });
                if (!member) continue;

                // A. Proses Simpanan
                for (const [catCode, amount] of Object.entries(item.savings)) {
                    if (amount <= 0) continue;

                    // Cari rekening simpanan anggota untuk kategori ini
                    let saving = await tx.saving.findFirst({
                        where: { memberId: member.id, category: { code: catCode } },
                        include: { category: true }
                    });

                    // Auto-create rekening jika belum ada
                    if (!saving) {
                        const category = categories.find(c => c.code === catCode);
                        if (!category) throw new Error(`Kategori simpanan '${catCode}' tidak ditemukan.`);
                        saving = await tx.saving.create({
                            data: { memberId: member.id, categoryId: category.id, amount: 0 },
                            include: { category: true }
                        });
                    }

                    // Increment saldo
                    await tx.saving.update({
                        where: { id: saving.id },
                        data: { amount: { increment: amount } }
                    });

                    // Catat transaksi simpanan dengan deskripsi referensi periode
                    await tx.savingTransaction.create({
                        data: {
                            savingId: saving.id,
                            amount,
                            type: 'DEPOSIT',
                            description: `Setoran Potongan Gaji ${month}/${year} [${reference}]`
                        }
                    });

                    // Tambahkan ke total akumulasi
                    savingTotals[catCode] = (savingTotals[catCode] || 0) + amount;
                    grandTotalDeductions += amount;
                }

                // B. Proses Pinjaman (jika ada cicilan bulan ini)
                if (item.loan.installmentNo && (item.loan.pokok > 0 || item.loan.jasa > 0)) {
                    const installments = await tx.installment.findMany({
                        where: {
                            loan: { memberId: member.id, status: 'APPROVED' },
                            status: 'UNPAID'
                        },
                        include: { loan: true }
                    });

                    // Temukan installment yang jatuh tempo pada bulan & tahun ini
                    const targetInstallment = installments.find(inst => {
                        if (!inst.dueDate) return false;
                        const d = new Date(inst.dueDate);
                        return (d.getMonth() + 1) === month && d.getFullYear() === year;
                    });

                    if (targetInstallment) {
                        const totalInstallment = item.loan.pokok + item.loan.jasa;

                        // Tandai cicilan Lunas (PAID)
                        await tx.installment.update({
                            where: { id: targetInstallment.id },
                            data: { status: 'PAID', paidDate: new Date() }
                        });

                        // Cek apakah semua cicilan sudah lunas
                        const unpaidCount = await tx.installment.count({
                            where: { loanId: targetInstallment.loanId, status: { not: 'PAID' } }
                        });

                        if (unpaidCount === 0) {
                            await tx.loan.update({
                                where: { id: targetInstallment.loanId },
                                data: { status: 'PAID' }
                            });
                        }

                        // Akumulasi total
                        totalLoanPrincipal += item.loan.pokok;
                        totalLoanInterest += item.loan.jasa;
                        grandTotalDeductions += totalInstallment;
                    }
                }
            }

            // 5. Buat double-entry journal konsolidasian (single balanced journal entry)
            if (grandTotalDeductions > 0) {
                const journalItems: { accountCode: string; type: JournalType; amount: number }[] = [];

                // DEBIT: 1010 Kas (total seluruh uang potongan masuk ke kas koperasi)
                journalItems.push({ accountCode: '1010', type: 'DEBIT', amount: grandTotalDeductions });

                // CREDIT: Akun simpanan masing-masing kategori
                for (const [catCode, totalAmount] of Object.entries(savingTotals)) {
                    if (totalAmount > 0) {
                        const category = categories.find(c => c.code === catCode);
                        const accountCode = category?.accountCode || '2011';
                        journalItems.push({ accountCode, type: 'CREDIT', amount: totalAmount });
                    }
                }

                // CREDIT: 1020 Piutang Anggota (total porsi pokok pinjaman)
                if (totalLoanPrincipal > 0) {
                    journalItems.push({ accountCode: '1020', type: 'CREDIT', amount: totalLoanPrincipal });
                }

                // CREDIT: 4020 Pendapatan Bunga Pinjaman (total porsi bunga pinjaman)
                if (totalLoanInterest > 0) {
                    journalItems.push({ accountCode: '4020', type: 'CREDIT', amount: totalLoanInterest });
                }

                const monthName = new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'long' });
                await AccountingService.createJournalEntry(
                    tenantId,
                    `Posting Potongan Gaji Massal Periode ${monthName.toUpperCase()} ${year}`,
                    reference,
                    journalItems,
                    tx
                );
            }

            return { success: true, grandTotal: grandTotalDeductions };
        });

            if (idempotencyKey) {
                idempotencyCache.set(idempotencyKey, { data: result, expiresAt: Date.now() + IDEMPOTENCY_TTL });
            }

            return result;
        } finally {
            payrollLocks.delete(lockKey);
        }
    }

    /** Membatalkan posting potongan gaji bulanan (Rollback) */
    static async cancelPayrollDeductions(tenantId: string, month: number, year: number, operatorUserId?: string, idempotencyKey?: string) {
        if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
            appLogger.info({ idempotencyKey, tenantId, month, year }, '[PAYROLL] Returning cached cancel result');
            return idempotencyCache.get(idempotencyKey)!.data;
        }

        const lockKey = `${tenantId}:${year}:${month}`;
        if (payrollLocks.has(lockKey)) {
            throw new Error(`Operasi potongan gaji periode ${month}/${year} sedang berjalan dalam proses lain. Mohon tunggu.`);
        }

        payrollLocks.add(lockKey);

        try {
            const reference = `PAYROLL-${tenantId}-${year}-${String(month).padStart(2, '0')}`;
            
            // 1. Cek apakah postingan ada
            const journal = await prisma.journal.findFirst({
                where: { reference, tenantId },
                include: { items: true }
            });
            if (!journal) {
                throw new Error('Data posting potongan gaji untuk periode ini tidak ditemukan.');
            }

            // 2. Ambil data potongan untuk mengetahui siapa saja yang perlu di-revert
            const report = await this.getPayrollDeductionsReport(tenantId, month, year);

            const result = await prisma.$transaction(async (tx) => {
                // A. Revert Simpanan & Hapus Transaksi Simpanan
                for (const item of report.data) {
                    const member = await tx.member.findFirst({
                        where: { memberNo: item.memberNo, tenantId }
                    });
                    if (!member) continue;

                    for (const [catCode, amount] of Object.entries(item.savings)) {
                        if (amount <= 0) continue;

                        // Cari rekening simpanan
                        const saving = await tx.saving.findFirst({
                            where: { memberId: member.id, category: { code: catCode } }
                        });
                        if (saving) {
                            // Cari transaksi setoran potongan gaji untuk periode ini
                            const savingTx = await tx.savingTransaction.findFirst({
                                where: {
                                    savingId: saving.id,
                                    amount,
                                    type: 'DEPOSIT',
                                    description: {
                                        startsWith: `Setoran Potongan Gaji ${month}/${year}`
                                    }
                                }
                            });

                            if (savingTx) {
                                // Kurangi saldo
                                await tx.saving.update({
                                    where: { id: saving.id },
                                    data: { amount: { decrement: amount } }
                                });
                                // Hapus transaksi simpanan
                                await tx.savingTransaction.delete({
                                    where: { id: savingTx.id }
                                });
                            }
                        }
                    }

                    // B. Revert Pinjaman (Ubah status angsuran kembali ke UNPAID)
                    if (item.loan.installmentNo && (item.loan.pokok > 0 || item.loan.jasa > 0)) {
                        const installments = await tx.installment.findMany({
                            where: {
                                loan: { memberId: member.id, status: { in: ['APPROVED', 'PAID'] } },
                                status: 'PAID'
                            },
                            include: { loan: true }
                        });

                        const targetInstallment = installments.find(inst => {
                            if (!inst.dueDate) return false;
                            const d = new Date(inst.dueDate);
                            return (d.getMonth() + 1) === month && d.getFullYear() === year;
                        });

                        if (targetInstallment) {
                            // Set status kembali ke UNPAID
                            await tx.installment.update({
                                where: { id: targetInstallment.id },
                                data: { status: 'UNPAID', paidDate: null }
                            });

                            // Kembalikan status loan ke APPROVED jika sebelumnya lunas
                            if (targetInstallment.loan.status === 'PAID') {
                                await tx.loan.update({
                                    where: { id: targetInstallment.loanId },
                                    data: { status: 'APPROVED' }
                                });
                            }
                        }
                    }
                }

                // C. Hapus Jurnal & Jurnal Items (akan di-cascade delete)
                await tx.journal.delete({
                    where: { id: journal.id }
                });

                return { success: true };
            });

            if (idempotencyKey) {
                idempotencyCache.set(idempotencyKey, { data: result, expiresAt: Date.now() + IDEMPOTENCY_TTL });
            }

            return result;
        } finally {
            payrollLocks.delete(lockKey);
        }
    }

    // =========================================================================
    // LAPORAN INVENTORI KOPERASI — Fase 1
    // =========================================================================

    /**
     * Laporan 1: Snapshot Stok Barang
     * Menampilkan seluruh produk aktif dengan kondisi stok, harga, dan status.
     * Stok ≤ 5 dianggap "RENDAH"; stok = 0 dianggap "HABIS".
     */
    static async getInventoryStockReport(
        tenantId: string,
        options?: { category?: string; lowStockOnly?: boolean }
    ) {
        const where: any = { tenantId };

        if (options?.category && options.category !== 'ALL') {
            where.category = { contains: options.category, mode: 'insensitive' };
        }
        if (options?.lowStockOnly) {
            where.stock = { lte: 5 };
        }

        const products = await prisma.product.findMany({
            where,
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });

        const LOW_STOCK_THRESHOLD = 5;

        const items = products.map(p => {
            const stock    = Number(p.stock);
            const modal    = Number(p.costPrice || 0);
            const jual     = Number(p.price || 0);
            const nilaiPersediaan = stock * modal;

            let status: 'NORMAL' | 'RENDAH' | 'HABIS' = 'NORMAL';
            if (stock === 0)                   status = 'HABIS';
            else if (stock <= LOW_STOCK_THRESHOLD) status = 'RENDAH';

            return {
                id:               p.id,
                code:             p.code,
                name:             p.name,
                category:         p.category || '-',
                stock,
                costPrice:        modal,
                price:            jual,
                nilaiPersediaan,
                status,
            };
        });

        const summary = {
            totalSKU:             items.length,
            totalItems:           items.reduce((s, i) => s + i.stock, 0),
            totalNilaiPersediaan: items.reduce((s, i) => s + i.nilaiPersediaan, 0),
            jumlahHabis:          items.filter(i => i.status === 'HABIS').length,
            jumlahRendah:         items.filter(i => i.status === 'RENDAH').length,
        };

        return { items, summary };
    }

    /**
     * Laporan 2: Nilai Persediaan per Kategori
     * Mengelompokkan nilai modal stok berdasarkan kategori produk.
     */
    static async getInventoryValuationReport(tenantId: string) {
        const products = await prisma.product.findMany({
            where: { tenantId },
            orderBy: { category: 'asc' },
        });

        const categoryMap: Record<string, { category: string; sku: number; totalStock: number; totalValue: number }> = {};

        for (const p of products) {
            const cat   = p.category || 'Tanpa Kategori';
            const stock = Number(p.stock);
            const modal = Number(p.costPrice || 0);

            if (!categoryMap[cat]) {
                categoryMap[cat] = { category: cat, sku: 0, totalStock: 0, totalValue: 0 };
            }
            categoryMap[cat].sku++;
            categoryMap[cat].totalStock += stock;
            categoryMap[cat].totalValue += stock * modal;
        }

        const rows = Object.values(categoryMap).sort((a, b) => b.totalValue - a.totalValue);

        const grandTotal = {
            totalSKU:   rows.reduce((s, r) => s + r.sku, 0),
            totalStock: rows.reduce((s, r) => s + r.totalStock, 0),
            totalValue: rows.reduce((s, r) => s + r.totalValue, 0),
        };

        return { rows, grandTotal };
    }

    /**
     * Laporan 3: Rekap Barang Masuk (Pembelian)
     * Menampilkan seluruh transaksi stock-in dalam rentang waktu tertentu
     * beserta rincian nilai barang, ongkos kirim, dan total pembayaran.
     */
    static async getPurchaseSummaryReport(
        tenantId: string,
        options?: { startDate?: string; endDate?: string; supplier?: string }
    ) {
        const where: any = { tenantId };

        if (options?.supplier) {
            where.supplier = { contains: options.supplier, mode: 'insensitive' };
        }
        if (options?.startDate || options?.endDate) {
            where.date = {};
            if (options.startDate) where.date.gte = new Date(options.startDate + 'T00:00:00.000Z');
            if (options.endDate)   where.date.lte = new Date(options.endDate   + 'T23:59:59.999Z');
        }

        const stockIns = await prisma.coopStockIn.findMany({
            where,
            include: { items: { include: { Product: { select: { name: true, code: true } } } } },
            orderBy: { date: 'desc' },
        });

        const rows = stockIns.map(tx => {
            const nilaiBarang  = tx.items.reduce((s, i) => s + (Number(i.costPrice) * i.quantity), 0);
            const shippingFee  = Number(tx.shippingFee || 0);
            const totalBayar   = nilaiBarang + shippingFee;
            const itemCount    = tx.items.reduce((s, i) => s + i.quantity, 0);

            return {
                id:            tx.id,
                date:          tx.date,
                supplier:      tx.supplier || 'Tanpa Supplier',
                paymentMethod: tx.paymentMethod,
                notes:         tx.notes || '',
                nilaiBarang,
                shippingFee,
                totalBayar,
                itemCount,
                skuCount:      tx.items.length,
            };
        });

        const grandTotal = {
            totalTransaksi: rows.length,
            totalNilaiBarang:  rows.reduce((s, r) => s + r.nilaiBarang, 0),
            totalShippingFee:  rows.reduce((s, r) => s + r.shippingFee, 0),
            totalPembayaran:   rows.reduce((s, r) => s + r.totalBayar, 0),
            totalItemDibeli:   rows.reduce((s, r) => s + r.itemCount, 0),
        };

        return { rows, grandTotal };
    }
}

