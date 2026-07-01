import { planService, CreatePlanInput, UpdatePlanInput } from '../services/plan.service';
import { isSystemSuperAdmin } from '@/utils/rbac';

export const planController = {
  async getAllPlans(request: any, reply: any) {
    try {
      const { include_inactive } = request.query;
      const includeInactive = include_inactive === 'true';

      const plans = await planService.getAllPlans(includeInactive);

      reply.status(200);
      return {
        success: true,
        message: 'Plans retrieved successfully',
        data: plans,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve plans';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // Public endpoint: return only active plans, no auth required
  async getPublicActivePlans(_request: any, reply: any) {
    try {
      const plans = await planService.getAllPlans(false);

      reply.status(200);
      return {
        success: true,
        message: 'Active plans retrieved successfully',
        data: plans,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve active plans';

      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // Public endpoint: return Academic Core tier plans for registration form (no auth required)
  async getAcademicTierPlans(_request: any, reply: any) {
    try {
      const { prisma } = await import('@/utils/prisma');
      const plans = await prisma.plan.findMany({
        where: {
          id: { startsWith: 'ACADEMIC_' },
          is_active: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
          size_label: true,
          max_user: true,
          description: true,
          price_monthly: true,
          price_yearly: true,
        },
        orderBy: { max_user: 'asc' },
      });

      // Ensure ENTERPRISE (null max_user) comes last
      const sorted = [
        ...plans.filter((p) => p.max_user !== null),
        ...plans.filter((p) => p.max_user === null),
      ];

      reply.status(200);
      return {
        success: true,
        message: 'Academic tier plans retrieved successfully',
        data: sorted,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve academic tier plans';
      reply.status(500);
      return { success: false, message: errorMessage };
    }
  },

  async getPlanById(request: any, reply: any) {
    try {
      const { id } = request.params;

      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Plan ID is required',
        };
      }

      const plan = await planService.getPlanById(id);

      if (!plan) {
        reply.status(404);
        return {
          success: false,
          message: 'Plan not found',
        };
      }

      reply.status(200);
      return {
        success: true,
        message: 'Plan retrieved successfully',
        data: plan,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve plan';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async createPlan(request: any, reply: any) {
    try {
      const user = request.user!;
      
      // Only system SUPERADMIN can create global plans
      if (!isSystemSuperAdmin(user.roleName, user.tenantId ?? user.tenant_id)) {
        reply.status(403);
        return {
          success: false,
          message: 'Insufficient permissions. Only system SUPERADMIN can create plans',
        };
      }

      const { name, price_monthly, max_user, features_json, currency } = request.body;

      // Validate required fields
      if (!name || price_monthly === undefined) {
        reply.status(400);
        return {
          success: false,
          message: 'Missing required fields: name, price_monthly',
        };
      }

      // Validate price
      if (typeof price_monthly !== 'number' || price_monthly < 0) {
        reply.status(400);
        return {
          success: false,
          message: 'Price must be a non-negative number',
        };
      }

      const planInput: CreatePlanInput = {
        name,
        price_monthly,
        max_user,
        features_json,
        currency,
      };

      const plan = await planService.createPlan(planInput);

      reply.status(201);
      return {
        success: true,
        message: 'Plan created successfully',
        data: plan,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create plan';
      
      if (errorMessage.includes('already exists')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async updatePlan(request: any, reply: any) {
    try {
      const user = request.user!;
      
      // Only system SUPERADMIN can update global plans
      if (!isSystemSuperAdmin(user.roleName, user.tenantId ?? user.tenant_id)) {
        reply.status(403);
        return {
          success: false,
          message: 'Insufficient permissions. Only system SUPERADMIN can update plans',
        };
      }

      const { id } = request.params;
      const { name, price_monthly, max_user, features_json, currency, is_active } = request.body;

      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Plan ID is required',
        };
      }

      // Validate price if provided
      if (price_monthly !== undefined && (typeof price_monthly !== 'number' || price_monthly < 0)) {
        reply.status(400);
        return {
          success: false,
          message: 'Price must be a non-negative number',
        };
      }

      const updateInput: UpdatePlanInput = {};
      if (name !== undefined) updateInput.name = name;
      if (price_monthly !== undefined) updateInput.price_monthly = price_monthly;
      if (max_user !== undefined) updateInput.max_user = max_user;
      if (features_json !== undefined) updateInput.features_json = features_json;
      if (currency !== undefined) updateInput.currency = currency;
      if (is_active !== undefined) updateInput.is_active = is_active;

      const plan = await planService.updatePlan(id, updateInput);

      reply.status(200);
      return {
        success: true,
        message: 'Plan updated successfully',
        data: plan,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update plan';
      
      if (errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('already exists')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async deactivatePlan(request: any, reply: any) {
    try {
      const user = request.user!;
      
      // Only system SUPERADMIN can deactivate global plans
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        reply.status(403);
        return {
          success: false,
          message: 'Insufficient permissions. Only system SUPERADMIN can deactivate plans',
        };
      }

      const { id } = request.params;

      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Plan ID is required',
        };
      }

      const plan = await planService.deactivatePlan(id);

      reply.status(200);
      return {
        success: true,
        message: 'Plan deactivated successfully',
        data: plan,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate plan';
      
      if (errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('active subscriptions')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getPlanAnalytics(_request: any, reply: any) {
    try {
      const analytics = await planService.getPlanAnalytics();

      reply.status(200);
      return {
        success: true,
        message: 'Plan analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve plan analytics';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },
};
