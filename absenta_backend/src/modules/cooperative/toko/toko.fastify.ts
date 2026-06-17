// @ts-nocheck
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TokoService } from './toko.service';
import { ProductCategoryService } from './product-category.service';
import { OpnameService } from './opname.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';
import { smartReadSheet } from '../../../utils/excel-import.utils';
import * as XLSX from 'xlsx-js-style';

export default async function tokoRoutes(fastify: any) {

    const getTenantId = (req: any) => {
        return (req.user?.tenant_id || req.user?.tenantId) || mockTenant.id;
    };

    // GET /products
    fastify.get('/', { preHandler: [requireCapability(['cooperative.store.products.view.list', 'cooperative.store.view.catalog'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const search = (req.query as any).search;
            const products = await TokoService.getProducts(tenantId, search);
            return products;
        } catch (error) {
            reply.code(500).send({ error: 'Failed to fetch products' });
        }
    });

    // POST /products
    fastify.post('/', { preHandler: [requireCapability('cooperative.store.products.create')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const operatorId = req.user?.id || req.user?.userId || null;
            const product = await TokoService.createProduct(tenantId, req.body as any, operatorId);
            reply.code(201).send(product);
        } catch (error) {
            reply.code(500).send({ error: 'Failed to create product' });
        }
    });

    // PUT /products/:id
    fastify.put('/:id', { preHandler: [requireCapability('cooperative.store.products.update')] }, async (req: any, reply: any) => {
        try {
            const operatorId = req.user?.id || req.user?.userId || null;
            const product = await TokoService.updateProduct(req.params.id, req.body as any, operatorId);
            return product;
        } catch (error) {
            reply.code(500).send({ error: 'Failed to update product' });
        }
    });

    // DELETE /products/:id
    fastify.delete('/:id', { preHandler: [requireCapability('cooperative.store.products.delete')] }, async (req: any, reply: any) => {
        try {
            const operatorId = req.user?.id || req.user?.userId || null;
            await TokoService.deleteProduct(req.params.id, operatorId);
            reply.code(204).send();
        } catch (error) {
            reply.code(500).send({ error: 'Failed to delete product' });
        }
    });

    // GET /members (Search members for POS)
    fastify.get('/members', { preHandler: [requireCapability('cooperative.store.orders.manage')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const search = (req.query as any).search;
            const members = await TokoService.searchMembersForPOS(tenantId, search);
            return members;
        } catch (error: any) {
            reply.code(500).send({ error: error.message || 'Failed to search members' });
        }
    });

    // POST /pos/checkout
    fastify.post('/checkout', { preHandler: [requireCapability('cooperative.store.orders.manage')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const operatorId = req.user?.id || req.user?.userId || null;
            const { memberId, items, paymentMethod, cashAmount, changeAmount, pin, voucherCode } = req.body as any;
            const sale = await TokoService.processSale(tenantId, memberId, items, { paymentMethod, cashAmount, changeAmount, operatorId, pin, voucherCode });
            reply.code(201).send(sale);
        } catch (error: any) {
            if (error.message.includes('not found')) {
                reply.code(404).send({ message: error.message });
            } else if (
                error.message.includes('tidak mencukupi') || 
                error.message.includes('tidak boleh') || 
                error.message.includes('wajib') || 
                error.message.includes('tidak valid') || 
                error.message.includes('belum diaktifkan') || 
                error.message.includes('belum memiliki') ||
                error.message.includes('salah') ||
                error.message.includes('belum mengatur') ||
                error.message.includes('Keamanan') ||
                error.message.includes('PIN')
            ) {
                reply.code(400).send({ message: error.message });
            } else {
                reply.code(500).send({ 
                    message: error.message || 'Failed to process sale',
                    error: error.message || 'Failed to process sale' 
                });
            }
        }
    });

    // GET /history
    fastify.get('/history', { preHandler: [requireCapability(['cooperative.store.products.view.list', 'cooperative.store.view.catalog'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const user = req.user;
            const isOperator = user?.capabilities?.includes('cooperative.store.orders.manage') || user?.role?.name?.toUpperCase() === 'SUPERADMIN';
            const canViewAll = isOperator || user?.capabilities?.includes('cooperative.store.transactions.view');
            
            const sales = await TokoService.getMemberSalesHistory(tenantId, String(user.id), canViewAll, req.query as any);
            return sales;
        } catch (error: any) {
            reply.code(500).send({ error: error.message || 'Failed to fetch sales history' });
        }
    });

    // POST /products/:id/adjust-stock
    fastify.post('/:id/adjust-stock', { preHandler: [requireCapability('cooperative.store.products.update')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const operatorId = req.user?.id || req.user?.userId || null;
            const { newStock, reason } = req.body as any;
            const product = await TokoService.adjustStock(tenantId, req.params.id, Number(newStock), reason, operatorId);
            return product;
        } catch (error: any) {
            if (error.message === 'Product not found') {
                reply.code(404).send({ message: 'Product not found' });
            } else {
                reply.code(500).send({ error: 'Failed to adjust stock' });
            }
        }
    });

    // POST /stock-in
    fastify.post('/stock-in', { preHandler: [requireCapability('cooperative.store.products.update')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const operatorId = req.user?.id || req.user?.userId || null;
            const stockIn = await TokoService.processStockIn(tenantId, operatorId, req.body as any);
            reply.code(201).send(stockIn);
        } catch (error: any) {
            reply.code(500).send({ error: error.message || 'Failed to process stock-in' });
        }
    });

    // GET /stock-in
    fastify.get('/stock-in', { preHandler: [requireCapability('cooperative.store.products.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { startDate, endDate, supplier } = req.query as any;
            const history = await TokoService.getStockInHistory(tenantId, { startDate, endDate, supplier });
            return history;
        } catch (error: any) {
            reply.code(500).send({ error: 'Failed to fetch stock-in history' });
        }
    });

    // GET /stock-in/:id
    fastify.get('/stock-in/:id', { preHandler: [requireCapability('cooperative.store.products.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const stockIn = await TokoService.getStockInDetail(tenantId, req.params.id);
            if (!stockIn) {
                reply.code(404).send({ message: 'Stock-in transaction not found' });
            } else {
                return stockIn;
            }
        } catch (error: any) {
            reply.code(500).send({ error: 'Failed to fetch stock-in transaction details' });
        }
    });

    // GET /categories
    fastify.get('/categories', { preHandler: [requireCapability(['cooperative.store.products.view.list', 'cooperative.store.view.catalog'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const categories = await ProductCategoryService.getCategories(tenantId);
            return categories;
        } catch (error: any) {
            reply.code(500).send({ error: error.message || 'Failed to fetch categories' });
        }
    });

    // POST /categories
    fastify.post('/categories', { preHandler: [requireCapability('cooperative.store.products.update')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const operatorId = req.user?.id || req.user?.userId || null;
            const { name, description } = req.body as any;
            const category = await ProductCategoryService.createCategory(tenantId, name, description, operatorId);
            reply.code(201).send(category);
        } catch (error: any) {
            reply.code(400).send({ message: error.message || 'Failed to create category' });
        }
    });

    // PUT /categories/:id
    fastify.put('/categories/:id', { preHandler: [requireCapability('cooperative.store.products.update')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const operatorId = req.user?.id || req.user?.userId || null;
            const { name, description } = req.body as any;
            const category = await ProductCategoryService.updateCategory(req.params.id, tenantId, name, description, operatorId);
            return category;
        } catch (error: any) {
            reply.code(400).send({ message: error.message || 'Failed to update category' });
        }
    });

    // DELETE /categories/:id
    fastify.delete('/categories/:id', { preHandler: [requireCapability('cooperative.store.products.update')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const operatorId = req.user?.id || req.user?.userId || null;
            await ProductCategoryService.deleteCategory(req.params.id, tenantId, operatorId);
            reply.code(204).send();
        } catch (error: any) {
            reply.code(400).send({ message: error.message || 'Failed to delete category' });
        }
    });

    // GET /opname - List all sessions
    fastify.get('/opname', { preHandler: [requireCapability('cooperative.store.products.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const sessions = await OpnameService.getSessions(tenantId);
            return sessions;
        } catch (error: any) {
            reply.code(500).send({ error: error.message || 'Failed to fetch opname sessions' });
        }
    });

    // GET /opname/:id - Get detail session
    fastify.get('/opname/:id', { preHandler: [requireCapability('cooperative.store.products.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const session = await OpnameService.getSessionById(req.params.id, tenantId);
            if (!session) {
                reply.code(404).send({ message: 'Sesi opname tidak ditemukan' });
            } else {
                return session;
            }
        } catch (error: any) {
            reply.code(500).send({ error: error.message || 'Failed to fetch opname details' });
        }
    });

    // POST /opname - Create session
    fastify.post('/opname', { preHandler: [requireCapability('cooperative.store.products.update')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const operatorId = req.user?.id || req.user?.userId || null;
            const { notes, categoryFilter } = req.body as any;
            const session = await OpnameService.createSession(tenantId, operatorId, notes, categoryFilter);
            reply.code(201).send(session);
        } catch (error: any) {
            reply.code(400).send({ message: error.message || 'Failed to create opname session' });
        }
    });

    // PUT /opname/:id/items - Update counts
    fastify.put('/opname/:id/items', { preHandler: [requireCapability('cooperative.store.products.update')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { items } = req.body as any;
            const updated = await OpnameService.updateSessionItems(tenantId, req.params.id, items);
            return updated;
        } catch (error: any) {
            reply.code(400).send({ message: error.message || 'Failed to update physical counts' });
        }
    });

    // POST /opname/:id/finalize - Finalize opname session
    fastify.post('/opname/:id/finalize', { preHandler: [requireCapability('cooperative.store.products.update')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const operatorId = req.user?.id || req.user?.userId || null;
            const session = await OpnameService.finalizeSession(tenantId, req.params.id, operatorId);
            return session;
        } catch (error: any) {
            reply.code(400).send({ message: error.message || 'Failed to finalize opname session' });
        }
    });

    // DELETE /opname/:id - Cancel session
    fastify.delete('/opname/:id', { preHandler: [requireCapability('cooperative.store.products.update')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const session = await OpnameService.cancelSession(tenantId, req.params.id);
            return session;
        } catch (error: any) {
            reply.code(400).send({ message: error.message || 'Failed to cancel opname session' });
        }
    });

    // GET /import/template
    fastify.get('/import/template', { preHandler: [requireCapability('cooperative.store.products.create')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const categories = await ProductCategoryService.getCategories(tenantId);
            const headers = [
                'BARCODE / KODE BARANG', 'NAMA PRODUK', 'KATEGORI', 'HARGA JUAL', 'HARGA MODAL', 'STOK AWAL', 'DESKRIPSI'
            ];

            const dataWithHints = [
                ['PETUNJUK CEPAT:', '', '', '', '', '', ''],
                ['1. Kolom BERWARNA EMAS wajib diisi (Barcode, Nama Produk, Kategori, Harga Jual).', '', '', '', '', '', ''],
                ['2. Agar angka NOL tidak hilang di depan barcode, awali dengan tanda PETIK SATU (\'). Contoh: \'89912345678', '', '', '', '', '', ''],
                ['3. Harga Jual, Harga Modal, dan Stok Awal diisi dengan angka bulat positif saja (Tanpa titik/koma ribuan).', '', '', '', '', '', ''],
                ['4. Kolom Kategori diisi dengan nama kategori (misal: Makanan, Minuman, ATK). Jika kategori belum ada, sistem akan membuatnya otomatis.', '', '', '', '', '', ''],
                ['', '', '', '', '', '', ''], // Spacer
                headers
            ];

            const ws = XLSX.utils.aoa_to_sheet(dataWithHints);

            // Styles matching the professional academic style
            const hintStyle = {
                font: { bold: true, color: { rgb: "4F46E5" } },
                alignment: { horizontal: "left" }
            };

            const warningStyle = {
                font: { bold: true, color: { rgb: "B91C1C" } },
                alignment: { horizontal: "left" }
            };

            const reqHeaderStyle = {
                font: { bold: true, color: { rgb: "000000" } },
                fill: { fgColor: { rgb: "FFD700" } }, // Gold for Required
                alignment: { horizontal: "center" },
                border: { 
                    bottom: { style: "medium", color: { rgb: "000000" } },
                    top: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };

            const optHeaderStyle = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "1E293B" } }, // Slate-800 for Optional
                alignment: { horizontal: "center" },
                border: { 
                    bottom: { style: "medium", color: { rgb: "000000" } },
                    top: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };

            // Apply Styles to Hints (First 5 rows)
            for (let i = 0; i < 5; i++) {
                const cell = ws[XLSX.utils.encode_cell({ r: i, c: 0 })];
                if (cell) cell.s = i === 1 ? warningStyle : hintStyle;
            }

            // Apply Styles to Header (Row 6, index 6)
            headers.forEach((h, i) => {
                const cell = ws[XLSX.utils.encode_cell({ r: 6, c: i })];
                if (cell) {
                    if (['BARCODE / KODE BARANG', 'NAMA PRODUK', 'KATEGORI', 'HARGA JUAL'].includes(h)) {
                        cell.s = reqHeaderStyle;
                    } else {
                        cell.s = optHeaderStyle;
                    }
                }
            });

            ws['!cols'] = headers.map(() => ({ wch: 25 }));
            ws['!rows'] = Array(7).fill({ hpt: 20 });
            ws['!rows'][6] = { hpt: 30 }; // Header row taller

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Produk');

            // --- REFERENSI KATEGORI SHEET ---
            const refData = categories.map(cat => ({
                'Nama Kategori': cat.name,
                'Deskripsi': cat.description || '-'
            }));
            const refWs = XLSX.utils.json_to_sheet(refData);
            refWs['!cols'] = [{ wch: 30 }, { wch: 40 }];
            XLSX.utils.book_append_sheet(wb, refWs, 'Referensi Kategori');

            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            reply.header('Content-Disposition', 'attachment; filename="import_produk_koperasi_template.xlsx"');
            return reply.send(buffer);
        } catch (error) {
            console.error('Error generating template:', error);
            reply.code(500).send({ message: 'Failed to generate template' });
        }
    });

    // POST /import
    fastify.post('/import', { preHandler: [requireCapability('cooperative.store.products.create')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const operatorId = req.user?.id || req.user?.userId || null;

            const part = await req.file();
            if (!part) {
                return reply.code(400).send({ message: 'File wajib diunggah.' });
            }

            const buffer = await part.toBuffer();
            const wb = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const data = smartReadSheet(ws);

            if (data.length === 0) {
                return reply.code(400).send({ message: 'Berkas Excel kosong atau baris data tidak terdeteksi.' });
            }

            const result = await TokoService.importProducts(tenantId, data, operatorId);
            return result;
        } catch (error: any) {
            console.error('Error importing products:', error);
            reply.code(500).send({ message: error.message || 'Failed to import products' });
        }
    });
}
