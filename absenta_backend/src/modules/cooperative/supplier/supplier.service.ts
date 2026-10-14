// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { prisma } from '@/utils/prisma';

export interface CreateSupplierInput {
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierInput extends Partial<CreateSupplierInput> {
  isActive?: boolean;
}

export class SupplierService {
  /**
   * Mengambil semua data supplier per tenant dengan agregat statistik pembelian (Optimized Single Query)
   */
  static async findAll(tenantId: string, includeInactive = false) {
    const suppliers = await prisma.coopSupplier.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true })
      },
      include: {
        _count: {
          select: { stockIns: true }
        },
        stockIns: {
          select: {
            shippingFee: true,
            items: {
              select: {
                quantity: true,
                costPrice: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return suppliers.map((sup: any) => {
      const totalPurchases = sup._count?.stockIns ?? (sup.stockIns ? sup.stockIns.length : 0);
      const totalValue = (sup.stockIns || []).reduce((sum: number, si: any) => {
        const siTotal = (si.items || []).reduce(
          (s: number, item: any) => s + (Number(item.quantity) || 0) * (Number(item.costPrice) || 0),
          0
        );
        return sum + siTotal + (Number(si.shippingFee) || 0);
      }, 0);

      const { stockIns, _count, ...rest } = sup;
      return {
        ...rest,
        totalPurchases,
        totalValue
      };
    });
  }

  /**
   * Mengambil detail supplier beserta riwayat pasokan barang masuk (Stock In)
   */
  static async findById(id: string, tenantId: string) {
    const supplier = await prisma.coopSupplier.findFirst({
      where: { id, tenantId },
      include: {
        stockIns: {
          include: {
            items: {
              include: {
                Product: { select: { name: true, code: true, unit: true } }
              }
            }
          },
          orderBy: { date: 'desc' },
          take: 50
        }
      }
    });

    if (!supplier) return null;

    const totalValue = (supplier.stockIns || []).reduce((sum: number, si: any) => {
      const itemsTotal = (si.items || []).reduce(
        (s: number, item: any) => s + (Number(item.quantity) || 0) * (Number(item.costPrice) || 0),
        0
      );
      return sum + itemsTotal + (Number(si.shippingFee) || 0);
    }, 0);

    return {
      ...supplier,
      totalPurchases: supplier.stockIns?.length || 0,
      totalValue,
      stockIns: supplier.stockIns || []
    };
  }

  /**
   * Mendaftarkan supplier baru
   */
  static async create(tenantId: string, data: CreateSupplierInput) {
    const name = data.name.trim();
    return prisma.coopSupplier.create({
      data: {
        tenantId,
        name,
        contact: data.contact?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
        isActive: true
      }
    });
  }

  /**
   * Memperbarui informasi supplier
   */
  static async update(id: string, tenantId: string, data: UpdateSupplierInput) {
    const supplier = await prisma.coopSupplier.findFirst({ where: { id, tenantId } });
    if (!supplier) throw new Error('Supplier tidak ditemukan');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.contact !== undefined) updateData.contact = data.contact?.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    return prisma.coopSupplier.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Nonaktifkan supplier (Soft delete)
   */
  static async delete(id: string, tenantId: string) {
    const supplier = await prisma.coopSupplier.findFirst({ where: { id, tenantId } });
    if (!supplier) throw new Error('Supplier tidak ditemukan');

    return prisma.coopSupplier.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Cari atau daftarkan supplier otomatis berdasarkan nama (misalnya dari formulir barang masuk raw)
   */
  static async findOrCreate(tenantId: string, name: string) {
    const trimmed = name.trim();
    const existing = await prisma.coopSupplier.findFirst({
      where: {
        tenantId,
        name: { equals: trimmed, mode: 'insensitive' }
      }
    });

    if (existing) return existing;

    return prisma.coopSupplier.create({
      data: { tenantId, name: trimmed, isActive: true }
    });
  }
}
