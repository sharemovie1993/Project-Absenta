// Import and re-export from billing.ts for consistency
import type {
  Plan,
  Subscription,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanAnalytics,
  PlansResponse,
  PlanResponse
} from './billing';

export type {
  Plan,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanAnalytics,
  PlansResponse,
  PlanResponse
} from './billing';

// Additional types specific to plans API
export interface PlanQueryParams {
  include_inactive?: boolean;
  category?: string;
  min_price?: number;
  max_price?: number;
  billing_cycle?: 'MONTHLY' | 'YEARLY';
  page?: number;
  limit?: number;
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  limit?: number;
  unit?: string;
}

export interface PlanWithSubscriptions extends Plan {
  subscriptions_count: number;
  active_subscriptions_count: number;
  monthly_revenue: number;
  yearly_revenue: number;
}

export interface PlanMetrics {
  total_plans: number;
  active_plans: number;
  inactive_plans: number;
  most_popular_plan: {
    id: string;
    name: string;
    subscriptions_count: number;
  };
  average_plan_price: number;
  total_monthly_revenue: number;
  total_yearly_revenue: number;
  conversion_by_plan: Array<{
    plan_id: string;
    plan_name: string;
    trial_to_paid_rate: number;
    subscriptions_count: number;
  }>;
}

export interface PlanComparison {
  plans: Plan[];
  features: Array<{
    category: string;
    features: Array<{
      name: string;
      description: string;
      plans: Record<string, boolean | string | number>;
    }>;
  }>;
}