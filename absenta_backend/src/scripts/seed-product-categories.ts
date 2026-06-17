import { PrismaClient } from '@prisma/client';
import { ProductCategoryService } from '../modules/cooperative/toko/product-category.service';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Memulai sinkronisasi kategori produk default untuk semua tenant...');
    const tenants = await prisma.tenant.findMany();
    console.log(`📋 Total Tenant ditemukan: ${tenants.length}`);

    for (const tenant of tenants) {
        console.log(`👉 Menjalankan sinkronisasi untuk Tenant: ${tenant.name} (${tenant.id})`);
        await ProductCategoryService.ensureDefaultCategories(tenant.id);
    }
    console.log('✅ Sinkronisasi kategori produk default selesai.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
