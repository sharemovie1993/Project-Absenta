// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { AccountingService } from '../laporan/accounting.service';
import { activityLogService } from '../../activity/services/activity-log.service';

export class OpnameService {
    // List all sessions for a tenant
    static async getSessions(tenantId: string) {
        return prisma.coopStockOpname.findMany({
            where: { tenantId },
            orderBy: { date: 'desc' },
            include: {
                items: {
                    include: {
                        Product: true
                    }
                }
            }
        });
    }

    // Get a specific session
    static async getSessionById(id: string, tenantId: string) {
        return prisma.coopStockOpname.findFirst({
            where: { id, tenantId },
            include: {
                items: {
                    include: {
                        Product: true
                    }
                }
            }
        });
    }

    // Create a new opname session in DRAFT status
    static async createSession(tenantId: string, operatorId: string | null, notes?: string, categoryFilter?: string) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        
        // Count existing sessions for today to generate sequential number
        const startOfDay = new Date(new Date(now).setHours(0,0,0,0));
        const endOfDay = new Date(new Date(now).setHours(23,59,59,999));
        
        const countToday = await prisma.coopStockOpname.count({
            where: {
                tenantId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });
        
        const opnameNumber = `OPN-${dateStr}-${String(countToday + 1).padStart(4, '0')}`;

        // Get products matching the tenant and optionally the category filter
        const productWhere: any = { tenantId };
        if (categoryFilter && categoryFilter !== 'ALL') {
            productWhere.category = categoryFilter;
        }
        
        const products = await prisma.product.findMany({
            where: productWhere
        });

        if (products.length === 0) {
            throw new Error('Tidak ada produk untuk dilakukan opname.');
        }

        // Create the session and session items inside a transaction
        return prisma.$transaction(async (tx) => {
            const session = await tx.coopStockOpname.create({
                data: {
                    tenantId,
                    opnameNumber,
                    status: 'DRAFT',
                    notes: notes || null,
                    operatorId,
                    date: new Date()
                }
            });

            const itemsData = products.map(prod => ({
                opnameId: session.id,
                productId: prod.id,
                systemStock: prod.stock,
                physicalStock: prod.stock, // Default to system stock so they don't have to input everything
                difference: 0,
                costPrice: prod.costPrice,
                notes: null
            }));

            await tx.coopStockOpnameItem.createMany({
                data: itemsData
            });

            return tx.coopStockOpname.findUnique({
                where: { id: session.id },
                include: {
                    items: {
                        include: {
                            Product: true
                        }
                    }
                }
            });
        });
    }

    // Update physical stock of one or more items in the session
    static async updateSessionItems(tenantId: string, sessionId: string, items: { productId: string; physicalStock: number; notes?: string }[]) {
        const session = await prisma.coopStockOpname.findFirst({
            where: { id: sessionId, tenantId, status: 'DRAFT' }
        });

        if (!session) {
            throw new Error('Sesi opname tidak ditemukan atau sudah ditutup.');
        }

        return prisma.$transaction(async (tx) => {
            for (const item of items) {
                const sessionItem = await tx.coopStockOpnameItem.findFirst({
                    where: { opnameId: sessionId, productId: item.productId }
                });

                if (sessionItem) {
                    const physicalStockVal = Number(item.physicalStock);
                    if (isNaN(physicalStockVal) || physicalStockVal < 0) {
                        throw new Error('Jumlah stok fisik tidak boleh bernilai negatif.');
                    }
                    const diff = physicalStockVal - sessionItem.systemStock;
                    await tx.coopStockOpnameItem.update({
                        where: { id: sessionItem.id },
                        data: {
                            physicalStock: physicalStockVal,
                            difference: diff,
                            notes: item.notes !== undefined ? item.notes : sessionItem.notes
                        }
                    });
                }
            }

            return tx.coopStockOpname.findUnique({
                where: { id: sessionId },
                include: {
                    items: {
                        include: {
                            Product: true
                        }
                    }
                }
            });
        });
    }

    // Cancel / Delete a session in DRAFT status
    static async cancelSession(tenantId: string, sessionId: string) {
        const session = await prisma.coopStockOpname.findFirst({
            where: { id: sessionId, tenantId, status: 'DRAFT' }
        });

        if (!session) {
            throw new Error('Sesi opname tidak ditemukan atau sudah ditutup.');
        }

        return prisma.coopStockOpname.update({
            where: { id: sessionId },
            data: { status: 'CANCELLED' }
        });
    }

    // Finalize session (apply changes, generate journal entries, write audit logs)
    static async finalizeSession(tenantId: string, sessionId: string, operatorId: string | null) {
        const session = await prisma.coopStockOpname.findFirst({
            where: { id: sessionId, tenantId, status: 'DRAFT' },
            include: {
                items: {
                    include: {
                        Product: true
                    }
                }
            }
        });

        if (!session) {
            throw new Error('Sesi opname tidak ditemukan atau sudah ditutup.');
        }

        let diffItemsCount = 0;
        let totalSurplus = 0; 
        let totalDeficit = 0; 

        const itemsWithDiff = [];

        for (const item of session.items) {
            if (item.difference !== 0) {
                diffItemsCount++;
                const itemDiffVal = Math.abs(item.difference) * Number(item.costPrice);
                
                if (item.difference > 0) {
                    totalSurplus += itemDiffVal;
                } else {
                    totalDeficit += itemDiffVal;
                }

                itemsWithDiff.push({
                    productId: item.productId,
                    physicalStock: item.physicalStock,
                    oldStock: item.systemStock,
                    newStock: item.physicalStock,
                    diff: item.difference,
                    name: item.Product.name,
                    code: item.Product.code
                });
            }
        }

        if (totalSurplus > 0 || totalDeficit > 0) {
            await AccountingService.getOrCreateDefaultAccounts(tenantId);
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update stock levels for each item that has a difference
            for (const diffItem of itemsWithDiff) {
                await tx.product.update({
                    where: { id: diffItem.productId },
                    data: { stock: diffItem.physicalStock }
                });
            }

            // 2. Record accounting entries if there are changes
            if (totalSurplus > 0 || totalDeficit > 0) {
                const journalEntries = [];
                
                if (totalSurplus > 0) {
                    journalEntries.push({ accountCode: '1030', type: 'DEBIT', amount: totalSurplus });
                    journalEntries.push({ accountCode: '5020', type: 'CREDIT', amount: totalSurplus });
                }

                if (totalDeficit > 0) {
                    journalEntries.push({ accountCode: '5020', type: 'DEBIT', amount: totalDeficit });
                    journalEntries.push({ accountCode: '1030', type: 'CREDIT', amount: totalDeficit });
                }

                if (journalEntries.length > 0) {
                    await AccountingService.createJournalEntry(
                        tenantId,
                        `Penyesuaian Stock Opname: ${session.opnameNumber}`,
                        `STK-OPN-${session.id}`,
                        journalEntries,
                        tx
                    );
                }
            }

            // 3. Mark session as completed
            const updatedSession = await tx.coopStockOpname.update({
                where: { id: sessionId },
                data: { status: 'COMPLETED' },
                include: {
                    items: {
                        include: {
                            Product: true
                        }
                    }
                }
            });

            return updatedSession;
        });

        // 4. Log audit event
        activityLogService.logEvent({
            event_type: 'COOP_PRODUCT_ADJUST_STOCK',
            tenant_id: tenantId,
            user_id: operatorId || null,
            entity: 'CoopStockOpname',
            entity_id: sessionId,
            metadata: {
                opnameNumber: session.opnameNumber,
                diffItemsCount,
                totalSurplus,
                totalDeficit,
                itemsAdjusted: itemsWithDiff
            },
            description: `Finalisasi Stock Opname ${session.opnameNumber}. Total item disesuaikan: ${diffItemsCount} barang. Selisih Surplus: Rp ${totalSurplus.toLocaleString('id-ID')}, Selisih Defisit: Rp ${totalDeficit.toLocaleString('id-ID')}.`
        });

        return result;
    }
}
