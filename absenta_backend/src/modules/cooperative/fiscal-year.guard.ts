// @ts-nocheck
import { prisma } from '../../utils/prisma';
import { appLogger } from '@/utils/app-logger';

export class FiscalYearGuard {
    /**
     * Memeriksa apakah suatu tanggal transaksi berada pada Tahun Buku yang sudah CLOSED / DISTRIBUTED.
     * Jika ya, melempar error agar transaksi tidak bisa dimanipulasi (Anti-Backdating Protection).
     * 
     * @param tenantId ID Tenant
     * @param transactionDate Tanggal transaksi (Date object atau ISO string)
     * @param actionName Nama aksi untuk log error (misal: "Penjualan Kasir POS", "Pencairan Pinjaman")
     */
    static async validateNotClosed(tenantId: string, transactionDate: Date | string, actionName: string = 'Transaksi') {
        const dateObj = new Date(transactionDate);
        if (isNaN(dateObj.getTime())) return;

        // Cari periode tahun buku yang mencakup tanggal ini
        const closedPeriod = await prisma.shuPeriod.findFirst({
            where: {
                tenantId,
                startDate: { lte: dateObj },
                endDate: { gte: dateObj },
                status: { in: ['APPROVED', 'DISTRIBUTED'] },
            },
            select: {
                year: true,
                status: true,
            },
        });

        if (closedPeriod) {
            const msg = `PERIOD_LOCKED: ${actionName} ditolak. Tahun Buku ${closedPeriod.year} telah berstatus ${closedPeriod.status} (Tutup Buku/Audit). Perubahan data masa lalu dilarang untuk menjaga integritas pembukuan.`;
            appLogger.warn({ tenantId, transactionDate, closedPeriod, actionName }, msg);
            throw new Error(msg);
        }
    }

    /**
     * Mendapatkan Tahun Buku yang sedang berstatus aktif (running) untuk tenant.
     * Jika tidak ada yang ditandai isActive, fallback ke periode tahun berjalan atau periode terbaru.
     */
    static async getActiveFiscalYear(tenantId: string) {
        // 1. Cek yang eksplisit isActive = true
        let active = await prisma.shuPeriod.findFirst({
            where: { tenantId, isActive: true },
        });

        if (active) return active;

        // 2. Fallback: cari periode yang mencakup hari ini
        const now = new Date();
        active = await prisma.shuPeriod.findFirst({
            where: {
                tenantId,
                startDate: { lte: now },
                endDate: { gte: now },
            },
        });

        if (active) return active;

        // 3. Fallback: periode tahun terbaru
        return prisma.shuPeriod.findFirst({
            where: { tenantId },
            orderBy: { year: 'desc' },
        });
    }

    /**
     * Mengatur salah satu Tahun Buku menjadi aktif (dan menonaktifkan yang lain)
     */
    static async setActiveFiscalYear(tenantId: string, periodId: string) {
        return prisma.$transaction(async (tx) => {
            await tx.shuPeriod.updateMany({
                where: { tenantId },
                data: { isActive: false },
            });

            return tx.shuPeriod.update({
                where: { id: periodId },
                data: { isActive: true },
            });
        });
    }
}
