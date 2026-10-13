// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../../../utils/prisma';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

const getTenantId = (req: any) => {
    return ((req.user as any)?.tenant_id || (req.user as any)?.tenantId) || mockTenant.id;
};

const INDONESIAN_MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default async function dashboardRoutes(fastify: any) {
    // Get Dashboard Stats Komprehensif untuk Pengurus
    fastify.get('/stats', { preHandler: [requireCapability('cooperative.dashboard.view.overview')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const now = new Date();
            
            // ─── 1. ANGGOTA ─────────────────────────────────────────────────────────
            const totalMembers = await prisma.member.count({ where: { tenantId } });
            const activeMembers = await prisma.member.count({ where: { tenantId, status: 'ACTIVE' } });

            // ─── 2. SIMPANAN & BREAKDOWN ────────────────────────────────────────────
            const savingsAgg = await prisma.saving.aggregate({
                _sum: { amount: true },
                where: { member: { tenantId } }
            });
            const totalSavings = Number(savingsAgg._sum.amount || 0);

            // Breakdown Simpanan (Pokok, Wajib, Sukarela, dll)
            const categories = await prisma.savingCategory.findMany({
                where: { tenantId },
                select: { id: true, code: true, name: true }
            });
            const catMap = new Map(categories.map(c => [c.id, c.code]));

            const savingsByCat = await prisma.saving.groupBy({
                by: ['categoryId'],
                where: { member: { tenantId } },
                _sum: { amount: true }
            });

            let simpananPokok = 0;
            let simpananWajib = 0;
            let simpananSukarela = 0;

            for (const item of savingsByCat) {
                const code = catMap.get(item.categoryId);
                const amt = Number(item._sum.amount || 0);
                if (code === 'POKOK') simpananPokok += amt;
                else if (code === 'WAJIB') simpananWajib += amt;
                else simpananSukarela += amt;
            }

            // ─── 3. PINJAMAN & JATUH TEMPO ──────────────────────────────────────────
            const loansAgg = await prisma.loan.aggregate({
                _sum: { amount: true },
                where: { member: { tenantId }, status: { in: ['APPROVED', 'PAID'] } }
            });
            const totalLoans = Number(loansAgg._sum.amount || 0);

            const activeLoansCount = await prisma.loan.count({
                where: { member: { tenantId }, status: 'APPROVED' }
            });

            const pendingLoansList = await prisma.loan.findMany({
                where: { member: { tenantId }, status: 'PENDING' },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    member: {
                        include: {
                            User: { select: { full_name: true } },
                            Siswa: { select: { nama_siswa: true } },
                            Guru: { select: { nama_guru: true } },
                        }
                    }
                }
            });

            const pendingLoans = pendingLoansList.map(l => ({
                id: l.id,
                amount: Number(l.amount),
                duration: l.duration,
                createdAt: l.createdAt,
                memberName: l.member?.User?.full_name || l.member?.Guru?.nama_guru || l.member?.Siswa?.nama_siswa || 'Anggota Koperasi'
            }));

            // Cicilan Jatuh Tempo (Status UNPAID dan dueDate < now)
            const dueInstallmentsAgg = await prisma.installment.aggregate({
                where: { 
                    loan: { member: { tenantId } },
                    status: 'UNPAID',
                    dueDate: { lt: now }
                },
                _count: { id: true },
                _sum: { amount: true }
            });
            const dueInstallments = Number(dueInstallmentsAgg._count.id || 0);
            const dueInstallmentsAmount = Number(dueInstallmentsAgg._sum.amount || 0);

            // ─── 4. TOKO POS MINIMARKET ─────────────────────────────────────────────
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const todaySalesAgg = await prisma.sale.aggregate({
                where: { tenantId, date: { gte: startOfToday } },
                _sum: { total: true },
                _count: { id: true }
            });
            const monthSalesAgg = await prisma.sale.aggregate({
                where: { tenantId, date: { gte: startOfMonth } },
                _sum: { total: true },
                _count: { id: true }
            });

            const storeSalesToday = Number(todaySalesAgg._sum.total || 0);
            const storeSalesCountToday = Number(todaySalesAgg._count.id || 0);
            const storeSalesMonth = Number(monthSalesAgg._sum.total || 0);
            const storeSalesCountMonth = Number(monthSalesAgg._count.id || 0);

            // ─── 5. SHU TAHUN BUKU AKTIF ────────────────────────────────────────────
            const activePeriod = await prisma.shuPeriod.findFirst({
                where: { tenantId, isActive: true },
                select: { id: true, year: true, totalShu: true, status: true }
            });

            // ─── 6. TREN 6 BULAN TERAKHIR (REAL METRICS) ───────────────────────────
            const monthlyTrend = [];
            for (let i = 5; i >= 0; i--) {
                const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const mYear = targetDate.getFullYear();
                const mMonth = targetDate.getMonth();
                const mStart = new Date(mYear, mMonth, 1);
                const mEnd = new Date(mYear, mMonth + 1, 0, 23, 59, 59, 999);
                const monthName = `${INDONESIAN_MONTH_SHORT[mMonth]} ${mYear !== now.getFullYear() ? mYear : ''}`.trim();

                // Simpanan masuk di bulan ini
                const mSavings = await prisma.savingTransaction.aggregate({
                    where: {
                        saving: { member: { tenantId } },
                        type: 'DEPOSIT',
                        date: { gte: mStart, lte: mEnd }
                    },
                    _sum: { amount: true }
                });

                // Pinjaman cair di bulan ini
                const mLoans = await prisma.loan.aggregate({
                    where: {
                        member: { tenantId },
                        status: { in: ['APPROVED', 'PAID'] },
                        createdAt: { gte: mStart, lte: mEnd }
                    },
                    _sum: { amount: true }
                });

                // Penjualan toko di bulan ini
                const mSales = await prisma.sale.aggregate({
                    where: {
                        tenantId,
                        date: { gte: mStart, lte: mEnd }
                    },
                    _sum: { total: true }
                });

                monthlyTrend.push({
                    name: monthName,
                    simpanan: Number(mSavings._sum.amount || 0),
                    pinjaman: Number(mLoans._sum.amount || 0),
                    penjualan: Number(mSales._sum.total || 0)
                });
            }

            // ─── 7. TIKET & PENGADUAN ───────────────────────────────────────────────
            const openTickets = await prisma.ticket.count({
                where: { tenantId, status: { in: ['OPEN', 'IN_PROGRESS'] } }
            });

            // ─── 8. TRANSAKSI TERBARU (MUTASI REAL-TIME) ───────────────────────────
            const recentSavings = await prisma.savingTransaction.findMany({
                where: { saving: { member: { tenantId } } },
                take: 4,
                orderBy: { date: 'desc' },
                include: {
                    saving: {
                        include: {
                            category: { select: { name: true } },
                            member: {
                                include: {
                                    User: { select: { full_name: true } },
                                    Siswa: { select: { nama_siswa: true } },
                                    Guru: { select: { nama_guru: true } },
                                }
                            }
                        }
                    }
                }
            });

            const recentSales = await prisma.sale.findMany({
                where: { tenantId },
                take: 4,
                orderBy: { date: 'desc' },
                include: {
                    member: {
                        include: {
                            User: { select: { full_name: true } },
                            Siswa: { select: { nama_siswa: true } },
                            Guru: { select: { nama_guru: true } },
                        }
                    }
                }
            });

            const recentActivities = [
                ...recentSavings.map(s => ({
                    id: s.id,
                    type: 'SAVING',
                    title: `Setoran ${s.saving?.category?.name || 'Simpanan'}`,
                    description: s.saving?.member?.User?.full_name || s.saving?.member?.Guru?.nama_guru || s.saving?.member?.Siswa?.nama_siswa || 'Anggota',
                    amount: Number(s.amount),
                    date: s.date
                })),
                ...recentSales.map(sl => ({
                    id: sl.id,
                    type: 'SALE',
                    title: 'Penjualan Kasir POS',
                    description: sl.member ? (sl.member?.User?.full_name || sl.member?.Guru?.nama_guru || sl.member?.Siswa?.nama_siswa) : 'Pembeli Umum',
                    amount: Number(sl.total),
                    date: sl.date
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

            return reply.send({
                data: {
                    // Backward-compatible properties
                    totalMembers,
                    totalSavings,
                    totalLoans,
                    dueInstallments,

                    // Extended Executive Properties
                    activeMembers,
                    simpananPokok,
                    simpananWajib,
                    simpananSukarela,
                    activeLoansCount,
                    dueInstallmentsAmount,
                    storeSalesToday,
                    storeSalesCountToday,
                    storeSalesMonth,
                    storeSalesCountMonth,
                    activePeriod,
                    openTickets,
                    pendingLoans,
                    monthlyTrend,
                    recentActivities
                }
            });
        } catch (error: any) {
            appLogger.error({ err: error }, '[Dashboard] Gagal memuat statistik koperasi');
            return reply.status(500).send({ message: 'Gagal memuat ringkasan dashboard koperasi.', error: error.message });
        }
    });
}
