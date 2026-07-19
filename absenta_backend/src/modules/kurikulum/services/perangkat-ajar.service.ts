import { prisma } from '../../../utils/prisma';
import { storageService } from '../../../infra/storage/storage.service';

export class PerangkatAjarService {
  static async uploadPerangkat(
    tenantId: string,
    data: {
      guru_id: string;
      mapel_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      judul: string;
      jenis: string;
      file_url: string;
    }
  ) {
    return prisma.perangkatAjar.create({
      data: {
        tenant_id: tenantId,
        guru_id: data.guru_id,
        mapel_id: data.mapel_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        judul: data.judul,
        jenis: data.jenis,
        file_url: data.file_url,
        status: 'PENDING',
      },
    });
  }

  static async reviewPerangkat(
    tenantId: string,
    id: string,
    reviewerId: string,
    data: {
      status: 'APPROVED' | 'REJECTED';
      catatan_reviewer?: string | null;
    }
  ) {
    const existing = await prisma.perangkatAjar.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Perangkat ajar tidak ditemukan atau bukan milik tenant Anda');
    }

    return prisma.perangkatAjar.update({
      where: { id },
      data: {
        status: data.status,
        catatan_reviewer: data.catatan_reviewer || null,
        reviewer_id: reviewerId,
        reviewed_at: new Date(),
      },
    });
  }

  static async getPerangkatById(tenantId: string, id: string) {
    return prisma.perangkatAjar.findFirst({
      where: { id, tenant_id: tenantId },
    });
  }

  static async getPerangkat(
    tenantId: string,
    filter: {
      guru_id?: string;
      mapel_id?: string;
      tahun_pelajaran_id?: string;
      semester_id?: string;
      status?: string;
      jenis?: string;
    }
  ) {
    return prisma.perangkatAjar.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.guru_id ? { guru_id: filter.guru_id } : {}),
        ...(filter.mapel_id ? { mapel_id: filter.mapel_id } : {}),
        ...(filter.tahun_pelajaran_id ? { tahun_pelajaran_id: filter.tahun_pelajaran_id } : {}),
        ...(filter.semester_id ? { semester_id: filter.semester_id } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.jenis ? { jenis: filter.jenis } : {}),
      },
      include: {
        Guru: { select: { nama_guru: true, nip: true } },
        Mapel: { select: { nama_mapel: true, kode_mapel: true } },
        TahunPelajaran: { select: { tahun: true } },
        Semester: { select: { nama_semester: true } },
        Reviewer: { select: { full_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  static async deletePerangkat(tenantId: string, id: string) {
    const existing = await prisma.perangkatAjar.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Perangkat ajar tidak ditemukan atau bukan milik tenant Anda');
    }

    try {
      await storageService.delete(existing.file_url);
    } catch (err) {
      console.error(`Failed to delete physical file: ${existing.file_url}`, err);
    }

    return prisma.perangkatAjar.delete({
      where: { id },
    });
  }
}
