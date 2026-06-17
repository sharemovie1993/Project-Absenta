import { tenantDetailDb as prisma } from '../repositories/tenant-detail.db';

export async function getTenantUsersQuery(tenantId: string, page: number = 1, limit: number = 10, search?: string) {
  try {
    const skip = (page - 1) * limit;

    const whereClause: any = {
      tenant_id: tenantId
    };

    if (search) {
      whereClause.OR = [{ full_name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          full_name: true,
          email: true,
          role_id: true,
          status: true,
          last_login: true,
          created_at: true,
          updated_at: true,
          Role: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.user.count({ where: whereClause })
    ]);

    const usersWithRoleName = (users as any[]).map((u: any) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role_id: u.role_id,
      role_name: u.Role?.name ?? 'UNKNOWN',
      status: u.status,
      last_login: u.last_login ?? null,
      created_at: u.created_at,
      updated_at: u.updated_at,
    }));

    return {
      users: usersWithRoleName,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error fetching tenant users:', error);
    throw new Error('Gagal mengambil daftar user');
  }
}
