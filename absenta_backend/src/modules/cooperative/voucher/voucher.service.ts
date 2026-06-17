// @ts-nocheck
import { prisma } from '../../../utils/prisma';

export class VoucherService {
    
    // Get all vouchers for a tenant (optionally filtered by memberId for personal vouchers)
    static async getVouchers(tenantId: string, memberId?: string | null) {
        const where: any = { tenantId, isActive: true };
        if (memberId !== undefined) {
            where.OR = [
                { memberId: null },
                { memberId: memberId }
            ];
        }
        return await prisma.voucher.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
    }

    // Create a new voucher
    static async createVoucher(tenantId: string, data: any) {
        return await prisma.voucher.create({
            data: {
                tenantId,
                code: data.code,
                discount: Number(data.discount),
                description: data.description,
                isActive: true
            }
        });
    }

    // Delete a voucher
    static async deleteVoucher(id: string) {
        return await prisma.voucher.delete({
            where: { id }
        });
    }

    // Validate voucher code
    static async validateVoucher(tenantId: string, code: string, memberId?: string | null) {
        const voucher = await prisma.voucher.findFirst({
            where: { tenantId, code: code.toUpperCase(), isActive: true }
        });
        
        if (!voucher) {
            throw new Error('Voucher tidak ditemukan atau sudah tidak aktif.');
        }
        
        if (voucher.memberId && memberId && voucher.memberId !== memberId) {
            throw new Error('Voucher ini hanya dapat digunakan oleh anggota pemiliknya.');
        }
        
        return voucher;
    }
}



