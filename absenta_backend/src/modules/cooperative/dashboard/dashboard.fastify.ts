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

            // ─── 9. KEPATUHAN SIMPANAN WAJIB BULAN INI ────────────────────────
            const wajibCategory = categories.find(c => c.code === 'WAJIB');
            const paidWajibMemberIds = new Set();
            if (wajibCategory && activeMembers > 0) {
                const wajibDeposits = await prisma.savingTransaction.findMany({
                    where: {
                        saving: {
                            categoryId: wajibCategory.id,
                            member: { tenantId, status: 'ACTIVE' }
                        },
                        type: 'DEPOSIT',
                        date: { gte: startOfMonth }
                    },
                    select: { saving: { select: { memberId: true } } }
                });
                for (const wd of wajibDeposits) {
                    if (wd.saving?.memberId) paidWajibMemberIds.add(wd.saving.memberId);
                }
            }
            const wajibPaidCount = paidWajibMemberIds.size;
            const wajibUnpaidCount = Math.max(0, activeMembers - wajibPaidCount);
            const wajibCompliancePercent = activeMembers > 0 ? Math.round((wajibPaidCount / activeMembers) * 100) : 100;

            const wajibCompliance = {
                totalActive: activeMembers,
                paidCount: wajibPaidCount,
                unpaidCount: wajibUnpaidCount,
                compliancePercent: wajibCompliancePercent
            };

            // ─── 10. PORTOFOLIO PINJAMAN & RISIKO NPL ─────────────────────────
            const unpaidInstallments = await prisma.installment.findMany({
                where: {
                    loan: { member: { tenantId }, status: 'APPROVED' },
                    status: 'UNPAID'
                },
                include: {
                    loan: {
                        include: {
                            member: {
                                include: {
                                    User: { select: { full_name: true } },
                                    Guru: { select: { nama_guru: true } },
                                    Siswa: { select: { nama_siswa: true } }
                                }
                            }
                        }
                    }
                }
            });

            let currentAmount = 0;
            let overdue1to30Amount = 0;
            let overdueOver30Amount = 0;
            const overdueList: Array<{ id: string; memberName: string; amount: number; dueDate: Date; daysOverdue: number }> = [];

            for (const inst of unpaidInstallments) {
                const amt = Number(inst.amount || 0);
                const dueDate = new Date(inst.dueDate);
                const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays <= 0) {
                    currentAmount += amt;
                } else if (diffDays <= 30) {
                    overdue1to30Amount += amt;
                    overdueList.push({
                        id: inst.id,
                        memberName: inst.loan?.member?.User?.full_name || inst.loan?.member?.Guru?.nama_guru || inst.loan?.member?.Siswa?.nama_siswa || 'Anggota',
                        amount: amt,
                        dueDate: inst.dueDate,
                        daysOverdue: diffDays
                    });
                } else {
                    overdueOver30Amount += amt;
                    overdueList.push({
                        id: inst.id,
                        memberName: inst.loan?.member?.User?.full_name || inst.loan?.member?.Guru?.nama_guru || inst.loan?.member?.Siswa?.nama_siswa || 'Anggota',
                        amount: amt,
                        dueDate: inst.dueDate,
                        daysOverdue: diffDays
                    });
                }
            }

            const totalLoanExposure = totalLoans > 0 ? totalLoans : (currentAmount + overdue1to30Amount + overdueOver30Amount);
            const nplRatio = totalLoanExposure > 0 
                ? Math.min(100, Number(((overdueOver30Amount / totalLoanExposure) * 100).toFixed(1))) 
                : 0;

            const topOverdue = overdueList
                .sort((a, b) => b.daysOverdue - a.daysOverdue)
                .slice(0, 3);

            const loanPortfolio = {
                totalActiveLoans: activeLoansCount,
                totalOutstanding: totalLoanExposure,
                currentAmount,
                overdue1to30Amount,
                overdueOver30Amount,
                nplRatio,
                topOverdue
            };

            // ─── 11. ANTREAN VERIFIKASI ANGGOTA BARU ──────────────────────────
            const pendingMembersList = await prisma.member.findMany({
                where: { tenantId, status: 'PENDING' },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    User: { select: { full_name: true, email: true } },
                    Guru: { select: { nama_guru: true, nip: true } },
                    Siswa: { select: { nama_siswa: true, nis: true } }
                }
            });
            const pendingMembersCount = await prisma.member.count({
                where: { tenantId, status: 'PENDING' }
            });
            const pendingMembers = {
                count: pendingMembersCount,
                list: pendingMembersList.map(m => ({
                    id: m.id,
                    name: m.User?.full_name || m.Guru?.nama_guru || m.Siswa?.nama_siswa || 'Calon Anggota',
                    identifier: m.memberNo || m.Guru?.nip || m.Siswa?.nis || m.User?.email || '-',
                    createdAt: m.createdAt
                }))
            };

            // ─── 12. ESTIMASI SHU BERJALAN YTD ───────────────────────────────
            const currentYear = activePeriod?.year || now.getFullYear();
            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

            const yearSalesAgg = await prisma.sale.aggregate({
                where: { tenantId, date: { gte: startOfYear, lte: endOfYear } },
                _sum: { total: true }
            });
            const totalYearSales = Number(yearSalesAgg._sum.total || 0);
            const estimatedStoreProfit = Math.round(totalYearSales * 0.15); // Rata-rata margin toko 15%

            const paidInstallmentsThisYear = await prisma.installment.findMany({
                where: {
                    loan: { member: { tenantId } },
                    status: 'PAID',
                    paidDate: { gte: startOfYear, lte: endOfYear }
                },
                include: {
                    loan: { select: { amount: true, interestRate: true, duration: true } }
                }
            });

            let interestIncome = 0;
            for (const inst of paidInstallmentsThisYear) {
                const loanAmt = Number(inst.loan?.amount || 0);
                const rate = Number(inst.loan?.interestRate || 0);
                const dur = inst.loan?.duration || 1;
                const monthlyInterest = (loanAmt * (rate / 100)) / dur;
                interestIncome += monthlyInterest;
            }
            interestIncome = Math.round(interestIncome);

            const totalEstimatedShu = Number(activePeriod?.totalShu || 0) > 0
                ? Number(activePeriod.totalShu)
                : (estimatedStoreProfit + interestIncome);

            const estimatedShuYtd = {
                year: currentYear,
                totalEstimatedShu,
                estimatedStoreProfit,
                interestIncome,
                totalYearSales,
                status: activePeriod?.status || 'BERJALAN'
            };

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
                    recentActivities,

                    // 4 Executive Metrics
                    wajibCompliance,
                    loanPortfolio,
                    pendingMembers,
                    estimatedShuYtd
                }
            });
        } catch (error: any) {
            appLogger.error({ err: error }, '[Dashboard] Gagal memuat statistik koperasi');
            return reply.status(500).send({ message: 'Gagal memuat ringkasan dashboard koperasi.', error: error.message });
        }
    });
}
