import { prisma } from '../../../utils/prisma';
import { Prisma } from '@prisma/client';

export class SuratKeluarService {
  static async getAll(tenantId: string, query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    kategori_surat?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.SuratKeluarWhereInput = {
      tenant_id: tenantId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.kategori_surat) {
      where.kategori_surat = query.kategori_surat;
    }

    if (query.search) {
      where.OR = [
        { nomor_surat: { contains: query.search, mode: 'insensitive' } },
        { judul: { contains: query.search, mode: 'insensitive' } },
        { tujuan_surat: { contains: query.search, mode: 'insensitive' } },
        { isi_ringkas: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, list] = await Promise.all([
      prisma.suratKeluar.count({ where }),
      prisma.suratKeluar.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: { select: { nama_kelas: true } }
            }
          },
          CreatedBy: {
            select: { id: true, full_name: true }
          },
          ApprovedBy: {
            select: { id: true, full_name: true }
          }
        }
      })
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  static async getById(tenantId: string, id: string) {
    return prisma.suratKeluar.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            Kelas: { select: { nama_kelas: true } }
          }
        },
        CreatedBy: {
          select: { id: true, full_name: true }
        },
        ApprovedBy: {
          select: { id: true, full_name: true }
        }
      }
    });
  }

  static async generateNomorSurat(tenantId: string, kategori: string) {
    const currentYear = new Date().getFullYear();
    const count = await prisma.suratKeluar.count({
      where: {
        tenant_id: tenantId,
        tanggal_surat: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`)
        }
      }
    });
    const runningNum = String(count + 1).padStart(3, '0');
    let kodeSeksi = 'Dinas';
    if (kategori === 'Undangan') kodeSeksi = 'Humas';
    else if (kategori === 'Panggilan' || kategori === 'Keterangan') kodeSeksi = 'Kesiswaan';
    else if (kategori === 'Kurikulum') kodeSeksi = 'Kurikulum';

    return `800 / ${runningNum} / ${kodeSeksi} / ${currentYear}`;
  }

  static async create(tenantId: string, userId: string, data: {
    nomor_surat?: string;
    judul: string;
    tujuan_surat?: string;
    tanggal_surat?: string;
    isi_ringkas?: string;
    dokumen_url?: string;
    kategori_surat?: string;
    siswa_id?: string;
  }) {
    const kategori = data.kategori_surat || 'Dinas';
    const nomor = data.nomor_surat || await this.generateNomorSurat(tenantId, kategori);

    return prisma.suratKeluar.create({
      data: {
        tenant_id: tenantId,
        nomor_surat: nomor,
        judul: data.judul,
        tujuan_surat: data.tujuan_surat || null,
        tanggal_surat: data.tanggal_surat ? new Date(data.tanggal_surat) : new Date(),
        isi_ringkas: data.isi_ringkas || null,
        dokumen_url: data.dokumen_url || null,
        kategori_surat: kategori,
        siswa_id: data.siswa_id || null,
        created_by_id: userId,
        status: 'DRAFT'
      }
    });
  }

  static async update(tenantId: string, id: string, data: {
    nomor_surat?: string;
    judul?: string;
    tujuan_surat?: string;
    tanggal_surat?: string;
    isi_ringkas?: string;
    dokumen_url?: string;
    kategori_surat?: string;
    siswa_id?: string;
    status?: string;
  }) {
    const updateData: any = { ...data };
    if (data.tanggal_surat) updateData.tanggal_surat = new Date(data.tanggal_surat);

    const existing = await prisma.suratKeluar.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Surat Keluar tidak ditemukan');

    return prisma.suratKeluar.update({
      where: { id },
      data: updateData
    });
  }

  static async delete(tenantId: string, id: string) {
    const existing = await prisma.suratKeluar.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Surat Keluar tidak ditemukan');

    return prisma.suratKeluar.delete({ where: { id } });
  }

  static async sign(tenantId: string, id: string, approvedById: string, approvedStatus: 'DIKIRIM' | 'DITOLAK') {
    const existing = await prisma.suratKeluar.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Surat Keluar tidak ditemukan');

    const updated = await prisma.suratKeluar.update({
      where: { id },
      data: {
        status: approvedStatus,
        approved_by_id: approvedStatus === 'DIKIRIM' ? approvedById : null
      }
    });

    // Sync status back to PemanggilanOrangTua if this is a summons letter
    if (approvedStatus === 'DIKIRIM' && existing.kategori_surat === 'Panggilan' && existing.siswa_id) {
      const latestSummons = await prisma.pemanggilanOrangTua.findFirst({
        where: {
          tenant_id: tenantId,
          siswa_id: existing.siswa_id,
          status: 'BARU'
        },
        orderBy: { created_at: 'desc' }
      });

      if (latestSummons) {
        await prisma.pemanggilanOrangTua.update({
          where: { id: latestSummons.id },
          data: { status: 'DIKIRIM' }
        });

        // Trigger WhatsApp notification to parent
        try {
          const { BpbkService } = await import('../../bpbk/services/bpbk.service');
          await BpbkService.sendSummonsToParentWhatsApp(tenantId, latestSummons.id);
        } catch (e) {
          console.error('[SuratKeluar Sync] Failed to trigger parent WhatsApp:', e);
        }
      }
    }

    return updated;
  }
}