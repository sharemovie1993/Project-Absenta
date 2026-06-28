import { prisma } from '../../../utils/prisma';
import { Prisma } from '@prisma/client';

export class SuratMasukService {
  static async getAll(tenantId: string, query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.SuratMasukWhereInput = {
      tenant_id: tenantId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { nomor_surat: { contains: query.search, mode: 'insensitive' } },
        { judul: { contains: query.search, mode: 'insensitive' } },
        { asal_surat: { contains: query.search, mode: 'insensitive' } },
        { ringkasan: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, list] = await Promise.all([
      prisma.suratMasuk.count({ where }),
      prisma.suratMasuk.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal_terima: 'desc' },
        include: {
          PenerimaDisposisi: {
            select: {
              id: true,
              full_name: true,
              email: true,
              Guru: { select: { nama_guru: true } }
            }
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
    return prisma.suratMasuk.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        PenerimaDisposisi: {
          select: {
            id: true,
            full_name: true,
            email: true,
            Guru: { select: { nama_guru: true } }
          }
        }
      }
    });
  }

  static async create(tenantId: string, data: {
    nomor_surat: string;
    judul: string;
    asal_surat?: string;
    tanggal_surat: string;
    tanggal_terima?: string;
    ringkasan?: string;
    dokumen_url?: string;
  }) {
    return prisma.suratMasuk.create({
      data: {
        tenant_id: tenantId,
        nomor_surat: data.nomor_surat,
        judul: data.judul,
        asal_surat: data.asal_surat || null,
        tanggal_surat: new Date(data.tanggal_surat),
        tanggal_terima: data.tanggal_terima ? new Date(data.tanggal_terima) : new Date(),
        ringkasan: data.ringkasan || null,
        dokumen_url: data.dokumen_url || null,
        status: 'BARU'
      }
    });
  }

  static async update(tenantId: string, id: string, data: {
    nomor_surat?: string;
    judul?: string;
    asal_surat?: string;
    tanggal_surat?: string;
    tanggal_terima?: string;
    ringkasan?: string;
    dokumen_url?: string;
    status?: string;
  }) {
    const updateData: any = { ...data };
    if (data.tanggal_surat) updateData.tanggal_surat = new Date(data.tanggal_surat);
    if (data.tanggal_terima) updateData.tanggal_terima = new Date(data.tanggal_terima);

    const existing = await prisma.suratMasuk.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Surat Masuk tidak ditemukan');

    return prisma.suratMasuk.update({
      where: { id },
      data: updateData
    });
  }

  static async delete(tenantId: string, id: string) {
    const existing = await prisma.suratMasuk.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Surat Masuk tidak ditemukan');

    return prisma.suratMasuk.delete({ where: { id } });
  }

  static async disposisi(tenantId: string, id: string, data: {
    instruksi: string;
    penerima_id: string;
  }) {
    const existing = await prisma.suratMasuk.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Surat Masuk tidak ditemukan');

    return prisma.suratMasuk.update({
      where: { id },
      data: {
        disposisi_instruksi: data.instruksi,
        penerima_disposisi_id: data.penerima_id,
        status: 'DISPOSISI'
      }
    });
  }
}