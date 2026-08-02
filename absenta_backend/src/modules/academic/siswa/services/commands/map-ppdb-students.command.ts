import { prisma } from '@/utils/prisma';
import { SiswaStatus } from '@/constants/enums';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

interface MapPpdbStudentsInput {
  siswaIds: string[];
  targetKelasId: string;
}

export async function mapPpdbStudentsCommand(
  input: MapPpdbStudentsInput,
  scope: { tenantId: string; org: any }
): Promise<{ success: number; failed: number; errors: any[] }> {
  const { tenantId } = scope;
  const { siswaIds, targetKelasId } = input;

  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  // 1. Verify target kelas exists and belongs to the same tenant
  const targetKelas = await prisma.kelas.findFirst({
    where: { id: targetKelasId, tenant_id: tenantId },
    select: { id: true, nama_kelas: true, tingkat: true, jurusan_id: true }
  });

  if (!targetKelas) {
    throw new Error('Kelas target tidak ditemukan');
  }

  // 2. Fetch active tahun pelajaran & semester
  const activeYear = await prisma.tahunPelajaran.findFirst({
    where: { tenant_id: tenantId, is_active: true }
  });

  if (!activeYear) {
    throw new Error('Tahun pelajaran aktif tidak ditemukan. Pastikan sudah ada tahun pelajaran aktif di master data.');
  }

  const activeSemester = await prisma.semester.findFirst({
    where: { tenant_id: tenantId, is_active: true, tahun_pelajaran_id: activeYear.id }
  });

  if (!activeSemester) {
    throw new Error('Semester aktif tidak ditemukan. Pastikan sudah ada semester aktif untuk tahun pelajaran ini.');
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  // 3. Process each student in a transaction
  for (const siswaId of siswaIds) {
    try {
      await prisma.$transaction(async (tx) => {
        // Verify student is indeed CALON and belongs to the tenant
        const student = await tx.siswa.findFirst({
          where: { id: siswaId, tenant_id: tenantId },
          select: { id: true, nama_siswa: true, status: true }
        });

        if (!student) {
          throw new Error('Siswa tidak ditemukan');
        }

        if (student.status !== 'CALON') {
          throw new Error(`Siswa sudah berstatus ${student.status}, tidak bisa dipetakan kembali`);
        }

        // Update student record
        await tx.siswa.update({
          where: { id: siswaId },
          data: {
            status: SiswaStatus.AKTIF,
            kelas_id: targetKelas.id,
            jurusan_id: targetKelas.jurusan_id,
            tahun_pelajaran_id: activeYear.id,
            semester_id: activeSemester.id
          }
        });

        // Create or Update SiswaAkademik (Registration snapshot)
        await tx.siswaAkademik.upsert({
          where: {
            siswa_id_tahun_pelajaran_id_semester_id: {
              siswa_id: student.id,
              tahun_pelajaran_id: activeYear.id,
              semester_id: activeSemester.id
            }
          },
          update: {
            kelas_id: targetKelas.id,
            status: 'AKTIF'
          },
          create: {
            siswa_id: student.id,
            kelas_id: targetKelas.id,
            tahun_pelajaran_id: activeYear.id,
            semester_id: activeSemester.id,
            status: 'AKTIF'
          }
        });
      });

      successCount++;
    } catch (err: any) {
      failedCount++;
      errors.push({
        siswaId,
        message: err.message
      });
    }
  }

  if (successCount > 0) {
    await cacheInvalidationService.invalidateSiswaCache(tenantId);
  }

  return {
    success: successCount,
    failed: failedCount,
    errors
  };
}
