import { PrismaClient } from '@prisma/client';

export interface RecordRefundInput {
  tenant_id: string;
  invoice_id?: string;
  payment_id?: string;
  amount: number;
  currency?: string;
  reason?: string;
}

export class RefundService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async recordRefund(input: RecordRefundInput) {
    if (!input.invoice_id && !input.payment_id) {
      throw new Error('Either invoice_id or payment_id is required');
    }
    const currency = input.currency || 'IDR';
    const refund = await this.prisma.refundRecord.create({
      data: {
        tenant_id: input.tenant_id,
        invoice_id: input.invoice_id,
        payment_id: input.payment_id,
        amount: input.amount,
        currency,
        reason: input.reason || null
      }
    });
    await this.prisma.activityLog.create({
      data: {
        tenant_id: input.tenant_id,
        user_id: 'system',
        action: 'REFUND_RECORDED',
        entity: input.invoice_id ? 'INVOICE' : 'PAYMENT',
        entity_id: input.invoice_id || input.payment_id || null,
        metadata: JSON.stringify({
          amount: input.amount,
          currency,
          reason: input.reason || null
        })
      }
    });
    return refund;
  }
}

export const refundService = new RefundService();
