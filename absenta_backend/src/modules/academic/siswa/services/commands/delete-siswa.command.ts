import { RoleName } from '@/constants/enums';
import { userService } from '@/modules/user/services/user.service';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import { siswaDb } from '../repositories/siswa.db';
import type { SiswaResponse } from '../siswa.types';

export async function deleteSiswaCommand(
  siswaId: string,
  scope: { tenantId: string; org: any; userId?: string }
): Promise<SiswaResponse> {
  const { tenantId, org } = scope;
  const whereClause: any = { id: siswaId, tenant_id: tenantId };

  // Apply Isolate/Scope filter from Organization Engine
  if (org && org.tenant_wide !== true) {
    const allowed = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
    if (allowed.length > 0) {
      whereClause.kelas_id = { in: allowed };
    } else {
      throw new Error('Siswa not found');
    }
  }

  const existingSiswa: any = await siswaDb.siswa.findFirst({
    where: whereClause,
    include: {
      _count: {
        select: {
          AbsenSiswa: true,
          AbsenGerbangSiswa: true,
          SiswaAkademik: true,
          PelanggaranSiswa: true,
        },
      },
    },
  });

  if (!existingSiswa) {
    throw new Error('Siswa tidak ditemukan');
  }

  const counts = existingSiswa._count;
  const detailParts: string[] = [];
  if (counts.AbsenSiswa > 0) detailParts.push(`${counts.AbsenSiswa} Sesi Absensi`);
  if (counts.AbsenGerbangSiswa > 0) detailParts.push(`${counts.AbsenGerbangSiswa} Absensi Gerbang`);
  if (counts.SiswaAkademik > 0) detailParts.push(`${counts.SiswaAkademik} Riwayat Akademik`);
  if (counts.PelanggaranSiswa > 0) detailParts.push(`${counts.PelanggaranSiswa} Catatan Pelanggaran`);

  if (detailParts.length > 0) {
    throw new Error(
      `Tidak dapat menghapus siswa karena memiliki data terkait: ${detailParts.join(', ')}. Disarankan untuk menonaktifkan status siswa daripada menghapusnya.`,
    );
  }

  await siswaDb.orangTuaSiswa.deleteMany({
    where: { siswa_id: siswaId },
  });

  await siswaDb.siswaFaceTemplate.deleteMany({
    where: { siswa_id: siswaId },
  });

  const deletedSiswa: any = await siswaDb.siswa.delete({
    where: { id: siswaId },
  });

  if (deletedSiswa.user_id) {
    try {
      await userService.deleteUser(deletedSiswa.user_id, RoleName.SUPERADMIN, undefined);
    } catch (error) {
      console.error(`Failed to delete associated user ${deletedSiswa.user_id}:`, error);
    }
  }

  try {
    activityLogService.logEvent({
      event_type: 'ACADEMIC_SISWA_DELETED',
      tenant_id: tenantId,
      user_id: scope.userId ?? null,
      entity: 'Siswa',
      entity_id: siswaId,
      metadata: {
        nama_siswa: existingSiswa.nama_siswa,
        nis: existingSiswa.nis,
        nisn: existingSiswa.nisn,
      },
    });
  } catch (logErr) {
    console.error('[deleteSiswaCommand] Failed to record activity log:', logErr);
  }

  return deletedSiswa as SiswaResponse;
}

