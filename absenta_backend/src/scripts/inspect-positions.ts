import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const tenantId = 'demo-tenant-absenta';
  const positions = await prisma.organizationalPosition.findMany({
    where: { tenant_id: tenantId },
    include: {
      organizationalAssigns: {
        where: { is_active: true },
        include: {
          User: {
            include: { Guru: true, Siswa: true }
          }
        }
      }
    }
  });

  console.log('=== POSISI & PENUGASAN DI TENANT DEMO ===');
  for (const p of positions) {
    console.log(`[Code: ${p.code.padEnd(16)}] ${p.name.padEnd(30)} | Assigns: ${p.organizationalAssigns.length}`);
    for (const a of p.organizationalAssigns) {
      const personName = a.User?.Guru?.nama_guru || a.User?.Siswa?.nama_siswa || a.User?.full_name || 'N/A';
      console.log(`   -> ${personName} (User ID: ${a.user_id})`);
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
