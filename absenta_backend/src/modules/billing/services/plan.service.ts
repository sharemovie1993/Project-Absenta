import { prisma } from '@/utils/prisma';
import axios from 'axios';

export interface CreatePlanInput {
  name: string;
  price_monthly: number;
  max_user?: number | null;
  features_json?: any;
  currency?: string;
}

export interface UpdatePlanInput {
  name?: string;
  price_monthly?: number;
  max_user?: number | null;
  features_json?: any;
  currency?: string;
  is_active?: boolean;
}

export interface PlanResponse {
  id: string;
  name: string;
  price_monthly: number;
  module_id?: string | null;
  module?: any;
  max_user: number | null;
  features_json: any;
  description?: string | null;
  price_yearly?: number | null;
  trial_days?: number;
  absensi_mode?: string;
  billing_period: string;
  currency: string;
  is_active: boolean;
  size_label?: string | null;
  tier?: string | null;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
  _count?: {
    subscriptions: number;
  };
}

export class PlanService {

  private toPlanCode(name: string): string {
    return String(name || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private resolveServiceCode(name: string, featuresJson?: unknown): string {
    const n = String(name || '');
    if (n === 'CORE_PLATFORM') return 'CORE';
    const tags = Array.isArray(featuresJson) ? featuresJson.map((x) => String(x).toUpperCase()) : [];
    if (tags.includes('KOPERASI')) return 'KOPERASI';
    if (tags.includes('ABSENSI')) return 'ABSENSI';
    if (n.toLowerCase().startsWith('koperasi-')) return 'KOPERASI';
    if (n.toLowerCase().startsWith('absensi-')) return 'ABSENSI';
    return 'CORE';
  }

  async getAllPlans(includeInactive: boolean = false): Promise<PlanResponse[]> {
    try {
      const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
      const response = await axios.get(`${LICENSE_SERVER_URL}/api/license/packages?product_id=absenta`, { timeout: 8000 });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data.map((plan: any) => {
          let features = plan.features_json;
          if (typeof features === 'string') {
            try {
              features = JSON.parse(features);
            } catch (e) {
              features = [];
            }
          }
          return {
            id: plan.id,
            name: plan.name || plan.title,
            price_monthly: plan.price_monthly || 0,
            module_id: plan.module_id || null,
            module: plan.module_id ? { id: plan.module_id, name: plan.module_id } : null,
            max_user: plan.device_limit || null,
            features_json: features || [],
            description: plan.description ?? null,
            price_yearly: plan.price_yearly ?? null,
            trial_days: 0,
            absensi_mode: plan.module_id === 'ABSENSI' ? 'SIMPLE' : undefined,
            billing_period: plan.billing_period || 'MONTH',
            currency: 'IDR',
            is_active: true,
            size_label: plan.size_label || 'Standard',
            tier: plan.size_label || 'Standard',
            metadata: null,
            created_at: new Date(plan.created_at || Date.now()),
            updated_at: new Date(plan.updated_at || Date.now()),
            _count: { subscriptions: 0 }
          };
        });
      }
    } catch (err) {
      console.error('[PLAN SERVICE] Failed to fetch plans from Licensing Server, falling back to local database', err);
    }

    const whereClause: any = {};
    
    if (!includeInactive) {
      whereClause.is_active = true;
    }

    const plans = await prisma.plan.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
        Module: true,
      },
      orderBy: {
        price_monthly: 'asc',
      },
    });

    return plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      price_monthly: plan.price_monthly,
      module_id: plan.module_id,
      module: (plan as any).Module,
      max_user: plan.max_user,
      features_json: plan.features_json,
      description: plan.description ?? null,
      price_yearly: plan.price_yearly ?? null,
      trial_days: plan.trial_days,
      absensi_mode: (plan as any).absensi_mode,
      billing_period: (plan as any).billing_period,
      currency: plan.currency,
      is_active: plan.is_active,
      size_label: (plan as any).size_label,
      tier: (plan as any).tier,
      metadata: (plan as any).metadata,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
      _count: plan._count,
    }));
  }

  async getPlanById(id: string): Promise<PlanResponse | null> {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
        Module: true,
      },
    });

    if (!plan) {
      return null;
    }

    return {
      id: plan.id,
      name: plan.name,
      price_monthly: plan.price_monthly,
      module_id: plan.module_id,
      module: (plan as any).Module,
      max_user: plan.max_user,
      features_json: plan.features_json,
      description: plan.description ?? null,
      price_yearly: plan.price_yearly ?? null,
      trial_days: plan.trial_days,
      absensi_mode: (plan as any).absensi_mode,
      billing_period: (plan as any).billing_period,
      currency: plan.currency,
      is_active: plan.is_active,
      size_label: (plan as any).size_label,
      tier: (plan as any).tier,
      metadata: (plan as any).metadata,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
      _count: plan._count,
    };
  }

  async createPlan(input: CreatePlanInput): Promise<PlanResponse> {
    // Validate input
    if (!input.name || input.price_monthly < 0) {
      throw new Error('Invalid plan data: name is required and price must be non-negative');
    }

    // Check if plan name already exists
    const existingPlan = await prisma.plan.findFirst({
      where: { name: input.name },
    });

    if (existingPlan) {
      throw new Error('Plan with this name already exists');
    }

    const featureTags = input.features_json || [];
    const code = this.toPlanCode(input.name);
    const serviceCode = this.resolveServiceCode(input.name, featureTags);
    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.plan.create({
        data: {
          code,
          service_code: serviceCode,
          name: input.name,
          price_monthly: input.price_monthly,
          max_user: input.max_user ?? null,
          features_json: input.features_json ?? [],
          currency: input.currency || 'IDR',
        },
        include: {
          _count: {
            select: {
              subscriptions: true,
            },
          },
        },
      });

      return created;
    });

    return {
      id: plan.id,
      name: plan.name,
      price_monthly: plan.price_monthly,
      max_user: plan.max_user,
      features_json: plan.features_json,
      description: (plan as any).description ?? null,
      price_yearly: (plan as any).price_yearly ?? null,
      trial_days: (plan as any).trial_days,
      absensi_mode: (plan as any).absensi_mode,
      billing_period: (plan as any).billing_period,
      currency: plan.currency,
      is_active: plan.is_active,
      size_label: (plan as any).size_label,
      tier: (plan as any).tier,
      metadata: (plan as any).metadata,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
      _count: plan._count,
    };
  }

  async updatePlan(id: string, input: UpdatePlanInput): Promise<PlanResponse> {
    // Check if plan exists
    const existingPlan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      throw new Error('Plan not found');
    }

    // Check if name is being changed and if it conflicts
    if (input.name && input.name !== existingPlan.name) {
      const nameConflict = await prisma.plan.findFirst({
        where: { 
          name: input.name,
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw new Error('Plan with this name already exists');
      }
    }

    // Validate price if provided
    if (input.price_monthly !== undefined && input.price_monthly < 0) {
      throw new Error('Price must be non-negative');
    }

    const plan = await prisma.$transaction(async (tx) => {
      const updated = await tx.plan.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.price_monthly !== undefined && { price_monthly: input.price_monthly }),
          ...(input.max_user !== undefined && { max_user: input.max_user }),
          ...(input.features_json !== undefined && { features_json: input.features_json }),
          ...(input.currency !== undefined && { currency: input.currency }),
          ...(input.is_active !== undefined && { is_active: input.is_active }),
        },
        include: {
          _count: {
            select: {
              subscriptions: true,
            },
          },
        },
      });

      return updated;
    });

    return {
      id: plan.id,
      name: plan.name,
      price_monthly: plan.price_monthly,
      max_user: plan.max_user,
      features_json: (plan as any).features_json,
      description: (plan as any).description ?? null,
      price_yearly: (plan as any).price_yearly ?? null,
      trial_days: (plan as any).trial_days,
      absensi_mode: (plan as any).absensi_mode,
      billing_period: (plan as any).billing_period,
      currency: plan.currency,
      is_active: plan.is_active,
      size_label: (plan as any).size_label,
      tier: (plan as any).tier,
      metadata: (plan as any).metadata,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
      _count: plan._count,
    };
  }

  async deactivatePlan(id: string): Promise<PlanResponse> {
    // Check if plan exists
    const existingPlan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
        },
      },
    });

    if (!existingPlan) {
      throw new Error('Plan not found');
    }

    // Check if there are active subscriptions
    if (existingPlan._count.subscriptions > 0) {
      throw new Error('Cannot deactivate plan with active subscriptions');
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: { is_active: false },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    return {
      id: plan.id,
      name: plan.name,
      price_monthly: plan.price_monthly,
      max_user: plan.max_user,
      features_json: (plan as any).features_json,
      billing_period: (plan as any).billing_period,
      currency: plan.currency,
      is_active: plan.is_active,
      size_label: (plan as any).size_label,
      tier: (plan as any).tier,
      metadata: (plan as any).metadata,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
      _count: plan._count,
    };
  }

  async getPlanAnalytics(): Promise<any> {
    try {
      // Get all plans with subscription counts
      const plans = await prisma.plan.findMany({
        include: {
          _count: {
            select: {
              subscriptions: true,
            },
          },
          subscriptions: {
            where: {
              status: 'ACTIVE',
            },
            select: {
              id: true,
              start_date: true,
              end_date: true,
            },
          },
        },
      });

      // Calculate analytics
      const totalPlans = plans.length;
      const activePlans = plans.filter(plan => plan.is_active).length;
      const inactivePlans = totalPlans - activePlans;

      // Find most popular plan
      const mostPopularPlan = plans.reduce((prev, current) => {
        return (prev._count.subscriptions > current._count.subscriptions) ? prev : current;
      }, plans[0]);

      // Find highest revenue plan
      const highestRevenuePlan = plans.reduce((prev, current) => {
        const prevRevenue = prev.price_monthly * prev._count.subscriptions;
        const currentRevenue = current.price_monthly * current._count.subscriptions;
        return (prevRevenue > currentRevenue) ? prev : current;
      }, plans[0]);

      // Calculate average plan price
      const averagePlanPrice = plans.reduce((sum, plan) => sum + plan.price_monthly, 0) / totalPlans;

      // Calculate total revenue (monthly)
      const totalMonthlyRevenue = plans.reduce((sum, plan) => {
        return sum + (plan.price_monthly * plan._count.subscriptions);
      }, 0);

      // Plan distribution
      const planDistribution = plans.map(plan => ({
        plan_id: plan.id,
        plan_name: plan.name,
        subscriptions_count: plan._count.subscriptions,
        active_subscriptions: plan.subscriptions.length,
        revenue_contribution: plan.price_monthly * plan._count.subscriptions,
        percentage: totalPlans > 0 ? (plan._count.subscriptions / plans.reduce((sum, p) => sum + p._count.subscriptions, 0)) * 100 : 0,
      }));

      // Transform plan data to match frontend expectations
      const transformPlan = (plan: any) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        price: plan.price_monthly,
        currency: plan.currency,
        billing_cycle: 'MONTHLY' as const,
        max_users: plan.max_user || 0,
        max_students: plan.max_students || 0,
        features_json: plan.features_json || [],
        is_active: plan.is_active,
        created_at: plan.created_at.toISOString(),
        updated_at: plan.updated_at.toISOString(),
        _count: plan._count
      });

      return {
        // Structure yang diharapkan frontend
        most_popular_plan: mostPopularPlan ? {
          plan: transformPlan(mostPopularPlan),
          subscription_count: mostPopularPlan._count.subscriptions,
        } : null,
        highest_revenue_plan: highestRevenuePlan ? {
          plan: transformPlan(highestRevenuePlan),
          total_revenue: highestRevenuePlan.price_monthly * highestRevenuePlan._count.subscriptions,
        } : null,
        conversion_rate: 85.5, // Mock data
        churn_rate_by_plan: planDistribution.map(plan => ({
          plan_id: plan.plan_id,
          plan_name: plan.plan_name,
          churn_rate: Math.random() * 10, // Mock data
        })),
        // Data tambahan untuk overview
        overview: {
          total_plans: totalPlans,
          active_plans: activePlans,
          inactive_plans: inactivePlans,
          total_subscriptions: plans.reduce((sum, plan) => sum + plan._count.subscriptions, 0),
        },
        financial: {
          average_plan_price: Math.round(averagePlanPrice),
          total_monthly_revenue: totalMonthlyRevenue,
          total_yearly_revenue: totalMonthlyRevenue * 12,
        },
        plan_distribution: planDistribution,
        growth_metrics: {
          // Mock data for now - in real implementation, this would compare with previous period
          subscription_growth: 15.2,
          revenue_growth: 22.8,
          new_plans_this_month: 0,
        },
      };
    } catch (error) {
      console.error('Error getting plan analytics:', error);
      throw new Error('Failed to retrieve plan analytics');
    }
  }
}

export const planService = new PlanService();
