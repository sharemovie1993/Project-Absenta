import { prisma } from '@/utils/prisma';
import { DataScope } from '../../../../types/fastify';
import { Hari } from '@prisma/client';

export interface CreateJadwalKegiatanInput {
  nama: string;
  jenis_kegiatan: string;
  hari: Hari[];
  waktu_mulai: string;
  waktu_selesai?: string | null;
  target_semua_kelas: boolean;
  target_kelas_ids?: string[];
  berlaku_mulai: string; // YYYY-MM-DD
  berlaku_sampai?: string | null; // YYYY-MM-DD
  tahun_pelajaran_id: string;
}

export interface UpdateJadwalKegiatanInput {
  nama?: string;
  jenis_kegiatan?: string;
  hari?: Hari[];
  waktu_mulai?: string;
  waktu_selesai?: string | null;
  target_semua_kelas?: boolean;
  target_kelas_ids?: string[];
  berlaku_mulai?: string;
  berlaku_sampai?: string | null;
  aktif?: boolean;
}

export class JadwalKegiatanService {
  async getAll(scope: DataScope, activeOnly = false) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    return prisma.jadwalKegiatan.findMany({
      where: {
        tenant_id: scope.tenantId,
        ...(activeOnly ? { aktif: true } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getById(scope: DataScope, id: string) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    const record = await prisma.jadwalKegiatan.findFirst({
      where: { id, tenant_id: scope.tenantId },
    });

    if (!record) {
      throw new Error('Jadwal Kegiatan tidak ditemukan atau akses ditolak');
    }

    return record;
  }

  async create(scope: DataScope, userId: string, input: CreateJadwalKegiatanInput) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    // Validasi format jam
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(input.waktu_mulai) || (input.waktu_selesai && !timeRegex.test(input.waktu_selesai))) {
      throw new Error('Format waktu_mulai dan waktu_selesai harus HH:mm');
    }

    return prisma.jadwalKegiatan.create({
      data: {
        tenant_id: scope.tenantId,
        nama: input.nama,
        jenis_kegiatan: input.jenis_kegiatan,
        hari: input.hari,
        waktu_mulai: input.waktu_mulai,
        waktu_selesai: input.waktu_selesai || null,
        target_semua_kelas: input.target_semua_kelas,
        target_kelas_ids: input.target_kelas_ids || [],
        berlaku_mulai: new Date(input.berlaku_mulai),
        berlaku_sampai: input.berlaku_sampai ? new Date(input.berlaku_sampai) : null,
        tahun_pelajaran_id: input.tahun_pelajaran_id,
        dibuat_oleh: userId,
        aktif: true,
      },
    });
  }

  async update(scope: DataScope, id: string, input: UpdateJadwalKegiatanInput) {
    // Pastikan record ada dan milik tenant tersebut
    await this.getById(scope, id);

    const data: any = {};
    if (input.nama !== undefined) data.nama = input.nama;
    if (input.jenis_kegiatan !== undefined) data.jenis_kegiatan = input.jenis_kegiatan;
    if (input.hari !== undefined) data.hari = input.hari;
    if (input.waktu_mulai !== undefined) data.waktu_mulai = input.waktu_mulai;
    if (input.waktu_selesai !== undefined) data.waktu_selesai = input.waktu_selesai;
    if (input.target_semua_kelas !== undefined) data.target_semua_kelas = input.target_semua_kelas;
    if (input.target_kelas_ids !== undefined) data.target_kelas_ids = input.target_kelas_ids;
    if (input.berlaku_mulai !== undefined) data.berlaku_mulai = new Date(input.berlaku_mulai);
    if (input.berlaku_sampai !== undefined) data.berlaku_sampai = input.berlaku_sampai ? new Date(input.berlaku_sampai) : null;
    if (input.aktif !== undefined) data.aktif = input.aktif;

    return prisma.jadwalKegiatan.update({
      where: { id },
      data,
    });
  }

  async delete(scope: DataScope, id: string) {
    await this.getById(scope, id);

    return prisma.jadwalKegiatan.delete({
      where: { id },
    });
  }
}

export const jadwalKegiatanService = new JadwalKegiatanService();
