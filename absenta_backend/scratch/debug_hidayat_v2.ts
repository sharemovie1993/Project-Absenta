import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const nisTarget = '20255419';

  const siswa = await prisma.siswa.findFirst({
    where: { nis: nisTarget },
    select: { id: true, user_id: true, tenant_id: true, nama_siswa: true }
  });

  if (!siswa) {
    console.log('Siswa tidak ditemukan');
    return;
  }

  console.log('--- Data Siswa ---');
  console.log(JSON.stringify(siswa, null, 2));

  const assignments = await prisma.organizationalAssignment.findMany({
    where: { user_id: siswa.user_id },
    include: {
      Position: {
        select: { id: true, name: true, scope_type: true }
      },
      Kelas: {
        select: { id: true, nama_kelas: true }
      }
    }
  });

  console.log('--- Organizational Assignments ---');
  console.log(JSON.stringify(assignments, null, 2));
  
  // Also check User role
  const user = await prisma.user.findUnique({
    where: { id: siswa.user_id || '' },
    include: { Role: true }
  });
  console.log('--- User Role ---');
  console.log(JSON.stringify({ role: user?.Role?.name }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
