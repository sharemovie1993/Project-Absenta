import { siswaDb } from '../repositories/siswa.db';

export async function deleteAllSiswaCommand(tenantId: string): Promise<{ count: number }> {
  const siswas = await siswaDb.siswa.findMany({
    where: { tenant_id: tenantId },
    select: { id: true, user_id: true },
  });

  if (siswas.length === 0) {
    return { count: 0 };
  }

  const siswaIds = siswas.map((s: any) => s.id);
  const userIds = siswas.map((s: any) => s.user_id).filter((id: any): id is string => !!id);

  await siswaDb.absenSiswa.deleteMany({
    where: { siswa_id: { in: siswaIds } } as any,
  });

  await siswaDb.absenGerbangSiswa.deleteMany({
    where: { siswa_id: { in: siswaIds } } as any,
  });

  await siswaDb.siswaAkademik.deleteMany({
    where: { siswa_id: { in: siswaIds } } as any,
  });

  await siswaDb.orangTuaSiswa.deleteMany({
    where: { siswa_id: { in: siswaIds } } as any,
  });

  await siswaDb.siswaFaceTemplate.deleteMany({
    where: { siswa_id: { in: siswaIds } } as any,
  });

  const { count } = await siswaDb.siswa.deleteMany({
    where: {
      tenant_id: tenantId,
      id: { in: siswaIds },
    } as any,
  });

  if (userIds.length > 0) {
    try {
      await siswaDb.user.deleteMany({
        where: {
          id: { in: userIds },
          tenant_id: tenantId,
          Role: { name: 'SISWA' },
        } as any,
      });
    } catch (error) {
      console.error('Failed to batch delete associated users:', error);
    }
  }

  return { count };
}

