import { SavingCategoryService } from './saving-category.service';
import { requireCapability } from '@/middlewares/requireCapability';

export async function savingCategoryRoutes(fastify: any) {
    // GET /cooperative/saving-categories — list semua kategori aktif (anggota & pengurus)
    fastify.get('/saving-categories', {
        preHandler: requireCapability('cooperative.dashboard.view.overview'),
    }, async (req: any, reply: any) => {
        const data = await SavingCategoryService.getCategories(req.tenantId);
        return reply.send({ success: true, data });
    });

    // GET /cooperative/saving-categories/all — termasuk nonaktif (pengurus saja)
    fastify.get('/saving-categories/all', {
        preHandler: requireCapability(['cooperative.savings.types.manage', 'cooperative.settings.view']),
    }, async (req: any, reply: any) => {
        const data = await SavingCategoryService.getAllCategories(req.tenantId);
        return reply.send({ success: true, data });
    });

    // POST /cooperative/saving-categories — tambah kategori baru
    fastify.post('/saving-categories', {
        preHandler: requireCapability('cooperative.savings.types.manage'),
    }, async (req: any, reply: any) => {
        const data = await SavingCategoryService.createCategory(req.tenantId, req.body);
        return reply.code(201).send({ success: true, data });
    });

    // PUT /cooperative/saving-categories/:id — update kategori
    fastify.put('/saving-categories/:id', {
        preHandler: requireCapability('cooperative.savings.types.manage'),
    }, async (req: any, reply: any) => {
        const data = await SavingCategoryService.updateCategory(req.params.id, req.tenantId, req.body);
        return reply.send({ success: true, data });
    });

    // PATCH /cooperative/saving-categories/:id/toggle — aktif/nonaktif
    fastify.patch('/saving-categories/:id/toggle', {
        preHandler: requireCapability('cooperative.savings.types.manage'),
    }, async (req: any, reply: any) => {
        const data = await SavingCategoryService.toggleActive(req.params.id, req.tenantId);
        return reply.send({ success: true, data });
    });

    // DELETE /cooperative/saving-categories/:id — hapus kategori
    fastify.delete('/saving-categories/:id', {
        preHandler: requireCapability('cooperative.savings.types.manage'),
    }, async (req: any, reply: any) => {
        const data = await SavingCategoryService.deleteCategory(req.params.id, req.tenantId);
        return reply.send({ success: true, message: 'Kategori simpanan berhasil dihapus', data });
    });
}
