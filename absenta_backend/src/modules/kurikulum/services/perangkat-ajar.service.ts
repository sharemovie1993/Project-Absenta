import { prisma } from '../../../utils/prisma';
import { storageService } from '../../../infra/storage/storage.service';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';
import { convertOfficeToPdfSibling, resolveExistingSiblingPdf } from '../../../utils/office-to-pdf.util';

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
      fase?: string | null;
      tingkat?: number | null;
      is_shared?: boolean;
    }
  ) {
    const created = await prisma.perangkatAjar.create({
      data: {
        tenant_id: tenantId,
        guru_id: data.guru_id,
        mapel_id: data.mapel_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        judul: data.judul,
        jenis: data.jenis,
        file_url: data.file_url,
        fase: data.fase || null,
        tingkat: data.tingkat ?? null,
        is_shared: Boolean(data.is_shared),
        status: 'PENDING',
      },
    });

    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return created;
  }

  static async updatePerangkat(
    tenantId: string,
    id: string,
    data: {
      judul?: string;
      jenis?: string;
      mapel_id?: string;
      guru_id?: string;
      file_url?: string;
      fase?: string | null;
      tingkat?: number | null;
      is_shared?: boolean;
      resetToPending?: boolean;
    }
  ) {
    const existing = await prisma.perangkatAjar.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Perangkat ajar tidak ditemukan atau bukan milik tenant Anda');
    }

    // Jika berkas fisik diganti dan file lama tidak dipakai record lain, bersihkan file lama
    if (data.file_url && existing.file_url && existing.file_url !== data.file_url) {
      const refCount = await prisma.perangkatAjar.count({
        where: { file_url: existing.file_url },
      });
      if (refCount <= 1) {
        try {
          await storageService.delete(existing.file_url);
        } catch (err) {
          console.error(`Failed to delete replaced file: ${existing.file_url}`, err);
        }
      }
    }

    const updated = await prisma.perangkatAjar.update({
      where: { id },
      data: {
        ...(data.judul !== undefined ? { judul: data.judul } : {}),
        ...(data.jenis !== undefined ? { jenis: data.jenis } : {}),
        ...(data.mapel_id !== undefined ? { mapel_id: data.mapel_id } : {}),
        ...(data.guru_id !== undefined ? { guru_id: data.guru_id } : {}),
        ...(data.file_url !== undefined ? { file_url: data.file_url } : {}),
        ...(data.fase !== undefined ? { fase: data.fase } : {}),
        ...(data.tingkat !== undefined ? { tingkat: data.tingkat } : {}),
        ...(data.is_shared !== undefined ? { is_shared: data.is_shared } : {}),
        ...(data.resetToPending
          ? { status: 'PENDING', catatan_reviewer: null, reviewer_id: null, reviewed_at: null }
          : {}),
      },
      include: {
        Guru: true,
        Mapel: true,
        TahunPelajaran: true,
        Semester: true,
      },
    });

    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return updated;
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

    const updated = await prisma.perangkatAjar.update({
      where: { id },
      data: {
        status: data.status,
        catatan_reviewer: data.catatan_reviewer || null,
        reviewer_id: reviewerId,
        reviewed_at: new Date(),
      },
    });

    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return updated;
  }

  static async getPerangkatById(tenantId: string, id: string) {
    const item = await prisma.perangkatAjar.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Guru: true,
        Mapel: true,
        TahunPelajaran: true,
        Semester: true,
      },
    });

    if (!item) return null;

    if (item.file_url) {
      try {
        const existingPdf = await resolveExistingSiblingPdf(item.file_url);
        const previewPdf = existingPdf || (await convertOfficeToPdfSibling(item.file_url).catch(() => null));
        if (previewPdf) {
          (item as any).preview_pdf_url = previewPdf;
        }
      } catch {}
    }

    // Fetch rich html_content from GlobalPerangkatAjarLibrary matching title/jenis
    try {
      const lib = await prisma.globalPerangkatAjarLibrary.findFirst({
        where: {
          judul: { contains: item.judul, mode: 'insensitive' },
          jenis: item.jenis,
        },
        select: { html_content: true },
        orderBy: { created_at: 'desc' }
      });

      if (lib?.html_content) {
        (item as any).html_content = lib.html_content;
      }
    } catch (e) {}

    return item;
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
    const rows = await prisma.perangkatAjar.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.guru_id ? { OR: [{ guru_id: filter.guru_id }, { is_shared: true }] } : {}),
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

    return Promise.all(
      rows.map(async (row) => {
        const fileExists = row.file_url ? await storageService.exists(row.file_url).catch(() => false) : false;
        const previewPdf = fileExists && row.file_url ? await resolveExistingSiblingPdf(row.file_url) : null;
        return {
          ...row,
          file_exists: fileExists,
          ...(previewPdf ? { preview_pdf_url: previewPdf } : {}),
        };
      })
    );
  }

  static async deletePerangkat(tenantId: string, id: string) {
    const existing = await prisma.perangkatAjar.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Perangkat ajar tidak ditemukan atau bukan milik tenant Anda');
    }

    if (existing.file_url) {
      const refCount = await prisma.perangkatAjar.count({
        where: { file_url: existing.file_url }
      });
      if (refCount <= 1) {
        try {
          await storageService.delete(existing.file_url);
        } catch (err) {
          console.error(`Failed to delete physical file: ${existing.file_url}`, err);
        }
      }
    }

    const deleted = await prisma.perangkatAjar.delete({
      where: { id },
    });

    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return deleted;
  }

  static async bulkDeletePerangkat(tenantId: string, ids: string[]) {
    if (!ids || ids.length === 0) return { count: 0 };
    const items = await prisma.perangkatAjar.findMany({
      where: { id: { in: ids }, tenant_id: tenantId },
      select: { id: true, file_url: true }
    });

    for (const item of items) {
      if (item.file_url) {
        const refCount = await prisma.perangkatAjar.count({
          where: { file_url: item.file_url, id: { notIn: ids } }
        });
        if (refCount === 0) {
          try {
            await storageService.delete(item.file_url);
          } catch (err) {
            console.error(`Failed to delete physical file: ${item.file_url}`, err);
          }
        }
      }
    }

    const res = await prisma.perangkatAjar.deleteMany({
      where: { id: { in: items.map((i) => i.id) }, tenant_id: tenantId }
    });

    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return res;
  }

  static async rolloverPerangkat(
    tenantId: string,
    params: {
      source_tahun_pelajaran_id: string;
      target_tahun_pelajaran_id: string;
      source_semester_id?: string;
      target_semester_id?: string;
      guru_id?: string;
      mode?: 'skip_existing' | 'overwrite';
    }
  ): Promise<{
    success: boolean;
    message: string;
    copiedCount: number;
    skippedCount: number;
    totalSourceCount: number;
  }> {
    const {
      source_tahun_pelajaran_id,
      target_tahun_pelajaran_id,
      source_semester_id,
      target_semester_id,
      guru_id,
      mode = 'skip_existing',
    } = params;

    if (!tenantId || !source_tahun_pelajaran_id || !target_tahun_pelajaran_id) {
      throw new Error('Tenant ID, Tahun Pelajaran Sumber, dan Tahun Pelajaran Target wajib diisi');
    }

    if (source_tahun_pelajaran_id === target_tahun_pelajaran_id) {
      throw new Error('Tahun pelajaran sumber dan target tidak boleh sama');
    }

    const targetTp = await prisma.tahunPelajaran.findFirst({
      where: { id: target_tahun_pelajaran_id, tenant_id: tenantId },
      include: { Semester: true },
    });

    if (!targetTp) {
      throw new Error('Tahun pelajaran target tidak ditemukan');
    }

    const targetSemesters = targetTp.Semester || [];
    if (targetSemesters.length === 0) {
      throw new Error('Tahun pelajaran target belum memiliki data semester');
    }

    const sourceItems = await prisma.perangkatAjar.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: source_tahun_pelajaran_id,
        ...(guru_id ? { guru_id } : {}),
        ...(source_semester_id ? { semester_id: source_semester_id } : {}),
      },
      include: {
        Semester: true,
      },
    });

    if (sourceItems.length === 0) {
      return {
        success: true,
        message: 'Tidak ada dokumen perangkat ajar pada tahun pelajaran sumber untuk disalin',
        copiedCount: 0,
        skippedCount: 0,
        totalSourceCount: 0,
      };
    }

    let copiedCount = 0;
    let skippedCount = 0;

    for (const item of sourceItems) {
      let resolvedTargetSemId = target_semester_id;
      if (!resolvedTargetSemId) {
        const srcSemName = (item.Semester?.nama_semester || '').toLowerCase();
        const matched = targetSemesters.find((ts) => {
          const tName = ts.nama_semester.toLowerCase();
          if (srcSemName.includes('ganjil') && tName.includes('ganjil')) return true;
          if (srcSemName.includes('genap') && tName.includes('genap')) return true;
          if (srcSemName.includes('1') && tName.includes('1')) return true;
          if (srcSemName.includes('2') && tName.includes('2')) return true;
          return false;
        });
        resolvedTargetSemId = matched?.id || targetSemesters.find((ts) => ts.is_active)?.id || targetSemesters[0].id;
      }

      const existing = await prisma.perangkatAjar.findFirst({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: target_tahun_pelajaran_id,
          semester_id: resolvedTargetSemId,
          guru_id: item.guru_id,
          mapel_id: item.mapel_id,
          jenis: item.jenis,
        },
      });

      if (existing) {
        if (mode === 'overwrite') {
          await prisma.perangkatAjar.update({
            where: { id: existing.id },
            data: {
              judul: item.judul,
              file_url: item.file_url,
              fase: item.fase,
              tingkat: item.tingkat,
              total_alokasi_jp: item.total_alokasi_jp,
              konten_struktur_json: item.konten_struktur_json as any,
              preset_ref_id: item.preset_ref_id,
              status: 'PENDING',
              catatan_reviewer: null,
              reviewer_id: null,
              reviewed_at: null,
            },
          });
          copiedCount++;
        } else {
          skippedCount++;
        }
      } else {
        await prisma.perangkatAjar.create({
          data: {
            tenant_id: tenantId,
            guru_id: item.guru_id,
            mapel_id: item.mapel_id,
            tahun_pelajaran_id: target_tahun_pelajaran_id,
            semester_id: resolvedTargetSemId,
            judul: item.judul,
            jenis: item.jenis,
            file_url: item.file_url,
            fase: item.fase,
            tingkat: item.tingkat,
            total_alokasi_jp: item.total_alokasi_jp,
            konten_struktur_json: item.konten_struktur_json as any,
            preset_ref_id: item.preset_ref_id,
            status: 'PENDING',
          },
        });
        copiedCount++;
      }
    }

    await cacheInvalidationService.invalidateAcademicCache(tenantId);

    return {
      success: true,
      message: `Berhasil menyalin ${copiedCount} perangkat ajar ke tahun pelajaran target${skippedCount > 0 ? ` (${skippedCount} dilewati karena sudah ada)` : ''}`,
      copiedCount,
      skippedCount,
      totalSourceCount: sourceItems.length,
    };
  }
}

