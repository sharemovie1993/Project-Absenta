// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '../../../utils/prisma';
import { TokoService } from './toko.service';

export class EWalletService {
    
    /**
     * Resolve RFID token to Cooperative Member
     */
    static async resolveMemberByRfid(tenantId: string, rfid: string) {
        if (!rfid) throw new Error('RFID token is required');

        // 1. Search in Siswa
        const student = await prisma.siswa.findFirst({
            where: { tenant_id: tenantId, no_rfid: rfid },
            select: { id: true, nama_siswa: true }
        });

        if (student) {
            const member = await prisma.member.findFirst({
                where: { tenantId, siswaId: student.id, status: 'ACTIVE' },
                include: {
                    Siswa: { select: { nama_siswa: true, nis: true } },
                    savings: {
                        where: { category: { code: 'SUKARELA' } },
                        include: { category: true }
                    }
                }
            });
            if (member) return member;
        }

        // 2. Search in Guru
        const teacher = await prisma.guru.findFirst({
            where: { tenant_id: tenantId, no_rfid: rfid },
            select: { id: true, nama_guru: true }
        });

        if (teacher) {
            const member = await prisma.member.findFirst({
                where: { tenantId, guruId: teacher.id, status: 'ACTIVE' },
                include: {
                    Guru: { select: { nama_guru: true, nip: true } },
                    savings: {
                        where: { category: { code: 'SUKARELA' } },
                        include: { category: true }
                    }
                }
            });
            if (member) return member;
        }

        throw new Error('Kartu RFID tidak terdaftar sebagai anggota koperasi yang aktif');
    }

    /**
     * Get E-Wallet balance (Simpanan Sukarela) by RFID
     */
    static async getBalanceByRfid(tenantId: string, rfid: string) {
        const member = await this.resolveMemberByRfid(tenantId, rfid);
        const eWalletSaving = member.savings.find(s => s.category.code === 'SUKARELA');
        
        if (!eWalletSaving) {
            throw new Error('Anggota belum memiliki rekening Simpanan Sukarela (E-Wallet)');
        }

        return {
            memberId: member.id,
            memberName: member.Siswa?.nama_siswa || member.Guru?.nama_guru || 'Member',
            memberNo: member.memberNo,
            balance: Number(eWalletSaving.amount),
            currency: 'IDR'
        };
    }

    /**
     * Process POS Sale using RFID as E-Wallet
     */
    static async processRfidPayment(
        tenantId: string,
        rfid: string,
        items: { productId: string; quantity: number }[],
        options: { pin: string; operatorId?: string; voucherCode?: string }
    ) {
        // 1. Resolve member from RFID
        const member = await this.resolveMemberByRfid(tenantId, rfid);

        // 2. Delegate to TokoService.processSale with SAVING payment method
        return TokoService.processSale(tenantId, member.id, items, {
            paymentMethod: 'SAVING',
            pin: options.pin,
            operatorId: options.operatorId,
            voucherCode: options.voucherCode
        });
    }
}
