/**
 * template-surat.service.ts
 * Layanan CRUD Template Surat Dinamis.
 *
 * Fitur:
 * - CRUD template surat dengan validasi tenant-scoped.
 * - Render template: mengganti variabel {{nama_siswa}}, {{kelas}}, {{tanggal}}, dll.
 * - Daftar variabel yang didukung setiap template tersimpan di kolom variabel_list (JSON).
 */

import { prisma } from '../../../utils/prisma';
import { z } from 'zod';

// ─── Validation Schema ────────────────────────────────────────────────────────

export const CreateTemplateSuratSchema = z.object({
  nama_template: z.string().min(3).max(100),
  kategori: z.string().optional().default('Umum'),
  isi_template: z.string().min(10),
  variabel_list: z.array(z.string()).optional().default([]),
  is_active: z.boolean().optional().default(true),
});

export const UpdateTemplateSuratSchema = CreateTemplateSuratSchema.partial();

export const RenderTemplateSuratSchema = z.object({
  template_id: z.string().uuid(),
  variabel: z.record(z.string()), // e.g. { "nama_siswa": "Budi", "kelas": "XII RPL 1" }
});

export type CreateTemplateSuratDto = z.infer<typeof CreateTemplateSuratSchema>;
export type UpdateTemplateSuratDto = z.infer<typeof UpdateTemplateSuratSchema>;
export type RenderTemplateSuratDto = z.infer<typeof RenderTemplateSuratSchema>;

// ─── Variabel Sistem yang Selalu Tersedia ────────────────────────────────────

/**
 * Semua variabel yang dikenali dan deskripsinya (untuk keperluan UI builder).
 */
export const SYSTEM_VARIABLES: { key: string; label: string; contoh: string }[] = [
  { key: 'nama_siswa',    label: 'Nama Lengkap Siswa',   contoh: 'Ahmad Fauzan' },
  { key: 'nis',           label: 'NIS Siswa',             contoh: '20240001' },
  { key: 'kelas',         label: 'Kelas Siswa',           contoh: 'XII RPL 1' },
  { key: 'jurusan',       label: 'Jurusan Siswa',         contoh: 'Rekayasa Perangkat Lunak' },
  { key: 'nama_ortu',     label: 'Nama Orang Tua/Wali',   contoh: 'Bapak Mahmud' },
  { key: 'tanggal',       label: 'Tanggal Hari Ini',      contoh: '11 Juli 2026' },
  { key: 'nomor_surat',   label: 'Nomor Surat',           contoh: '001/SK/VII/2026' },
  { key: 'nama_sekolah',  label: 'Nama Sekolah (Tenant)', contoh: 'SMK Negeri 1 Bandung' },
  { key: 'kepala_sekolah',label: 'Nama Kepala Sekolah',   contoh: 'Drs. H. Asep Kurnia, M.Pd.' },
  { key: 'tahun_ajaran',  label: 'Tahun Ajaran Aktif',    contoh: '2025/2026' },
  { key: 'isi_kasus',     label: 'Isi/Perihal Kasus',     contoh: 'Pelanggaran tata tertib sekolah' },
  { key: 'tanggal_kejadian', label: 'Tanggal Kejadian',   contoh: '10 Juli 2026' },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export class TemplateSuratService {
  /**
   * Ambil semua template untuk tenant, opsional filter kategori.
   */
  static async getAll(tenantId: string, query: { kategori?: string; is_active?: string }) {
    const where: any = { tenant_id: tenantId };
    if (query.kategori) where.kategori = query.kategori;
    if (query.is_active !== undefined) where.is_active = query.is_active === 'true';

    const list = await prisma.templateSurat.findMany({
      where,
      orderBy: [{ kategori: 'asc' }, { nama_template: 'asc' }],
      include: {
        CreatedBy: { select: { id: true, full_name: true } },
      },
    });

    // Parse variabel_list dari JSON string ke array
    return list.map((t) => ({
      ...t,
      variabel_list: t.variabel_list ? JSON.parse(t.variabel_list) : [],
    }));
  }

  /**
   * Ambil satu template berdasarkan ID.
   */
  static async getById(tenantId: string, id: string) {
    const template = await prisma.templateSurat.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        CreatedBy: { select: { id: true, full_name: true } },
      },
    });
    if (!template) return null;
    return {
      ...template,
      variabel_list: template.variabel_list ? JSON.parse(template.variabel_list) : [],
    };
  }

  /**
   * Buat template surat baru.
   */
  static async create(tenantId: string, userId: string, dto: CreateTemplateSuratDto) {
    const data = CreateTemplateSuratSchema.parse(dto);
    return prisma.templateSurat.create({
      data: {
        tenant_id: tenantId,
        created_by_id: userId,
        nama_template: data.nama_template,
        kategori: data.kategori,
        isi_template: data.isi_template,
        variabel_list: JSON.stringify(data.variabel_list),
        is_active: data.is_active,
      },
    });
  }

  /**
   * Update template surat.
   */
  static async update(tenantId: string, id: string, dto: UpdateTemplateSuratDto) {
    const data = UpdateTemplateSuratSchema.parse(dto);
    const existing = await prisma.templateSurat.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Template tidak ditemukan');

    const updateData: any = { ...data };
    if (data.variabel_list !== undefined) {
      updateData.variabel_list = JSON.stringify(data.variabel_list);
    }

    return prisma.templateSurat.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Hapus template surat (soft-delete: set is_active = false).
   */
  static async deactivate(tenantId: string, id: string) {
    const existing = await prisma.templateSurat.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Template tidak ditemukan');
    return prisma.templateSurat.update({
      where: { id },
      data: { is_active: false },
    });
  }

  /**
   * Hapus permanen template.
   */
  static async delete(tenantId: string, id: string) {
    const existing = await prisma.templateSurat.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Template tidak ditemukan');
    return prisma.templateSurat.delete({ where: { id } });
  }

  /**
   * Render template: ganti semua {{variabel}} dengan nilai yang diberikan.
   *
   * @param tenantId - ID tenant
   * @param templateId - ID template yang akan dirender
   * @param variabel - Map variabel dan nilainya
   * @returns HTML/teks hasil render
   */
  static async render(tenantId: string, templateId: string, variabel: Record<string, string>): Promise<string> {
    const template = await prisma.templateSurat.findFirst({
      where: { id: templateId, tenant_id: tenantId, is_active: true },
    });
    if (!template) throw new Error('Template tidak ditemukan atau tidak aktif');

    let output = template.isi_template;

    // Ganti semua {{variabel}} secara case-insensitive dan bersih
    for (const [key, value] of Object.entries(variabel)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      output = output.replace(regex, value ?? '');
    }

    // Bersihkan sisa variabel yang tidak tersedia → tampilkan kosong
    output = output.replace(/\{\{[^}]+\}\}/g, '');

    return output;
  }

  /**
   * Kembalikan daftar variabel sistem yang tersedia untuk ditampilkan di UI builder.
   */
  static getSystemVariables() {
    return SYSTEM_VARIABLES;
  }
}
