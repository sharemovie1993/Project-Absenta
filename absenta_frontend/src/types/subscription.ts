// Import and re-export from billing.ts for consistency
import type {
  Billing,
  Subscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionResponse,
  SubscriptionsResponse,
  SubscriptionAnalytics,
  SubscriptionFilters,
  SubscriptionHistoryItem
} from './billing';

export type {
  Subscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionResponse,
  SubscriptionsResponse,
  SubscriptionAnalytics,
  SubscriptionFilters
} from './billing';

export type { SubscriptionHistoryItem } from './billing';

// Additional types specific to subscription API
export interface SubscriptionQueryParams {
  include_inactive?: boolean;
  tenant_id?: string;
  plan_id?: string;
  status?:
    | 'ACTIVE'
    | 'EXPIRED'
    | 'CANCELED'
    | 'CANCELLED'
    | 'SUSPENDED'
    | 'TRIAL'
    | 'PENDING_PAYMENT'
    | 'BLOCKED'
    | 'UPGRADE_PENDING';
  page?: number;
  limit?: number;
}

export interface RenewSubscriptionRequest {
  new_end_date: string;
}

export interface SubscriptionWithBillings extends Subscription {
  billings: Billing[];
}

export interface SubscriptionMetrics {
  total_subscriptions: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  canceled_subscriptions: number;
  trial_subscriptions: number;
  monthly_recurring_revenue: number;
  churn_rate: number;
  conversion_rate: number;
  average_subscription_value: number;
  expiring_this_month: number;
  auto_renewal_rate: number;
}
