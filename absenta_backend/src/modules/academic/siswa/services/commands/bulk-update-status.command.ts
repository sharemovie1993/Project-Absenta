import { siswaDb } from '../repositories/siswa.db';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export async function bulkUpdateStatusCommand(
  scope: { tenantId: string; org: any },
  payload: {
    siswaIds: string[];
    status: string;
    tanggal?: Date;
    alasan?: string;
  },
): Promise<any> {
  const { tenantId, org } = scope;
  const { siswaIds, status, tanggal, alasan } = payload;

  if (!siswaIds || siswaIds.length === 0) {
    throw new Error('Tidak ada siswa yang dipilih');
  }

  const updateData: any = {
    status,
  };

  const nonActiveStatuses = ['KELUAR', 'PINDAH', 'LULUS', 'DO', 'NON_AKTIF'];
  if (nonActiveStatuses.includes(status)) {
    updateData.tanggal_keluar = tanggal || new Date();
    if (alasan) updateData.alasan_keluar = alasan;
  } else if (status === 'AKTIF') {
    updateData.tanggal_keluar = null;
    updateData.alasan_keluar = null;
  }

  const whereClause: any = {
    tenant_id: tenantId,
    id: { in: siswaIds },
  };

  // Apply Isolate/Scope filter from Organization Engine
  if (org && org.tenant_wide !== true) {
    const allowed = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
    if (allowed.length > 0) {
      whereClause.kelas_id = { in: allowed };
    } else {
      // No assigned classes, deny bulk update
      return { count: 0 };
    }
  }

  const result = await siswaDb.$transaction(async (tx) => {
    // 1. Get student profiles with their user_ids
    const targetedStudents = await tx.siswa.findMany({
      where: whereClause,
      select: { id: true, user_id: true }
    });
    const userIds = targetedStudents.map(s => s.user_id).filter(Boolean) as string[];

    // 2. Perform bulk update on student profiles
    const updateResult = await tx.siswa.updateMany({
      where: whereClause,
      data: updateData,
    });

    // 3. Enforce User account business contract (LULUS keeps ACTIVE for Tracer Study, others frozen)
    if (userIds.length > 0) {
      const userLoginStatus = ['PINDAH', 'KELUAR', 'DO', 'MENINGGAL', 'NON_AKTIF'].includes(status) ? 'INACTIVE' : 'ACTIVE';
      await tx.user.updateMany({
        where: { id: { in: userIds } },
        data: { status: userLoginStatus }
      });
      console.log(`[USER-SYNC] Updated ${userIds.length} student user accounts status to: ${userLoginStatus}`);
    }

    return updateResult;
  });

  if (scope.tenantId) {
    try {
      const activeYear = await siswaDb.tahunPelajaran.findFirst({
        where: { tenant_id: scope.tenantId, is_active: true },
        select: { id: true },
      });

      if (activeYear) {
        const activeSemester = await siswaDb.semester.findFirst({
          where: {
            tenant_id: scope.tenantId,
            is_active: true,
            tahun_pelajaran_id: (activeYear as any).id,
          } as any,
          select: { id: true } as any,
        });

        if (activeSemester) {
          let akademikStatus: any = null;

          if (status === 'LULUS') {
            akademikStatus = 'LULUS';
          } else if (['PINDAH', 'KELUAR', 'DO', 'MENINGGAL', 'NON_AKTIF'].includes(status)) {
            akademikStatus = 'PINDAH';
          } else if (status === 'AKTIF') {
            akademikStatus = 'AKTIF';
          }

          if (akademikStatus) {
            await siswaDb.siswaAkademik.updateMany({
              where: {
                siswa_id: { in: siswaIds },
                tahun_pelajaran_id: (activeYear as any).id,
                semester_id: (activeSemester as any).id,
              } as any,
              data: {
                status: akademikStatus,
              } as any,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error syncing SiswaAkademik status:', error);
    }
  }

  if (scope.tenantId) {
    await cacheInvalidationService.invalidateSiswaCache(scope.tenantId);
  }

  return result;
}
