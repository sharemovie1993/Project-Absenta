// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '../../../utils/prisma';

export interface CreateVoucherInput {
    code: string;
    discount: number | string;
    description?: string | null;
    validUntil?: string | Date | null;
    memberId?: string | null;
}

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

    // Create a new voucher with clean data sanitization
    static async createVoucher(tenantId: string, data: CreateVoucherInput) {
        const trimmedCode = String(data.code).toUpperCase().trim();
        return await prisma.voucher.create({
            data: {
                tenantId,
                code: trimmedCode,
                discount: Number(data.discount),
                description: data.description?.trim() || null,
                validUntil: data.validUntil ? new Date(data.validUntil) : null,
                memberId: data.memberId || null,
                isActive: true
            }
        });
    }

    // Delete a voucher with multi-tenant verification
    static async deleteVoucher(tenantId: string, id: string) {
        const voucher = await prisma.voucher.findFirst({
            where: { id, tenantId }
        });
        if (!voucher) {
            throw new Error('Voucher tidak ditemukan');
        }

        return await prisma.voucher.delete({
            where: { id }
        });
    }

    // Validate voucher code
    static async validateVoucher(tenantId: string, code: string, memberId?: string | null) {
        const trimmedCode = code.toUpperCase().trim();
        const voucher = await prisma.voucher.findFirst({
            where: { tenantId, code: trimmedCode, isActive: true }
        });
        
        if (!voucher) {
            throw new Error('Voucher tidak ditemukan atau sudah tidak aktif.');
        }

        // Check if voucher has expired
        if (voucher.validUntil && new Date(voucher.validUntil) < new Date()) {
            throw new Error('Masa berlaku voucher ini sudah habis.');
        }
        
        if (voucher.memberId && memberId && voucher.memberId !== memberId) {
            throw new Error('Voucher ini hanya dapat digunakan oleh anggota pemiliknya.');
        }
        
        return voucher;
    }
}



