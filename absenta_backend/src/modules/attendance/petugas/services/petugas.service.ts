import { prisma } from '@/utils/prisma';
import { DataScope } from '../../../../types/fastify';
import { organizationalContextCache } from '@/modules/auth/services/organizational-context-cache';
import { applyDataScope } from '@/utils/applyDataScope';

export interface AssignPetugasInput {
  siswa_id: string;
  kelas_id: string;
  custom_title?: string;
  is_leader?: boolean;
}

export class PetugasService {
  async getAll(scope: DataScope, params?: { page?: number; limit?: number; search?: string; kelas_id?: string }) {
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
        { OR: [{ tahun_pelajaran_id: null }, { TahunPelajaran: { is_active: true } }] },
      ],
      Position: { code: 'PETUGAS_KELAS' },
    };

    // Apply Scoping
    where = applyDataScope(where, scope);

    if (params?.kelas_id) {
      where.kelas_id = params.kelas_id;
    }

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

      const activeTp = await tx.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true },
      });

      const activeExists = await tx.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          user_id: siswa.user_id,
          position_id: position.id,
          kelas_id: input.kelas_id,
          is_active: true,
        },
        select: { id: true, custom_title: true, is_leader: true, user_id: true },
      });

      if (activeExists) {
        if (input.custom_title !== undefined || input.is_leader !== undefined) {
          return tx.organizationalAssignment.update({
            where: { id: activeExists.id },
            data: {
              custom_title: input.custom_title !== undefined ? input.custom_title : activeExists.custom_title,
              is_leader: input.is_leader !== undefined ? input.is_leader : activeExists.is_leader,
              updated_at: new Date(),
            },
          });
        }
        return activeExists;
      }

      const inactive = await tx.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          user_id: siswa.user_id,
          position_id: position.id,
          kelas_id: input.kelas_id,
          is_active: false,
        },
        select: { id: true, custom_title: true, is_leader: true },
      });

      if (inactive) {
        return tx.organizationalAssignment.update({
          where: { id: inactive.id },
          data: {
            is_active: true,
            start_date: new Date(),
            end_date: null,
            custom_title: input.custom_title !== undefined ? input.custom_title : inactive.custom_title,
            is_leader: input.is_leader !== undefined ? input.is_leader : inactive.is_leader,
            tahun_pelajaran_id: activeTp?.id || null,
            updated_at: new Date()
          },
        });
      }

      return tx.organizationalAssignment.create({
        data: {
          tenant_id: tenantId,
          position_id: position.id,
          user_id: siswa.user_id,
          kelas_id: input.kelas_id,
          unit_id: null,
          tahun_pelajaran_id: activeTp?.id || null,
          custom_title: input.custom_title || null,
          is_leader: input.is_leader ?? false,
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
      select: { id: true, user_id: true, kelas_id: true },
    });
    if (!existing) throw new Error('Assignment not found');

    if (
      Array.isArray(scope.kelasIds) &&
      scope.kelasIds.length > 0 &&
      !scope.tenantWide &&
      existing.kelas_id &&
      !scope.kelasIds.map(String).includes(String(existing.kelas_id))
    ) {
      throw new Error('Anda tidak memiliki otoritas untuk menghapus petugas di kelas ini');
    }

    await prisma.organizationalAssignment.update({
      where: { id },
      data: { is_active: false, end_date: new Date(), updated_at: new Date() },
    });
    await organizationalContextCache.invalidateUser(String(existing.user_id));
  }
}

export const petugasService = new PetugasService();
