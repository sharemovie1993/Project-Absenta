// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '../../../utils/prisma';
import { activityLogService } from '../../activity/services/activity-log.service';

export interface CreateProductCategoryDto {
  code: string;
  name: string;
  description?: string;
  order?: number;
}

export class ProductCategoryService {
  /**
   * JIT (Just In Time) initialization of default categories for a tenant.
   * Uses Indonesian names explicitly.
   */
  static async ensureDefaultCategories(tenantId: string, tx?: any) {
    const client = tx || prisma;
    const defaults = [
      {
        code: 'MAKANAN',
        name: 'Makanan',
        description: 'Snack, biskuit, roti, kue, mie instan, es krim, dan camilan.',
        order: 1,
      },
      {
        code: 'MINUMAN',
        name: 'Minuman',
        description: 'Air mineral, teh, susu, jus, kopi, dan aneka minuman dingin.',
        order: 2,
      },
      {
        code: 'ALAT_TULIS',
        name: 'Alat Tulis',
        description: 'Buku tulis, pulpen, pensil, map, penghapus, penggaris, lem, dan ATK.',
        order: 3,
      },
      {
        code: 'BUKU_PELAJARAN',
        name: 'Buku Pelajaran',
        description: 'Buku paket kurikulum, modul ajar, LKS, dan kamus pelajaran.',
        order: 4,
      },
      {
        code: 'SERAGAM',
        name: 'Seragam',
        description: 'Seragam sekolah, olahraga, pramuka, batik, dasi, topi, dan atribut.',
        order: 5,
      },
      {
        code: 'KACAMATA',
        name: 'Kacamata & Optik',
        description: 'Frame kacamata, lensa radiasi, pembersih, dan kerja sama optik luar.',
        order: 6,
      },
      {
        code: 'ELEKTRONIK',
        name: 'Elektronik',
        description: 'Kalkulator, flashdisk, mouse, headset, kabel charger, dan baterai.',
        order: 7,
      },
      {
        code: 'PERAWATAN_KEBERSIHAN',
        name: 'Perawatan & Kebersihan',
        description: 'Sabun, sampo, pembersih muka, deodoran, parfum, detergen, tisu, dan alat kebersihan.',
        order: 8,
      },
      {
        code: 'KESEHATAN',
        name: 'Kesehatan & Obat',
        description: 'Minyak kayu putih/telon, plester, vitamin, masker, dan obat P3K.',
        order: 9,
      },
      {
        code: 'KARYA_SISWA',
        name: 'Karya Siswa',
        description: 'Produk kreatif jurusan/teaching factory dan merchandise sekolah.',
        order: 10,
      },
      {
        code: 'LAIN_LAIN',
        name: 'Lain-lain',
        description: 'Barang umum lainnya yang belum masuk 10 kelompok di atas.',
        order: 11,
      }
    ];

    await client.productCategory.createMany({
      data: defaults.map((d) => ({
        tenantId,
        code: d.code,
        name: d.name,
        description: d.description,
        order: d.order,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Automatically registers a typed category string when a product is saved.
   * Ensures backwards compatibility with old POST requests / mobile apps.
   */
  static async ensureCategoryExists(tenantId: string, categoryName: string, tx?: any) {
    if (!categoryName || !categoryName.trim()) return;
    const nameClean = categoryName.trim();
    const code = nameClean.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
    if (!code) return;

    const client = tx || prisma;

    const existing = await client.productCategory.findFirst({
      where: {
        tenantId,
        OR: [
          { name: { equals: nameClean, mode: 'insensitive' } },
          { code: { equals: code, mode: 'insensitive' } }
        ]
      }
    });

    if (!existing) {
      const created = await client.productCategory.create({
        data: {
          tenantId,
          code,
          name: nameClean,
          isActive: true,
          order: 99
        }
      });

      // Log creation
      activityLogService.logEvent({
        event_type: 'COOP_CATEGORY_CREATED',
        tenant_id: tenantId,
        user_id: null,
        entity: 'ProductCategory',
        entity_id: created.id,
        metadata: {
          categoryName: nameClean,
          code,
          description: `Kategori baru "${nameClean}" didaftarkan secara otomatis melalui penyimpanan produk`
        }
      });
    }
  }

  /**
   * Get all active categories for a tenant.
   */
  static async getCategories(tenantId: string) {
    await this.ensureDefaultCategories(tenantId);
    return prisma.productCategory.findMany({
      where: { tenantId, isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Create a custom category.
   */
  static async createCategory(tenantId: string, name: string, description?: string, operatorId?: string | null) {
    if (!name || !name.trim()) {
      throw new Error('Nama kategori wajib diisi.');
    }

    await this.ensureDefaultCategories(tenantId);

    const nameClean = name.trim();
    const code = nameClean.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');

    // Check duplicate name or code
    const duplicate = await prisma.productCategory.findFirst({
      where: {
        tenantId,
        OR: [
          { name: { equals: nameClean, mode: 'insensitive' } },
          { code: { equals: code, mode: 'insensitive' } }
        ]
      }
    });

    if (duplicate) {
      throw new Error('Kategori dengan nama atau kode serupa sudah terdaftar.');
    }

    const lastCat = await prisma.productCategory.findFirst({
      where: { tenantId },
      orderBy: { order: 'desc' }
    });
    const order = lastCat ? lastCat.order + 1 : 1;

    const category = await prisma.productCategory.create({
      data: {
        tenantId,
        code,
        name: nameClean,
        description,
        order,
        isActive: true,
      }
    });

    // Log creation
    activityLogService.logEvent({
      event_type: 'COOP_CATEGORY_CREATED',
      tenant_id: tenantId,
      user_id: operatorId || null,
      entity: 'ProductCategory',
      entity_id: category.id,
      metadata: {
        categoryName: nameClean,
        code,
        description: `Membuat kategori produk baru "${nameClean}"`
      }
    });

    return category;
  }

  /**
   * Update category details.
   */
  static async updateCategory(id: string, tenantId: string, name: string, description?: string, operatorId?: string | null) {
    if (!name || !name.trim()) {
      throw new Error('Nama kategori wajib diisi.');
    }

    const nameClean = name.trim();
    const code = nameClean.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');

    // Ensure we are updating a category owned by the tenant
    const cat = await prisma.productCategory.findFirst({
      where: { id, tenantId }
    });
    if (!cat) {
      throw new Error('Kategori tidak ditemukan.');
    }

    // Check if new name or code conflicts with another category
    const duplicate = await prisma.productCategory.findFirst({
      where: {
        tenantId,
        id: { not: id },
        OR: [
          { name: { equals: nameClean, mode: 'insensitive' } },
          { code: { equals: code, mode: 'insensitive' } }
        ]
      }
    });

    if (duplicate) {
      throw new Error('Nama kategori sudah digunakan oleh kategori lain.');
    }

    // Update the ProductCategory record
    const updated = await prisma.productCategory.update({
      where: { id },
      data: {
        name: nameClean,
        code,
        description
      }
    });

    // Cascade name update to products matching the old category name string
    await prisma.product.updateMany({
      where: { tenantId, category: cat.name },
      data: { category: nameClean }
    });

    // Log update
    activityLogService.logEvent({
      event_type: 'COOP_CATEGORY_UPDATED',
      tenant_id: tenantId,
      user_id: operatorId || null,
      entity: 'ProductCategory',
      entity_id: id,
      metadata: {
        oldName: cat.name,
        newName: nameClean,
        description: `Mengubah nama kategori produk "${cat.name}" menjadi "${nameClean}"`
      }
    });

    return updated;
  }

  /**
   * Delete a category if not in use.
   */
  static async deleteCategory(id: string, tenantId: string, operatorId?: string | null) {
    const cat = await prisma.productCategory.findFirst({
      where: { id, tenantId }
    });
    if (!cat) {
      throw new Error('Kategori tidak ditemukan.');
    }

    // Check if any product is currently associated with this category string
    const count = await prisma.product.count({
      where: { tenantId, category: cat.name }
    });

    if (count > 0) {
      throw new Error(`Kategori "${cat.name}" sedang digunakan oleh ${count} produk dan tidak dapat dihapus.`);
    }

    const deleted = await prisma.productCategory.delete({
      where: { id }
    });

    // Log deletion
    activityLogService.logEvent({
      event_type: 'COOP_CATEGORY_DELETED',
      tenant_id: tenantId,
      user_id: operatorId || null,
      entity: 'ProductCategory',
      entity_id: id,
      metadata: {
        categoryName: cat.name,
        description: `Menghapus kategori produk "${cat.name}"`
      }
    });

    return deleted;
  }
}
