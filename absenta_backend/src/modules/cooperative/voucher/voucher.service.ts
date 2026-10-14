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

// Dual-layer caching: In-Memory Cache with TTL & Bounded Capacity (Phase 4 Hardening)
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}
const voucherCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 30_000; // 30 seconds TTL
const MAX_CACHE_ENTRIES = 500; // Bounded capacity to prevent memory leaks

function pruneExpiredVoucherCache() {
    const now = Date.now();
    for (const [key, entry] of voucherCache.entries()) {
        if (now >= entry.expiresAt) {
            voucherCache.delete(key);
        }
    }
}

export function clearVoucherMemoryCache(tenantId?: string) {
    if (tenantId) {
        for (const key of voucherCache.keys()) {
            if (key.startsWith(`vouchers:${tenantId}:`)) {
                voucherCache.delete(key);
            }
        }
    } else {
        voucherCache.clear();
    }
}

export class VoucherService {
    // Get all vouchers for a tenant (optionally filtered by memberId for personal vouchers)
    static async getVouchers(tenantId: string, memberId?: string | null) {
        const cacheKey = `vouchers:${tenantId}:${memberId ?? 'all'}`;
        const cached = voucherCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }

        const where: any = { tenantId, isActive: true };
        if (memberId !== undefined) {
            where.OR = [
                { memberId: null },
                { memberId: memberId }
            ];
        }
        const vouchers = await prisma.voucher.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        if (voucherCache.size >= MAX_CACHE_ENTRIES) {
            pruneExpiredVoucherCache();
            if (voucherCache.size >= MAX_CACHE_ENTRIES) {
                const firstKey = voucherCache.keys().next().value;
                if (firstKey) voucherCache.delete(firstKey);
            }
        }

        voucherCache.set(cacheKey, { data: vouchers, expiresAt: Date.now() + CACHE_TTL_MS });
        return vouchers;
    }

    // Create a new voucher with clean data sanitization
    static async createVoucher(tenantId: string, data: CreateVoucherInput) {
        clearVoucherMemoryCache(tenantId);
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

        clearVoucherMemoryCache(tenantId);
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



