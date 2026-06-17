import { FastifyRequest as OriginalFastifyRequest, FastifyInstance as OriginalFastifyInstance } from 'fastify';
import { AbsensiMode, PrismaClient } from '@prisma/client';
import { RoleName } from '../constants/enums';

export interface UserPayload {
  id: string;
  email: string;
  tenantId?: string;
  roleId: string;
  roleName: RoleName;
}

export interface DataScope {
  tenantId?: string;
  userId?: string;
  kelasIds?: string[];
  unitIds?: string[];
  tenantWide?: boolean;
  
  // Snake case support for Enterprise Standard
  tenant_wide?: boolean;
  kelas_ids?: string[];
  unit_ids?: string[];
  
  org?: any; // New Organizational Engine Scope
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserPayload;
    tenantId?: string;
    attendanceMode?: AbsensiMode;
    dataScope?: DataScope;
    organizationalScope?: any; // Standard property from organizationalScopeMiddleware
    jwtVerify(): Promise<any>;
  }
  
  interface FastifyInstance {
    jwt: {
      sign(payload: any): Promise<string>;
      verify(token: string): Promise<any>;
    };
    prisma: PrismaClient;
  }
}
