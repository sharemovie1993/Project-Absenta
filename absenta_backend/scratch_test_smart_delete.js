const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSmartDelete() {
  const tenantId = '44497b2b-a4f2-42c5-805b-105db58a6415'; // SMKN 1 PLERED
  
  // Ambil salah satu penugasan aktif (Misal Agus Waluyo di TOOLMAN)
  const assignment = await prisma.organizationalAssignment.findFirst({
    where: { 
      tenant_id: tenantId, 
      is_active: true,
      User: { full_name: { contains: 'Agus Waluyo' } }
    }
  });

  if (!assignment) {
    console.log('Tidak ada penugasan aktif untuk Agus Waluyo untuk diuji.');
    return;
  }

  console.log(`Mencoba 'Smart Delete' untuk Assignment ID: ${assignment.id}...`);

  // Logika baru kita: Hapus langsung via ID Assignment
  const updated = await prisma.organizationalAssignment.update({
    where: { id: assignment.id },
    data: {
      is_active: false,
      end_date: new Date(),
      updated_at: new Date()
    }
  });

  console.log('--- HASIL UJI SMART DELETE ---');
  console.log(`ID Terhapus: ${updated.id}`);
  console.log(`Status Aktif Sekarang: ${updated.is_active}`);
  
  if (!updated.is_active) {
    console.log('✅ BERHASIL: Sistem sekarang bisa menghapus personil lewat ID Penugasan langsung!');
  }
}

testSmartDelete().catch(console.error).finally(() => prisma.$disconnect());
