import { prisma } from '@/utils/prisma';
import { OpnameService } from '@/modules/cooperative/toko/opname.service';

async function runTest() {
    console.log('🏁 Memulai Pengujian Modul Stock Opname by Script...');

    // 1. Cari data produk yang sudah ada untuk mendapatkan tenantId
    const sampleProduct = await prisma.product.findFirst();
    if (!sampleProduct) {
        console.error('❌ Error: Tidak ada produk di database. Harap jalankan seed terlebih dahulu.');
        return;
    }
    const tenantId = sampleProduct.tenantId;
    console.log(`📌 Menggunakan Tenant: ${tenantId}`);
    console.log(`📌 Produk Uji Coba: ${sampleProduct.name} (Kode: ${sampleProduct.code}, Stok Saat Ini: ${sampleProduct.stock})`);

    // Ambil operator acak
    const user = await prisma.user.findFirst({
        where: { tenant_id: tenantId }
    });
    const operatorId = user ? user.id : null;

    // 2. Buat Sesi Opname Baru
    console.log('\nStep 1: Membuat Sesi Opname Baru...');
    const session = await OpnameService.createSession(tenantId, operatorId, 'Script Test Opname');
    if (!session) {
        console.error('❌ Error: Gagal membuat sesi opname.');
        return;
    }
    console.log(`✅ Sesi Terbuat: ${session.opnameNumber} (Status: ${session.status}, Total Item: ${session.items?.length})`);

    // Temukan item uji coba dalam sesi
    const sessionItem = session.items.find((item: any) => item.productId === sampleProduct.id);
    if (!sessionItem) {
        console.error('❌ Error: Produk uji coba tidak masuk dalam sesi opname.');
        return;
    }

    // 3. Update Stok Fisik (Koreksi Selisih)
    console.log('\nStep 2: Melakukan Update Stok Fisik...');
    const oldStock = sampleProduct.stock;
    const testPhysicalStock = oldStock + 5; // Tambahkan 5 sebagai surplus
    
    console.log(`🔄 Mengubah stok fisik ${sampleProduct.name} dari ${oldStock} menjadi ${testPhysicalStock}...`);
    const updatedSession = await OpnameService.updateSessionItems(tenantId, session.id, [
        {
            productId: sampleProduct.id,
            physicalStock: testPhysicalStock,
            notes: 'Test surplus 5 pcs via script'
        }
    ]);

    if (!updatedSession) {
        console.error('❌ Error: Gagal meng-update sesi item.');
        return;
    }

    const updatedItem = updatedSession.items.find((item: any) => item.productId === sampleProduct.id);
    console.log(`✅ Stok Fisik Terupdate: ${updatedItem?.physicalStock} (Selisih: ${updatedItem?.difference} pcs)`);

    // 4. Finalisasi Sesi Opname
    console.log('\nStep 3: Memfinalisasi Sesi Opname...');
    const finalized = await OpnameService.finalizeSession(tenantId, session.id, operatorId);
    if (!finalized) {
        console.error('❌ Error: Gagal memfinalisasi sesi.');
        return;
    }
    console.log(`✅ Status Sesi Final: ${finalized.status}`);

    // 5. Verifikasi Efek di Database
    console.log('\nStep 4: Melakukan Verifikasi Perubahan Database...');
    
    // A. Cek stok produk
    const productAfter = await prisma.product.findUnique({
        where: { id: sampleProduct.id }
    });
    console.log(`📊 Stok Produk Di DB Sekarang: ${productAfter?.stock} pcs (Target: ${testPhysicalStock})`);
    if (productAfter?.stock === testPhysicalStock) {
        console.log('   🟢 VERIFIKASI STOK: BERHASIL');
    } else {
        console.error('   🔴 VERIFIKASI STOK: GAGAL');
    }

    // B. Cek Pencatatan Jurnal Akuntansi & Hardening tenantId
    const expectedRef = `STK-OPN-${session.id}`;
    const journal = await prisma.journal.findFirst({
        where: { reference: expectedRef, tenantId },
        include: { items: true }
    });

    if (journal) {
        console.log(`📊 Jurnal Terbentuk: ID: ${journal.id}, Ref: ${journal.reference}, tenantId: ${journal.tenantId}`);
        console.log(`   Keterangan Jurnal: "${journal.description}"`);
        console.log('   Detail Entri Jurnal:');
        journal.items.forEach((item: any) => {
            console.log(`     - Account ID: ${item.accountId}, Tipe: ${item.type}, Jumlah: Rp ${Number(item.amount).toLocaleString('id-ID')}`);
        });
        
        if (journal.tenantId === tenantId) {
            console.log('   🟢 VERIFIKASI JURNAL (ISOLASI TENANT): BERHASIL');
        } else {
            console.error('   🔴 VERIFIKASI JURNAL (ISOLASI TENANT): GAGAL - tenantId tidak cocok/kosong');
        }
    } else {
        console.error('   🔴 VERIFIKASI JURNAL: GAGAL - Jurnal Akuntansi tidak ditemukan');
    }

    // C. Kembalikan stok semula agar database development tidak kotor
    await prisma.product.update({
        where: { id: sampleProduct.id },
        data: { stock: oldStock }
    });
    console.log(`\n🧹 Database cleaned up. Stok ${sampleProduct.name} dikembalikan ke ${oldStock}.`);
    console.log('🎉 Pengujian Selesai!');
}

runTest()
    .catch(err => console.error('❌ Test Failed with error:', err))
    .finally(() => prisma.$disconnect());
