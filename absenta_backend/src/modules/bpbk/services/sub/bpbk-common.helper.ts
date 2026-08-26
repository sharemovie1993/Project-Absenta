// @ts-nocheck
import { prisma } from '../../../../utils/prisma';

export class BpbkCommonHelper {
  static async getWaliKelasClassIds(tenantId: string, userId: string): Promise<string[]> {
    const assignments = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        status: 'ACTIVE',
        class_id: { not: null },
        structure: {
          role_name: { contains: 'WALI_KELAS', mode: 'insensitive' }
        }
      },
      select: { class_id: true }
    });
    return assignments.map(a => a.class_id).filter((id): id is string => id !== null);
  }

  static async isUserWaliKelasOfStudent(tenantId: string, userId: string, siswaId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } }
    });
    const roleName = user?.role?.name?.toUpperCase() || '';
    if (roleName !== 'WALI_KELAS' && roleName !== 'GURU') {
      return false;
    }

    const siswa = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId },
      select: { kelas_id: true }
    });
    if (!siswa?.kelas_id) return false;

    const waliKelasClassIds = await this.getWaliKelasClassIds(tenantId, userId);
    return waliKelasClassIds.includes(siswa.kelas_id);
  }

  static async buildVisibilityFilter(
    tenantId: string,
    userContext: { id: string; capabilities: string[] }
  ): Promise<any> {
    const hasSensitiveAccess = userContext?.capabilities?.includes('bk.counseling.view.sensitive') || 
                                userContext?.capabilities?.includes('system.platform.full_access');
                                
    if (hasSensitiveAccess) {
      return {}; 
    }

    const waliKelasClassIds = await this.getWaliKelasClassIds(tenantId, userContext.id);

    if (waliKelasClassIds.length > 0) {
      return {
        OR: [
          {
            visibility: 'PUBLIC'
          },
          {
            visibility: 'LIMITED',
            Siswa: { kelas_id: { in: waliKelasClassIds } }
          }
        ]
      };
    }

    return {
      visibility: 'PUBLIC'
    };
  }

  static async verifyOwner(modelName: string, id: string, tenantId: string) {
    const dbModel = (prisma as any)[modelName];
    if (!dbModel) {
      throw new Error('Model not found in Prisma client');
    }
    const record = await dbModel.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!record) {
      throw new Error('Data not found or unauthorized access');
    }
  }
}
