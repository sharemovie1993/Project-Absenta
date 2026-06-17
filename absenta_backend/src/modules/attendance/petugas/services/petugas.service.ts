import { prisma } from '@/utils/prisma';
import { DataScope } from '../../../../types/fastify';
import { organizationalContextCache } from '@/modules/auth/services/organizational-context-cache';
import { applyDataScope } from '@/utils/applyDataScope';

export interface AssignPetugasInput {
  siswa_id: string;
  kelas_id: string;
}

export class PetugasService {
  async getAll(scope: DataScope, params?: { page?: number; limit?: number; search?: string }) {
    const tenantId = scope.tenantId;
    if (!tenantId) throw new Error('Tenant ID required');

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    let where: any = {
      tenant_id: tenantId,
      is_active: true,
      AND: [
        { OR: [{ start_date: null }, { start_date: { lte: new Date() } }] },
        { OR: [{ end_date: null }, { end_date: { gte: new Date() } }] },
      ],
      Position: { code: 'PETUGAS_KELAS' },
    };

    // Apply Scoping
    where = applyDataScope(where, scope);

    if (params?.search) {
      where.User = {
        Siswa: {
          nama_siswa: { contains: params.search, mode: 'insensitive' },
        },
      };
    }

    const [total, results] = await Promise.all([
      prisma.organizationalAssignment.count({ where }),
      prisma.organizationalAssignment.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              email: true,
              full_name: true,
              Siswa: {
                select: {
                  id: true,
                  nama_siswa: true,
                  nis: true,
                  nisn: true,
                  user_id: true,
                  kelas_id: true,
                  Kelas: { select: { id: true, nama_kelas: true } },
                },
              },
            },
          },
          Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
          Position: { select: { id: true, code: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    // Transform data to lift Siswa to root level for Frontend compatibility
    const data = results.map((item: any) => {
      const { User, ...assignment } = item;
      return {
        ...assignment,
        Siswa: User?.Siswa || null,
        user_email: User?.email,
        user_full_name: User?.full_name
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async assign(input: AssignPetugasInput, scope: DataScope) {
    const tenantId = scope.tenantId;
    if (!tenantId) throw new Error('Tenant ID required');

    const result = await prisma.$transaction(async (tx) => {
      const siswa = await tx.siswa.findFirst({
        where: { id: input.siswa_id, tenant_id: tenantId },
        select: { id: true, user_id: true, kelas_id: true },
      });
      if (!siswa?.user_id) throw new Error('Siswa not found');
      if (String(siswa.kelas_id || '') !== String(input.kelas_id)) {
        throw new Error('Siswa tidak terdaftar pada kelas tersebut');
      }

      // Check Scoping for assignment
      if (
        Array.isArray(scope.kelasIds) && 
        scope.kelasIds.length > 0 && 
        !scope.tenantWide && 
        !scope.kelasIds.map(String).includes(String(input.kelas_id))
      ) {
        throw new Error('Anda tidak memiliki otoritas untuk menambah petugas di kelas ini');
      }

      const position = await tx.organizationalPosition.upsert({
        where: { tenant_id_code: { tenant_id: tenantId, code: 'PETUGAS_KELAS' } },
        create: {
          tenant_id: tenantId,
          code: 'PETUGAS_KELAS',
          name: 'Petugas Kelas',
          scope_type: 'attendance',
          unit_type: 'kelas',
          is_active: true,
          updated_at: new Date(),
        },
        update: { updated_at: new Date(), is_active: true },
      });

      const activeExists = await tx.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          user_id: siswa.user_id,
          position_id: position.id,
          kelas_id: input.kelas_id,
          is_active: true,
        },
        select: { id: true },
      });
      if (activeExists) throw new Error('Siswa is already assigned as Petugas Kelas');

      const inactive = await tx.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          user_id: siswa.user_id,
          position_id: position.id,
          kelas_id: input.kelas_id,
          is_active: false,
        },
        select: { id: true },
      });

      if (inactive) {
        return tx.organizationalAssignment.update({
          where: { id: inactive.id },
          data: { is_active: true, start_date: new Date(), end_date: null, updated_at: new Date() },
        });
      }

      return tx.organizationalAssignment.create({
        data: {
          tenant_id: tenantId,
          position_id: position.id,
          user_id: siswa.user_id,
          kelas_id: input.kelas_id,
          unit_id: null,
          start_date: new Date(),
          end_date: null,
          is_active: true,
          updated_at: new Date(),
        } as any,
      });
    });

    await organizationalContextCache.invalidateUser(String((result as any).user_id));
    return result;
  }

  async unassign(id: string, scope: DataScope) {
    const tenantId = scope.tenantId;
    if (!tenantId) throw new Error('Tenant ID required');

    const existing = await prisma.organizationalAssignment.findFirst({
      where: { id, tenant_id: tenantId, Position: { code: 'PETUGAS_KELAS' } },
      select: { id: true, user_id: true },
    });
    if (!existing) throw new Error('Assignment not found');

    await prisma.organizationalAssignment.update({
      where: { id },
      data: { is_active: false, end_date: new Date(), updated_at: new Date() },
    });
    await organizationalContextCache.invalidateUser(String(existing.user_id));
  }
}

export const petugasService = new PetugasService();
