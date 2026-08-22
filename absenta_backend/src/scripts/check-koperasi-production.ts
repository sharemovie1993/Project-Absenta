import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function checkKoperasi() {
  console.log('🔍 [CEK KOPERASI DI TENANT PRODUKSI VS DEMO]...');

  // 1. Cek OrganizationalPositions terkait Koperasi di Produksi
  console.log('\n--- 1. POSISI ORGANISASI KOPERASI DI PRODUKSI ---');
  const prodPositions = await prisma.organizationalPosition.findMany({
    where: {
      tenant_id: PROD_ID,
      OR: [
        { code: { contains: 'KOPERASI', mode: 'insensitive' } },
        { name: { contains: 'koperasi', mode: 'insensitive' } },
        { code: { in: ['KETUA_KOPERASI', 'BENDAHARA_KOPERASI', 'SEKRETARIS_KOPERASI', 'MANAJER_TOKO_KOPERASI', 'PENGAWAS_KOPERASI', 'KASIR_KOPERASI'] } }
      ]
    },
    include: {
      organizationalAssigns: {
        where: { is_active: true },
        include: {
          User: {
            select: { id: true, email: true, full_name: true, role_id: true, Role: { select: { name: true } } }
          }
        }
      }
    }
  });

  console.log(JSON.stringify(prodPositions, null, 2));

  // 2. Cek semua OrganizationalAssignment di Produksi
  console.log('\n--- 2. SEMUA ASSIGNMENT KOPERASI DI PRODUKSI ---');
  const prodAssignments = await prisma.organizationalAssignment.findMany({
    where: {
      tenant_id: PROD_ID,
      Position: {
        OR: [
          { code: { contains: 'KOP', mode: 'insensitive' } },
          { name: { contains: 'koperasi', mode: 'insensitive' } }
        ]
      }
    },
    include: {
      Position: true,
      User: { select: { id: true, email: true, full_name: true } }
    }
  });
  console.log('Prod Assignments count:', prodAssignments.length);
  prodAssignments.forEach(a => {
    console.log(`- [${a.Position.code}] ${a.Position.name} => User: ${a.User.full_name} (${a.User.email})`);
  });

  // 3. Cek User di Produksi dengan role Koperasi atau email koperasi
  console.log('\n--- 3. USER PRODUKSI DENGAN KATA KOPERASI ---');
  const prodUsers = await prisma.user.findMany({
    where: {
      tenant_id: PROD_ID,
      OR: [
        { email: { contains: 'koperasi', mode: 'insensitive' } },
        { full_name: { contains: 'koperasi', mode: 'insensitive' } }
      ]
    },
    include: {
      Role: true
    }
  });
  console.log('Prod Users count:', prodUsers.length);
  prodUsers.forEach(u => {
    console.log(`- User: ${u.full_name} (${u.email}) -> Role: ${u.Role?.name}`);
  });

  // 4. Cek CooperativeMember / Accounts di Produksi
  console.log('\n--- 4. DATA KOPERASI DI PRODUKSI ---');
  try {
    const memberCount = await (prisma as any).cooperativeMember?.count({ where: { tenant_id: PROD_ID } });
    console.log(`CooperativeMember di Produksi: ${memberCount}`);
  } catch (e) {
    console.log('CooperativeMember table not found or error:', (e as any).message);
  }

  // 5. Cek Posisi dan Assignment Koperasi di DEMO
  console.log('\n--- 5. POSISI & ASSIGNMENT KOPERASI DI DEMO ---');
  const demoPositions = await prisma.organizationalPosition.findMany({
    where: {
      tenant_id: DEMO_ID,
      OR: [
        { code: { contains: 'KOPERASI', mode: 'insensitive' } },
        { name: { contains: 'koperasi', mode: 'insensitive' } }
      ]
    },
    include: {
      organizationalAssigns: {
        include: {
          User: { select: { id: true, email: true, full_name: true } }
        }
      }
    }
  });
  console.log('Demo Positions count:', demoPositions.length);
  demoPositions.forEach(p => {
    console.log(`- [${p.code}] ${p.name}`);
    p.organizationalAssigns.forEach(a => {
      console.log(`    ↳ User: ${a.User?.full_name} (${a.User?.email}) active=${a.is_active}`);
    });
  });

  // 6. Cek User Koperasi di DEMO
  console.log('\n--- 6. USER KOPERASI DI DEMO ---');
  const demoUsers = await prisma.user.findMany({
    where: {
      tenant_id: DEMO_ID,
      email: { contains: 'koperasi' }
    },
    include: {
      Role: true
    }
  });
  demoUsers.forEach(u => {
    console.log(`- Demo User: ${u.full_name} (${u.email}) -> Role: ${u.Role?.name}`);
  });
}

checkKoperasi()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
