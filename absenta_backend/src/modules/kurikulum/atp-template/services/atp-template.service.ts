import { prisma } from '@/utils/prisma';

export interface CreateTpTemplateInput {
  kode_tp: string;
  judul_materi: string;
  deskripsi_tp: string;
  alokasi_jp?: number;
  urutan?: number;
}

export interface UpsertAtpTemplateInput {
  id?: string;
  kode_mapel_ref: string;
  nama_mapel_ref: string;
  fase: string;
  tingkat?: number;
  nama_template: string;
  deskripsi?: string;
  sumber?: string;
  url_sumber?: string;
  tags?: string[];
  total_alokasi_jp?: number;
  status?: string;
  created_by?: string;
  tp_template: CreateTpTemplateInput[];
}

export interface ImportTemplateInput {
  mapel_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  guru_id: string;
  fase?: string;
}

export class AtpTemplateService {
  /**
   * List template ATP yang sudah PUBLISHED (untuk guru/publik)
   * atau semua status (untuk SUPERADMIN dengan includeDraft=true)
   */
  async listTemplates(filters: {
    fase?: string;
    kode_mapel_ref?: string;
    search?: string;
    includeDraft?: boolean;
  }) {
    const where: any = {};

    if (!filters.includeDraft) {
      where.status = 'PUBLISHED';
    }
    if (filters.fase) where.fase = filters.fase;
    if (filters.kode_mapel_ref) {
      where.kode_mapel_ref = { contains: filters.kode_mapel_ref, mode: 'insensitive' };
    }
    if (filters.search) {
      where.OR = [
        { nama_template: { contains: filters.search, mode: 'insensitive' } },
        { nama_mapel_ref: { contains: filters.search, mode: 'insensitive' } },
        { sumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.atpTemplate.findMany({
      where,
      include: {
        TpTemplate: { orderBy: { urutan: 'asc' } }
      },
      orderBy: [{ fase: 'asc' }, { nama_mapel_ref: 'asc' }, { created_at: 'desc' }]
    });
  }

  /**
   * Detail satu template by ID (include semua TP-nya)
   */
  async getTemplateById(id: string) {
    const template = await prisma.atpTemplate.findUnique({
      where: { id },
      include: { TpTemplate: { orderBy: { urutan: 'asc' } } }
    });

    if (!template) {
      const err: any = new Error('Template ATP tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    return template;
  }

  /**
   * Buat atau update template ATP + semua TP-nya (SUPERADMIN only)
   */
  async upsertTemplate(input: UpsertAtpTemplateInput) {
    const { id, tp_template = [], total_alokasi_jp, ...fields } = input;

    const calculatedJp = tp_template.reduce((sum, tp) => sum + (tp.alokasi_jp ?? 2), 0);
    const finalTotalJp = total_alokasi_jp ?? calculatedJp;

    return prisma.$transaction(async (tx: any) => {
      let record;

      if (id) {
        record = await tx.atpTemplate.update({
          where: { id },
          data: { ...fields, total_alokasi_jp: finalTotalJp }
        });
        // Hapus semua TP lama lalu buat ulang (replace strategy)
        await tx.atpTpTemplate.deleteMany({ where: { atp_template_id: id } });
      } else {
        record = await tx.atpTemplate.create({
          data: { ...fields, total_alokasi_jp: finalTotalJp }
        });
      }

      if (tp_template.length > 0) {
        await tx.atpTpTemplate.createMany({
          data: tp_template.map((tp, idx) => ({
            atp_template_id: record.id,
            kode_tp: tp.kode_tp || `TP ${idx + 1}`,
            judul_materi: tp.judul_materi,
            deskripsi_tp: tp.deskripsi_tp || '',
            alokasi_jp: tp.alokasi_jp ?? 2,
            urutan: typeof tp.urutan === 'number' ? tp.urutan : idx + 1
          }))
        });
      }

      return tx.atpTemplate.findUnique({
        where: { id: record.id },
        include: { TpTemplate: { orderBy: { urutan: 'asc' } } }
      });
    });
  }

  /**
   * Set status template: DRAFT atau PUBLISHED (SUPERADMIN only)
   */
  async setStatus(id: string, status: 'DRAFT' | 'PUBLISHED') {
    const existing = await prisma.atpTemplate.findUnique({ where: { id } });
    if (!existing) {
      const err: any = new Error('Template ATP tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return prisma.atpTemplate.update({ where: { id }, data: { status } });
  }

  /**
   * Hapus template (SUPERADMIN only) — cascade ke AtpTpTemplate
   */
  async deleteTemplate(id: string) {
    const existing = await prisma.atpTemplate.findUnique({ where: { id } });
    if (!existing) {
      const err: any = new Error('Template ATP tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    await prisma.atpTemplate.delete({ where: { id } });
    return { message: 'Template ATP berhasil dihapus' };
  }

  /**
   * Import (clone) template menjadi AlurTujuanPembelajaran milik guru.
   * Seluruh TP disalin — perubahan guru tidak mempengaruhi template asli.
   * Jika guru sudah punya ATP dengan kombinasi (guru+mapel+semester+fase) yang sama,
   * ATP tersebut akan di-overwrite TP-nya dengan TP dari template.
   */
  async importTemplateToAtp(
    tenantId: string,
    templateId: string,
    input: ImportTemplateInput
  ) {
    const template = await this.getTemplateById(templateId);

    if (template.status !== 'PUBLISHED') {
      const err: any = new Error('Template ini belum dipublikasikan dan tidak dapat diimpor');
      err.statusCode = 400;
      throw err;
    }

    const { mapel_id, tahun_pelajaran_id, semester_id, guru_id, fase } = input;
    const resolvedFase = fase || template.fase;

    return prisma.$transaction(async (tx: any) => {
      // Cek apakah ATP dengan kombinasi yang sama sudah ada
      const existing = await tx.alurTujuanPembelajaran.findFirst({
        where: { tenant_id: tenantId, guru_id, mapel_id, tahun_pelajaran_id, semester_id, fase: resolvedFase }
      });

      let atpRecord;

      if (existing) {
        // Sudah ada → update nama, deskripsi, JP lalu replace semua TP
        atpRecord = await tx.alurTujuanPembelajaran.update({
          where: { id: existing.id },
          data: {
            nama_atp: `${template.nama_mapel_ref} - ${template.nama_template}`,
            deskripsi: template.deskripsi,
            total_alokasi_jp: template.total_alokasi_jp,
            status: 'PUBLISHED'
          }
        });
        await tx.tujuanPembelajaran.deleteMany({
          where: { atp_id: existing.id, tenant_id: tenantId }
        });
      } else {
        // Belum ada → buat ATP baru
        atpRecord = await tx.alurTujuanPembelajaran.create({
          data: {
            tenant_id: tenantId,
            guru_id,
            mapel_id,
            tahun_pelajaran_id,
            semester_id,
            fase: resolvedFase,
            tingkat: template.tingkat,
            nama_atp: `${template.nama_mapel_ref} - ${template.nama_template}`,
            deskripsi: template.deskripsi,
            total_alokasi_jp: template.total_alokasi_jp,
            status: 'PUBLISHED'
          }
        });
      }

      // Clone semua TP dari template ke ATP guru
      if (template.TpTemplate.length > 0) {
        await tx.tujuanPembelajaran.createMany({
          data: template.TpTemplate.map((tp) => ({
            tenant_id: tenantId,
            atp_id: atpRecord.id,
            kode_tp: tp.kode_tp,
            judul_materi: tp.judul_materi,
            deskripsi_tp: tp.deskripsi_tp,
            alokasi_jp: tp.alokasi_jp,
            urutan: tp.urutan,
            is_completed: false
          }))
        });
      }

      return tx.alurTujuanPembelajaran.findUnique({
        where: { id: atpRecord.id },
        include: { TujuanPembelajaran: { orderBy: { urutan: 'asc' } } }
      });
    });
  }
}

export const atpTemplateService = new AtpTemplateService();
