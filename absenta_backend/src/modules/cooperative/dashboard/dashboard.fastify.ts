// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../../../utils/prisma';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';
import { MemberService } from '../member/member.service';
import { eventBus } from '@/utils/event-bus';

const getTenantId = (req: any) => {
    return ((req.user as any)?.tenant_id || (req.user as any)?.tenantId) || mockTenant.id;
};

const INDONESIAN_MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// ── L1 In-Memory Cache for Management Dashboard Stats ──
interface CachedStats {
    data: any;
    timestamp: number;
}
const statsCache = new Map<string, CachedStats>();
const STATS_CACHE_TTL_MS = 45 * 1000; // 45 seconds

// Anti-DDoS / Rate-limit on forced refresh per tenant
const lastForceRefreshMap = new Map<string, number>();
const FORCE_REFRESH_THROTTLE_MS = 5 * 1000; // Minimal interval 5 detik antar forced refresh

// Automatic cache eviction with timer unref to prevent memory leak
const statsCacheCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of statsCache.entries()) {
        if (now - value.timestamp > STATS_CACHE_TTL_MS * 2) {
            statsCache.delete(key);
        }
    }
}, 60 * 1000);
statsCacheCleanupInterval.unref?.();

export const invalidateDashboardCache = (tenantId?: string) => {
    if (tenantId) {
        statsCache.delete(tenantId);
        lastForceRefreshMap.delete(tenantId);
    } else {
        statsCache.clear();
        lastForceRefreshMap.clear();
    }
};

// ── Event-Driven Cache Invalidation Subscriptions ──
eventBus.subscribe('coop:transaction:created', ({ tenantId }: { tenantId: string }) => invalidateDashboardCache(tenantId));
eventBus.subscribe('coop:member:updated', ({ tenantId }: { tenantId: string }) => invalidateDashboardCache(tenantId));
eventBus.subscribe('coop:loan:updated', ({ tenantId }: { tenantId: string }) => invalidateDashboardCache(tenantId));
eventBus.subscribe('coop:sale:created', ({ tenantId }: { tenantId: string }) => invalidateDashboardCache(tenantId));

export default async function dashboardRoutes(fastify: any) {
    // ──────────────────────────────────────────────────────────────────────────
    // 1. GET /stats — Dashboard Stats Komprehensif untuk Pengurus & TV Mode
    // ──────────────────────────────────────────────────────────────────────────
    fastify.get('/stats', { preHandler: [requireCapability('cooperative.dashboard.view.overview')] }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const rawRefresh = req.query?.refresh === 'true';
            let forceRefresh = false;

            // Anti-DDoS throttle: allow force refresh only once every 5 seconds per tenant
            if (rawRefresh) {
                const lastRefresh = lastForceRefreshMap.get(tenantId) || 0;
                if (Date.now() - lastRefresh >= FORCE_REFRESH_THROTTLE_MS) {
                    forceRefresh = true;
                    lastForceRefreshMap.set(tenantId, Date.now());
                }
            }

            // Check In-Memory Cache
            const cached = statsCache.get(tenantId);
            if (!forceRefresh && cached && (Date.now() - cached.timestamp < STATS_CACHE_TTL_MS)) {
                return reply.send({
                    success: true,
                    data: cached.data,
                    cached: true,
                    cacheAgeSeconds: Math.floor((Date.now() - cached.timestamp) / 1000)
                });
            }

            // Validasi & Sanitasi Parameter fiscalYear
            let requestedYear: number | undefined;
            if (req.query?.fiscalYear) {
                const parsed = parseInt(String(req.query.fiscalYear), 10);
                if (!isNaN(parsed) && parsed >= 2000 && parsed <= 2100) {
                    requestedYear = parsed;
                }
            }

            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // ── Parallel Batch 1: Anggota, Simpanan, Pinjaman, POS, Tiket, SHU Period ──
            const [
                totalMembers,
                activeMembers,
                savingsAgg,
                categories,
                savingsByCat,
                loansAgg,
                activeLoansCount,
                pendingLoansList,
                dueInstallmentsAgg,
                todaySalesAgg,
                monthSalesAgg,
                activePeriod,
                openTickets,
                unpaidInstallments,
                pendingMembersList,
                pendingMembersCount,
                recentSavings,
                recentSales
            ] = await Promise.all([
                // 1. Anggota
                prisma.member.count({ where: { tenantId } }),
                prisma.member.count({ where: { tenantId, status: 'ACTIVE' } }),

                // 2. Simpanan
                prisma.saving.aggregate({
                    _sum: { amount: true },
                    where: { member: { tenantId } }
                }),
                prisma.savingCategory.findMany({
                    where: { tenantId },
                    select: { id: true, code: true, name: true }
                }),
                prisma.saving.groupBy({
                    by: ['categoryId'],
                    where: { member: { tenantId } },
                    _sum: { amount: true }
                }),

                // 3. Pinjaman
                prisma.loan.aggregate({
                    _sum: { amount: true },
                    where: { member: { tenantId }, status: { in: ['APPROVED', 'PAID'] } }
                }),
                prisma.loan.count({
                    where: { member: { tenantId }, status: 'APPROVED' }
                }),
                prisma.loan.findMany({
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
                }),
                prisma.installment.aggregate({
                    where: { 
                        loan: { member: { tenantId } },
                        status: 'UNPAID',
                        dueDate: { lt: now }
                    },
                    _count: { id: true },
                    _sum: { amount: true }
                }),

                // 4. Penjualan Toko POS
                prisma.sale.aggregate({
                    where: { tenantId, date: { gte: startOfToday } },
                    _sum: { total: true },
                    _count: { id: true }
                }),
                prisma.sale.aggregate({
                    where: { tenantId, date: { gte: startOfMonth } },
                    _sum: { total: true },
                    _count: { id: true }
                }),

                // 5. SHU Tahun Buku
                prisma.shuPeriod.findFirst({
                    where: { tenantId, isActive: true },
                    select: { id: true, year: true, totalShu: true, status: true }
                }),

                // 6. Tiket
                prisma.ticket.count({
                    where: { tenantId, status: { in: ['OPEN', 'IN_PROGRESS'] } }
                }),

                // 7. Cicilan Belum Lunas untuk Analisis NPL & Ageing
                prisma.installment.findMany({
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
                }),

                // 8. Antrean Anggota Baru
                prisma.member.findMany({
                    where: { tenantId, status: 'PENDING' },
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        User: { select: { full_name: true, email: true } },
                        Guru: { select: { nama_guru: true, nip: true } },
                        Siswa: { select: { nama_siswa: true, nis: true } }
                    }
                }),
                prisma.member.count({
                    where: { tenantId, status: 'PENDING' }
                }),

                // 9. Mutasi Aktivitas Terbaru
                prisma.savingTransaction.findMany({
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
                }),
                prisma.sale.findMany({
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
                })
            ]);

            // ── Breakdown Simpanan ──
            const catMap = new Map(categories.map(c => [c.id, c.code]));
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

            const totalSavings = Number(savingsAgg._sum.amount || 0);
            const totalLoans = Number(loansAgg._sum.amount || 0);
            const dueInstallments = Number(dueInstallmentsAgg._count.id || 0);
            const dueInstallmentsAmount = Number(dueInstallmentsAgg._sum.amount || 0);
            const storeSalesToday = Number(todaySalesAgg._sum.total || 0);
            const storeSalesCountToday = Number(todaySalesAgg._count.id || 0);
            const storeSalesMonth = Number(monthSalesAgg._sum.total || 0);
            const storeSalesCountMonth = Number(monthSalesAgg._count.id || 0);

            // ── Kepatuhan Simpanan Wajib Bulan Ini ──
            const wajibCategory = categories.find(c => c.code === 'WAJIB');
            let wajibPaidCount = 0;
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
                const paidMemberIds = new Set(wajibDeposits.map(d => d.saving?.memberId).filter(Boolean));
                wajibPaidCount = paidMemberIds.size;
            }
            const wajibUnpaidCount = Math.max(0, activeMembers - wajibPaidCount);
            const wajibCompliancePercent = activeMembers > 0 ? Math.round((wajibPaidCount / activeMembers) * 100) : 100;
            const wajibCompliance = {
                totalActive: activeMembers,
                paidCount: wajibPaidCount,
                unpaidCount: wajibUnpaidCount,
                compliancePercent: wajibCompliancePercent
            };

            // ── Portofolio Pinjaman & NPL Ratio ──
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

            // ── Antrean Pinjaman & Anggota Baru ──
            const pendingLoans = pendingLoansList.map(l => ({
                id: l.id,
                amount: Number(l.amount),
                duration: l.duration,
                createdAt: l.createdAt,
                memberName: l.member?.User?.full_name || l.member?.Guru?.nama_guru || l.member?.Siswa?.nama_siswa || 'Anggota Koperasi'
            }));

            const pendingMembers = {
                count: pendingMembersCount,
                list: pendingMembersList.map(m => ({
                    id: m.id,
                    name: m.User?.full_name || m.Guru?.nama_guru || m.Siswa?.nama_siswa || 'Calon Anggota',
                    identifier: m.memberNo || m.Guru?.nip || m.Siswa?.nis || m.User?.email || '-',
                    createdAt: m.createdAt
                }))
            };

            // ── Estimasi SHU Berjalan YTD ──
            const currentYear = requestedYear || activePeriod?.year || now.getFullYear();
            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

            const [yearSalesAgg, paidInstallmentsThisYear] = await Promise.all([
                prisma.sale.aggregate({
                    where: { tenantId, date: { gte: startOfYear, lte: endOfYear } },
                    _sum: { total: true }
                }),
                prisma.installment.findMany({
                    where: {
                        loan: { member: { tenantId } },
                        status: 'PAID',
                        paidDate: { gte: startOfYear, lte: endOfYear }
                    },
                    include: {
                        loan: { select: { amount: true, interestRate: true, duration: true } }
                    }
                })
            ]);

            const totalYearSales = Number(yearSalesAgg._sum.total || 0);
            const estimatedStoreProfit = Math.round(totalYearSales * 0.15); // Estimasi margin ritel 15%

            let interestIncome = 0;
            for (const inst of paidInstallmentsThisYear) {
                const loanAmt = Number(inst.loan?.amount || 0);
                const rate = Number(inst.loan?.interestRate || 0);
                const dur = inst.loan?.duration || 1;
                interestIncome += (loanAmt * (rate / 100)) / dur;
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

            // ── Parallelized 6-Month Trend (6 Bulan Terakhir) ──
            const monthIndices = [5, 4, 3, 2, 1, 0];
            const monthlyTrend = await Promise.all(monthIndices.map(async (i) => {
                const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const mYear = targetDate.getFullYear();
                const mMonth = targetDate.getMonth();
                const mStart = new Date(mYear, mMonth, 1);
                const mEnd = new Date(mYear, mMonth + 1, 0, 23, 59, 59, 999);
                const monthName = `${INDONESIAN_MONTH_SHORT[mMonth]} ${mYear !== now.getFullYear() ? mYear : ''}`.trim();

                const [mSavings, mLoans, mSales] = await Promise.all([
                    prisma.savingTransaction.aggregate({
                        where: {
                            saving: { member: { tenantId } },
                            type: 'DEPOSIT',
                            date: { gte: mStart, lte: mEnd }
                        },
                        _sum: { amount: true }
                    }),
                    prisma.loan.aggregate({
                        where: {
                            member: { tenantId },
                            status: { in: ['APPROVED', 'PAID'] },
                            createdAt: { gte: mStart, lte: mEnd }
                        },
                        _sum: { amount: true }
                    }),
                    prisma.sale.aggregate({
                        where: {
                            tenantId,
                            date: { gte: mStart, lte: mEnd }
                        },
                        _sum: { total: true }
                    })
                ]);

                return {
                    name: monthName,
                    simpanan: Number(mSavings._sum.amount || 0),
                    pinjaman: Number(mLoans._sum.amount || 0),
                    penjualan: Number(mSales._sum.total || 0)
                };
            }));

            // ── Recent Activities Merged ──
            const recentActivities = [
                ...recentSavings.map(s => ({
                    id: s.id,
                    type: 'SAVING',
                    title: s.saving?.category?.name ? `Simpanan ${s.saving.category.name}` : 'Simpanan',
                    description: s.saving?.member?.User?.full_name || s.saving?.member?.Guru?.nama_guru || s.saving?.member?.Siswa?.nama_siswa || 'Anggota',
                    amount: Number(s.amount),
                    date: s.date
                })),
                ...recentSales.map(sl => ({
                    id: sl.id,
                    type: 'SALE',
                    title: 'Kasir POS',
                    description: sl.member ? (sl.member?.User?.full_name || sl.member?.Guru?.nama_guru || sl.member?.Siswa?.nama_siswa) : 'Pembeli Umum',
                    amount: Number(sl.total),
                    date: sl.date
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

            const resultData = {
                // Core KPI
                totalMembers,
                activeMembers,
                totalSavings,
                simpananPokok,
                simpananWajib,
                simpananSukarela,
                totalLoans,
                activeLoansCount,
                dueInstallments,
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

                // 4 Executive Risk & Compliance Metrics
                wajibCompliance,
                loanPortfolio,
                pendingMembers,
                estimatedShuYtd
            };

            // Save to In-Memory Cache
            statsCache.set(tenantId, { data: resultData, timestamp: Date.now() });

            appLogger.info({ action: 'GET_DASHBOARD_STATS', tenantId, durationMs: Date.now() - startTime });
            return reply.send({
                success: true,
                data: resultData,
                cached: false
            });
        } catch (error: any) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, '[Dashboard] Gagal memuat statistik koperasi');
            return reply.status(500).send({
                type: 'https://errors.absenta.id/cooperative/dashboard-stats-error',
                title: 'Gagal Memuat Statistik Koperasi',
                status: 500,
                detail: error.message || 'Terjadi kesalahan sistem saat mengagregasikan metrik koperasi.',
                code: 'COOP_DASHBOARD_STATS_FAILED',
                instance: req.url,
                timestamp: new Date().toISOString()
            });
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2. GET /summary-member — Ringkasan Akun Personal Anggota (Self-Service Hub)
    // ──────────────────────────────────────────────────────────────────────────
    fastify.get('/summary-member', { preHandler: [requireCapability('cooperative.dashboard.view.overview', false)] }, async (req: any, reply: any) => {
        const startTime = Date.now();
        try {
            const tenantId = getTenantId(req);
            const userId = req.user?.id;
            if (!userId) {
                return reply.code(401).send({ success: false, message: 'Unauthorized' });
            }

            const member = await MemberService.getMemberByUserId(tenantId, userId);
            if (!member) {
                return reply.send({
                    success: true,
                    data: {
                        isMember: false,
                        memberInfo: null,
                        mySavings: { total: 0, pokok: 0, wajib: 0, sukarela: 0, unpaidWajibThisMonth: false },
                        myLoans: { activeLoan: null, pendingLoansCount: 0 },
                        myShuEstimate: { estimatedAmount: 0, periodYear: new Date().getFullYear() },
                        recentPurchases: []
                    }
                });
            }

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // Simpanan & Breakdown
            const savingsList = await prisma.saving.findMany({
                where: { memberId: member.id },
                include: { category: true }
            });

            let pokok = 0;
            let wajib = 0;
            let sukarela = 0;
            let totalSavings = 0;
            let wajibCategoryId: string | null = null;

            for (const s of savingsList) {
                const amt = Number(s.amount || 0);
                totalSavings += amt;
                const code = s.category?.code;
                if (code === 'POKOK') pokok += amt;
                else if (code === 'WAJIB') {
                    wajib += amt;
                    wajibCategoryId = s.categoryId;
                } else {
                    sukarela += amt;
                }
            }

            // Kepatuhan Simpanan Wajib Bulan Berjalan Anggota
            let paidWajibThisMonth = false;
            if (wajibCategoryId) {
                const wajibTrx = await prisma.savingTransaction.findFirst({
                    where: {
                        saving: { memberId: member.id, categoryId: wajibCategoryId },
                        type: 'DEPOSIT',
                        date: { gte: startOfMonth }
                    }
                });
                if (wajibTrx) paidWajibThisMonth = true;
            }

            // Pinjaman Aktif & Cicilan Berikutnya
            const [activeLoan, pendingLoansCount] = await Promise.all([
                prisma.loan.findFirst({
                    where: { memberId: member.id, status: 'APPROVED' },
                    include: {
                        installments: {
                            where: { status: 'UNPAID' },
                            orderBy: { dueDate: 'asc' },
                            take: 1
                        }
                    }
                }),
                prisma.loan.count({
                    where: { memberId: member.id, status: 'PENDING' }
                })
            ]);

            // Riwayat Pembelian POS Terakhir
            const recentSales = await prisma.sale.findMany({
                where: { tenantId, memberId: member.id },
                take: 5,
                orderBy: { date: 'desc' },
                select: {
                    id: true,
                    date: true,
                    total: true,
                    paymentMethod: true
                }
            });

            // Estimasi Dividen SHU Personal Berjalan
            const activePeriod = await prisma.shuPeriod.findFirst({
                where: { tenantId, isActive: true },
                select: { id: true, year: true, totalShu: true }
            });

            const currentYear = activePeriod?.year || now.getFullYear();
            let estimatedShu = 0;

            if (activePeriod && Number(activePeriod.totalShu) > 0) {
                const totalMemberSavingsAll = await prisma.saving.aggregate({
                    where: { member: { tenantId, status: 'ACTIVE' } },
                    _sum: { amount: true }
                });
                const allSavingsSum = Number(totalMemberSavingsAll._sum.amount || 0);
                if (allSavingsSum > 0 && totalSavings > 0) {
                    const modalRatio = totalSavings / allSavingsSum;
                    estimatedShu = Math.round(Number(activePeriod.totalShu) * 0.4 * modalRatio);
                }
            }

            const data = {
                isMember: true,
                memberInfo: {
                    id: member.id,
                    memberNo: member.memberNo,
                    name: member.name,
                    type: member.type,
                    status: member.status,
                    joinDate: member.joinDate
                },
                mySavings: {
                    total: totalSavings,
                    pokok,
                    wajib,
                    sukarela,
                    unpaidWajibThisMonth: member.status === 'ACTIVE' && !paidWajibThisMonth
                },
                myLoans: {
                    activeLoan: activeLoan ? {
                        id: activeLoan.id,
                        amount: Number(activeLoan.amount),
                        interestRate: Number(activeLoan.interestRate),
                        duration: activeLoan.duration,
                        nextInstallment: activeLoan.installments[0] ? {
                            id: activeLoan.installments[0].id,
                            amount: Number(activeLoan.installments[0].amount),
                            dueDate: activeLoan.installments[0].dueDate,
                            isOverdue: new Date(activeLoan.installments[0].dueDate) < now
                        } : null
                    } : null,
                    pendingLoansCount
                },
                myShuEstimate: {
                    estimatedAmount: estimatedShu,
                    periodYear: currentYear
                },
                recentPurchases: recentSales.map(s => ({
                    id: s.id,
                    date: s.date,
                    total: Number(s.total),
                    paymentMethod: s.paymentMethod
                }))
            };

            appLogger.info({ action: 'GET_DASHBOARD_SUMMARY_MEMBER', tenantId, memberId: member.id, durationMs: Date.now() - startTime });
            return reply.send({ success: true, data });
        } catch (error: any) {
            appLogger.error({ err: error, durationMs: Date.now() - startTime }, '[Dashboard] Gagal memuat ringkasan member');
            return reply.status(500).send({ success: false, message: 'Gagal memuat ringkasan anggota.', error: error.message });
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3. GET /quick-actions — Indikator Cepat & Badge Notifikasi Pengurus
    // ──────────────────────────────────────────────────────────────────────────
    fastify.get('/quick-actions', { preHandler: [requireCapability('cooperative.dashboard.view.overview')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const now = new Date();

            const [pendingMembers, pendingLoans, openTickets, overdueInstallments] = await Promise.all([
                prisma.member.count({ where: { tenantId, status: 'PENDING' } }),
                prisma.loan.count({ where: { member: { tenantId }, status: 'PENDING' } }),
                prisma.ticket.count({ where: { tenantId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
                prisma.installment.count({
                    where: {
                        loan: { member: { tenantId } },
                        status: 'UNPAID',
                        dueDate: { lt: now }
                    }
                })
            ]);

            return reply.send({
                success: true,
                data: {
                    pendingMembers,
                    pendingLoans,
                    openTickets,
                    overdueInstallments
                }
            });
        } catch (error: any) {
            appLogger.error({ err: error }, '[Dashboard] Gagal memuat quick-actions');
            return reply.status(500).send({ success: false, message: 'Gagal memuat indikator pintas koperasi.', error: error.message });
        }
    });
}
