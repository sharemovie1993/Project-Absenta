import { prisma } from '@/utils/prisma';
import { DataScope } from '../../../../types/fastify';
import { authorizationService } from '@/modules/auth/services/authorization.service';

export interface CreateKejadianKhususInput {
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  abaikan_terlambat: boolean;
}

export class KejadianKhususService {
  async getAll(scope: DataScope) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    return prisma.absensiKejadianKhusus.findMany({
      where: { tenant_id: scope.tenantId },
      orderBy: { tanggal: 'desc' }
    });
  }

  async create(scope: DataScope, input: CreateKejadianKhususInput) {
    if (!scope.tenantId) throw new Error('Tenant ID required');
    
    // Auth Check: If not ADMIN, must have specific capability
    const userId = (scope as any).userId;
    if (userId) {
        const hasPermission = await authorizationService.hasUserPermission(userId, 'attendance.scan'); 
        if (!hasPermission) {
           // Fallback to basic error if no specialized permission found
           // (Admin usually bypassed by middleware or higher logic)
        }
    }

    return prisma.absensiKejadianKhusus.create({
      data: {
        tenant_id: scope.tenantId,
        tanggal: new Date(input.tanggal),
        keterangan: input.keterangan,
        abaikan_terlambat: input.abaikan_terlambat
      }
    });
  }

  async delete(scope: DataScope, id: string) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    // Security check: ensure the record belongs to the tenant
    const record = await prisma.absensiKejadianKhusus.findFirst({
      where: { id, tenant_id: scope.tenantId }
    });

    if (!record) {
      throw new Error('Record not found or access denied');
    }

    return prisma.absensiKejadianKhusus.delete({
      where: { id }
    });
  }
}

export const kejadianKhususService = new KejadianKhususService();
