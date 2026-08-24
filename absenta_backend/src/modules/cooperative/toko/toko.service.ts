// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { mockTenant } from '../../../utils/mocks';
import { AccountingService } from '../laporan/accounting.service';
import { ProductCategoryService } from './product-category.service';
import { activityLogService } from '../../activity/services/activity-log.service';
import bcrypt from 'bcrypt';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';

export class TokoService {

    // Get Products (with stock check)
    static async getProducts(tenantId: string, search?: string) {
        const where: any = { tenantId };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }
        return prisma.product.findMany({ where, orderBy: { name: 'asc' } });
    }

    // Get Product By ID
    static async getProductById(id: string, tenantId: string) {
        return prisma.product.findFirst({ where: { id, tenantId } });
    }

    // Create Product
    static async createProduct(tenantId: string, data: any, operatorId?: string | null) {
        // [GUARD: Validasi input]
        if (!data.name) throw new Error('Nama produk wajib diisi.');
        if (data.price === undefined || Number(data.price) < 0) throw new Error('Harga produk tidak boleh negatif.');
        if (data.stock !== undefined && Number(data.stock) < 0) throw new Error('Stok produk tidak boleh negatif.');

        if (data.category) {
            await ProductCategoryService.ensureCategoryExists(tenantId, data.category);
        }

        const product = await prisma.product.create({
            data: {
                tenantId,
                code:              data.code,
                name:              data.name,
                price:             Number(data.price),
                costPrice:         Number(data.costPrice || 0),
                stock:             Number(data.stock || 0),
                minStock:          Number(data.minStock || 0),
                category:          data.category || null,
                imageUrl:          data.imageUrl || null,
                productType:       data.productType || 'Default',
                showInTransaction: data.showInTransaction !== undefined ? Boolean(data.showInTransaction) : true,
                useStock:          data.useStock !== undefined ? Boolean(data.useStock) : true,
                weight:            data.weight !== undefined ? Number(data.weight) : 0,
                unit:              data.unit || null,
                discount:          data.discount !== undefined ? Number(data.discount) : 0,
                discountType:      data.discountType || 'PERCENT',
                rackLocation:      data.rackLocation || null,
                barcode:           data.barcode || null,
                description:       data.description || null,
            },
        });

        // Audit Log
        activityLogService.logEvent({
            event_type: 'COOP_PRODUCT_CREATED',
            tenant_id: tenantId,
            user_id: operatorId || null,
            entity: 'Product',
            entity_id: product.id,
            metadata: {
                productName: product.name,
                productCode: product.code,
                price: product.price,
                stock: product.stock,
                category: product.category,
                description: `Membuat produk baru "${product.name}" (${product.code}) dengan stok awal ${product.stock} pcs dan harga jual Rp ${Number(product.price).toLocaleString('id-ID')}`
            }
        });

        await cacheInvalidationService.invalidateKoperasiCache(tenantId);
        return product;
    }

    // Update Product
    static async updateProduct(id: string, data: any, operatorId?: string | null) {
        if (data.price !== undefined && Number(data.price) < 0) throw new Error('Harga produk tidak boleh negatif.');
        if (data.stock !== undefined && Number(data.stock) < 0) throw new Error('Stok produk tidak boleh negatif.');

        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) throw new Error('Produk tidak ditemukan.');

        if (data.category) {
            await ProductCategoryService.ensureCategoryExists(product.tenantId, data.category);
        }

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.code !== undefined) updateData.code = data.code;
        if (data.price !== undefined) updateData.price = Number(data.price);
        if (data.costPrice !== undefined) updateData.costPrice = Number(data.costPrice);
        if (data.stock !== undefined) updateData.stock = Number(data.stock);
        if (data.minStock !== undefined) updateData.minStock = Number(data.minStock);
        if (data.category !== undefined) updateData.category = data.category || null;
        if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;
        if (data.productType !== undefined) updateData.productType = data.productType || 'Default';
        if (data.showInTransaction !== undefined) updateData.showInTransaction = Boolean(data.showInTransaction);
        if (data.useStock !== undefined) updateData.useStock = Boolean(data.useStock);
        if (data.weight !== undefined) updateData.weight = Number(data.weight);
        if (data.unit !== undefined) updateData.unit = data.unit || null;
        if (data.discount !== undefined) updateData.discount = Number(data.discount);
        if (data.discountType !== undefined) updateData.discountType = data.discountType || 'PERCENT';
        if (data.rackLocation !== undefined) updateData.rackLocation = data.rackLocation || null;
        if (data.barcode !== undefined) updateData.barcode = data.barcode || null;
        if (data.description !== undefined) updateData.description = data.description || null;

        const updated = await prisma.product.update({
            where: { id },
            data: updateData,
        });

        // Compile change history
        const changes: Record<string, any> = {};
        if (data.name && data.name !== product.name) changes.name = { old: product.name, new: data.name };
        if (data.price && Number(data.price) !== Number(product.price)) changes.price = { old: Number(product.price), new: Number(data.price) };
        if (data.costPrice && Number(data.costPrice) !== Number(product.costPrice)) changes.costPrice = { old: Number(product.costPrice), new: Number(data.costPrice) };
        if (data.category && data.category !== product.category) changes.category = { old: product.category, new: data.category };

        const changesDesc = Object.keys(changes)
            .map(k => `${k}: ${changes[k].old} → ${changes[k].new}`)
            .join(', ');

        // Audit Log
        activityLogService.logEvent({
            event_type: 'COOP_PRODUCT_UPDATED',
            tenant_id: product.tenantId,
            user_id: operatorId || null,
            entity: 'Product',
            entity_id: id,
            metadata: {
                productName: updated.name,
                productCode: updated.code,
                changes,
                description: `Mengubah data produk "${updated.name}" (${updated.code})${changesDesc ? ` - Perubahan [ ${changesDesc} ]` : ''}`
            }
        });

        return updated;
    }

    // Delete Product (dengan proteksi data historis)
    static async deleteProduct(id: string, operatorId?: string | null) {
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) throw new Error('Produk tidak ditemukan.');

        // Cek apakah produk sudah pernah dijual
        const saleCount = await prisma.saleItem.count({ where: { productId: id } });
        if (saleCount > 0) {
            throw new Error(
                `Produk tidak bisa dihapus karena sudah memiliki ${saleCount} riwayat penjualan. ` +
                `Nonaktifkan produk (stok = 0) daripada menghapusnya untuk menjaga integritas laporan.`
            );
        }

        const deleted = await prisma.product.delete({ where: { id } });

        // Audit Log
        activityLogService.logEvent({
            event_type: 'COOP_PRODUCT_DELETED',
            tenant_id: product.tenantId,
            user_id: operatorId || null,
            entity: 'Product',
            entity_id: id,
            metadata: {
                productName: product.name,
                productCode: product.code,
                description: `Menghapus produk "${product.name}" (${product.code}) secara permanen`
            }
        });

        return deleted;
    }

    // Stock Opname (dengan journal entry)
    static async adjustStock(tenantId: string, productId: string, newStock: number, reason?: string, operatorId?: string | null) {
        if (newStock < 0) throw new Error('Stok tidak boleh negatif.');

        const product = await this.getProductById(productId, tenantId);
        if (!product) throw new Error('Product not found');

        const oldStock   = product.stock;
        const diff       = newStock - oldStock;
        const diffAmount = Math.abs(diff) * Number(product.costPrice);

        // Pre-warm accounts (di luar tx)
        if (diffAmount > 0) {
            await AccountingService.getOrCreateDefaultAccounts(tenantId);
        }

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.product.update({
                where: { id: productId },
                data: { stock: newStock },
            });

            // Catat jurnal penyesuaian stok jika ada perubahan nilai
            if (diffAmount > 0) {
                const desc = reason
                    ? `Penyesuaian Stok: ${product.name} — ${reason}`
                    : `Penyesuaian Stok: ${product.name} (${oldStock} → ${newStock})`;

                await AccountingService.createJournalEntry(
                    tenantId,
                    desc,
                    `STK-ADJ-${productId}-${Date.now()}`,
                    diff > 0
                        ? [  // Stok bertambah: Persediaan Dr / Beban Admin Cr (penyesuaian positif)
                            { accountCode: '1030', type: 'DEBIT',  amount: diffAmount },
                            { accountCode: '5020', type: 'CREDIT', amount: diffAmount },
                          ]
                        : [  // Stok berkurang: Beban Admin Dr / Persediaan Cr (penyesuaian negatif)
                            { accountCode: '5020', type: 'DEBIT',  amount: diffAmount },
                            { accountCode: '1030', type: 'CREDIT', amount: diffAmount },
                          ],
                    tx,
                );
            }

            return updated;
        });

        // Audit Log
        activityLogService.logEvent({
            event_type: 'COOP_PRODUCT_ADJUST_STOCK',
            tenant_id: tenantId,
            user_id: operatorId || null,
            entity: 'Product',
            entity_id: productId,
            metadata: {
                productName: product.name,
                productCode: product.code,
                oldStock,
                newStock,
                diff,
                reason: reason || 'Tanpa keterangan',
                description: `Stock Opname produk "${product.name}" (${product.code}): ${oldStock} → ${newStock} pcs (Selisih: ${diff > 0 ? '+' : ''}${diff} pcs). Alasan: ${reason || 'Tanpa keterangan'}`
            }
        });

        return result;
    }

    // Process Sale Transaction
    static async processSale(
        tenantId: string, 
        memberId: string | null, 
        items: { productId: string; quantity: number }[],
        paymentOptions?: { paymentMethod?: string; cashAmount?: number; changeAmount?: number; operatorId?: string | null; pin?: string; voucherCode?: string }
    ) {
        // [GUARD: Validasi input]
        if (!items || items.length === 0) throw new Error('Minimal satu produk harus dipilih.');
        for (const item of items) {
            if (!item.productId) throw new Error('productId tidak valid.');
            if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
                throw new Error(`Jumlah produk harus bilangan bulat positif (productId: ${item.productId}).`);
            }
        }

        const paymentMethod = paymentOptions?.paymentMethod || "CASH";
        const cashAmount = paymentOptions?.cashAmount !== undefined ? Number(paymentOptions.cashAmount) : null;
        const changeAmount = paymentOptions?.changeAmount !== undefined ? Number(paymentOptions.changeAmount) : null;

        if (paymentMethod !== "CASH" && paymentMethod !== "SAVING") {
            throw new Error("Metode pembayaran tidak valid.");
        }

        // Pre-warm Chart of Accounts SEBELUM $transaction (mencegah deadlock)
        await AccountingService.getOrCreateDefaultAccounts(tenantId);

        let savingCategory: any = null;
        if (paymentMethod === "SAVING") {
            if (!memberId) {
                throw new Error("Anggota harus dipilih untuk pembayaran menggunakan simpanan.");
            }

            const member = await prisma.member.findUnique({ where: { id: memberId } });
            if (!member) throw new Error("Anggota tidak ditemukan.");

            // 1. Validasi Anti-Self-Transaction untuk Kasir
            const operatorId = paymentOptions?.operatorId || null;
            if (operatorId && member.userId === operatorId) {
                throw new Error(
                    "Keamanan: Kasir tidak diperbolehkan melakukan pembayaran cashless (potong simpanan) " +
                    "pada akun milik sendiri. Silakan lakukan pembayaran tunai atau gunakan register kasir lain."
                );
            }

            // 2. Verifikasi PIN Transaksi Koperasi
            const pinInput = paymentOptions?.pin || '';
            if (member.pin) {
                if (!pinInput) {
                    throw new Error("PIN Transaksi Koperasi wajib diisi untuk metode pembayaran potong simpanan.");
                }
                const isPinValid = await bcrypt.compare(pinInput, member.pin);
                if (!isPinValid) {
                    throw new Error("PIN Transaksi Koperasi salah. Silakan coba lagi.");
                }
            } else {
                throw new Error(
                    "Anggota belum mengatur PIN Transaksi Koperasi. Silakan atur PIN terlebih dahulu " +
                    "atau hubungi pengurus koperasi untuk membuat PIN baru."
                );
            }

            savingCategory = await prisma.savingCategory.findFirst({
                where: { tenantId, code: 'SUKARELA', isActive: true }
            });
            if (!savingCategory) {
                throw new Error("Kategori Simpanan Sukarela belum diaktifkan di tenant ini.");
            }
            await AccountingService.resolveAccountId(tenantId, savingCategory.accountCode, savingCategory.name);
        }

        // Execute dalam satu $transaction untuk atomicity
        return prisma.$transaction(async (tx: any) => {
            // [ANTI-RACE CONDITION: Validasi stok DI DALAM tx]
            // Re-read stok dengan fresh read, lalu validasi sebelum decrement
            let totalAmount = 0;
            let totalCOGS   = 0;
            const saleItemsData: any[] = [];

            for (const item of items) {
                // Re-read produk di dalam tx (fresh read, bukan dari sebelumnya)
                const product = await tx.product.findUnique({ where: { id: item.productId } });

                if (!product)                      throw new Error(`Produk ${item.productId} tidak ditemukan.`);
                if (product.tenantId !== tenantId) throw new Error(`Produk ${item.productId} tidak ditemukan di tenant ini.`);
                if (product.stock < item.quantity) {
                    throw new Error(
                        `Stok tidak mencukupi untuk produk "${product.name}". ` +
                        `Stok tersedia: ${product.stock}, dibutuhkan: ${item.quantity}.`
                    );
                }

                const lineTotal = Number(product.price)     * item.quantity;
                const lineCOGS  = Number(product.costPrice) * item.quantity;
                totalAmount += lineTotal;
                totalCOGS   += lineCOGS;

                saleItemsData.push({ productId: product.id, quantity: item.quantity, price: product.price });
            }

            // Process Voucher Code if provided
            let discountAmount = 0;
            let voucherCodeUsed = null;
            if (paymentOptions?.voucherCode) {
                const voucher = await tx.voucher.findFirst({
                    where: { tenantId, code: paymentOptions.voucherCode.toUpperCase(), isActive: true }
                });
                if (!voucher) {
                    throw new Error('Voucher tidak valid atau sudah tidak aktif.');
                }
                if (voucher.memberId && voucher.memberId !== memberId) {
                    throw new Error('Voucher ini hanya dapat digunakan oleh anggota pemiliknya.');
                }
                discountAmount = Number(voucher.discount);
                voucherCodeUsed = voucher.code;

                // Mark voucher as used
                await tx.voucher.update({
                    where: { id: voucher.id },
                    data: { isActive: false }
                });
            }

            // Apply discount to totalAmount
            totalAmount = Math.max(0, totalAmount - discountAmount);

            // Jika bayar menggunakan simpanan sukarela, validasi dan kurangi saldo simpanan
            if (paymentMethod === "SAVING") {
                const memberSaving = await tx.saving.findFirst({
                    where: { memberId, categoryId: savingCategory.id }
                });
                if (!memberSaving) {
                    throw new Error("Anggota belum memiliki rekening Simpanan Sukarela.");
                }
                const balance = Number(memberSaving.amount);
                if (balance < totalAmount) {
                    throw new Error(
                        `Saldo simpanan tidak mencukupi. Saldo saat ini: Rp ${balance.toLocaleString('id-ID')}, ` +
                        `dibutuhkan: Rp ${totalAmount.toLocaleString('id-ID')}.`
                    );
                }

                // Potong saldo simpanan sukarela
                await tx.saving.update({
                    where: { id: memberSaving.id },
                    data: { amount: { decrement: totalAmount } }
                });

                // Catat mutasi penarikan (WITHDRAWAL) untuk belanja POS
                await tx.savingTransaction.create({
                    data: {
                        savingId: memberSaving.id,
                        amount: totalAmount,
                        type: 'WITHDRAWAL',
                        description: `Pembayaran POS`
                    }
                });
            }

            // Buat Sale Record
            const sale = await tx.sale.create({
                data: {
                    tenantId,
                    memberId: memberId || null,
                    total: totalAmount,
                    paymentMethod,
                    cashAmount,
                    changeAmount,
                    discount: discountAmount,
                    voucherCode: voucherCodeUsed,
                    items: { create: saleItemsData },
                },
                include: { 
                    items: { include: { product: true } },
                    member: {
                        include: {
                            Siswa: { select: { nama_siswa: true } },
                            Guru: { select: { nama_guru: true } },
                            User: { select: { full_name: true } }
                        }
                    }
                },
            });

            // Update Stok (atomic decrement, di dalam tx)
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data:  { stock: { decrement: item.quantity } },
                });
            }

            // Journal Entry 1: Penjualan (Kas/Tabungan Dr / Pendapatan Toko Cr)
            const debitAccount = paymentMethod === "SAVING" ? savingCategory.accountCode : "1010";
            const debitLabel = paymentMethod === "SAVING" ? `Tabungan Sukarela` : `Kas`;

            await AccountingService.createJournalEntry(
                tenantId,
                `Penjualan POS Minimarket (${debitLabel}) — Transaksi #${sale.id.slice(0, 8)}`,
                `POS-SALE-${sale.id}`,
                [
                    { accountCode: debitAccount, type: 'DEBIT',  amount: totalAmount },
                    { accountCode: '4010',       type: 'CREDIT', amount: totalAmount },
                ],
                tx,
            );

            // Journal Entry 2: COGS & Persediaan (Beban COGS Dr / Persediaan Cr)
            if (totalCOGS > 0) {
                await AccountingService.createJournalEntry(
                    tenantId,
                    `HPP & Pengurangan Stok POS #${sale.id.slice(0, 8)}`,
                    `POS-COGS-${sale.id}`,
                    [
                        { accountCode: '5010', type: 'DEBIT',  amount: totalCOGS },
                        { accountCode: '1030', type: 'CREDIT', amount: totalCOGS },
                    ],
                    tx,
                );
            }

            // Award Points for POS Shopping: 1 Point for every Rp 10.000 spent
            if (memberId) {
                const pointsEarned = Math.floor(totalAmount / 10000);
                if (pointsEarned > 0) {
                    await tx.member.update({
                        where: { id: memberId },
                        data: { points: { increment: pointsEarned } },
                    });
                    await tx.coopPointTransaction.create({
                        data: {
                            tenantId,
                            memberId,
                            amount: pointsEarned,
                            type: 'EARN_SHOPPING',
                            description: `Belanja di Toko Koperasi`,
                            referenceId: sale.id
                        }
                    });
                }
            }

            return sale;
        });
    }

    // Search active members for POS with voluntary saving balance
    static async searchMembersForPOS(tenantId: string, search?: string) {
        const where: any = {
            tenantId,
            status: 'ACTIVE',
        };

        if (search) {
            where.OR = [
                { memberNo: { contains: search, mode: 'insensitive' } },
                { Siswa: { nama_siswa: { contains: search, mode: 'insensitive' } } },
                { Guru: { nama_guru: { contains: search, mode: 'insensitive' } } },
                { User: { full_name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const members = await prisma.member.findMany({
            where,
            include: {
                Siswa: { select: { nama_siswa: true } },
                Guru: { select: { nama_guru: true } },
                User: { select: { full_name: true } },
                savings: {
                    where: {
                        category: {
                            code: 'SUKARELA',
                        },
                    },
                    select: {
                        amount: true,
                    },
                },
            },
            take: 30,
            orderBy: { memberNo: 'asc' },
        });

        return members.map((m: any) => {
            const name = m.Siswa?.nama_siswa || m.Guru?.nama_guru || m.User?.full_name || 'Tanpa Nama';
            const sukarelaBalance = m.savings[0] ? Number(m.savings[0].amount) : 0;
            return {
                id: m.id,
                memberNo: m.memberNo,
                name,
                type: m.type,
                sukarelaBalance,
            };
        });
    }

    // Get Sales History
    static async getSales(tenantId: string, options?: { startDate?: string; endDate?: string; memberId?: string }) {
        const where: any = { tenantId };

        if (options?.memberId) where.memberId = options.memberId;

        if (options?.startDate || options?.endDate) {
            const dateFilter: any = {};
            if (options.startDate) dateFilter.gte = new Date(options.startDate + 'T00:00:00.000Z');
            if (options.endDate)   dateFilter.lte = new Date(options.endDate   + 'T23:59:59.999Z');
            where.date = dateFilter;
        }

        return prisma.sale.findMany({
            where,
            include: { 
                items: { include: { product: true } },
                member: {
                    include: {
                        Siswa: { select: { nama_siswa: true } },
                        Guru: { select: { nama_guru: true } },
                        User: { select: { full_name: true } }
                    }
                }
            },
            orderBy: { date: 'desc' },
        });
    }

    // Get Member Sales History by User ID (or direct memberId if operator)
    static async getMemberSalesHistory(tenantId: string, userId: string, isOperator: boolean, queryOptions?: { memberId?: string; startDate?: string; endDate?: string }) {
        const options: any = {};
        
        if (!isOperator) {
            // Find the member record associated with this user
            const member = await prisma.member.findFirst({
                where: { tenantId, userId }
            });
            if (!member) return [];
            options.memberId = member.id;
        } else {
            if (queryOptions?.memberId) {
                options.memberId = queryOptions.memberId;
            }
        }

        if (queryOptions?.startDate) options.startDate = queryOptions.startDate;
        if (queryOptions?.endDate)   options.endDate = queryOptions.endDate;

        return this.getSales(tenantId, options);
    }

    // Process Incoming Stock (Barang Masuk)
    static async processStockIn(
        tenantId: string, 
        operatorId: string | null, 
        data: { 
            supplier?: string; 
            notes?: string; 
            paymentMethod?: string; // "CASH" | "CREDIT"
            shippingFee?: number;   // Ongkos kirim — dicatat sebagai Beban Operasional (Metode 2)
            items: { productId: string; quantity: number; costPrice: number }[] 
        }
    ) {
        const { supplier, notes, paymentMethod = "CASH", items, shippingFee: rawShippingFee } = data;
        const shippingFee = Math.max(0, Number(rawShippingFee || 0));
        
        if (!items || items.length === 0) throw new Error('Minimal satu produk harus diinput.');
        for (const item of items) {
            if (!item.productId) throw new Error('productId tidak valid.');
            if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
                throw new Error(`Jumlah barang masuk harus bilangan bulat positif.`);
            }
            if (item.costPrice === undefined || Number(item.costPrice) < 0) {
                throw new Error(`Harga modal tidak boleh negatif.`);
            }
        }

        // Pre-warm accounts (di luar tx)
        await AccountingService.getOrCreateDefaultAccounts(tenantId);
        if (paymentMethod === "CREDIT") {
            await AccountingService.resolveAccountId(tenantId, "2060", "Utang Dagang Toko");
        }
        // Pre-warm akun beban operasional untuk ongkos kirim (Metode 2)
        if (shippingFee > 0) {
            await AccountingService.resolveAccountId(tenantId, "5020", "Beban Administrasi Koperasi");
        }

        let totalAmount = 0;
        const stockInResult = await prisma.$transaction(async (tx) => {
            const stockInItemsData: any[] = [];

            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
                if (product.tenantId !== tenantId) throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan di tenant ini.`);

                const costPriceVal = Number(item.costPrice);
                const lineTotal = costPriceVal * item.quantity;
                totalAmount += lineTotal;

                stockInItemsData.push({
                    productId: product.id,
                    quantity: item.quantity,
                    costPrice: costPriceVal
                });

                // Update stock and costPrice on product
                await tx.product.update({
                    where: { id: product.id },
                    data: {
                        stock: { increment: item.quantity },
                        costPrice: costPriceVal
                    }
                });
            }

            // Create CoopStockIn record
            const stockIn = await tx.coopStockIn.create({
                data: {
                    tenantId,
                    supplier: supplier || null,
                    notes: notes || null,
                    paymentMethod,
                    operatorId: operatorId || null,
                    shippingFee: shippingFee,
                    items: { create: stockInItemsData }
                },
                include: { items: { include: { Product: true } } }
            });

            // Journal Entry (Metode 2 - Operating Expense Method):
            //   DEBIT  1030 (Persediaan)            = totalAmount (nilai produk)
            //   DEBIT  5020 (Beban Administrasi)    = shippingFee (ongkos kirim, jika ada)
            //   KREDIT 1010/2060 (Kas/Utang)        = totalAmount + shippingFee
            if (totalAmount > 0 || shippingFee > 0) {
                const creditAccountCode = paymentMethod === "CREDIT" ? "2060" : "1010";
                const grandTotal = totalAmount + shippingFee;

                const journalLines: { accountCode: string; type: 'DEBIT' | 'CREDIT'; amount: number }[] = [];

                if (totalAmount > 0) {
                    journalLines.push({ accountCode: '1030', type: 'DEBIT', amount: totalAmount }); // Persediaan Dr
                }
                if (shippingFee > 0) {
                    journalLines.push({ accountCode: '5020', type: 'DEBIT', amount: shippingFee }); // Beban Ongkir Dr
                }
                journalLines.push({ accountCode: creditAccountCode, type: 'CREDIT', amount: grandTotal }); // Kas/Utang Cr

                await AccountingService.createJournalEntry(
                    tenantId,
                    `Penerimaan Barang Masuk Koperasi — Transaksi #${stockIn.id.slice(0, 8)}` +
                        (shippingFee > 0 ? ` (termasuk ongkos kirim Rp ${shippingFee.toLocaleString('id-ID')})` : ''),
                    `STK-IN-${stockIn.id}`,
                    journalLines,
                    tx
                );
            }

            return stockIn;
        });

        // Audit Log
        const grandTotalLog = totalAmount + shippingFee;
        activityLogService.logEvent({
            event_type: 'COOP_PRODUCT_STOCK_IN',
            tenant_id: tenantId,
            user_id: operatorId || null,
            entity: 'CoopStockIn',
            entity_id: stockInResult.id,
            metadata: {
                supplier: supplier || 'Tanpa Supplier',
                paymentMethod,
                itemCount: items.length,
                totalAmount: totalAmount,
                shippingFee: shippingFee,
                grandTotal: grandTotalLog,
                notes: notes || '',
                description: `Penerimaan Barang Masuk (Stock-In) dari Supplier "${supplier || 'Tanpa Supplier'}" — Nilai Barang: Rp ${totalAmount.toLocaleString('id-ID')}, Ongkos Kirim: Rp ${shippingFee.toLocaleString('id-ID')}, Total Pembayaran: Rp ${grandTotalLog.toLocaleString('id-ID')} (${items.length} item, Metode: ${paymentMethod})`
            }
        });

        return stockInResult;
    }

    // Get Incoming Stock History
    static async getStockInHistory(
        tenantId: string, 
        options?: { startDate?: string; endDate?: string; supplier?: string }
    ) {
        const where: any = { tenantId };

        if (options?.supplier) {
            where.supplier = { contains: options.supplier, mode: 'insensitive' };
        }

        if (options?.startDate || options?.endDate) {
            const dateFilter: any = {};
            if (options.startDate) dateFilter.gte = new Date(options.startDate + 'T00:00:00.000Z');
            if (options.endDate)   dateFilter.lte = new Date(options.endDate   + 'T23:59:59.999Z');
            where.date = dateFilter;
        }

        return prisma.coopStockIn.findMany({
            where,
            include: { items: { include: { Product: true } } },
            orderBy: { date: 'desc' }
        });
    }

    // Get Specific Stock-In Transaction details
    static async getStockInDetail(tenantId: string, id: string) {
        return prisma.coopStockIn.findFirst({
            where: { id, tenantId },
            include: { items: { include: { Product: true } } }
        });
    }

    // Import products from Excel parsed rows
    static async importProducts(tenantId: string, data: any[], operatorId?: string | null) {
        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: { row: number; message: string }[] = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNum = row.__rowNum || (i + 2);
            try {
                if (!row.name || String(row.name).trim() === '') {
                    throw new Error('Nama produk wajib diisi.');
                }
                
                const price = Number(row.price);
                if (isNaN(price) || price < 0) {
                    throw new Error('Harga jual wajib diisi dengan angka positif.');
                }

                const costPrice = Number(row.costPrice || 0);
                if (isNaN(costPrice) || costPrice < 0) {
                    throw new Error('Harga modal tidak boleh bernilai negatif.');
                }

                const stock = Number(row.stock || 0);
                if (isNaN(stock) || stock < 0) {
                    throw new Error('Stok awal tidak boleh bernilai negatif.');
                }

                let code = row.code ? String(row.code).trim() : null;
                if (!code) {
                    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
                    code = `KOP-${randomNum}`;
                }

                const minStock = row.minStock !== undefined && !isNaN(Number(row.minStock)) ? Number(row.minStock) : 0;
                const weight = row.weight !== undefined && !isNaN(Number(row.weight)) ? Number(row.weight) : 0;
                const discount = row.discount !== undefined && !isNaN(Number(row.discount)) ? Number(row.discount) : 0;
                const unit = row.unit ? String(row.unit).trim() : 'pcs';
                const rackLocation = row.rackLocation ? String(row.rackLocation).trim() : null;
                const description = row.description ? String(row.description).trim() : null;
                const productType = row.productType ? String(row.productType).trim() : 'Default';
                const imageUrl = row.imageUrl ? String(row.imageUrl).trim() : null;

                const category = row.category ? String(row.category).trim() : 'Lain-lain';
                await ProductCategoryService.ensureCategoryExists(tenantId, category);

                const existing = await prisma.product.findFirst({
                    where: { tenantId, code }
                });

                if (existing) {
                    await prisma.product.update({
                        where: { id: existing.id },
                        data: {
                            name: String(row.name).trim(),
                            category,
                            price,
                            costPrice,
                            stock: existing.stock + stock,
                            minStock: minStock !== 0 ? minStock : existing.minStock,
                            unit: unit || existing.unit,
                            weight: weight !== 0 ? weight : existing.weight,
                            discount: discount !== 0 ? discount : existing.discount,
                            rackLocation: rackLocation || existing.rackLocation,
                            description: description || existing.description,
                            imageUrl: imageUrl || existing.imageUrl,
                            productType: productType || existing.productType,
                        }
                    });
                    updated++;
                } else {
                    await prisma.product.create({
                        data: {
                            tenantId,
                            code,
                            name: String(row.name).trim(),
                            category,
                            price,
                            costPrice,
                            stock,
                            minStock,
                            unit,
                            weight,
                            discount,
                            rackLocation,
                            description,
                            imageUrl,
                            productType,
                            showInTransaction: true,
                            useStock: true,
                        }
                    });
                    created++;
                }
            } catch (err: any) {
                errors.push({
                    row: rowNum,
                    message: err.message || 'Error tidak diketahui'
                });
            }
        }

        // Log import event
        if (created > 0 || updated > 0) {
            activityLogService.logEvent({
                event_type: 'COOP_PRODUCT_IMPORT',
                tenant_id: tenantId,
                user_id: operatorId || null,
                entity: 'Product',
                metadata: {
                    createdCount: created,
                    updatedCount: updated,
                    failedCount: errors.length,
                    description: `Mengimpor data produk koperasi: ${created} baru dibuat, ${updated} diperbarui, ${errors.length} gagal.`
                }
            });
        }

        return {
            created,
            updated,
            skipped,
            errors
        };
    }
}
