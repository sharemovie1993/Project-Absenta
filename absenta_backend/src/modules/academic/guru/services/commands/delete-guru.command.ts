import { prisma } from '@/utils/prisma';
import { applyDataScope } from '@/utils/applyDataScope';
import { DataScope } from '@/types/fastify';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export async function deleteGuruCommand(guruId: string, scope: DataScope): Promise<void> {
  // Check if guru exists
  let whereClause: any = { id: guruId };
  whereClause = applyDataScope(whereClause, { tenantId: scope.tenantId });

  const existingGuru = await prisma.guru.findFirst({
    where: whereClause,
  });

  if (!existingGuru) {
    throw new Error('Guru not found or insufficient permissions');
  }

  // Check if guru has related records that prevent deletion
  const relatedRecords = await prisma.guru.findFirst({
    where: { id: guruId },
    include: {
      _count: {
        select: {
          GuruMapel: true,
          SesiAbsensi: true,
          AbsenGuru: true,
          JadwalKBM: true,
          SupervisiGuru: true,
          SupervisiAsSupervisor: true,
        },
      },
    },
  });

  if (relatedRecords && relatedRecords._count) {
    const counts = relatedRecords._count;
    const totalRelations =
      counts.GuruMapel +
      counts.SesiAbsensi +
      counts.AbsenGuru +
      counts.JadwalKBM +
      counts.SupervisiGuru +
      counts.SupervisiAsSupervisor;

    if (totalRelations > 0) {
      throw new Error(
        'Guru tidak dapat dihapus karena memiliki data terkait (Jadwal/Absensi/Supervisi). Silakan non-aktifkan status guru jika sudah tidak aktif.'
      );
    }
  }

  // Safe to delete if no active relations
  await prisma.$transaction(async (tx) => {
    await tx.guru.delete({
      where: { id: guruId },
    });

    if (existingGuru.user_id) {
      try {
        await tx.user.delete({
          where: { id: existingGuru.user_id },
        });
      } catch (userDeleteError) {
        console.warn('Could not delete associated User record:', userDeleteError);
      }
    }
  });

  await cacheInvalidationService.invalidateAcademicCache(existingGuru.tenant_id);
}
