import { prisma } from '../../../utils/prisma';

export class PointService {
    // Get points history for a member
    static async getHistory(tenantId: string, memberId: string) {
        return prisma.coopPointTransaction.findMany({
            where: { tenantId, memberId },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get points balance for a member
    static async getBalance(tenantId: string, memberId: string) {
        const member = await prisma.member.findFirst({
            where: { id: memberId, tenantId },
            select: { points: true },
        });
        return member?.points || 0;
    }

    // Redeem points to create a private voucher
    static async redeemPoints(tenantId: string, memberId: string, pointsToRedeem: number) {
        // Validate redeem package
        const validPackages = [500, 1000, 2000];
        if (!validPackages.includes(pointsToRedeem)) {
            throw new Error('Paket penukaran poin tidak valid. Pilih 500, 1000, atau 2000 poin.');
        }

        let discount = 0;
        if (pointsToRedeem === 500) discount = 5000;
        else if (pointsToRedeem === 1000) discount = 10000;
        else if (pointsToRedeem === 2000) discount = 20000;

        return prisma.$transaction(async (tx) => {
            // Get member points balance
            const member = await tx.member.findFirst({
                where: { id: memberId, tenantId },
                select: { points: true, memberNo: true }
            });

            if (!member) throw new Error('Anggota tidak ditemukan.');
            if (member.points < pointsToRedeem) {
                throw new Error(`Poin tidak mencukupi. Saldo poin Anda: ${member.points} poin.`);
            }

            // 1. Deduct points
            await tx.member.update({
                where: { id: memberId },
                data: { points: { decrement: pointsToRedeem } }
            });

            // 2. Generate unique voucher code
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            const voucherCode = `LP-REDEEM-${randomSuffix}`;

            // 3. Create private Voucher
            const voucher = await tx.voucher.create({
                data: {
                    tenantId,
                    code: voucherCode,
                    description: `Voucher Penukaran Loyalitas ${pointsToRedeem} Poin`,
                    discount,
                    isActive: true,
                    memberId
                }
            });

            // 4. Log Point Transaction
            await tx.coopPointTransaction.create({
                data: {
                    tenantId,
                    memberId,
                    amount: -pointsToRedeem,
                    type: 'REDEEM_VOUCHER',
                    description: `Tukar Voucher Rp ${discount.toLocaleString('id-ID')}`,
                    referenceId: voucher.id
                }
            });

            return {
                voucher,
                pointsRemaining: member.points - pointsToRedeem
            };
        });
    }
}
