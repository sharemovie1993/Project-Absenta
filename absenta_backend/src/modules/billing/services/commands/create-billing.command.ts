import type { BillingResponse, CreateBillingInput } from '../billing.types';

export async function createBillingCommand(input: CreateBillingInput): Promise<BillingResponse> {
  const now = new Date();
  return {
    id: `bill_${Date.now()}`,
    subscription_id: input.subscription_id,
    amount: input.amount,
    billing_date: input.billing_date,
    payment_method: input.payment_method || null,
    payment_reference: input.payment_reference || null,
    created_at: now,
    updated_at: now,
  };
}

