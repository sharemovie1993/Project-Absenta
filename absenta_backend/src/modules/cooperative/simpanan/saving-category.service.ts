import { prisma } from '@/utils/prisma';

export interface CreateCategoryDto {
    code: string;
    name: string;
    description?: string;
    color?: string;
    order?: number;
    isMandatory?: boolean;
    isWithdrawable?: boolean;
    withdrawRule?: string;
    defaultAmount?: number | null;
    isIncludedInShu?: boolean;
    accountCode?: string;
}

export class SavingCategoryService {
    /** Memastikan kategori simpanan default (POKOK, WAJIB, SUKARELA) terpopulasi untuk tenant.
     *  Menggunakan createMany + skipDuplicates agar atomic dan aman dari race condition.
     */
    static async ensureDefaultCategories(tenantId: string, tx?: any) {
        const client = tx || prisma;
        // Cek cepat
        const count = await client.savingCategory.count({ where: { tenantId } });
        if (count >= 4) return; // Sudah ada semua default

        const defaults = [
            {
                code: 'POKOK',
                name: 'Simpanan Pokok',
                description: 'Setoran awal saat pertama kali mendaftar sebagai anggota.',
                color: '#4F46E5', // Indigo
                order: 1,
                isMandatory: true,
                isWithdrawable: false,
                withdrawRule: 'MEMBERSHIP_TERMINATION',
                defaultAmount: 100000,
                isIncludedInShu: true,
                accountCode: '2011', // Simpanan Pokok
            },
            {
                code: 'WAJIB',
                name: 'Simpanan Wajib',
                description: 'Iuran wajib yang disetor setiap bulan secara berkala.',
                color: '#0EA5E9', // Sky
                order: 2,
                isMandatory: true,
                isWithdrawable: false,
                withdrawRule: 'MEMBERSHIP_TERMINATION',
                defaultAmount: 20000,
                isIncludedInShu: true,
                accountCode: '2012', // Simpanan Wajib
            },
            {
                code: 'SUKARELA',
                name: 'Simpanan Sukarela',
                description: 'Tabungan bebas/sukarela yang dapat disetor & diambil kapan saja.',
                color: '#10B981', // Emerald
                order: 3,
                isMandatory: false,
                isWithdrawable: true,
                withdrawRule: 'ANYTIME',
                defaultAmount: null,
                isIncludedInShu: false,
                accountCode: '2013', // Simpanan Sukarela
            },
            {
                code: 'SHR',
                name: 'Simpanan Hari Raya',
                description: 'Tabungan khusus anggota yang dipersiapkan untuk kebutuhan hari raya.',
                color: '#F59E0B', // Amber
                order: 4,
                isMandatory: false,
                isWithdrawable: true,
                withdrawRule: 'RESTRICTED',
                defaultAmount: null,
                isIncludedInShu: false,
                accountCode: '2014', // Simpanan Hari Raya
            }
        ];

        // createMany dengan skipDuplicates — atomic, aman dari race condition concurrent
        await client.savingCategory.createMany({
            data: defaults.map((d: any) => ({ tenantId, ...d, isActive: true })),
            skipDuplicates: true,
        });
    }

    /** Ambil semua kategori simpanan aktif milik tenant */
    static async getCategories(tenantId: string) {
        await this.ensureDefaultCategories(tenantId);
        return prisma.savingCategory.findMany({
            where: { tenantId, isActive: true },
            orderBy: { order: 'asc' },
        });
    }

    /** Ambil semua kategori termasuk non-aktif (untuk admin) */
    static async getAllCategories(tenantId: string) {
        await this.ensureDefaultCategories(tenantId);
        return prisma.savingCategory.findMany({
            where: { tenantId },
            orderBy: { order: 'asc' },
            include: {
                _count: { select: { Savings: true } },
            },
        });
    }

    /** Ambil satu kategori by id */
    static async getCategoryById(id: string, tenantId: string) {
        return prisma.savingCategory.findFirst({
            where: { id, tenantId },
        });
    }

    /** Buat kategori simpanan baru (custom per tenant) */
    static async createCategory(tenantId: string, data: CreateCategoryDto) {
        // Validasi kode unik per tenant
        const existing = await prisma.savingCategory.findFirst({
            where: { tenantId, code: data.code.toUpperCase() },
        });
        if (existing) throw new Error(`Kode simpanan '${data.code}' sudah ada di koperasi ini.`);

        return prisma.savingCategory.create({
            data: {
                tenantId,
                code: data.code.toUpperCase(),
                name: data.name,
                description: data.description,
                color: data.color ?? '#6B7280',
                order: data.order ?? 99,
                isMandatory: data.isMandatory ?? false,
                isWithdrawable: data.isWithdrawable ?? true,
                withdrawRule: data.withdrawRule ?? 'ANYTIME',
                defaultAmount: data.defaultAmount ?? null,
                isIncludedInShu: data.isIncludedInShu ?? false,
                accountCode: data.accountCode ?? '2010',
                isActive: true,
            },
        });
    }

    /** Update kategori simpanan */
    static async updateCategory(id: string, tenantId: string, data: Partial<CreateCategoryDto>) {
        const category = await prisma.savingCategory.findFirst({ where: { id, tenantId } });
        if (!category) throw new Error('Kategori tidak ditemukan.');

        // Jika kode diubah, pastikan tidak bentrok
        if (data.code && data.code.toUpperCase() !== category.code) {
            const conflict = await prisma.savingCategory.findFirst({
                where: { tenantId, code: data.code.toUpperCase(), NOT: { id } },
            });
            if (conflict) throw new Error(`Kode simpanan '${data.code}' sudah digunakan.`);
        }

        return prisma.savingCategory.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.color && { color: data.color }),
                ...(data.order !== undefined && { order: data.order }),
                ...(data.isMandatory !== undefined && { isMandatory: data.isMandatory }),
                ...(data.isWithdrawable !== undefined && { isWithdrawable: data.isWithdrawable }),
                ...(data.withdrawRule && { withdrawRule: data.withdrawRule }),
                ...(data.defaultAmount !== undefined && { defaultAmount: data.defaultAmount }),
                ...(data.isIncludedInShu !== undefined && { isIncludedInShu: data.isIncludedInShu }),
                ...(data.accountCode && { accountCode: data.accountCode }),
                ...(data.code && { code: data.code.toUpperCase() }),
            },
        });
    }

    /** Toggle aktif/nonaktif — tidak boleh nonaktif jika masih punya saving */
    static async toggleActive(id: string, tenantId: string) {
        const category = await prisma.savingCategory.findFirst({
            where: { id, tenantId },
            include: { _count: { select: { Savings: true } } },
        });
        if (!category) throw new Error('Kategori tidak ditemukan.');

        // Tidak boleh nonaktifkan jika masih ada data saving
        if (category.isActive && category._count.Savings > 0) {
            throw new Error(
                `Kategori '${category.name}' masih digunakan oleh ${category._count.Savings} rekening simpanan. Tidak dapat dinonaktifkan.`
            );
        }

        return prisma.savingCategory.update({
            where: { id },
            data: { isActive: !category.isActive },
        });
    }

    /** Hapus kategori simpanan jika belum digunakan */
    static async deleteCategory(id: string, tenantId: string) {
        const category = await prisma.savingCategory.findFirst({
            where: { id, tenantId },
            include: { _count: { select: { Savings: true } } },
        });
        if (!category) throw new Error('Kategori tidak ditemukan.');

        // Tidak boleh hapus jika masih ada data saving
        if (category._count.Savings > 0) {
            throw new Error(
                `Kategori '${category.name}' masih digunakan oleh ${category._count.Savings} rekening simpanan. Tidak dapat dihapus.`
            );
        }

        return prisma.savingCategory.delete({
            where: { id },
        });
    }
}
