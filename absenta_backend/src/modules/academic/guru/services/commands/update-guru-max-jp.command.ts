import { prisma } from '@/utils/prisma';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export async function updateGuruMaxJpCommand(params: {
  tenantId: string;
  guruId: string;
  maxJp: number;
}) {
  const { tenantId, guruId, maxJp } = params;

  if (typeof maxJp !== 'number' || maxJp < 1 || maxJp > 100) {
    throw new Error('Batas Max JP harus berupa angka antara 1 dan 100');
  }

  // 1. Verifikasi keberadaan Guru dan isolasi tenant
  const guru = await prisma.guru.findFirst({
    where: { id: guruId, tenant_id: tenantId },
    select: { id: true, nama_guru: true }
  });

  if (!guru) {
    throw new Error('Guru tidak ditemukan atau akses ditolak');
  }

  // 2. Update max_jp pada tabel Guru
  const updatedGuru = await prisma.guru.update({
    where: { id: guruId },
    data: { max_jp: maxJp },
    select: {
      id: true,
      nama_guru: true,
      nip: true,
      max_jp: true,
      tenant_id: true,
      updated_at: true,
    }
  });

  // 3. Invalidate cache akademis & kurikulum secara otomatis
  await cacheInvalidationService.invalidateAcademicCache(tenantId);

  return updatedGuru;
}
