import { prisma } from '../utils/prisma';

export class StudentResolverService {
  /**
   * Resolves a Student ID (Siswa.id) from a User ID (User.id).
   * Returns null if not found or the user is not a student.
   */
  async resolveSiswaId(tenantId: string, userId: string): Promise<string | null> {
    const student = await prisma.siswa.findFirst({
      where: { tenant_id: tenantId, user_id: userId },
      select: { id: true }
    });
    return student ? student.id : null;
  }
}

export const studentResolverService = new StudentResolverService();
