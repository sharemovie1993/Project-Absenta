// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { TransactionType } from '@prisma/client';
import { AccountingService } from '../laporan/accounting.service';

// Helper: resolve nama member dari relasi
const resolveMemberName = (member: {
    Siswa?: { nama_siswa: string } | null;
    Guru?: { nama_guru: string } | null;
    User?: { full_name: string } | null;
}): string =>
    member.Siswa?.nama_siswa ?? member.Guru?.nama_guru ?? member.User?.full_name ?? 'Unknown';

// Include member name resolvers yang dipakai di seluruh service
const MEMBER_NAME_INCLUDE = {
    Siswa: { select: { nama_siswa: true } },
    Guru:  { select: { nama_guru: true } },
    User:  { select: { full_name: true } },
};

export class SavingService {

    /** Ambil semua rekening simpanan dalam satu tenant */
    static async getSavings(tenantId: string, options?: { memberId?: string; userId?: string }) {
        const where: Record<string, unknown> = { member: { tenantId } };
        if (options?.memberId) where.memberId = options.memberId;
        if (options?.userId) (where.member as Record<string, unknown>).userId = options.userId;

        const savings = await prisma.saving.findMany({
            where,
            include: {
                category: true,
                member: { include: MEMBER_NAME_INCLUDE },
                transactions: { take: 5, orderBy: { date: 'desc' } },
            },
        });

        return savings.map(s => ({
            ...s,
            member: { ...s.member, name: resolveMemberName(s.member) },
        }));
    }

    /** Buat rekening simpanan baru untuk anggota */
    static async createSaving(memberId: string, categoryId: string, initialAmount = 0) {
        // Pastikan kategori ada dan aktif
        const category = await prisma.savingCategory.findFirst({
            where: { id: categoryId, isActive: true },
        });
        if (!category) throw new Error('Kategori simpanan tidak ditemukan atau sudah tidak aktif.');

        // Cek duplikasi — 1 anggota hanya boleh punya 1 rekening per kategori
        const existing = await prisma.saving.findFirst({ where: { memberId, categoryId } });
        if (existing) throw new Error(`Rekening simpanan '${category.name}' sudah ada untuk anggota ini.`);

        // Validasi initialAmount
        if (initialAmount < 0) throw new Error('Saldo awal tidak boleh negatif.');

        if (initialAmount === 0) {
            // Buat rekening tanpa setoran awal — tidak perlu jurnal
            return prisma.saving.create({
                data: { memberId, categoryId, amount: 0 },
                include: { category: true },
            });
        }

        // Jika ada initialAmount > 0, buat rekening + SavingTransaction + Journal dalam satu $transaction
        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) throw new Error('Anggota tidak ditemukan.');

        // Pre-warm Chart of Accounts (di luar $transaction)
        await AccountingService.getOrCreateDefaultAccounts(member.tenantId);
        await AccountingService.resolveAccountId(member.tenantId, category.accountCode, category.name);

        return prisma.$transaction(async (tx) => {
            const saving = await tx.saving.create({
                data: { memberId, categoryId, amount: initialAmount },
                include: { category: true },
            });

            // Catat SavingTransaction untuk audit trail
            const txRecord = await tx.savingTransaction.create({
                data: {
                    savingId: saving.id,
                    amount: initialAmount,
                    type: 'DEPOSIT',
                    description: `Setoran Awal — ${category.name}`,
                }
            });

            // Double-entry journal: Kas Dr / Simpanan Cr
            await AccountingService.createJournalEntry(
                member.tenantId,
                `Setoran Awal ${category.name} (${member.memberNo})`,
                `SAV-INIT-${saving.id}`,
                [
                    { accountCode: '1010', type: 'DEBIT',  amount: initialAmount },
                    { accountCode: category.accountCode, type: 'CREDIT', amount: initialAmount },
                ],
                tx,
            );

            return saving;
        });
    }

    /** Proses transaksi: DEPOSIT / WITHDRAWAL / INTEREST / ADMIN_FEE */
    static async processTransaction(
        savingId: string,
        amount: number,
        type: TransactionType,
        description?: string,
        operatorUserId?: string,
    ) {
        // [GUARD 1: Validasi amount]
        if (!amount || isNaN(amount) || amount <= 0) {
            throw new Error('Nominal transaksi harus lebih dari 0.');
        }

        // [GUARD 2: Validasi type adalah enum yang valid]
        const validTypes: TransactionType[] = ['DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'ADMIN_FEE'];
        if (!validTypes.includes(type)) {
            throw new Error(`Jenis transaksi tidak valid: ${type}.`);
        }

        const saving = await prisma.saving.findUnique({
            where: { id: savingId },
            include: { member: true, category: true },
        });
        if (!saving) throw new Error('Rekening simpanan tidak ditemukan.');

        // [GUARD 3: Anti-Self-Transaction]
        if (
            operatorUserId &&
            saving.member?.userId === operatorUserId &&
            (type === 'DEPOSIT' || type === 'WITHDRAWAL')
        ) {
            throw new Error('Operator tidak diperbolehkan melakukan transaksi tabungan pada akun milik sendiri.');
        }

        const tenantId = saving.member.tenantId;
        const savingsAccountCode = saving.category.accountCode;

        // Pre-warm Chart of Accounts SEBELUM masuk $transaction (mencegah deadlock & race condition)
        await AccountingService.getOrCreateDefaultAccounts(tenantId);
        await AccountingService.resolveAccountId(tenantId, savingsAccountCode, saving.category.name);

        return prisma.$transaction(async (tx) => {
            // [GUARD 4: Re-read saldo di dalam tx untuk mencegah race condition WITHDRAWAL/ADMIN_FEE]
            const freshSaving = await tx.saving.findUnique({ where: { id: savingId } });
            if (!freshSaving) throw new Error('Rekening simpanan tidak ditemukan.');

            const currentBalance = Number(freshSaving.amount);

            // [GUARD 5: Simpanan Pokok & Wajib Business Rules]
            const code = (saving.category.code || '').toUpperCase();
            if (code === 'POKOK' && type === 'DEPOSIT' && currentBalance > 0) {
                throw new Error('Pembayaran Simpanan Pokok tidak diperbolehkan lebih dari satu kali.');
            }
            if ((code === 'POKOK' || code === 'WAJIB') && type === 'WITHDRAWAL') {
                throw new Error(`Tarik tunai tidak diperbolehkan untuk kategori Simpanan ${saving.category.name}.`);
            }

            if ((type === 'WITHDRAWAL' || type === 'ADMIN_FEE') && currentBalance < amount) {
                throw new Error(
                    `Saldo tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')}, ` +
                    `diperlukan: Rp ${amount.toLocaleString('id-ID')}.`
                );
            }

            // 1. Catat SavingTransaction
            const transaction = await tx.savingTransaction.create({
                data: { savingId, amount, type, description },
            });

            // 2. Update saldo (atomic increment/decrement)
            const increment = (type === 'DEPOSIT' || type === 'INTEREST') ? amount : -amount;
            await tx.saving.update({
                where: { id: savingId },
                data: { amount: { increment } },
            });

            // 3. Double-entry journal
            let journalItems: { accountCode: string; type: string; amount: number }[] = [];

            if (type === 'DEPOSIT') {
                journalItems = [
                    { accountCode: '1010',             type: 'DEBIT',  amount },
                    { accountCode: savingsAccountCode, type: 'CREDIT', amount },
                ];
            } else if (type === 'INTEREST') {
                journalItems = [
                    { accountCode: '5020',             type: 'DEBIT',  amount },
                    { accountCode: savingsAccountCode, type: 'CREDIT', amount },
                ];
            } else if (type === 'WITHDRAWAL') {
                journalItems = [
                    { accountCode: savingsAccountCode, type: 'DEBIT',  amount },
                    { accountCode: '1010',             type: 'CREDIT', amount },
                ];
            } else if (type === 'ADMIN_FEE') {
                journalItems = [
                    { accountCode: savingsAccountCode, type: 'DEBIT',  amount },
                    { accountCode: '5020',             type: 'CREDIT', amount },
                ];
            }

            if (journalItems.length > 0) {
                await AccountingService.createJournalEntry(
                    tenantId,
                    `${type} - ${saving.category.name} (${saving.member.memberNo})`,
                    `SAV-${transaction.id}`,
                    journalItems as any,
                    tx,
                );
            }

            // Award Points for Savings Deposit: 10 Points for every Rp 50.000 deposited
            if (type === 'DEPOSIT') {
                const pointsEarned = Math.floor(amount / 50000) * 10;
                if (pointsEarned > 0) {
                    await tx.member.update({
                        where: { id: saving.memberId },
                        data: { points: { increment: pointsEarned } },
                    });
                    await tx.coopPointTransaction.create({
                        data: {
                            tenantId,
                            memberId: saving.memberId,
                            amount: pointsEarned,
                            type: 'EARN_SAVING',
                            description: `Setoran simpanan ${saving.category.name}`,
                            referenceId: transaction.id
                        }
                    });
                }
            }

            return transaction;
        });
    }

    /** Detail satu rekening simpanan */
    static async getSavingById(savingId: string, tenantId: string) {
        const saving = await prisma.saving.findFirst({
            where: { id: savingId, member: { tenantId } },
            include: {
                category: true,
                member: { include: MEMBER_NAME_INCLUDE },
                transactions: { orderBy: { date: 'desc' } },
            },
        });
        if (!saving) throw new Error('Rekening simpanan tidak ditemukan.');

        return {
            ...saving,
            member: { ...saving.member, name: resolveMemberName(saving.member) },
        };
    }

    /** Semua transaksi simpanan dalam tenant (dengan filter tanggal) */
    static async getTransactions(tenantId: string, options?: { startDate?: string; endDate?: string }) {
        const where: Record<string, unknown> = { saving: { member: { tenantId } } };

        if (options?.startDate || options?.endDate) {
            const dateFilter: Record<string, Date> = {};
            if (options.startDate) dateFilter.gte = new Date(options.startDate + 'T00:00:00.000Z');
            if (options.endDate)   dateFilter.lte = new Date(options.endDate   + 'T23:59:59.999Z');
            where.date = dateFilter;
        }

        const transactions = await prisma.savingTransaction.findMany({
            where,
            include: {
                saving: {
                    include: {
                        category: { select: { code: true, name: true, color: true } },
                        member:   { include: MEMBER_NAME_INCLUDE },
                    },
                },
            },
            orderBy: { date: 'desc' },
        });

        return transactions.map(t => ({
            id:            t.id,
            amount:        Number(t.amount),
            type:          t.type,
            date:          t.date,
            description:   t.description,
            savingId:      t.savingId,
            categoryCode:  t.saving.category.code,
            categoryName:  t.saving.category.name,
            categoryColor: t.saving.category.color,
            memberNo:      t.saving.member.memberNo,
            memberName:    resolveMemberName(t.saving.member),
        }));
    }

    /**
     * Insight simpanan anggota (untuk member view):
     * 1. Tren setoran total bulanan — 6 bulan terakhir (sparkline chart)
     * 2. Status iuran bulan berjalan per rekening — apakah sudah ada DEPOSIT bulan ini
     */
    static async getMemberSavingInsights(userId: string, tenantId: string) {
        // Ambil semua rekening milik user ini
        const savings = await prisma.saving.findMany({
            where: { member: { userId, tenantId } },
            include: {
                category: { select: { id: true, code: true, name: true, color: true, defaultAmount: true } },
            },
        });

        if (savings.length === 0) {
            return { monthlyTrend: [], accountStatuses: [] };
        }

        const savingIds = savings.map(s => s.id);

        // ── 1. Tren bulanan: ambil semua transaksi 6 bulan terakhir ──────────
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const recentTxs = await prisma.savingTransaction.findMany({
            where: {
                savingId: { in: savingIds },
                date:     { gte: sixMonthsAgo },
            },
            select: { date: true, amount: true, type: true },
            orderBy: { date: 'asc' },
        });

        // Build bulan-bulan 6 terakhir
        const monthLabels: { year: number; month: number; label: string }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
            monthLabels.push({
                year:  d.getFullYear(),
                month: d.getMonth(), // 0-indexed
                label: `${months[d.getMonth()]} ${d.getFullYear()}`,
            });
        }

        // Akumulasi net per bulan (DEPOSIT + INTEREST masuk, WITHDRAWAL + ADMIN_FEE keluar)
        const monthlyMap: Record<string, number> = {};
        monthLabels.forEach(m => { monthlyMap[`${m.year}-${m.month}`] = 0; });

        recentTxs.forEach(tx => {
            const d = new Date(tx.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (key in monthlyMap) {
                const isIn = tx.type === 'DEPOSIT' || tx.type === 'INTEREST';
                monthlyMap[key] += isIn ? Number(tx.amount) : -Number(tx.amount);
            }
        });

        const monthlyTrend = monthLabels.map(m => ({
            label:  m.label,
            amount: monthlyMap[`${m.year}-${m.month}`] ?? 0,
        }));

        // ── 2. Status iuran bulan berjalan per rekening ──────────────────────
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const currentMonthTxs = await prisma.savingTransaction.findMany({
            where: {
                savingId: { in: savingIds },
                type:     'DEPOSIT',
                date:     { gte: currentMonthStart, lte: currentMonthEnd },
            },
            select: { savingId: true, amount: true, date: true },
        });

        const depositedThisMonth = new Set(currentMonthTxs.map(t => t.savingId));

        const accountStatuses = savings.map(s => {
            // Kategori "periodik" = yang punya defaultAmount > 0 (biasanya WAJIB, dll)
            const isPeriodic = Number(s.category?.defaultAmount || 0) > 0;
            const deposited  = depositedThisMonth.has(s.id);
            const txThisMonth = currentMonthTxs.find(t => t.savingId === s.id);

            return {
                savingId:     s.id,
                categoryCode: s.category?.code  || '',
                categoryName: s.category?.name  || 'Simpanan',
                categoryColor:s.category?.color || null,
                defaultAmount:Number(s.category?.defaultAmount || 0),
                currentBalance: Number(s.amount),
                isPeriodic,
                depositedThisMonth: deposited,
                lastDepositAmount:  txThisMonth ? Number(txThisMonth.amount) : null,
                lastDepositDate:    txThisMonth ? txThisMonth.date           : null,
            };
        });

        // ── 3. Estimasi SHU untuk anggota ────────────────────────────────────
        // Ambil konfigurasi SHU tenant
        const shuConfig = await prisma.shuConfig.findUnique({ where: { tenantId } });
        const porsiJasaModal = shuConfig ? Number(shuConfig.porsiJasaModal) : 30;

        // Total simpanan modal anggota (semua kategori yang isIncludedInShu=true)
        const modalCategories = await prisma.savingCategory.findMany({
            where: { tenantId, isIncludedInShu: true, isActive: true },
            select: { id: true },
        });
        const modalCategoryIds = modalCategories.map(c => c.id);

        const memberModalSavings = await prisma.saving.findMany({
            where: { memberId: { in: savings.map(s => s.memberId) }, categoryId: { in: modalCategoryIds } },
            select: { amount: true },
        });
        const memberTotalModal = memberModalSavings.reduce((s, sv) => s + Number(sv.amount), 0);

        // Total simpanan modal SELURUH anggota aktif (untuk menghitung proporsi)
        const allActiveMembersModal = await prisma.saving.aggregate({
            where: {
                categoryId: { in: modalCategoryIds },
                member:     { tenantId, status: 'ACTIVE' },
            },
            _sum: { amount: true },
        });
        const totalAllMembersModal = Number(allActiveMembersModal._sum.amount ?? 0);
        const memberSharePct = totalAllMembersModal > 0
            ? (memberTotalModal / totalAllMembersModal) * 100
            : 0;

        // Riwayat SHU terakhir yang sudah didistribusikan ke anggota ini
        const memberRecord = await prisma.member.findFirst({
            where: { userId, tenantId },
            select: { id: true },
        });
        let lastDistributedShu: { year: number; totalShu: number } | null = null;
        if (memberRecord) {
            const lastAlloc = await prisma.shuAllocation.findFirst({
                where: { memberId: memberRecord.id, status: 'DISTRIBUTED' },
                include: { Period: { select: { year: true } } },
                orderBy: { Period: { year: 'desc' } },
            });
            if (lastAlloc) {
                lastDistributedShu = {
                    year:     lastAlloc.Period.year,
                    totalShu: Number(lastAlloc.totalShu),
                };
            }
        }

        const shuEstimation = {
            memberTotalModal,
            totalAllMembersModal,
            memberSharePct: Math.round(memberSharePct * 100) / 100,
            porsiJasaModal,
            lastDistributedShu,
            note: 'Estimasi porsi jasa modal berdasarkan proporsi simpanan Anda terhadap total simpanan anggota.',
        };

        // ── 4. Info kontak koperasi (untuk CTA Hubungi Bendahara) ────────────
        const configKeys = ['cooperative_name', 'cooperative_phone', 'cooperative_email', 'cooperative_address'];
        const configs = await prisma.config.findMany({
            where: { tenant_id: tenantId, key: { in: configKeys } },
            select: { key: true, value: true },
        });
        const cfgMap = configs.reduce((acc, c) => { acc[c.key] = c.value; return acc; }, {} as Record<string, string>);

        // Ambil nama bendahara dari OrganizationalAssignment
        const bendaharaAssign = await prisma.organizationalAssignment.findFirst({
            where: { tenant_id: tenantId, is_active: true, Position: { code: 'BENDAHARA_KOPERASI' } },
            include: {
                User: {
                    include: {
                        Guru:  { select: { nama_guru: true } },
                        Siswa: { select: { nama_siswa: true } },
                    },
                },
            },
        });
        const bendaharaName = bendaharaAssign?.User?.Guru?.nama_guru
            || bendaharaAssign?.User?.Siswa?.nama_siswa
            || null;

        const coopContact = {
            name:         cfgMap['cooperative_name']  || null,
            phone:        cfgMap['cooperative_phone'] || null,
            email:        cfgMap['cooperative_email'] || null,
            address:      cfgMap['cooperative_address'] || null,
            bendahara:    bendaharaName,
        };

        return { monthlyTrend, accountStatuses, shuEstimation, coopContact };
    }
}
