// @ts-nocheck
import { authTenantController } from './sub/auth-tenant.controller';
import { authRegistrationController } from './sub/auth-registration.controller';
import { authSessionController } from './sub/auth-session.controller';

export const getJwtSecret = () => process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export const authController = {
  ...authTenantController,
  ...authRegistrationController,
  ...authSessionController
};
