import { prisma } from '@/utils/prisma';
import { TipeDenah } from '@prisma/client';

export interface DenahElementNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  flip_h?: boolean;
  flip_v?: boolean;
  posisi_pintu?: 'BAWAH' | 'ATAS' | 'KIRI' | 'KANAN' | 'TIDAK_ADA';
  label_utama: string; // e.g. "R.01", "LAB TKJ 1", "TOILET"
  label_sub?: string; // e.g. "X TJKT 1"
  kategori_ruang: 'RUANG_UJIAN' | 'LAB' | 'TOILET' | 'KANTOR' | 'PERPUSTAKAAN' | 'LAPANGAN' | 'KORIDOR' | 'LAINNYA';
  warna_bg?: string;
  warna_border?: string;
  warna_teks?: string;
  kelas_id?: string;
  ruang_id?: string;
  kapasitas?: number;
  catatan?: string;
}

export interface CreateDenahInput {
  nama_denah: string;
  tipe?: TipeDenah;
  event_cbt_id?: string | null;
  lantai?: number;
  gedung?: string | null;
  canvas_width?: number;
  canvas_height?: number;
  grid_size?: number;
  elements?: DenahElementNode[];
}

export interface UpdateDenahInput {
  nama_denah?: string;
  tipe?: TipeDenah;
  event_cbt_id?: string | null;
  lantai?: number;
  gedung?: string | null;
  canvas_width?: number;
  canvas_height?: number;
  grid_size?: number;
  elements?: DenahElementNode[];
  is_active?: boolean;
}

export class DenahSpasialService {
  /**
   * Mengambil daftar denah dengan filter
   */
  static async list(tenantId: string, filter: {
    tipe?: TipeDenah;
    event_cbt_id?: string;
    gedung?: string;
    lantai?: number;
  } = {}) {
    const where: any = { tenant_id: tenantId, is_active: true };

    if (filter.tipe) {
      where.tipe = filter.tipe;
    }
    if (filter.event_cbt_id) {
      where.event_cbt_id = filter.event_cbt_id;
    }
    if (filter.gedung) {
      where.gedung = filter.gedung;
    }
    if (filter.lantai !== undefined && !isNaN(Number(filter.lantai))) {
      where.lantai = Number(filter.lantai);
    }

    return prisma.denahSpasial.findMany({
      where,
      orderBy: [{ lantai: 'asc' }, { created_at: 'desc' }],
    });
  }

  /**
   * Ambil detail denah berdasarkan ID
   */
  static async getById(tenantId: string, id: string) {
    const denah = await prisma.denahSpasial.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!denah) {
      throw new Error('Denah spasial tidak ditemukan');
    }

    return denah;
  }

  /**
   * Buat denah spasial baru
   */
  static async create(tenantId: string, input: CreateDenahInput) {
    if (!input.nama_denah || !input.nama_denah.trim()) {
      throw new Error('Nama denah wajib diisi');
    }

    return prisma.denahSpasial.create({
      data: {
        tenant_id: tenantId,
        nama_denah: input.nama_denah.trim(),
        tipe: input.tipe || 'MASTER_SARPRAS',
        event_cbt_id: input.event_cbt_id || null,
        lantai: input.lantai ?? 1,
        gedung: input.gedung?.trim() || null,
        canvas_width: input.canvas_width || 1920,
        canvas_height: input.canvas_height || 1080,
        grid_size: input.grid_size || 20,
        elements: (input.elements || []) as any,
      },
    });
  }

  /**
   * Update denah spasial (posisi node, ukuran, rotasi, elemen baru)
   */
  static async update(tenantId: string, id: string, input: UpdateDenahInput) {
    const existing = await this.getById(tenantId, id);

    const updateData: any = {};
    if (input.nama_denah !== undefined) updateData.nama_denah = input.nama_denah.trim();
    if (input.tipe !== undefined) updateData.tipe = input.tipe;
    if (input.event_cbt_id !== undefined) updateData.event_cbt_id = input.event_cbt_id;
    if (input.lantai !== undefined) updateData.lantai = Number(input.lantai);
    if (input.gedung !== undefined) updateData.gedung = input.gedung ? input.gedung.trim() : null;
    if (input.canvas_width !== undefined) updateData.canvas_width = Number(input.canvas_width);
    if (input.canvas_height !== undefined) updateData.canvas_height = Number(input.canvas_height);
    if (input.grid_size !== undefined) updateData.grid_size = Number(input.grid_size);
    if (input.elements !== undefined) updateData.elements = input.elements;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    return prisma.denahSpasial.update({
      where: { id: existing.id },
      data: updateData,
    });
  }

  /**
   * Hapus denah spasial (soft delete atau hard delete)
   */
  static async delete(tenantId: string, id: string) {
    const existing = await this.getById(tenantId, id);
    return prisma.denahSpasial.delete({
      where: { id: existing.id },
    });
  }

  /**
   * Kloning denah (misal Sarpras Master di-clone untuk Event Ujian CBT)
   */
  static async clone(tenantId: string, sourceId: string, options: {
    nama_denah: string;
    tipe: TipeDenah;
    event_cbt_id?: string | null;
  }) {
    const source = await this.getById(tenantId, sourceId);

    return prisma.denahSpasial.create({
      data: {
        tenant_id: tenantId,
        nama_denah: options.nama_denah || `${source.nama_denah} (Copy)`,
        tipe: options.tipe,
        event_cbt_id: options.event_cbt_id || null,
        lantai: source.lantai,
        gedung: source.gedung,
        canvas_width: source.canvas_width,
        canvas_height: source.canvas_height,
        grid_size: source.grid_size,
        elements: source.elements as any,
      },
    });
  }
}
