// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '../../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface UpdateShuConfigDto {
    porsiJasaModal?: number;
    porsiJasaTransaksi?: number;
    porsiCadangan?: number;
    porsiPengurus?: number;
    porsiSosial?: number;
    porsiPembangunan?: number;
    includeStorePurchases?: boolean;
    includeLoans?: boolean;
    includeSavingsDeposit?: boolean;
    enableLiveEstimation?: boolean;
}

export interface CreateShuPeriodDto {
    year: number;
    startDate: string; // ISO date
    endDate: string;   // ISO date
    totalRevenue?: number;
    totalExpense?: number;
    notes?: string;
    porsiJasaModal?: number;
    porsiJasaTransaksi?: number;
    porsiCadangan?: number;
    porsiPengurus?: number;
    porsiSosial?: number;
    porsiPembangunan?: number;
    includeStorePurchases?: boolean;
    includeLoans?: boolean;
    includeSavingsDeposit?: boolean;
}

// In-Memory Idempotency Cache (5 menit TTL) untuk mencegah duplicate calculation / duplicate distribution
const idempotencyCache = new Map<string, { data: any; timestamp: number }>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

const idempotencyCleaner = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of idempotencyCache.entries()) {
        if (now - value.timestamp > IDEMPOTENCY_TTL_MS) {
            idempotencyCache.delete(key);
        }
    }
}, 60 * 1000);

if (typeof idempotencyCleaner?.unref === 'function') {
    idempotencyCleaner.unref();
}

// In-Flight Mutex Locks per periodId
const distributionLocks = new Set<string>();
const calculationLocks = new Set<string>();

export class ShuService {

    // ─── KONFIGURASI ─────────────────────────────────────────────────────────

    /** Ambil atau buat konfigurasi SHU default untuk tenant */
    static async getConfig(tenantId: string) {
        const existing = await prisma.shuConfig.findUnique({ where: { tenantId } });
        if (existing) return existing;

        // Buat default jika belum ada
        return prisma.shuConfig.create({
            data: {
                tenantId,
                porsiJasaModal: 30,
                porsiJasaTransaksi: 30,
                porsiCadangan: 20,
                porsiPengurus: 5,
                porsiSosial: 5,
                porsiPembangunan: 10,
                includeStorePurchases: true,
                includeLoans: true,
                includeSavingsDeposit: false,
                enableLiveEstimation: false,
            },
        });
    }

    /** Update konfigurasi alokasi SHU */
    static async updateConfig(tenantId: string, data: UpdateShuConfigDto) {
        // Validasi total = 100
        const config = await this.getConfig(tenantId);
        const merged = {
            porsiJasaModal: data.porsiJasaModal ?? Number(config.porsiJasaModal),
            porsiJasaTransaksi: data.porsiJasaTransaksi ?? Number(config.porsiJasaTransaksi),
            porsiCadangan: data.porsiCadangan ?? Number(config.porsiCadangan),
            porsiPengurus: data.porsiPengurus ?? Number(config.porsiPengurus),
            porsiSosial: data.porsiSosial ?? Number(config.porsiSosial),
            porsiPembangunan: data.porsiPembangunan ?? Number(config.porsiPembangunan),
            includeStorePurchases: data.includeStorePurchases !== undefined ? Boolean(data.includeStorePurchases) : (config.includeStorePurchases ?? true),
            includeLoans: data.includeLoans !== undefined ? Boolean(data.includeLoans) : (config.includeLoans ?? true),
            includeSavingsDeposit: data.includeSavingsDeposit !== undefined ? Boolean(data.includeSavingsDeposit) : (config.includeSavingsDeposit ?? false),
            enableLiveEstimation: data.enableLiveEstimation !== undefined ? Boolean(data.enableLiveEstimation) : (config.enableLiveEstimation ?? false),
        };
        const total = (merged.porsiJasaModal + merged.porsiJasaTransaksi + merged.porsiCadangan + merged.porsiPengurus + merged.porsiSosial + merged.porsiPembangunan);
        if (Math.abs(total - 100) > 0.01) {
            throw new Error(`Total persentase alokasi SHU harus 100%. Saat ini: ${total}%`);
        }

        return prisma.shuConfig.upsert({
            where: { tenantId },
            update: merged,
            create: { tenantId, ...merged },
        });
    }

    // ─── PERIODE SHU ─────────────────────────────────────────────────────────

    /** Daftar semua periode SHU tenant */
    static async getPeriods(tenantId: string) {
        return prisma.shuPeriod.findMany({
            where: { tenantId },
            orderBy: { year: 'desc' },
            include: {
                _count: { select: { Allocations: true } },
            },
        });
    }

    /** Buat periode SHU baru (mengambil snapshot default dari ShuConfig jika tidak ditentukan) */
    static async createPeriod(tenantId: string, data: CreateShuPeriodDto) {
        const existing = await prisma.shuPeriod.findFirst({
            where: { tenantId, year: data.year },
        });
        if (existing) throw new Error(`Periode SHU tahun ${data.year} sudah ada.`);

        // Ambil default dari ShuConfig untuk snapshot
        const config = await this.getConfig(tenantId);

        const revenue = data.totalRevenue ?? 0;
        const expense = data.totalExpense ?? 0;
        return prisma.shuPeriod.create({
            data: {
                tenantId,
                year: data.year,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                totalRevenue: revenue,
                totalExpense: expense,
                totalShu: revenue - expense,
                notes: data.notes,
                status: 'DRAFT',
                porsiJasaModal: data.porsiJasaModal ?? config.porsiJasaModal,
                porsiJasaTransaksi: data.porsiJasaTransaksi ?? config.porsiJasaTransaksi,
                porsiCadangan: data.porsiCadangan ?? config.porsiCadangan,
                porsiPengurus: data.porsiPengurus ?? config.porsiPengurus,
                porsiSosial: data.porsiSosial ?? config.porsiSosial,
                porsiPembangunan: data.porsiPembangunan ?? config.porsiPembangunan,
                includeStorePurchases: data.includeStorePurchases !== undefined ? Boolean(data.includeStorePurchases) : (config.includeStorePurchases ?? true),
                includeLoans: data.includeLoans !== undefined ? Boolean(data.includeLoans) : (config.includeLoans ?? true),
                includeSavingsDeposit: data.includeSavingsDeposit !== undefined ? Boolean(data.includeSavingsDeposit) : (config.includeSavingsDeposit ?? false),
            },
        });
    }

    /** Update aturan RAT khusus untuk periode tertentu (hanya jika DRAFT atau CALCULATED) */
    static async updatePeriodRules(periodId: string, tenantId: string, data: Partial<CreateShuPeriodDto>) {
        const period = await prisma.shuPeriod.findFirst({
            where: { id: periodId, tenantId },
        });
        if (!period) throw new Error('Periode SHU tidak ditemukan.');
        if (period.status === 'APPROVED' || period.status === 'DISTRIBUTED') {
            throw new Error('Periode SHU yang sudah disetujui atau didistribusikan telah terkunci dan aturannya tidak dapat diubah.');
        }

        const merged = {
            porsiJasaModal: data.porsiJasaModal ?? Number(period.porsiJasaModal),
            porsiJasaTransaksi: data.porsiJasaTransaksi ?? Number(period.porsiJasaTransaksi),
            porsiCadangan: data.porsiCadangan ?? Number(period.porsiCadangan),
            porsiPengurus: data.porsiPengurus ?? Number(period.porsiPengurus),
            porsiSosial: data.porsiSosial ?? Number(period.porsiSosial),
            porsiPembangunan: data.porsiPembangunan ?? Number(period.porsiPembangunan),
            includeStorePurchases: data.includeStorePurchases !== undefined ? Boolean(data.includeStorePurchases) : (period.includeStorePurchases ?? true),
            includeLoans: data.includeLoans !== undefined ? Boolean(data.includeLoans) : (period.includeLoans ?? true),
            includeSavingsDeposit: data.includeSavingsDeposit !== undefined ? Boolean(data.includeSavingsDeposit) : (period.includeSavingsDeposit ?? false),
        };

        const total = (merged.porsiJasaModal + merged.porsiJasaTransaksi + merged.porsiCadangan + merged.porsiPengurus + merged.porsiSosial + merged.porsiPembangunan);
        if (Math.abs(total - 100) > 0.01) {
            throw new Error(`Total persentase alokasi SHU harus 100%. Saat ini: ${total}%`);
        }

        return prisma.shuPeriod.update({
            where: { id: periodId },
            data: merged,
        });
    }

    /** Hapus periode SHU (hanya jika DRAFT atau CALCULATED) */
    static async deletePeriod(periodId: string, tenantId: string) {
        const period = await prisma.shuPeriod.findFirst({
            where: { id: periodId, tenantId },
        });
        if (!period) throw new Error('Periode SHU tidak ditemukan.');
        if (period.status === 'APPROVED' || period.status === 'DISTRIBUTED') {
            throw new Error('Periode SHU yang sudah disetujui atau didistribusikan tidak dapat dihapus.');
        }

        return prisma.shuPeriod.delete({
            where: { id: periodId },
        });
    }

    /** Detail periode SHU beserta alokasi per anggota */
    static async getPeriodDetail(periodId: string, tenantId: string) {
        const period = await prisma.shuPeriod.findFirst({
            where: { id: periodId, tenantId },
            include: {
                Allocations: {
                    include: {
                        Member: {
                            include: {
                                Siswa: { select: { nama_siswa: true } },
                                Guru: { select: { nama_guru: true } },
                                User: { select: { full_name: true } },
                            },
                        },
                    },
                    orderBy: { totalShu: 'desc' },
                },
            },
        });
        if (!period) throw new Error('Periode SHU tidak ditemukan.');

        // Pisahkan Allocations dari period agar respons API terstruktur jelas
        const { Allocations, ...periodData } = period;

        return {
            period: periodData,
            allocations: Allocations.map(a => ({
                ...a,
                Member: {
                    ...a.Member,
                    name: a.Member.Siswa?.nama_siswa ?? a.Member.Guru?.nama_guru ?? a.Member.User?.full_name ?? 'Unknown',
                    memberNo: a.Member.memberNo,
                },
            })),
        };
    }

    // ─── KALKULASI SHU ───────────────────────────────────────────────────────

    /**
     * Kalkulasi SHU otomatis per anggota.
     *
     * Algoritma (Standar KSP Indonesia - UU No. 25/1992 & Permen Koperasi):
     *  1. Ambil konfigurasi alokasi SHU tenant
     *  2. Ambil kategori simpanan yang masuk jasa modal (isIncludedInShu = true)
     *  3. Hitung total simpanan modal (simpanan pokok + wajib) seluruh anggota
     *  4. Hitung total volume transaksi GABUNGAN per anggota dalam periode:
     *     - Volume DEPOSIT simpanan oleh anggota (jasa simpanan)
     *     - Volume PINJAMAN (amount) yang diambil anggota (jasa pinjaman)
     *     Catatan: Peminjam berhak atas SHU karena meminjam = berpartisipasi dalam
     *     usaha koperasi. Bunga yang dibayar menjadi pendapatan koperasi yang menghasilkan SHU.
     *  5. Untuk setiap anggota:
     *     - jasaModal      = (simpananModal_X / totalModal_semua) × (totalSHU × porsiJasaModal%)
     *     - jasaTransaksi  = (volumeGabungan_X / totalVolumeGabungan_semua) × (totalSHU × porsiJasaTransaksi%)
     *  6. Simpan ShuAllocation per anggota
     */
    static async calculateShu(periodId: string, tenantId: string, idempotencyKey?: string) {
        if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
            appLogger.info({ idempotencyKey, periodId }, '[SHU] Returning cached calculation result');
            return idempotencyCache.get(idempotencyKey)!.data;
        }

        if (calculationLocks.has(periodId)) {
            throw new Error('Kalkulasi SHU untuk periode ini sedang berjalan dalam proses lain. Mohon tunggu sejenak.');
        }

        calculationLocks.add(periodId);
        try {
            const period = await prisma.shuPeriod.findFirst({
                where: { id: periodId, tenantId },
            });
            if (!period) throw new Error('Periode SHU tidak ditemukan.');
            if (period.status === 'APPROVED' || period.status === 'DISTRIBUTED') {
                throw new Error('Periode SHU sudah disetujui/didistribusikan. Tidak bisa dikalkulasi ulang.');
            }

        // 1. Ambil data Laba-Rugi terkini untuk sinkronisasi otomatis sebelum kalkulasi
        const { ReportService } = require('../laporan/report.service');
        const report = await ReportService.getIncomeStatement(tenantId, period.startDate, period.endDate);
        const totalRevenue = Math.round(report.summary.totalRevenue || 0);
        const totalExpense = Math.round(report.summary.totalExpense || 0);
        const updatedTotalShu = totalRevenue - totalExpense;

        // Perbarui data periode di database
        await prisma.shuPeriod.update({
            where: { id: periodId },
            data: {
                totalRevenue,
                totalExpense,
                totalShu: updatedTotalShu
            }
        });

        // 2. Proteksi SHU Negatif atau Nol
        if (updatedTotalShu <= 0) {
            throw new Error(
                `SHU_RESTRICTION:NEGATIVE: Koperasi membukukan SHU bersih sebesar Rp ${updatedTotalShu.toLocaleString('id-ID')} (nol atau rugi) pada tahun buku ${period.year}. ` +
                'Kalkulasi pembagian SHU kepada anggota tidak dapat diproses jika koperasi mengalami kerugian.'
            );
        }

        // Ambil aturan RAT langsung dari snapshot periode (bukan config global)
        const totalShu = updatedTotalShu;
        const porsiJasaModal = Number(period.porsiJasaModal ?? 30) / 100;
        const porsiJasaTransaksi = Number(period.porsiJasaTransaksi ?? 30) / 100;

        // Pool SHU yang dibagi ke anggota
        const poolJasaModal = totalShu * porsiJasaModal;
        const poolJasaTransaksi = totalShu * porsiJasaTransaksi;

        // Kategori simpanan yang masuk jasa modal
        const modalCategories = await prisma.savingCategory.findMany({
            where: { tenantId, isIncludedInShu: true, isActive: true },
            select: { id: true },
        });
        const modalCategoryIds = modalCategories.map(c => c.id);

        // Semua anggota aktif dalam tenant
        const members = await prisma.member.findMany({
            where: { tenantId, status: 'ACTIVE' },
            include: {
                savings: {
                    where: { categoryId: { in: modalCategoryIds } },
                    select: { amount: true },
                },
            },
        });

        // Total modal seluruh anggota
        const totalModal = members.reduce(
            (sum, m) => sum + m.savings.reduce((s, sv) => s + Number(sv.amount), 0),
            0,
        );

        // ─── [1] Volume DEPOSIT simpanan anggota dalam periode ─────────────────
        const depositTransactions = await prisma.savingTransaction.findMany({
            where: {
                type: 'DEPOSIT',
                date: { gte: period.startDate, lte: period.endDate },
                saving: { member: { tenantId } },
            },
            include: {
                saving: { select: { memberId: true } },
            },
        });

        // Map volume deposit per memberId
        const depositPerMember = new Map<string, number>();
        for (const t of depositTransactions) {
            const current = depositPerMember.get(t.saving.memberId) ?? 0;
            depositPerMember.set(t.saving.memberId, current + Number(t.amount));
        }

        // ─── [2] Volume PINJAMAN anggota yang APPROVED dalam periode ──────────
        // Standar KSP Indonesia: meminjam = berpartisipasi dalam usaha koperasi
        // → anggota peminjam berhak atas jasa transaksi proporsional atas nilai pinjaman mereka
        const loansInPeriod = await prisma.loan.findMany({
            where: {
                status: { in: ['APPROVED', 'PAID'] },
                createdAt: { gte: period.startDate, lte: period.endDate },
                member: { tenantId },
            },
            select: {
                memberId: true,
                amount: true,
            },
        });

        // Map volume pinjaman per memberId
        const pinjamanPerMember = new Map<string, number>();
        for (const loan of loansInPeriod) {
            const current = pinjamanPerMember.get(loan.memberId) ?? 0;
            pinjamanPerMember.set(loan.memberId, current + Number(loan.amount));
        }

        // ─── [3] Volume BELANJA toko POS anggota dalam periode ─────────────────
        const salesInPeriod = await prisma.sale.findMany({
            where: {
                memberId: { not: null },
                date: { gte: period.startDate, lte: period.endDate },
                tenantId,
            },
            select: {
                memberId: true,
                total: true,
            },
        });

        // Map volume belanja per memberId
        const belanjaPerMember = new Map<string, number>();
        for (const sale of salesInPeriod) {
            if (sale.memberId) {
                const current = belanjaPerMember.get(sale.memberId) ?? 0;
                belanjaPerMember.set(sale.memberId, current + Number(sale.total));
            }
        }

        // ─── [4] Gabungkan: Volume Transaksi Dinamis Sesuai Aturan Transparan di Snapshot Periode
        const includeStore = period.includeStorePurchases ?? true;
        const includeLoan = period.includeLoans ?? true;
        const includeDeposit = period.includeSavingsDeposit ?? false;

        // Gunakan Array.from() untuk kompatibilitas ES target lama (TS2802 fix)
        const allMemberIds = Array.from(new Set([
            ...(includeDeposit ? Array.from(depositPerMember.keys()) : []),
            ...(includeLoan ? Array.from(pinjamanPerMember.keys()) : []),
            ...(includeStore ? Array.from(belanjaPerMember.keys()) : []),
        ]));
        const transaksiGabunganPerMember = new Map<string, number>();
        for (const memberId of allMemberIds) {
            const deposit = includeDeposit ? (depositPerMember.get(memberId) ?? 0) : 0;
            const pinjaman = includeLoan ? (pinjamanPerMember.get(memberId) ?? 0) : 0;
            const belanja = includeStore ? (belanjaPerMember.get(memberId) ?? 0) : 0;
            transaksiGabunganPerMember.set(memberId, deposit + pinjaman + belanja);
        }
        const totalTransaksiGabungan = Array.from(transaksiGabunganPerMember.values()).reduce((a, b) => a + b, 0);

        // Hapus alokasi lama jika ada (re-calculate)
        await prisma.shuAllocation.deleteMany({ where: { periodId } });

        // Buat alokasi baru per anggota
        const allocations = members.map(member => {
            const simpananModal = member.savings.reduce((s, sv) => s + Number(sv.amount), 0);
            const volumeBelanja = belanjaPerMember.get(member.id) ?? 0;
            const volumePinjaman = pinjamanPerMember.get(member.id) ?? 0;
            const volumeDeposit = depositPerMember.get(member.id) ?? 0;
            const volumeGabungan = (transaksiGabunganPerMember.get(member.id) ?? 0);

            const jasaModal = totalModal > 0 ? (simpananModal / totalModal) * poolJasaModal : 0;
            // jasaTransaksi = proporsi dari volume gabungan (sesuai aturan aktif) anggota
            const jasaTransaksi = totalTransaksiGabungan > 0 ? (volumeGabungan / totalTransaksiGabungan) * poolJasaTransaksi : 0;

            return {
                periodId,
                memberId: member.id,
                totalSimpananModal: new Decimal(simpananModal),
                // totalTransaksi menyimpan volume gabungan yang aktif untuk transparansi audit
                totalTransaksi: new Decimal(volumeGabungan),
                volumeBelanja: new Decimal(volumeBelanja),
                volumePinjaman: new Decimal(volumePinjaman),
                volumeDeposit: new Decimal(volumeDeposit),
                jasaModal: new Decimal(Math.round(jasaModal)),
                jasaTransaksi: new Decimal(Math.round(jasaTransaksi)),
                totalShu: new Decimal(Math.round(jasaModal + jasaTransaksi)),
                status: 'PENDING' as const,
            };
        });

        // Hanya simpan alokasi anggota yang mendapatkan SHU > 0
        // (anggota tanpa simpanan modal DAN tanpa transaksi dalam periode dikecualikan dari tabel)
        const validAllocations = allocations.filter(a => Number(a.totalShu) > 0);

        await prisma.shuAllocation.createMany({ data: validAllocations });

        // Update status periode
        await prisma.shuPeriod.update({
            where: { id: periodId },
            data: { status: 'CALCULATED' },
        });

        // Ringkasan kalkulasi untuk logging/response
        const totalShuDistributed = validAllocations.reduce((a, b) => a + Number(b.totalShu), 0);
        // Gunakan Array.from() untuk kompatibilitas ES target lama
        const uniqueBorrowerIds = Array.from(new Set(loansInPeriod.map(l => l.memberId)));
        const anggotaMeminjam = uniqueBorrowerIds.length;

            const result = {
                calculated: validAllocations.length,
                skipped: allocations.length - validAllocations.length, // anggota dengan SHU = 0
                totalShuDistributed,
                configApplied: {
                    includeStorePurchases: includeStore,
                    includeLoans: includeLoan,
                    includeSavingsDeposit: includeDeposit,
                },
                summary: {
                    poolJasaModal: Math.round(poolJasaModal),
                    poolJasaTransaksi: Math.round(poolJasaTransaksi),
                    totalVolumeDeposit: Math.round(Array.from(depositPerMember.values()).reduce((a, b) => a + b, 0)),
                    totalVolumePinjaman: Math.round(Array.from(pinjamanPerMember.values()).reduce((a, b) => a + b, 0)),
                    totalVolumeBelanja: Math.round(Array.from(belanjaPerMember.values()).reduce((a, b) => a + b, 0)),
                    totalVolumeGabungan: Math.round(totalTransaksiGabungan),
                    anggotaMemilikiSimpananModal: members.filter(m => m.savings.length > 0).length,
                    anggotaBerpartisipasiTransaksi: allMemberIds.length,
                    anggotaMeminjam,
                }
            };

            if (idempotencyKey) {
                idempotencyCache.set(idempotencyKey, { data: result, timestamp: Date.now() });
            }

            return result;
        } finally {
            calculationLocks.delete(periodId);
        }
    }

    /** Sinkronisasi ulang data Laba-Rugi terbaru ke periode SHU */
    static async syncPeriodFinancials(periodId: string, tenantId: string) {
        const period = await prisma.shuPeriod.findFirst({
            where: { id: periodId, tenantId }
        });
        if (!period) throw new Error('Periode SHU tidak ditemukan.');
        if (period.status !== 'DRAFT' && period.status !== 'CALCULATED') {
            throw new Error('Hanya periode berstatus DRAFT atau CALCULATED yang dapat disinkronisasi ulang keuangan.');
        }

        const { ReportService } = require('../laporan/report.service');
        const report = await ReportService.getIncomeStatement(tenantId, period.startDate, period.endDate);
        
        const totalRevenue = Math.round(report.summary.totalRevenue || 0);
        const totalExpense = Math.round(report.summary.totalExpense || 0);
        const totalShu = totalRevenue - totalExpense;

        return prisma.shuPeriod.update({
            where: { id: periodId },
            data: {
                totalRevenue,
                totalExpense,
                totalShu
            }
        });
    }

    /** Ketua menyetujui hasil kalkulasi SHU */
    static async approvePeriod(periodId: string, tenantId: string, userId: string) {
        const period = await prisma.shuPeriod.findFirst({ where: { id: periodId, tenantId } });
        if (!period) throw new Error('Periode SHU tidak ditemukan.');
        if (period.status !== 'CALCULATED') {
            throw new Error('SHU harus dikalkulasi terlebih dahulu sebelum disetujui.');
        }

        return prisma.shuPeriod.update({
            where: { id: periodId },
            data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
        });
    }

    /** Bendahara mendistribusikan SHU ke rekening Sukarela masing-masing anggota */
    static async distributeShu(periodId: string, tenantId: string, idempotencyKey?: string) {
        if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
            appLogger.info({ idempotencyKey, periodId }, '[SHU] Returning cached distribution result');
            return idempotencyCache.get(idempotencyKey)!.data;
        }

        if (distributionLocks.has(periodId)) {
            throw new Error('Distribusi SHU untuk periode ini sedang diproses. Mohon jangan mengirim permintaan ganda.');
        }

        distributionLocks.add(periodId);
        try {
            const period = await prisma.shuPeriod.findFirst({ where: { id: periodId, tenantId } });
            if (!period) throw new Error('Periode SHU tidak ditemukan.');
            if (period.status === 'DISTRIBUTED') {
                return { distributed: 0, totalMembers: 0, message: 'SHU periode ini sudah selesai didistribusikan sebelumnya.' };
            }
            if (period.status !== 'APPROVED') {
                throw new Error('SHU harus disetujui Ketua sebelum dapat didistribusikan.');
            }

            const allocations = await prisma.shuAllocation.findMany({
                where: { periodId, status: 'PENDING' },
                include: {
                    Member: {
                        include: {
                            savings: {
                                include: { category: { select: { code: true } } },
                            },
                        },
                    },
                },
            });

            // Dapatkan kategori SUKARELA untuk tenant
            const sukarela = await prisma.savingCategory.findFirst({
                where: { tenantId, code: 'SUKARELA', isActive: true },
            });

            let distributed = 0;
            for (const alloc of allocations) {
                if (Number(alloc.totalShu) <= 0) continue;

                // Cari rekening sukarela anggota, buat jika belum ada
                let savingAkun = alloc.Member.savings.find(s => s.category.code === 'SUKARELA');
                if (!savingAkun && sukarela) {
                    savingAkun = await prisma.saving.create({
                        data: { memberId: alloc.memberId, categoryId: sukarela.id, amount: 0 },
                        include: { category: { select: { code: true } } },
                    }) as any;
                }

                if (savingAkun) {
                    const shuAmount = Number(alloc.totalShu);
                    let updateSuccess = false;

                    await prisma.$transaction(async (tx) => {
                        // Atomic Multi-Layer Financial Defense:
                        // Hanya update alokasi jika status masih murni PENDING di basis data
                        const updated = await tx.shuAllocation.updateMany({
                            where: { id: alloc.id, status: 'PENDING' },
                            data: { status: 'DISTRIBUTED', distributedAt: new Date(), distributedTo: 'SAVINGS' },
                        });

                        // Jika alokasi sudah diproses oleh thread/request paralel, lewati agar tidak terjadi saldo ganda
                        if (updated.count === 0) return;

                        // Tambah saldo sukarela
                        await tx.saving.update({
                            where: { id: savingAkun!.id },
                            data: { amount: { increment: shuAmount } },
                        });

                        // Catat transaksi INTEREST di rekening tabungan sukarela
                        await tx.savingTransaction.create({
                            data: {
                                savingId: savingAkun!.id,
                                amount: shuAmount,
                                type: 'INTEREST',
                                description: `SHU Tahun ${period.year} [IDEM:${alloc.id}]`,
                            },
                        });

                        updateSuccess = true;
                    });

                    if (!updateSuccess) continue;

                    // Catat Jurnal Akuntansi Distribusi SHU (Double-Entry):
                    // Debit  3010 (Ekuitas Koperasi) — SHU keluar dari ekuitas koperasi
                    // Kredit 2010 (Tabungan Sukarela Anggota) — SHU masuk ke tabungan anggota
                    try {
                        const { AccountingService } = require('../laporan/accounting.service');
                        await AccountingService.createJournalEntry(
                            tenantId,
                            `Distribusi SHU Tahun ${period.year} - Anggota ${alloc.memberId.slice(-6).toUpperCase()}`,
                            `SHU-DIST-${period.year}-${alloc.id.slice(-8).toUpperCase()}`,
                            [
                                { accountCode: '3010', type: 'DEBIT', amount: shuAmount },
                                { accountCode: '2010', type: 'CREDIT', amount: shuAmount },
                            ]
                        );
                    } catch (acctErr) {
                        // Jika modul akuntansi belum tersedia, lewati (non-fatal)
                        console.warn('[SHU] Tidak dapat mencatat jurnal akuntansi distribusi SHU:', acctErr);
                    }

                    distributed++;
                }
            }

            // ─── [Jurnal Alokasi SHU Non-Anggota] ───────────────────────────────
            try {
                const config = await this.getConfig(tenantId);
                const totalShu = Number(period.totalShu);
                
                const porsiCadangan = Number(config.porsiCadangan);
                const porsiPengurus = Number(config.porsiPengurus);
                const porsiSosial = Number(config.porsiSosial);
                const porsiPembangunan = Number(config.porsiPembangunan);

                const cadanganAmount = Math.round(totalShu * (porsiCadangan / 100));
                const pengurusAmount = Math.round(totalShu * (porsiPengurus / 100));
                const sosialAmount = Math.round(totalShu * (porsiSosial / 100));
                const pembangunanAmount = Math.round(totalShu * (porsiPembangunan / 100));
                
                const totalNonMemberAlloc = cadanganAmount + pengurusAmount + sosialAmount + pembangunanAmount;

                if (totalNonMemberAlloc > 0) {
                    const { AccountingService } = require('../laporan/accounting.service');
                    await AccountingService.createJournalEntry(
                        tenantId,
                        `Alokasi SHU Non-Anggota Tahun ${period.year} (Cadangan, Pengurus, Sosial, Pembangunan)`,
                        `SHU-NONMEM-${period.year}-${period.id.slice(-8).toUpperCase()}`,
                        [
                            { accountCode: '3010', type: 'DEBIT',  amount: totalNonMemberAlloc },
                            { accountCode: '3020', type: 'CREDIT', amount: cadanganAmount },
                            { accountCode: '2030', type: 'CREDIT', amount: pengurusAmount },
                            { accountCode: '2040', type: 'CREDIT', amount: sosialAmount },
                            { accountCode: '2050', type: 'CREDIT', amount: pembangunanAmount },
                        ]
                    );
                }
            } catch (acctErr) {
                console.warn('[SHU] Gagal mencatat jurnal alokasi non-anggota:', acctErr);
            }

            await prisma.shuPeriod.update({
                where: { id: periodId },
                data: { status: 'DISTRIBUTED' },
            });

            const result = { distributed, totalMembers: allocations.length };
            if (idempotencyKey) {
                idempotencyCache.set(idempotencyKey, { data: result, timestamp: Date.now() });
            }

            return result;
        } finally {
            distributionLocks.delete(periodId);
        }
    }

    /** Riwayat SHU untuk anggota (self view) */
    static async getMyShuHistory(tenantId: string, userId: string) {
        const member = await prisma.member.findFirst({
            where: { tenantId, userId },
        });
        if (!member) return [];

        return prisma.shuAllocation.findMany({
            where: { memberId: member.id, status: 'DISTRIBUTED' },
            include: { Period: { select: { year: true, status: true } } },
            orderBy: { Period: { year: 'desc' } },
        });
    }

    /**
     * Hitung simulasi / perkiraan perolehan SHU tahun berjalan untuk member (Live Estimation).
     * Hanya mengembalikan data jika fitur diaktifkan oleh Ketua Koperasi (enableLiveEstimation = true).
     */
    static async getLiveEstimation(tenantId: string, userId: string) {
        const config = await this.getConfig(tenantId);
        if (!config.enableLiveEstimation) {
            return { enabled: false, message: 'Simulasi SHU berjalan dinonaktifkan oleh Pengurus.' };
        }

        const member = await prisma.member.findFirst({
            where: { tenantId, userId },
        });
        if (!member) {
            return { enabled: false, message: 'Data anggota tidak ditemukan.' };
        }

        // Cari periode aktif berjalan
        const { FiscalYearGuard } = await import('../fiscal-year.guard');
        let activePeriod = await FiscalYearGuard.getActiveFiscalYear(tenantId);
        
        const currentYear = new Date().getFullYear();
        if (!activePeriod) {
            // Auto fallback: Gunakan tahun kalender berjalan dengan aturan alokasi dari config
            activePeriod = {
                year: currentYear,
                startDate: new Date(`${currentYear}-01-01T00:00:00.000Z`),
                endDate: new Date(`${currentYear}-12-31T23:59:59.999Z`),
                totalShu: 0,
                porsiJasaModal: Number(config.porsiJasaModal || 30),
                porsiJasaTransaksi: Number(config.porsiJasaTransaksi || 30),
                includeStorePurchases: config.includeStorePurchases ?? true,
                includeLoans: config.includeLoans ?? true,
                includeSavingsDeposit: config.includeSavingsDeposit ?? false,
            } as any;
        }

        const startDate = new Date(activePeriod.startDate);
        const endDate = new Date(activePeriod.endDate);

        // [CEK PRIORITAS 1]: Jika periode aktif ini SUDAH DIKALKULASI (CALCULATED / APPROVED / DISTRIBUTED),
        // ambil alokasi resmi dari ShuAllocation agar angka pengurus dan member 100% SINKRON SATU ENGINE!
        if (activePeriod.id) {
            const existingAllocation = await prisma.shuAllocation.findFirst({
                where: {
                    periodId: activePeriod.id,
                    memberId: member.id,
                },
            });

            if (existingAllocation) {
                const jModal = Number(existingAllocation.jasaModal);
                const jTx = Number(existingAllocation.jasaTransaksi);
                const tShu = Number(existingAllocation.totalShu);
                const sModal = Number(existingAllocation.totalSimpananModal);
                const vBelanja = Number(existingAllocation.volumeBelanja || existingAllocation.totalTransaksi);

                return {
                    enabled: true,
                    hasActivePeriod: true,
                    year: activePeriod.year,
                    myTotalSimpananModal: sModal,
                    myTotalTransaksi: Number(existingAllocation.totalTransaksi),
                    myBelanja: vBelanja,
                    myPinjaman: Number(existingAllocation.volumePinjaman || 0),
                    myDeposit: Number(existingAllocation.volumeDeposit || 0),
                    poolJasaModal: Math.round(Number(activePeriod.totalShu || 0) * (Number(activePeriod.porsiJasaModal || 30) / 100)),
                    estimatedJasaModal: jModal,
                    estimatedJasaTransaksi: jTx,
                    estimatedTotalShu: tShu,
                    isOfficialCalculated: true,
                    status: existingAllocation.status,
                    notes: `Alokasi SHU Tahun Buku ${activePeriod.year} telah dihitung resmi oleh Bendahara Koperasi.`
                };
            }
        }

        // [CEK PRIORITAS 2]: Jika belum dikalkulasi resmi, hitung proporsional berbasis pool
        // 1. Simpanan Modal Saya (POKOK + WAJIB)
        const modalCategories = await prisma.savingCategory.findMany({
            where: { tenantId, code: { in: ['POKOK', 'WAJIB'] } },
            select: { id: true },
        });
        const modalCatIds = modalCategories.map(c => c.id);

        const mySavings = await prisma.saving.findMany({
            where: { memberId: member.id, categoryId: { in: modalCatIds } },
            select: { amount: true },
        });
        const myTotalSimpananModal = mySavings.reduce((sum, s) => sum + Number(s.amount), 0);

        // Total Simpanan Modal Seluruh Anggota Aktif
        const allSavings = await prisma.saving.aggregate({
            where: {
                member: { tenantId, status: 'ACTIVE' },
                categoryId: { in: modalCatIds },
            },
            _sum: { amount: true },
        });
        const grandTotalSimpananModal = Number(allSavings._sum.amount || 0);

        // 2. Volume Transaksi Saya
        let myBelanja = 0;
        let myPinjaman = 0;
        let myDeposit = 0;

        if (activePeriod.includeStorePurchases) {
            const belanja = await prisma.sale.aggregate({
                where: {
                    tenantId,
                    memberId: member.id,
                    date: { gte: startDate, lte: endDate },
                },
                _sum: { total: true },
            });
            myBelanja = Number(belanja._sum.total || 0);
        }

        if (activePeriod.includeLoans) {
            const loans = await prisma.loan.aggregate({
                where: {
                    memberId: member.id,
                    createdAt: { gte: startDate, lte: endDate },
                    status: { in: ['APPROVED', 'PAID'] },
                },
                _sum: { amount: true },
            });
            myPinjaman = Number(loans._sum.amount || 0);
        }

        if (activePeriod.includeSavingsDeposit) {
            const sukarelaCategory = await prisma.savingCategory.findFirst({
                where: { tenantId, code: 'SUKARELA' },
                select: { id: true },
            });
            if (sukarelaCategory) {
                const deposits = await prisma.savingTransaction.aggregate({
                    where: {
                        saving: { memberId: member.id, categoryId: sukarelaCategory.id },
                        type: 'DEPOSIT',
                        date: { gte: startDate, lte: endDate },
                    },
                    _sum: { amount: true },
                });
                myDeposit = Number(deposits._sum.amount || 0);
            }
        }

        const myTotalTransaksi = myBelanja + myPinjaman + myDeposit;

        // Total Transaksi Gabungan Seluruh Anggota (Hanya transaksi yang dilakukan oleh Anggota Koperasi)
        let grandTotalTransaksi = 0;
        if (activePeriod.includeStorePurchases) {
            const allSales = await prisma.sale.aggregate({
                where: { 
                    tenantId, 
                    memberId: { not: null },
                    date: { gte: startDate, lte: endDate } 
                },
                _sum: { total: true },
            });
            grandTotalTransaksi += Number(allSales._sum.total || 0);
        }
        if (activePeriod.includeLoans) {
            const allLoans = await prisma.loan.aggregate({
                where: { member: { tenantId }, createdAt: { gte: startDate, lte: endDate }, status: { in: ['APPROVED', 'PAID'] } },
                _sum: { amount: true },
            });
            grandTotalTransaksi += Number(allLoans._sum.amount || 0);
        }

        // 3. Estimasi Pendapatan & Biaya Berjalan dari Laporan Keuangan Riil Koperasi
        let estimatedTotalShu = Number(activePeriod.totalShu || 0);
        if (estimatedTotalShu <= 0) {
            try {
                const { ReportService } = require('../laporan/report.service');
                const report = await ReportService.getIncomeStatement(tenantId, startDate, endDate);
                const netIncome = Math.round(Number(report.summary?.totalRevenue || 0) - Number(report.summary?.totalExpense || 0));
                if (netIncome > 0) {
                    estimatedTotalShu = netIncome;
                }
            } catch (err) {
                appLogger.warn({ err }, '[SHU] Gagal mengambil Laba Rugi riil untuk live estimation, fallback ke omzet toko');
            }

            // Fallback cadangan jika pembukuan akuntansi belum memiliki jurnal transaksi sama sekali
            if (estimatedTotalShu <= 0) {
                const salesAgg = await prisma.sale.aggregate({
                    where: { tenantId, date: { gte: startDate, lte: endDate } },
                    _sum: { total: true },
                });
                estimatedTotalShu = Number(salesAgg._sum.total || 0) * 0.15;
            }
        }

        const porsiModalPct = Number(activePeriod.porsiJasaModal || 30) / 100;
        const porsiTxPct = Number(activePeriod.porsiJasaTransaksi || 30) / 100;

        const poolJasaModal = Math.round(estimatedTotalShu * porsiModalPct);
        const poolJasaTx = Math.round(estimatedTotalShu * porsiTxPct);

        const myShareModal = grandTotalSimpananModal > 0
            ? Math.round(poolJasaModal * (myTotalSimpananModal / grandTotalSimpananModal))
            : 0;

        // Jasa transaksi proporsional terhadap total transaksi anggota koperasi
        const estimatedJasaTransaksi = grandTotalTransaksi > 0
            ? Math.round(poolJasaTx * (myTotalTransaksi / grandTotalTransaksi))
            : (myTotalTransaksi > 0 ? poolJasaTx : 0);

        const estimatedTotalShuMyShare = myShareModal + estimatedJasaTransaksi;

        return {
            enabled: true,
            hasActivePeriod: true,
            year: activePeriod.year,
            myTotalSimpananModal,
            myTotalTransaksi,
            myBelanja,
            myPinjaman,
            myDeposit,
            poolJasaModal,
            estimatedJasaModal: myShareModal,
            estimatedJasaTransaksi,
            estimatedTotalShu: estimatedTotalShuMyShare,
            isOfficialCalculated: false,
            isEstimate: true,
            notes: `Estimasi dihitung dinamis dari Laba Bersih Pembukuan Koperasi berjalan (Laba: Rp ${estimatedTotalShu.toLocaleString('id-ID')}) berdasarkan proporsi modal & transaksi Anda saat ini.`
        };
    }
}
