import { prisma } from '@/utils/prisma';
import { RoleName } from '../../../../constants/enums';
import { isSystemSuperAdmin } from '../../../../utils/rbac';

export interface MappingItem { sumber_kelas_id: string; target_kelas_id: string }
export interface KenaikanKelasInput { tahun_sumber_id: string; tahun_target_id: string; mapping: MappingItem[] }

export interface KenaikanPreviewItem {
  sumber_kelas_id: string;
  target_kelas_id: string;
  total_siswa: number;
}

export interface KenaikanPreviewResponse { items: KenaikanPreviewItem[]; total: number }

export interface KenaikanRunResultItem {
  sumber_kelas_id: string;
  target_kelas_id: string;
  moved: number;
  skipped: number;
}

export interface KenaikanRunResponse { items: KenaikanRunResultItem[]; total_moved: number; total_skipped: number }

export class KenaikanKelasService {
  async preview(_role: RoleName, tenantId: string | undefined, input: KenaikanKelasInput): Promise<KenaikanPreviewResponse> {
    const tahunSumber = await prisma.tahunPelajaran.findFirst({ where: { id: input.tahun_sumber_id } });
    const tahunTarget = await prisma.tahunPelajaran.findFirst({ where: { id: input.tahun_target_id } });
    if (!tahunSumber || !tahunTarget || (tenantId && (tahunSumber.tenant_id !== tenantId || tahunTarget.tenant_id !== tenantId))) {
      throw new Error('Invalid tahun pelajaran');
    }

    const items: KenaikanPreviewItem[] = [];
    let total = 0;
    for (const map of input.mapping) {
      const totalSiswa = await prisma.siswa.count({
        where: { tenant_id: tahunSumber.tenant_id, kelas_id: map.sumber_kelas_id, status: 'AKTIF' },
      });
      items.push({ sumber_kelas_id: map.sumber_kelas_id, target_kelas_id: map.target_kelas_id, total_siswa: totalSiswa });
      total += totalSiswa;
    }
    return { items, total };
  }

  async run(role: RoleName, tenantId: string | undefined, input: KenaikanKelasInput): Promise<KenaikanRunResponse> {
    if (!(isSystemSuperAdmin(role, tenantId) || role === RoleName.ADMIN)) {
      throw new Error('Forbidden');
    }
    const tahunSumber = await prisma.tahunPelajaran.findFirst({ where: { id: input.tahun_sumber_id } });
    const tahunTarget = await prisma.tahunPelajaran.findFirst({ where: { id: input.tahun_target_id } });
    if (!tahunSumber || !tahunTarget || (tenantId && (tahunSumber.tenant_id !== tenantId || tahunTarget.tenant_id !== tenantId))) {
      throw new Error('Invalid tahun pelajaran');
    }

    const items: KenaikanRunResultItem[] = [];
    let total_moved = 0;
    let total_skipped = 0;

    await prisma.$transaction(async (tx) => {
      for (const map of input.mapping) {
        const siswaDirect = await tx.siswa.findMany({
          where: { tenant_id: tahunSumber.tenant_id, kelas_id: map.sumber_kelas_id, status: 'AKTIF' },
          select: { id: true },
        });
        const siswaIds = siswaDirect.map((s) => s.id);

        let moved = 0;
        let skipped = 0;
        for (const siswaId of siswaIds) {
          await tx.siswa.update({
            where: { id: siswaId },
            data: { kelas_id: map.target_kelas_id, tahun_pelajaran_id: tahunTarget.id },
          });
          moved++;
        }
        items.push({ sumber_kelas_id: map.sumber_kelas_id, target_kelas_id: map.target_kelas_id, moved, skipped });
        total_moved += moved;
        total_skipped += skipped;
      }
    });

    return { items, total_moved, total_skipped };
  }
}

export const kenaikanKelasService = new KenaikanKelasService();

