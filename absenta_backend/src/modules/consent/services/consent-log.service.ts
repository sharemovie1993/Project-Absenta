import { prisma } from '@/utils/prisma';
import { isSystemSuperAdmin } from '@/utils/rbac';

export type ConsentType = 'TERMS' | 'PRIVACY' | 'BIOMETRIC' | 'BILLING';

export interface CreateConsentLogPayload {
  user_id?: string | null;
  tenant_id?: string | null;
  consent_type: ConsentType;
  version?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export const consentLogService = {
  async create(payload: CreateConsentLogPayload) {
    return prisma.consentLog.create({
      data: {
        user_id: payload.user_id ?? null,
        tenant_id: payload.tenant_id ?? null,
        consent_type: payload.consent_type as any,
        version: payload.version ?? null,
        ip_address: payload.ip_address ?? null,
        user_agent: payload.user_agent ?? null,
      },
    });
  },

  async list(roleName?: string, requesterTenantId?: string | null, userId?: string | null, type?: ConsentType) {
    const superAdmin = isSystemSuperAdmin(roleName, requesterTenantId || undefined);
    const where: any = {};
    if (type) where.consent_type = type as any;
    if (superAdmin) {
      return prisma.consentLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 200,
      });
    }
    if (requesterTenantId) where.tenant_id = requesterTenantId;
    if (userId) where.user_id = userId;
    return prisma.consentLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 200,
    });
  },
};

