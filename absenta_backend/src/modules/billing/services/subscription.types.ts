import type { SubscriptionStatus } from '@prisma/client';

export interface CreateSubscriptionInput {
  tenant_id: string;
  plan_id: string;
  start_date: Date;
  end_date: Date;
  auto_renew?: boolean;
  next_billing_date?: Date;
  status?: SubscriptionStatus;
}

export interface UpdateSubscriptionInput {
  plan_id?: string;
  start_date?: Date;
  end_date?: Date;
  status?: SubscriptionStatus;
  auto_renew?: boolean;
  next_billing_date?: Date;
}

export interface SubscriptionResponse {
  id: string;
  tenant_id: string;
  plan_id: string;
  service_code: string;
  start_date: Date;
  end_date: Date;
  status: SubscriptionStatus;
  auto_renew: boolean;
  next_billing_date: Date | null;
  price_snapshot: number | null;
  pricing_model: string | null;
  pricing_meta: any;
  created_at: Date;
  updated_at: Date;
  plan?: {
    id: string;
    name: string;
    price_monthly: number;
    max_user: number | null;
    features_json: any;
    currency: string;
    is_active: boolean;
  };
  tenant?: {
    id: string;
    name: string;
    domain: string | null;
  };
}
