import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateSupplierInput {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateSupplierInput extends Partial<CreateSupplierInput> {
  isActive?: boolean;
}

export class SupplierService {
  // ─── List all active suppliers for a tenant ───────────────────────────────
  static async findAll(tenantId: string, includeInactive = false) {
    const suppliers = await prisma.coopSupplier.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true })
      },
      include: {
        _count: {
          select: { stockIns: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate total purchase value per supplier
    const suppliersWithStats = await Promise.all(
      suppliers.map(async (sup) => {
        const stockIns = await prisma.coopStockIn.findMany({
          where: { supplierId: sup.id },
          include: {
            items: { select: { quantity: true, costPrice: true } }
          }
        });

        const totalValue = stockIns.reduce((sum, si) => {
          const siTotal = si.items.reduce(
            (s, item) => s + item.quantity * Number(item.costPrice),
            0
          );
          return sum + siTotal + Number(si.shippingFee || 0);
        }, 0);

        return {
          ...sup,
          totalPurchases: sup._count.stockIns,
          totalValue,
          _count: undefined
        };
      })
    );

    return suppliersWithStats;
  }

  // ─── Get single supplier with purchase history ────────────────────────────
  static async findById(id: string, tenantId: string) {
    const supplier = await prisma.coopSupplier.findFirst({
      where: { id, tenantId }
    });

    if (!supplier) return null;

    const stockIns = await prisma.coopStockIn.findMany({
      where: { supplierId: id },
      include: {
        items: {
          include: {
            Product: { select: { name: true, code: true, unit: true } }
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 50
    });

    const totalValue = stockIns.reduce((sum, si) => {
      return sum + si.items.reduce((s, item) => s + item.quantity * Number(item.costPrice), 0)
        + Number(si.shippingFee || 0);
    }, 0);

    return {
      ...supplier,
      totalPurchases: stockIns.length,
      totalValue,
      stockIns
    };
  }

  // ─── Create new supplier ──────────────────────────────────────────────────
  static async create(tenantId: string, data: CreateSupplierInput) {
    return prisma.coopSupplier.create({
      data: {
        tenantId,
        name: data.name.trim(),
        contact: data.contact?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
        isActive: true
      }
    });
  }

  // ─── Update supplier ──────────────────────────────────────────────────────
  static async update(id: string, tenantId: string, data: UpdateSupplierInput) {
    const supplier = await prisma.coopSupplier.findFirst({ where: { id, tenantId } });
    if (!supplier) throw new Error('Supplier tidak ditemukan');

    return prisma.coopSupplier.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.contact !== undefined && { contact: data.contact?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    });
  }

  // ─── Soft delete (deactivate) supplier ───────────────────────────────────
  static async delete(id: string, tenantId: string) {
    const supplier = await prisma.coopSupplier.findFirst({ where: { id, tenantId } });
    if (!supplier) throw new Error('Supplier tidak ditemukan');

    return prisma.coopSupplier.update({
      where: { id },
      data: { isActive: false }
    });
  }

  // ─── Find or create supplier by name (used when stock-in has raw name) ────
  static async findOrCreate(tenantId: string, name: string) {
    const existing = await prisma.coopSupplier.findFirst({
      where: {
        tenantId,
        name: { equals: name.trim(), mode: 'insensitive' }
      }
    });

    if (existing) return existing;

    return prisma.coopSupplier.create({
      data: { tenantId, name: name.trim() }
    });
  }
}
