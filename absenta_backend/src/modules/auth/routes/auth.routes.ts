import { authController } from '../controllers/auth.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function authRoutes(fastify: any) {
  // Register endpoint - no authentication required
  fastify.post('/register', {
    preHandler: [ determineDataScope()],
    config: {
      skipAuth: true,
      public: true,
      rateLimit: { max: 5, timeWindow: '1 minute' }, // L5: anti mass-registration
    },
    handler: authController.register.bind(authController),
  });

  // Register tenant endpoint - no authentication required
  fastify.post('/register-tenant', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    schema: {
      description: 'Register new tenant with admin details',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['tenant_name', 'tenant_domain', 'admin_full_name', 'admin_email', 'admin_password', 'admin_phone'],
        properties: {
          tenant_name: { type: 'string' },
          tenant_domain: { type: 'string' },
          npsn: { type: 'string', pattern: '^\\d{8}$' },
          admin_full_name: { type: 'string' },
          admin_email: { type: 'string' },
          admin_password: { type: 'string' },
          admin_phone: { type: 'string' },
          plan_id: { type: 'string' },
          billing_cycle_months: { type: 'number', enum: [1, 3, 6, 12] },
          academic_tier: { type: 'string', enum: ['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'] }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
    handler: authController.registerTenant.bind(authController),
  });

  // Login endpoint - no authentication required
  fastify.post('/login', {
    preHandler: [ determineDataScope()], // Skip auth middleware for login
    config: {
      skipAuth: true,
      public: true,
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    },
    handler: authController.login.bind(authController),
  });

  // Dev-only helper: list tenants for localhost login dropdown (no auth)
  fastify.get('/dev/tenants', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    handler: authController.getDevTenants.bind(authController),
  });

  // Public tenant info by domain
  fastify.get('/tenant-info', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    handler: authController.tenantInfo.bind(authController),
  });

  // Check domain availability - public
  fastify.get('/check-domain', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    handler: authController.checkDomain.bind(authController),
  });

  // Get registration preset configuration for single-tenant mode - public
  fastify.get('/registration-preset', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    handler: authController.registrationPreset.bind(authController),
  });

  // Check email availability - public
  fastify.get('/check-email', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    handler: authController.checkEmail.bind(authController),
  });
  
  // Also support path param style
  fastify.get('/check-email/:email', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    handler: authController.checkEmail.bind(authController),
  });

  // Refresh token endpoint - no authentication required
  fastify.post('/refresh', {
    preHandler: [ determineDataScope()], // Skip auth middleware for refresh
    config: { skipAuth: true, public: true },
    handler: authController.refresh.bind(authController),
  });

  // Verify email endpoint - no authentication required
  fastify.get('/verify-email', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    handler: authController.verifyEmail.bind(authController),
  });
  // Alternate route form with token as path param
  fastify.get('/verify-email/:token', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    handler: async (request: any, reply: any) => {
      // Move path param into query to reuse controller logic
      request.query = request.query || {};
      (request.query as any).token = request.params?.token;
      return authController.verifyEmail(request, reply);
    },
  });
  // Confirm verify email - no authentication required
  fastify.post('/verify-email/confirm', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    handler: authController.confirmVerifyEmail.bind(authController),
  });

  // Resend verification email - no authentication required
  fastify.post('/resend-verification', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    handler: authController.resendVerification.bind(authController),
  });

  fastify.post('/request-password-reset', {
    preHandler: [ determineDataScope()],
    config: {
      skipAuth: true,
      public: true,
      rateLimit: {
        max: 3,
        timeWindow: '1 minute'
      }
    },
    handler: authController.requestPasswordReset.bind(authController),
  });

  fastify.post('/confirm-password-reset', {
    preHandler: [ determineDataScope()],
    config: { skipAuth: true, public: true },
    handler: authController.confirmPasswordReset.bind(authController),
  });

  // Get current user profile - requires authentication
  fastify.get('/me', {
    handler: authController.me.bind(authController),
  });

  // Impersonate - requires authentication and capability check
  fastify.post('/impersonate', {
    preHandler: [requireCapability('superadmin.tenants.impersonate'), determineDataScope()],
    handler: authController.impersonate.bind(authController),
  });

  // Logout - requires authentication
  fastify.post('/logout', {
    preHandler: [requireCapability('core.auth.logout'), determineDataScope()],
    handler: authController.logout.bind(authController),
  });

  // Change Password - requires authentication
  fastify.post('/change-password', {
    preHandler: [determineDataScope()],
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    },
    handler: authController.changePassword.bind(authController),
  });
}
